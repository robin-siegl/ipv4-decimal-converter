// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useTheme } from './useTheme';

const preferenceKey = 'ipv4-decimal-theme';
const html = readFileSync(resolve('index.html'), 'utf8');
const bootstrap = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
let themeMeta: HTMLMetaElement;

function systemPreference(dark: boolean) {
  const media = Object.assign(new EventTarget(), { matches: dark });
  vi.stubGlobal('matchMedia', vi.fn(() => media));
  return (next: boolean) => {
    media.matches = next;
    media.dispatchEvent(new Event('change'));
  };
}

beforeEach(() => {
  window.localStorage.clear();
  themeMeta = document.createElement('meta');
  themeMeta.name = 'theme-color';
  document.head.append(themeMeta);
});
afterEach(() => { themeMeta.remove(); });

it('follows system changes while no theme is saved', () => {
  const changeSystem = systemPreference(false);
  const { result } = renderHook(useTheme);
  expect(result.current.theme).toBe('light');
  act(() => { changeSystem(true); });
  expect(result.current.theme).toBe('dark');
  expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
  expect(document.documentElement.style.colorScheme).toBe('dark');
  expect(themeMeta.content).toBe('#141616');
  expect(window.localStorage.getItem(preferenceKey)).toBeNull();
});

it.each(['light', 'dark'] as const)('keeps a saved %s choice when the system theme changes', (theme) => {
  window.localStorage.setItem(preferenceKey, theme);
  const changeSystem = systemPreference(theme === 'light');
  const { result } = renderHook(useTheme);
  expect(result.current.theme).toBe(theme);
  act(() => { changeSystem(theme !== 'light'); });
  act(() => { changeSystem(theme === 'light'); });
  expect(result.current.theme).toBe(theme);
  expect(document.documentElement).toHaveAttribute('data-theme', theme);
});

it('remembers a toggle after remounting and overrides the system preference', () => {
  systemPreference(true);
  const first = renderHook(useTheme);
  act(() => { first.result.current.toggleTheme(); });
  expect(window.localStorage.getItem(preferenceKey)).toBe('light');
  first.unmount();
  const reopened = renderHook(useTheme);
  expect(reopened.result.current.theme).toBe('light');
  expect(themeMeta.content).toBe('#f7f7f5');
});

it('still switches themes when storage is blocked', () => {
  systemPreference(true);
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('Blocked'); });
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Blocked'); });
  const { result } = renderHook(useTheme);
  expect(result.current.theme).toBe('dark');
  act(() => { result.current.toggleTheme(); });
  expect(result.current.theme).toBe('light');
  expect(document.documentElement).toHaveAttribute('data-theme', 'light');
});

it.each([
  { saved: 'dark', systemDark: false, expected: 'dark' },
  { saved: 'light', systemDark: true, expected: 'light' },
  { saved: null, systemDark: true, expected: 'dark' },
  { saved: 'invalid', systemDark: false, expected: 'light' },
])('applies $expected before React loads (saved: $saved, system dark: $systemDark)', ({ saved, systemDark, expected }) => {
  if (saved !== null) window.localStorage.setItem(preferenceKey, saved);
  systemPreference(systemDark);
  expect(bootstrap).toBeTruthy();
  new Function(bootstrap!)();
  expect(document.documentElement).toHaveAttribute('data-theme', expected);
  expect(document.documentElement.style.colorScheme).toBe(expected);
  expect(themeMeta.content).toBe(expected === 'dark' ? '#141616' : '#f7f7f5');
  const { result } = renderHook(useTheme);
  expect(result.current.theme).toBe(expected);
});
