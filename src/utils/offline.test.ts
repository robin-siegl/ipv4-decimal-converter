// @vitest-environment jsdom
import { expect, it, vi } from 'vitest';
import { registerOffline } from './offline';

it('registers the production worker and waits for installation', async () => {
  vi.stubEnv('PROD', true);
  vi.stubEnv('BASE_URL', './');
  let finishInstall!: () => void;
  const ready = new Promise<void>((resolve) => { finishInstall = resolve; });
  const register = vi.fn().mockResolvedValue({});
  vi.stubGlobal('navigator', { serviceWorker: { register, ready } });
  let complete = false;
  const result = registerOffline().then((available) => { complete = true; return available; });
  await Promise.resolve();
  expect(register).toHaveBeenCalledWith('./sw.js', { scope: './', updateViaCache: 'none' });
  expect(complete).toBe(false);
  finishInstall();
  expect(await result).toBe(true);
});
it('supports hosting under a subdirectory', async () => {
  vi.stubEnv('PROD', true);
  vi.stubEnv('BASE_URL', '/ipv4-decimal-converter/');
  const register = vi.fn().mockResolvedValue({});
  vi.stubGlobal('navigator', { serviceWorker: { register, ready: Promise.resolve() } });
  expect(await registerOffline()).toBe(true);
  expect(register).toHaveBeenCalledWith('/ipv4-decimal-converter/sw.js', { scope: '/ipv4-decimal-converter/', updateViaCache: 'none' });
});
it('does not cache the development server', async () => {
  vi.stubEnv('PROD', false);
  const register = vi.fn();
  vi.stubGlobal('navigator', { serviceWorker: { register } });
  expect(await registerOffline()).toBe(false);
  expect(register).not.toHaveBeenCalled();
});
it('handles unsupported service workers', async () => {
  vi.stubEnv('PROD', true);
  vi.stubGlobal('navigator', {});
  expect(await registerOffline()).toBe(false);
});
it('handles registration rejection', async () => {
  vi.stubEnv('PROD', true);
  vi.stubGlobal('navigator', { serviceWorker: { register: vi.fn().mockRejectedValue(new Error('Storage blocked')) } });
  expect(await registerOffline()).toBe(false);
});
