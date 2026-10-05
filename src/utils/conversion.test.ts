import { describe, expect, it } from 'vitest';
import { MAX_IPV4, parseDecimal, parseIPv4 } from './conversion';

describe('IPv4 and decimal conversion', () => {
  it.each([
    ['192.168.1.1', 3232235777], ['127.0.0.1', 2130706433], ['8.8.8.8', 134744072],
    ['0.0.0.0', 0], ['0.0.0.1', 1], ['128.0.0.0', 2147483648], ['255.255.255.255', MAX_IPV4],
  ])('converts %s in both directions', (ip, number) => {
    expect(parseIPv4(ip)).toMatchObject({ ok: true, decimal: number });
    expect(parseDecimal(String(number))).toMatchObject({ ok: true, ip });
    expect(new URL(`http://${number}`).hostname).toBe(ip);
  });
  it.each(['1.2.3', '1.2.3.4.5', '256.0.0.1', '-1.0.0.0', '1.2.3.4x', '1 .2.3.4', '1.2.3.4/24', 'http://1.2.3.4', '010.0.0.1', '00.0.0.0', '1.2.3.04', '1.2.3.4\n5', '１.２.３.４'])('rejects invalid IPv4 input %s', (value) => {
    expect(parseIPv4(value).ok).toBe(false);
  });
  it.each(['-1', '4294967296', '9999999999999999999999', '1.5', '1e3', '0x7f000001', '+1', '1,000', '12 34', 'Infinity', 'NaN', '１２３'])('rejects invalid decimal input %s', (value) => {
    expect(parseDecimal(value).ok).toBe(false);
  });
  it('handles whitespace, empty input, and canonical decimal output', () => {
    expect(parseIPv4(' 192.168.1.1 ')).toMatchObject({ decimal: 3232235777 });
    expect(parseDecimal(' 2130706433 ')).toMatchObject({ ip: '127.0.0.1' });
    expect(parseDecimal('000000001')).toMatchObject({ decimal: 1 });
    expect(parseDecimal('0000000000')).toMatchObject({ ip: '0.0.0.0' });
    expect(parseIPv4(' ')).toEqual({ ok: false, empty: true });
    expect(parseDecimal('')).toEqual({ ok: false, empty: true });
  });
  it('matches URL host parsing across 10,000 deterministic unsigned values', () => {
    let value = 1701;
    for (let index = 0; index < 10000; index += 1) {
      value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
      const parsed = parseDecimal(String(value));
      expect(parsed.ok).toBe(true);
      if (!parsed.ok) throw new Error('Valid integer was rejected.');
      expect(parsed.ip).toBe(new URL(`http://${value}`).hostname);
      expect(parseIPv4(parsed.ip)).toMatchObject({ decimal: value });
    }
  });
});
