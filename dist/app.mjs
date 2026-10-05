import { parseIPv4, parseDecimal } from './conversion.mjs';

const ipv4 = document.getElementById('ipv4');
const decimal = document.getElementById('decimal');
const status = document.getElementById('conversion-status');
const browserUrl = document.getElementById('browser-url');
const formula = document.getElementById('formula');
const formulaResult = document.getElementById('formula-result');
const clipboardStatus = document.getElementById('clipboard-status');
const copyIPv4 = document.getElementById('copy-ipv4');
const copyDecimal = document.getElementById('copy-decimal');
const copyUrl = document.getElementById('copy-url');
const copyUrlLabel = document.getElementById('copy-url-label');
const instructions = 'Edit either value. The other updates automatically.';
const feedbackTimers = new Map();
let current = parseIPv4(ipv4.value);
let conversionRevision = 0;

function resetCopyFeedback(button) {
  clearTimeout(feedbackTimers.get(button));
  feedbackTimers.delete(button);
  button.dataset.copied = 'false';
  button.querySelector('use').setAttribute('href', '#icon-copy');
  if (button === copyUrl) copyUrlLabel.textContent = 'Copy URL';
  const label = button === copyIPv4 ? 'Copy IPv4 address' : button === copyDecimal ? 'Copy decimal integer' : 'Copy browser URL';
  button.setAttribute('aria-label', label);
  button.title = label;
}

function render(result) {
  for (const button of [copyIPv4, copyDecimal, copyUrl]) {
    resetCopyFeedback(button);
    button.disabled = !result.ok;
  }
  if (!result.ok) {
    browserUrl.textContent = 'http://…';
    formula.textContent = 'Enter a valid address to see the calculation.';
    formulaResult.textContent = '';
    return;
  }
  browserUrl.textContent = `http://${result.decimal}`;
  const [a, b, c, d] = result.octets;
  formula.textContent = `${a} × 256³ + ${b} × 256² + ${c} × 256 + ${d}`;
  formulaResult.textContent = `= ${result.decimal}`;
}

function update(source) {
  conversionRevision += 1;
  const target = source === ipv4 ? decimal : ipv4;
  current = source === ipv4 ? parseIPv4(source.value) : parseDecimal(source.value);
  for (const input of [ipv4, decimal]) {
    input.removeAttribute('aria-invalid');
    document.getElementById(`${input.id}-field`).dataset.invalid = 'false';
  }
  status.dataset.error = String(!current.ok && !current.empty);
  if (current.ok) {
    target.value = source === ipv4 ? String(current.decimal) : current.ip;
    target.placeholder = target === ipv4 ? '192.168.1.1' : '3232235777';
    status.textContent = instructions;
  } else {
    target.value = '';
    target.placeholder = '—';
    status.textContent = current.empty ? instructions : current.error;
    if (!current.empty) {
      source.setAttribute('aria-invalid', 'true');
      document.getElementById(`${source.id}-field`).dataset.invalid = 'true';
    }
  }
  render(current);
}

for (const input of [ipv4, decimal]) {
  input.addEventListener('input', () => update(input));
  input.addEventListener('blur', () => {
    if (!current.ok) return;
    input.value = input === ipv4 ? current.ip : String(current.decimal);
  });
}

document.getElementById('converter').addEventListener('submit', (event) => {
  event.preventDefault();
  const source = document.activeElement === decimal ? decimal : ipv4;
  update(source);
  if (current.ok) source.value = source === ipv4 ? current.ip : String(current.decimal);
});

for (const button of document.querySelectorAll('[data-example]')) {
  button.addEventListener('click', () => {
    ipv4.value = button.dataset.example;
    update(ipv4);
  });
}

function announce(message) {
  clipboardStatus.textContent = '';
  requestAnimationFrame(() => { clipboardStatus.textContent = message; });
}

function copyFallback(text) {
  const previousFocus = document.activeElement;
  const selection = previousFocus instanceof HTMLInputElement
    ? { start: previousFocus.selectionStart, end: previousFocus.selectionEnd }
    : null;
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.readOnly = true;
  textarea.setAttribute('aria-hidden', 'true');
  textarea.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;pointer-events:none;font-size:16px;';
  document.body.appendChild(textarea);
  textarea.select();
  let success = false;
  try { success = document.execCommand('copy'); } catch { /* Report failure below. */ }
  textarea.remove();
  previousFocus?.focus({ preventScroll: true });
  if (selection && selection.start !== null && selection.end !== null) {
    previousFocus.setSelectionRange(selection.start, selection.end);
  }
  return success;
}

async function copy(button, text, name) {
  if (!current.ok) return;
  const revision = conversionRevision;
  let success = false;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      success = true;
    }
  } catch { /* Try the selection-based fallback. */ }
  if (!success) success = copyFallback(text);
  if (!success) {
    announce('Could not copy. Select the value and copy it manually.');
    if (revision === conversionRevision) status.textContent = 'Could not copy. Select the value and copy it manually.';
    return;
  }
  announce(`${name} copied to clipboard.`);
  if (revision !== conversionRevision) return;
  status.textContent = instructions;
  resetCopyFeedback(button);
  button.dataset.copied = 'true';
  button.querySelector('use').setAttribute('href', '#icon-check');
  button.setAttribute('aria-label', `${name} copied`);
  button.title = 'Copied';
  if (button === copyUrl) copyUrlLabel.textContent = 'Copied';
  feedbackTimers.set(button, setTimeout(() => resetCopyFeedback(button), 1700));
}

copyIPv4.addEventListener('click', () => copy(copyIPv4, current.ip, 'IPv4 address'));
copyDecimal.addEventListener('click', () => copy(copyDecimal, String(current.decimal), 'Decimal integer'));
copyUrl.addEventListener('click', () => copy(copyUrl, `http://${current.decimal}`, 'URL'));

render(current);
