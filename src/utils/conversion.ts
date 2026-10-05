export const MAX_IPV4 = 4294967295;

export interface ConversionSuccess {
  ok: true;
  decimal: number;
  ip: string;
  octets: number[];
}

export interface ConversionFailure {
  ok: false;
  empty: boolean;
  error?: string;
}

export type ConversionResult = ConversionSuccess | ConversionFailure;

function result(decimal: number): ConversionSuccess {
  const octets = [3, 2, 1, 0].map((power) => Math.floor(decimal / 256 ** power) % 256);
  return { ok: true, decimal, ip: octets.join('.'), octets };
}

export function parseIPv4(value: string): ConversionResult {
  const text = value.trim();
  if (!text) return { ok: false, empty: true };
  if (!/^\d{1,3}(?:\.\d{1,3}){3}$/.test(text)) {
    return { ok: false, empty: false, error: 'Use four numbers from 0 to 255, separated by dots.' };
  }
  const parts = text.split('.');
  if (parts.some((part) => part.length > 1 && part.startsWith('0'))) {
    return { ok: false, empty: false, error: 'Remove leading zeros from each part (use 10, not 010).' };
  }
  if (parts.some((part) => Number(part) > 255)) {
    return { ok: false, empty: false, error: 'Each part of an IPv4 address must be between 0 and 255.' };
  }
  return result(parts.reduce((total, part) => total * 256 + Number(part), 0));
}

export function parseDecimal(value: string): ConversionResult {
  const text = value.trim();
  if (!text) return { ok: false, empty: true };
  if (!/^\d+$/.test(text)) {
    return { ok: false, empty: false, error: 'Use a whole number from 0 to 4,294,967,295. Digits only.' };
  }
  const decimal = Number(text);
  if (!Number.isSafeInteger(decimal) || decimal > MAX_IPV4) {
    return { ok: false, empty: false, error: 'The decimal integer must be between 0 and 4,294,967,295.' };
  }
  return result(decimal);
}
