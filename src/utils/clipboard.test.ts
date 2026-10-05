// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { copyText } from './clipboard';

afterEach(() => { document.body.innerHTML = ''; Reflect.deleteProperty(document, 'execCommand'); });

it('copies through the Clipboard API', async () => {
  const writeText = vi.fn().mockResolvedValue(void 0);
  vi.stubGlobal('navigator', { clipboard: { writeText } });
  expect(await copyText('3232235777')).toBe(true);
  expect(writeText).toHaveBeenCalledWith('3232235777');
  expect(document.querySelector('textarea')).toBeNull();
});
it('falls back after rejection and restores focus and selection', async () => {
  vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('Blocked')) } });
  document.execCommand = vi.fn().mockImplementation((command: string) => {
    expect(command).toBe('copy');
    expect(document.querySelector('textarea')).toHaveValue('127.0.0.1');
    return true;
  });
  const input = document.createElement('input');
  input.value = '127.0.0.1';
  document.body.appendChild(input);
  input.focus();
  input.setSelectionRange(2, 5);
  expect(await copyText(input.value)).toBe(true);
  expect(document.activeElement).toBe(input);
  expect([input.selectionStart, input.selectionEnd]).toEqual([2, 5]);
  expect(document.querySelector('textarea')).toBeNull();
});
it('uses a fallback when the Clipboard API is absent', async () => {
  vi.stubGlobal('navigator', {});
  document.execCommand = vi.fn().mockReturnValue(true);
  expect(await copyText('http://3232235777')).toBe(true);
});
it('returns failure and removes temporary elements if both methods fail', async () => {
  vi.stubGlobal('navigator', {});
  document.execCommand = vi.fn().mockImplementation(() => { throw new Error('Unsupported'); });
  expect(await copyText('3232235777')).toBe(false);
  expect(document.querySelector('textarea')).toBeNull();
});
