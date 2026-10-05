export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall back to a temporary selection if the Clipboard API is blocked.
  }

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
  let copied = false;
  try { copied = document.execCommand('copy'); } catch { /* Return failure for manual copying. */ }
  textarea.remove();
  if (previousFocus instanceof HTMLElement) previousFocus.focus({ preventScroll: true });
  if (previousFocus instanceof HTMLInputElement && selection && selection.start !== null && selection.end !== null) {
    previousFocus.setSelectionRange(selection.start, selection.end);
  }
  return copied;
}
