import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { BookOpen, Brain, Coffee, Dumbbell, Footprints, Heart, Moon, Music, PenLine, Sprout, Sun, Droplets, X } from 'lucide-react';
import { Button } from '@modules/core/ui/primitives/button';
import { Dialog } from '@modules/core/ui/primitives/dialog';
import { Select } from '@modules/core/ui/primitives/select';

const icons = { sprout: Sprout, book: BookOpen, water: Droplets, walk: Footprints, moon: Moon, sun: Sun, heart: Heart, brain: Brain, pen: PenLine, dumbbell: Dumbbell, coffee: Coffee, music: Music };
export function HabitIcon({ name, size = 20 }: { name: string; size?: number }) { const Icon = icons[name as keyof typeof icons] ?? Sprout; return <Icon size={size} aria-hidden="true" />; }
export function IconButton({ label, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return <Button type="button" size="sm" variant="ghost" iconOnly tooltip={label} aria-label={label} {...props}>{children}</Button>;
}
export function HabitSelect({ label, value, items, onChange, disabled }: { label: string; value: string; items: Record<string, ReactNode>; onChange: (value: string) => void; disabled?: boolean }) {
  return <Select ariaLabel={label} tooltip={label} value={value} items={items} disabled={disabled} onValueChange={value => { if (value !== null) onChange(value); }} className="habits-select" popupClassName="habits-select-popup" />;
}
export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) { return <label className="habit-field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>; }
export function HabitDialog({ title, children, onClose, busy = false, wide = false }: { title: string; children: ReactNode; onClose: () => void; busy?: boolean; wide?: boolean }) {
  return <Dialog open onOpenChange={open => { if (!open && !busy) onClose(); }} labelledBy="habit-dialog-title" className={`habit-dialog ${wide ? 'habit-dialog-wide' : ''}`}>
    <div className="habit-dialog-heading"><h2 id="habit-dialog-title">{title}</h2><IconButton label="Close dialog" disabled={busy} onClick={onClose}><X size={18} /></IconButton></div>{children}
  </Dialog>;
}
export function Empty({ title, children }: { title: string; children: ReactNode }) { return <div className="habits-empty"><Sprout size={28} /><h2>{title}</h2>{children}</div>; }
export const formatDay = (date: string, options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }) => new Intl.DateTimeFormat(undefined, { ...options, timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`));
