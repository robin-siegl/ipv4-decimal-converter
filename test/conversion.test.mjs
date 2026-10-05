import assert from 'node:assert/strict';
import test from 'node:test';
import { MAX_IPV4, parseIPv4, parseDecimal } from '../dist/conversion.mjs';

test('converts familiar addresses and the full unsigned range in both directions', () => {
  for (const [ip, number] of [
    ['192.168.1.1', 3232235777],
    ['127.0.0.1', 2130706433],
    ['8.8.8.8', 134744072],
    ['0.0.0.0', 0],
    ['0.0.0.1', 1],
    ['128.0.0.0', 2147483648],
    ['255.255.255.255', MAX_IPV4],
  ]) {
    assert.equal(parseIPv4(ip).decimal, number);
    assert.equal(parseDecimal(String(number)).ip, ip);
    assert.equal(new URL(`http://${number}`).hostname, ip);
  }
});

test('rejects malformed addresses, abbreviated hosts, and octal ambiguity', () => {
  for (const value of ['1.2.3', '1.2.3.4.5', '256.0.0.1', '-1.0.0.0', '1.2.3.4x', '1 .2.3.4', '1.2.3.4/24', 'http://1.2.3.4', '010.0.0.1', '00.0.0.0', '1.2.3.04', '1.2.3.4\n5', '１.２.３.４']) {
    assert.equal(parseIPv4(value).ok, false, value);
  }
});

test('rejects nondecimal and out-of-range integers', () => {
  for (const value of ['-1', '4294967296', '9999999999999999999999', '1.5', '1e3', '0x7f000001', '+1', '1,000', '12 34', 'Infinity', 'NaN', '１２３']) {
    assert.equal(parseDecimal(value).ok, false, value);
  }
});

test('handles whitespace, empty input, and canonical decimal output', () => {
  assert.equal(parseIPv4(' 192.168.1.1 ').decimal, 3232235777);
  assert.equal(parseDecimal(' 2130706433 ').ip, '127.0.0.1');
  assert.equal(parseDecimal('000000001').decimal, 1);
  assert.equal(parseDecimal('0000000000').ip, '0.0.0.0');
  assert.equal(parseIPv4(' ').empty, true);
  assert.equal(parseDecimal('').empty, true);
});

test('matches URL host parsing across 10,000 deterministic unsigned values', () => {
  let value = 1701;
  for (let index = 0; index < 10000; index += 1) {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    const parsed = parseDecimal(String(value));
    assert.equal(parsed.ip, new URL(`http://${value}`).hostname);
    assert.equal(parseIPv4(parsed.ip).decimal, value);
  }
});
