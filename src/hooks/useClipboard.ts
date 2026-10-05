import { useEffect, useRef, useState } from 'react';
import { copyText } from '../utils/clipboard';

export type CopyFeedback = (message: string, isError: boolean) => void;

export function useClipboard(value: string, enabled: boolean, name: string, onFeedback: CopyFeedback) {
  const [copied, setCopied] = useState(false);
  const revision = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    revision.current += 1;
    setCopied(false);
    if (timer.current !== null) clearTimeout(timer.current);
    return () => {
      revision.current += 1;
      if (timer.current !== null) clearTimeout(timer.current);
    };
  }, [value, enabled]);

  async function copy() {
    if (!enabled) return;
    const startedAt = revision.current;
    const success = await copyText(value);
    if (startedAt !== revision.current) return;
    if (!success) {
      onFeedback('Could not copy. Select the value and copy it manually.', true);
      return;
    }
    onFeedback(`${name} copied to clipboard.`, false);
    setCopied(true);
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1700);
  }

  return { copied, copy };
}
