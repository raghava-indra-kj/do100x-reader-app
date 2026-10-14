import { useId, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from '@modules/core/ui/primitives/button';
import { Dialog } from '@modules/core/ui/primitives/dialog';
import { Select } from '@modules/core/ui/primitives/select';
export function IconButton({ label, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) { return <Button type="button" size="sm" variant="ghost" iconOnly tooltip={label} aria-label={label} {...props}>{children}</Button>; }
export function CalendarSelect({ label, value, items, onChange, disabled }: { label: string; value: string; items: Record<string, ReactNode>; onChange: (value: string) => void; disabled?: boolean }) { return <Select ariaLabel={label} tooltip={label} value={value} items={items} disabled={disabled} onValueChange={value => { if (value !== null) onChange(value); }} className="calendar-select" />; }
export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) { return <label className="calendar-field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>; }
export function CalendarDialog({ title, children, onClose, busy = false }: { title: string; children: ReactNode; onClose: () => void; busy?: boolean }) { const id = useId(); return <Dialog open onOpenChange={open => { if (!open && !busy) onClose(); }} labelledBy={id} className="calendar-dialog"><header><h2 id={id}>{title}</h2><IconButton label="Close dialog" onClick={onClose} disabled={busy}><X size={18} /></IconButton></header>{children}</Dialog>; }
