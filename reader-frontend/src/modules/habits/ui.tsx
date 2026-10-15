import { useId, useRef, type ButtonHTMLAttributes, type ReactNode, type RefObject } from 'react';
import { BookOpen, Brain, Coffee, Dumbbell, Footprints, Heart, Moon, Music, PenLine, Sprout, Sun, Droplets, X } from 'lucide-react';
import { Button } from '@modules/core/ui/primitives/button';
import { BaseDialog } from '@modules/core/ui/primitives/dialog';
import { Select } from '@modules/core/ui/primitives/select';
import './habits-forms.css';

const icons = { sprout: Sprout, book: BookOpen, water: Droplets, walk: Footprints, moon: Moon, sun: Sun, heart: Heart, brain: Brain, pen: PenLine, dumbbell: Dumbbell, coffee: Coffee, music: Music };
export function HabitIcon({ name, size = 20 }: { name: string; size?: number }) { const Icon = icons[name as keyof typeof icons] ?? Sprout; return <Icon size={size} aria-hidden="true" />; }
export function IconButton({ label, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return <Button type="button" size="sm" variant="ghost" iconOnly tooltip={label} aria-label={label} {...props}>{children}</Button>;
}
export function HabitSelect({ label, value, items, onChange, disabled }: { label: string; value: string; items: Record<string, ReactNode>; onChange: (value: string) => void; disabled?: boolean }) {
  return <Select ariaLabel={label} tooltip={label} value={value} items={items} disabled={disabled} onValueChange={value => { if (value !== null) onChange(value); }} className="habits-select" popupClassName="habits-select-popup" />;
}
export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) { return <label className="habit-field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>; }
export function HabitDialog({ title, children, onClose, busy = false, wide = false, formLayout = false }: { title: string; children: ReactNode; onClose: () => void; busy?: boolean; wide?: boolean; formLayout?: boolean }) {
  const titleId = useId(), opener = useRef(document.activeElement as HTMLElement | null);
  return <BaseDialog.Root open onOpenChange={open => { if (!open && !busy) onClose(); }}>
    <BaseDialog.Portal><BaseDialog.Backdrop forceRender className="fixed inset-0 z-40 bg-(--navy-800)/42 animate-fade-in" />
      <BaseDialog.Popup aria-modal="true" aria-labelledby={titleId} finalFocus={() => {
        const enabled = (element: HTMLElement) => !element.matches(':disabled') && !element.closest('[hidden],[data-closed]');
        // An open parent is still aria-hidden while the child tears down. Base
        // Dialog removes that isolation before moving focus to this target.
        // Prioritize that parent explicitly, never a background main control.
        for (const selector of ['.habit-detail[role=dialog]:not([data-closed])', '.calendar-planning-dialog:not([data-closed])']) {
          const drawer = document.querySelector<HTMLElement>(selector);
          if (!drawer || drawer.closest('[hidden]')) continue;
          if (opener.current?.isConnected && drawer.contains(opener.current) && enabled(opener.current)) return opener.current;
          const target = [...drawer.querySelectorAll<HTMLElement>('button,input')].find(enabled);
          if (target) return target;
        }
        const available = (element: HTMLElement) => enabled(element) && !element.closest('[inert],[aria-hidden="true"]');
        if (opener.current?.isConnected && opener.current !== document.body && available(opener.current)) return opener.current;
        for (const selector of ['.habits-main', '.calendar-main']) {
          const target = [...document.querySelectorAll<HTMLElement>(`${selector} button,${selector} input`)].find(available);
          if (target) return target;
        }
        return true;
      }} className={`fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg bg-(--color-surface-raised) rounded-xl p-8 shadow-lg habit-dialog ${wide ? 'habit-dialog-wide' : ''} ${formLayout ? 'habit-form-dialog' : ''}`}>
        <div className="habit-dialog-heading"><h2 id={titleId}>{title}</h2><IconButton label="Close dialog" disabled={busy} onClick={onClose}><X size={18} /></IconButton></div>{children}
      </BaseDialog.Popup>
    </BaseDialog.Portal>
  </BaseDialog.Root>;
}

export type HabitFormConfirmation = { title: string; message: string; confirmLabel: string; action: () => void };
export function HabitConfirmDialog({ confirmation, onKeep, returnFocus }: { confirmation: HabitFormConfirmation; onKeep: () => void; returnFocus?: RefObject<HTMLElement | null> }) {
  const titleId = useId(), descriptionId = useId(), keep = useRef<HTMLButtonElement>(null), opener = useRef(document.activeElement as HTMLElement | null);
  return <BaseDialog.Root open onOpenChange={open => { if (!open) onKeep(); }}>
    <BaseDialog.Portal><BaseDialog.Backdrop forceRender className="habit-form-confirm-backdrop" />
      <BaseDialog.Popup className="habit-form-confirm" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId} initialFocus={keep} finalFocus={() => {
        const target = returnFocus?.current?.isConnected ? returnFocus.current : opener.current;
        if (!target?.isConnected) return false;
        return target.matches(':disabled') ? target.closest<HTMLElement>('[role=dialog]') : target;
      }}>
        <h2 id={titleId}>{confirmation.title}</h2><p id={descriptionId}>{confirmation.message}</p>
        <div><Button ref={keep} variant="outlined" onClick={onKeep}>Keep editing</Button><Button onClick={confirmation.action}>{confirmation.confirmLabel}</Button></div>
      </BaseDialog.Popup>
    </BaseDialog.Portal>
  </BaseDialog.Root>;
}
export function Empty({ title, children }: { title: string; children: ReactNode }) { return <div className="habits-empty"><Sprout size={28} /><h2>{title}</h2>{children}</div>; }
export const formatDay = (date: string, options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }) => new Intl.DateTimeFormat(undefined, { ...options, timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`));
