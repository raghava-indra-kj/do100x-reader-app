import { useId, useRef, type ButtonHTMLAttributes, type ReactNode, type RefObject } from 'react';
import { X } from 'lucide-react';
import { Button } from '@modules/core/ui/primitives/button';
import { BaseDialog } from '@modules/core/ui/primitives/dialog';
import { Select } from '@modules/core/ui/primitives/select';
export function IconButton({ label, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) { return <Button type="button" size="sm" variant="ghost" iconOnly tooltip={label} aria-label={label} {...props}>{children}</Button>; }
export function CalendarSelect({ label, value, items, onChange, disabled }: { label: string; value: string; items: Record<string, ReactNode>; onChange: (value: string) => void; disabled?: boolean }) { return <Select ariaLabel={label} tooltip={label} value={value} items={items} disabled={disabled} onValueChange={value => { if (value !== null) onChange(value); }} className="calendar-select" />; }
export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) { return <label className="calendar-field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>; }
export function CalendarDialog({ title, children, onClose, busy = false, className = '' }: { title: string; children: ReactNode; onClose: () => void; busy?: boolean; className?: string }) {
  const id = useId(), opener = useRef(document.activeElement as HTMLElement | null);
  return <BaseDialog.Root open onOpenChange={open => { if (!open && !busy) onClose(); }}>
    <BaseDialog.Portal><BaseDialog.Backdrop className="fixed inset-0 z-40 bg-(--navy-800)/42 animate-fade-in" />
      <BaseDialog.Popup aria-labelledby={id} aria-modal="true" finalFocus={() => {
        if (opener.current?.isConnected && opener.current !== document.body && !opener.current.matches(':disabled')) return opener.current;
        // Responsive changes can replace the original sidebar control.
        return document.querySelector<HTMLElement>('.calendar-planning-dialog button:not(:disabled)')
          ?? document.querySelector<HTMLElement>('.calendar-main button:not(:disabled)') ?? true;
      }} className={`fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg bg-(--color-surface-raised) rounded-xl p-8 shadow-lg calendar-dialog ${className}`}>
        <header><h2 id={id}>{title}</h2><IconButton label="Close dialog" onClick={onClose} disabled={busy}><X size={18} /></IconButton></header>{children}
      </BaseDialog.Popup>
    </BaseDialog.Portal>
  </BaseDialog.Root>;
}

// Keep this root mounted around Calendar: editors and source dialogs must be
// descendants even though their portals render outside the planning drawer.
export function CalendarPlanningRoot({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  return <BaseDialog.Root open={open} onOpenChange={open => { if (!open) onClose(); }}>{children}</BaseDialog.Root>;
}

export function CalendarPlanningPanel({ mobile, returnFocus, children }: { mobile: boolean; returnFocus: RefObject<HTMLButtonElement | null>; children: ReactNode }) {
  if (!mobile) return <aside className="calendar-sidebar" aria-label="Calendar planning">{children}</aside>;
  return <BaseDialog.Portal><BaseDialog.Backdrop className="calendar-planning-backdrop" />
    <BaseDialog.Popup className="calendar-sidebar calendar-planning-dialog" aria-label="Calendar planning" aria-modal="true" finalFocus={returnFocus}>
      {children}
    </BaseDialog.Popup>
  </BaseDialog.Portal>;
}

export function CalendarDiscardDialog({ message, confirmLabel = 'Discard changes', onKeep, onDiscard }: { message: string; confirmLabel?: string; onKeep: () => void; onDiscard: () => void }) {
  const titleId = useId(), descriptionId = useId(), keep = useRef<HTMLButtonElement>(null), opener = useRef(document.activeElement as HTMLElement | null);
  return <BaseDialog.Root open onOpenChange={open => { if (!open) onKeep(); }}>
    <BaseDialog.Portal><BaseDialog.Backdrop className="calendar-discard-backdrop" />
      <BaseDialog.Popup className="calendar-dialog calendar-discard-dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId} initialFocus={keep} finalFocus={() => {
        // If discarding closed the editor too, let that dialog restore focus.
        if (!opener.current?.isConnected) return false;
        return opener.current.matches(':disabled') ? opener.current.closest<HTMLElement>('[role=dialog]') : opener.current;
      }}>
        <h2 id={titleId}>Discard unsaved changes?</h2><p id={descriptionId}>{message}</p>
        <div className="calendar-form-actions"><Button ref={keep} type="button" variant="outlined" onClick={onKeep}>Keep editing</Button><Button type="button" onClick={onDiscard}>{confirmLabel}</Button></div>
      </BaseDialog.Popup>
    </BaseDialog.Portal>
  </BaseDialog.Root>;
}
