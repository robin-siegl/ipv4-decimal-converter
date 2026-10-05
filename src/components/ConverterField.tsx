import type { CopyFeedback } from '../hooks/useClipboard';
import { CopyButton } from './CopyButton';

export type FieldName = 'ipv4' | 'decimal';

export interface ConverterFieldProps {
  kind: FieldName;
  value: string;
  copyValue: string;
  valid: boolean;
  invalid: boolean;
  placeholder: string;
  onChange: (field: FieldName, value: string) => void;
  onBlur: (field: FieldName) => void;
  onFeedback: CopyFeedback;
}

export function ConverterField({ kind, value, copyValue, valid, invalid, placeholder, onChange, onBlur, onFeedback }: ConverterFieldProps) {
  const isIPv4 = kind === 'ipv4';
  const label = isIPv4 ? 'IPv4 address' : 'Decimal integer';
  return (
    <div>
      <div className="mb-2.5 flex items-baseline justify-between gap-3 max-[480px]:gap-2 max-[340px]:block">
        <label htmlFor={kind} className="text-sm font-semibold">{label}</label>
        <span id={`${kind}-format`} className="text-right text-xs leading-[1.5] text-muted max-[480px]:text-[11px] max-[340px]:mt-[3px] max-[340px]:block max-[340px]:text-left">{isIPv4 ? 'Four numbers, separated by dots' : 'A single number'}</span>
      </div>
      <div className={`flex min-h-[98px] items-center gap-4 rounded-none border bg-white px-[22px] py-[22px] transition-[border-color,box-shadow] duration-[120ms] focus-within:border-[#90908a] focus-within:shadow-[0_0_0_3px_#24242407] max-[480px]:min-h-[86px] max-[480px]:gap-2.5 max-[480px]:px-4 max-[480px]:py-[18px] max-[340px]:gap-[6px] max-[340px]:px-3 ${invalid ? 'border-[#777770]' : 'border-line'}`}>
        <input id={kind} name={kind} value={value} onChange={(event) => onChange(kind, event.target.value)} onBlur={() => onBlur(kind)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); onBlur(kind); } }} type="text" inputMode={isIPv4 ? 'decimal' : 'numeric'} autoComplete="off" autoCapitalize="off" spellCheck={false} placeholder={placeholder} maxLength={64} aria-invalid={invalid || void 0} aria-describedby={`${kind}-format conversion-status`} className="block min-w-0 w-full rounded-none border-0 bg-transparent p-0 font-mono text-[clamp(20px,5.5vw,32px)] leading-[1.4] font-normal tracking-[-0.9px] text-ink tabular-nums outline-none placeholder:text-[#aeaea7] max-[480px]:tracking-[-0.5px]" />
        <CopyButton value={copyValue} enabled={valid} name={label} label={isIPv4 ? 'Copy IPv4 address' : 'Copy decimal integer'} onFeedback={onFeedback} />
      </div>
    </div>
  );
}
