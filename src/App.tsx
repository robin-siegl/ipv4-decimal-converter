import { useCallback, useState } from 'react';
import { ConverterField, type FieldName } from './components/ConverterField';
import { CopyButton } from './components/CopyButton';
import { Icon } from './components/Icon';
import { useOffline } from './hooks/useOffline';
import { parseDecimal, parseIPv4 } from './utils/conversion';

const instructions = 'Edit either value. The other updates automatically.';
const examples = ['127.0.0.1', '8.8.8.8', '255.255.255.255'];

export function App() {
  const [fields, setFields] = useState({ ipv4: '192.168.1.1', decimal: '3232235777' });
  const [source, setSource] = useState<FieldName>('ipv4');
  const [copyError, setCopyError] = useState('');
  const [announcement, setAnnouncement] = useState({ message: '', id: 0 });
  const offlineReady = useOffline();
  const conversion = source === 'ipv4' ? parseIPv4(fields.ipv4) : parseDecimal(fields.decimal);
  const invalid = !conversion.ok && !conversion.empty;
  const status = copyError || (!conversion.ok && conversion.error) || instructions;
  const url = conversion.ok ? `http://${conversion.decimal}` : 'http://…';

  function change(field: FieldName, value: string) {
    const result = field === 'ipv4' ? parseIPv4(value) : parseDecimal(value);
    setFields(field === 'ipv4'
      ? { ipv4: value, decimal: result.ok ? String(result.decimal) : '' }
      : { ipv4: result.ok ? result.ip : '', decimal: value });
    setSource(field);
    setCopyError('');
  }

  function normalize(field: FieldName) {
    if (!conversion.ok) return;
    setFields((previous) => ({ ...previous, [field]: field === 'ipv4' ? conversion.ip : String(conversion.decimal) }));
  }

  const onCopyFeedback = useCallback((message: string, isError: boolean) => {
    setCopyError(isError ? message : '');
    setAnnouncement((previous) => ({ message, id: previous.id + 1 }));
  }, []);

  return (
    <main className="mx-auto mt-[clamp(64px,12vh,132px)] mb-10 w-[calc(100%_-_48px)] max-w-[620px] max-[480px]:mt-[52px] max-[480px]:mb-7 max-[480px]:w-[calc(100%_-_40px)] max-[340px]:w-[calc(100%_-_32px)]">
      <header className="mb-10 max-[480px]:mb-8">
        <h1 className="m-0 flex items-center gap-[18px] text-[clamp(30px,4.5vw,44px)] leading-[1.15] font-[560] tracking-[-1.7px] max-[480px]:gap-3 max-[480px]:tracking-[-1px]">IPv4 <Icon name="arrows" title="to and from" className="size-[30px] text-[#8a8a86] [stroke-width:1.4] max-[480px]:size-[23px]" /> decimal</h1>
        <p className="mt-3.5 text-base leading-[1.5] text-muted max-[480px]:mt-3 max-[480px]:text-sm">Two ways to write the same address.</p>
      </header>

      <section aria-label="Address converter">
        <form aria-label="Convert address" noValidate onSubmit={(event) => { event.preventDefault(); normalize(source); }}>
          <ConverterField kind="ipv4" value={fields.ipv4} copyValue={conversion.ok ? conversion.ip : ''} valid={conversion.ok} invalid={invalid && source === 'ipv4'} placeholder={!conversion.ok && source !== 'ipv4' ? '—' : '192.168.1.1'} onChange={change} onBlur={normalize} onFeedback={onCopyFeedback} />
          <div aria-hidden="true" className="flex h-9 items-center justify-center gap-2.5 text-[#a2a29b]"><span className="h-px w-5 bg-[#dfdfd9]" /><Icon name="arrows" className="size-[18px] rotate-90 [stroke-width:1.5]" /><span className="h-px w-5 bg-[#dfdfd9]" /></div>
          <ConverterField kind="decimal" value={fields.decimal} copyValue={conversion.ok ? String(conversion.decimal) : ''} valid={conversion.ok} invalid={invalid && source === 'decimal'} placeholder={!conversion.ok && source !== 'decimal' ? '—' : '3232235777'} onChange={change} onBlur={normalize} onFeedback={onCopyFeedback} />
          <p id="conversion-status" role="status" aria-live="polite" className={`mt-[13px] mb-[27px] min-h-5 text-xs leading-[1.65] max-[480px]:mb-[17px] max-[480px]:min-h-10 ${invalid || copyError ? 'text-ink' : 'text-muted'}`}>{status}</p>
        </form>

        <div className="flex items-center justify-between gap-5 border-y border-line pt-[19px] pb-5 max-[480px]:gap-3 max-[340px]:flex-col max-[340px]:items-stretch max-[340px]:gap-3.5">
          <div className="flex min-w-0 flex-col gap-[6px]"><span className="text-xs text-muted">Browser URL</span><code className="font-mono text-[17px] tracking-[-0.35px] wrap-anywhere max-[480px]:text-sm">{url}</code></div>
          <div className="shrink-0 max-[340px]:self-start"><CopyButton value={url} enabled={conversion.ok} name="URL" label="Copy browser URL" primary onFeedback={onCopyFeedback} /></div>
        </div>

        <div aria-label="Example addresses" className="mt-4 mb-[26px] flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted max-[480px]:mb-[22px] max-[480px]:gap-x-0.5">
          <span className="mr-1">Try</span>
          {examples.map((example) => <button key={example} type="button" title={example === '127.0.0.1' ? 'Loopback address' : void 0} onClick={() => change('ipv4', example)} className="min-h-11 rounded-none border-0 bg-transparent px-[9px] py-2 font-mono text-xs text-[#666661] transition-colors duration-[120ms] hover:bg-[#eaeae5] hover:text-ink max-[480px]:px-[7px] max-[480px]:text-[11px]">{example}</button>)}
        </div>
      </section>

      <details className="group border-t border-line">
        <summary className="flex min-h-[62px] list-none items-center justify-between gap-4 text-[13px] text-[#565651] select-none">How does it work?<Icon name="chevron" className="size-4 transition-transform duration-150 group-open:rotate-180" /></summary>
        <div className="pb-5 text-[13px] leading-[1.8] text-[#666661]">
          <p className="mb-4">Each part of an IPv4 address is a number from 0 to 255. Combine the four parts in base 256 to get one decimal integer.</p>
          <div aria-label="Current conversion calculation" className="mb-[18px] grid gap-[7px] border-l-2 border-[#cecec7] bg-[#edede8] px-[18px] py-[17px] text-xs leading-[1.8] text-[#444440] wrap-anywhere">
            <code className="font-mono">{conversion.ok ? `${conversion.octets[0]} × 256³ + ${conversion.octets[1]} × 256² + ${conversion.octets[2]} × 256 + ${conversion.octets[3]}` : 'Enter a valid address to see the calculation.'}</code>
            {conversion.ok && <code className="font-mono font-semibold text-ink">= {conversion.decimal}</code>}
          </div>
          <p className="mb-4">Include <code className="font-mono">http://</code> when pasting the number into your browser. It may display the address with dots again. A different notation doesn’t change what’s running at that address.</p>
          <a href="https://url.spec.whatwg.org/#concept-ipv4-parser" target="_blank" rel="noopener noreferrer" className="inline-block text-[#565651] underline decoration-[#a6a6a0] underline-offset-[3px] hover:text-ink">Read the URL standard <span aria-hidden="true">↗</span></a>
        </div>
      </details>

      <footer className="mt-[18px] text-[11px] leading-[1.7] text-muted">IPv4 only. Converted entirely in your browser.{offlineReady && <span> Available offline.</span>}</footer>
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true"><span key={announcement.id}>{announcement.message}</span></div>
    </main>
  );
}
