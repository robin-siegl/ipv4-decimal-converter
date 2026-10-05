// @vitest-environment jsdom
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import { App } from './App';

beforeEach(() => {
  vi.stubEnv('PROD', false);
  window.localStorage.clear();
});
const ipv4Input = () => screen.getByRole('textbox', { name: 'IPv4 address' });
const decimalInput = () => screen.getByRole('textbox', { name: 'Decimal integer' });
const form = () => within(screen.getByRole('form', { name: 'Convert address' }));

it('renders editable default values and a browser URL', () => {
  render(<App />);
  expect(ipv4Input()).toHaveValue('192.168.1.1');
  expect(decimalInput()).toHaveValue('3232235777');
  expect(screen.getByText('http://3232235777')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Copy browser URL' })).toBeEnabled();
});
it('converts either direction including unsigned boundary values', () => {
  render(<App />);
  fireEvent.change(ipv4Input(), { target: { value: '127.0.0.1' } });
  expect(decimalInput()).toHaveValue('2130706433');
  fireEvent.change(decimalInput(), { target: { value: '4294967295' } });
  expect(ipv4Input()).toHaveValue('255.255.255.255');
  fireEvent.change(decimalInput(), { target: { value: '0' } });
  expect(ipv4Input()).toHaveValue('0.0.0.0');
  expect(screen.getByText('http://0')).toBeInTheDocument();
});
it('clears stale output and disables copying for invalid or empty input', () => {
  render(<App />);
  fireEvent.change(decimalInput(), { target: { value: '4294967296' } });
  expect(ipv4Input()).toHaveValue('');
  expect(decimalInput()).toHaveAttribute('aria-invalid', 'true');
  for (const button of screen.getAllByRole('button', { name: /^Copy/ })) expect(button).toBeDisabled();
  expect(form().getByText(/must be between 0 and 4,294,967,295/)).toBeInTheDocument();
  fireEvent.change(decimalInput(), { target: { value: '' } });
  expect(decimalInput()).not.toHaveAttribute('aria-invalid');
  expect(form().getByText(/updates automatically/)).toBeInTheDocument();
});
it('rejects leading-zero ambiguity and recovers with valid input', () => {
  render(<App />);
  fireEvent.change(ipv4Input(), { target: { value: '010.0.0.1' } });
  expect(form().getByText(/Remove leading zeros/)).toBeInTheDocument();
  fireEvent.change(ipv4Input(), { target: { value: '10.0.0.1' } });
  expect(ipv4Input()).not.toHaveAttribute('aria-invalid');
  expect(decimalInput()).toHaveValue('167772161');
});
it('normalizes on blur and Enter', async () => {
  const user = userEvent.setup();
  render(<App />);
  fireEvent.change(ipv4Input(), { target: { value: ' 8.8.8.8 ' } });
  fireEvent.blur(ipv4Input());
  expect(ipv4Input()).toHaveValue('8.8.8.8');
  await user.click(decimalInput());
  await user.clear(decimalInput());
  await user.type(decimalInput(), '0001{Enter}');
  expect(decimalInput()).toHaveValue('1');
  expect(ipv4Input()).toHaveValue('0.0.0.1');
});
it('loads example addresses', async () => {
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByRole('button', { name: '127.0.0.1' }));
  expect(ipv4Input()).toHaveValue('127.0.0.1');
  expect(decimalInput()).toHaveValue('2130706433');
});
it('copies both fields and the decimal URL', async () => {
  const user = userEvent.setup();
  const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(void 0);
  render(<App />);
  await user.click(screen.getByRole('button', { name: 'Copy IPv4 address' }));
  await user.click(screen.getByRole('button', { name: 'Copy decimal integer' }));
  await user.click(screen.getByRole('button', { name: 'Copy browser URL' }));
  expect(writeText.mock.calls.map(([value]) => value)).toEqual(['192.168.1.1', '3232235777', 'http://3232235777']);
  expect(screen.getByRole('button', { name: 'URL copied' })).toHaveTextContent('Copied');
});
it('resets copy confirmation after its timeout', async () => {
  vi.useFakeTimers();
  vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockResolvedValue(void 0) } });
  render(<App />);
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Copy browser URL' })); });
  expect(screen.getByRole('button', { name: 'URL copied' })).toBeInTheDocument();
  act(() => { vi.advanceTimersByTime(1700); });
  expect(screen.getByRole('button', { name: 'Copy browser URL' })).toHaveTextContent('Copy URL');
});
it('shows copy failure and clears it on editing', async () => {
  const user = userEvent.setup();
  vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('Blocked'));
  document.execCommand = vi.fn().mockReturnValue(false);
  render(<App />);
  await user.click(screen.getByRole('button', { name: 'Copy decimal integer' }));
  expect(form().getByText(/Could not copy/)).toBeInTheDocument();
  fireEvent.change(ipv4Input(), { target: { value: '8.8.8.8' } });
  expect(form().getByText(/updates automatically/)).toBeInTheDocument();
});
it('ignores stale async copy feedback after input changes', async () => {
  const user = userEvent.setup();
  let finishCopy!: () => void;
  vi.spyOn(navigator.clipboard, 'writeText').mockImplementation(() => new Promise<void>((resolve) => { finishCopy = resolve; }));
  render(<App />);
  await user.click(screen.getByRole('button', { name: 'Copy browser URL' }));
  fireEvent.change(ipv4Input(), { target: { value: '8.8.8.8' } });
  await act(async () => { finishCopy(); });
  expect(screen.getByText('http://134744072')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Copy browser URL' })).toHaveTextContent('Copy URL');
});
it('opens the explanation with the current formula', async () => {
  const user = userEvent.setup();
  render(<App />);
  const summary = screen.getByText('How does it work?');
  expect(summary.closest('details')).not.toHaveAttribute('open');
  await user.click(summary);
  expect(summary.closest('details')).toHaveAttribute('open');
  expect(screen.getByText('192 × 256³ + 168 × 256² + 1 × 256 + 1')).toBeInTheDocument();
});
it('shows offline readiness after the worker becomes ready', async () => {
  vi.stubEnv('PROD', true);
  let finishInstall!: () => void;
  const ready = new Promise<void>((resolve) => { finishInstall = resolve; });
  vi.stubGlobal('navigator', { serviceWorker: { register: vi.fn().mockResolvedValue({}), ready } });
  render(<App />);
  expect(screen.queryByText('Available offline.')).not.toBeInTheDocument();
  await act(async () => { finishInstall(); });
  expect(screen.getByText('Available offline.')).toBeInTheDocument();
});

it('switches between light and dark mode without changing the conversion', async () => {
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByRole('button', { name: 'Switch to dark mode' }));
  expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
  expect(window.localStorage.getItem('ipv4-decimal-theme')).toBe('dark');
  expect(ipv4Input()).toHaveValue('192.168.1.1');
  expect(decimalInput()).toHaveValue('3232235777');
  await user.click(screen.getByRole('button', { name: 'Switch to light mode' }));
  expect(document.documentElement).toHaveAttribute('data-theme', 'light');
  expect(window.localStorage.getItem('ipv4-decimal-theme')).toBe('light');
});
