import { useEffect, useId, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Dialog } from '@modules/core/ui/primitives/dialog';
import { toast } from '@modules/core/ui/primitives/toast';

interface SettingsCopyButtonProps {
  text: string;
  label: string;
  iconOnly?: boolean;
  className?: string;
  fallbackHint?: string;
}

export function SettingsCopyButton({ text, label, iconOnly, className = '', fallbackHint }: SettingsCopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const [manualText, setManualText] = useState<string | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1800);
    return () => window.clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setCopied(false);
      if (fallbackHint) toast.error(fallbackHint);
      else setManualText(text);
    }
  }

  return <>
    <button type="button" className={`settings-action ${className}`} onClick={copy}
      aria-label={copied ? `${label} — copied` : label} title={iconOnly ? label : undefined}>
      {copied ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
      {!iconOnly && <span>{copied ? 'Copied' : label}</span>}
    </button>
    <span className="sr-only" role="status">{copied ? 'Copied to clipboard' : ''}</span>
    <Dialog open={manualText !== null} onOpenChange={open => { if (!open) setManualText(null); }}
      labelledBy={titleId} describedBy={descriptionId} className="w-[calc(100vw-32px)] max-w-lg p-5">
      <h2 id={titleId} className="text-base font-semibold">{label} manually</h2>
      <p id={descriptionId} className="my-3 text-sm">Clipboard access is unavailable. Use your device’s Copy command on the selected text.</p>
      <textarea readOnly value={manualText ?? ''} rows={manualText?.includes('\n') ? 7 : 2}
        aria-labelledby={titleId} ref={element => { element?.select(); }}
        className="w-full resize-y rounded-md border border-[var(--color-border-default)] bg-[var(--color-surface-canvas)] p-3 font-mono text-sm" />
      <div className="mt-3 flex justify-end">
        <button type="button" className="settings-action" onClick={() => setManualText(null)}>Done</button>
      </div>
    </Dialog>
  </>;
}
