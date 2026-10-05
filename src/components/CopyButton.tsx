import { useClipboard, type CopyFeedback } from '../hooks/useClipboard';
import { Icon } from './Icon';

export interface CopyButtonProps {
  value: string;
  enabled: boolean;
  name: string;
  label: string;
  primary?: boolean;
  onFeedback: CopyFeedback;
}

export function CopyButton({ value, enabled, name, label, primary = false, onFeedback }: CopyButtonProps) {
  const { copied, copy } = useClipboard(value, enabled, name, onFeedback);
  const style = primary
    ? 'inline-flex min-h-11 min-w-[126px] shrink-0 items-center justify-center gap-[9px] border-0 bg-accent px-4 py-[11px] text-[13px] leading-[1.4] font-semibold text-white enabled:hover:bg-accent-hover disabled:bg-disabled disabled:text-disabled-ink max-[480px]:min-w-28 max-[480px]:gap-[7px] max-[480px]:px-3'
    : `grid size-11 shrink-0 place-items-center border-0 enabled:hover:bg-control-hover enabled:hover:text-ink disabled:opacity-30 ${copied ? 'bg-accent-soft text-accent-ink' : 'bg-transparent text-control'}`;
  return (
    <button type="button" disabled={!enabled} onClick={() => { void copy(); }} aria-label={copied ? `${name} copied` : label} title={copied ? 'Copied' : label} className={`${style} rounded-none transition-colors duration-[120ms]`}>
      <Icon name={copied ? 'check' : 'copy'} className={primary ? 'size-4 [stroke-width:1.8]' : 'size-5'} />
      {primary && <span>{copied ? 'Copied' : 'Copy URL'}</span>}
    </button>
  );
}
