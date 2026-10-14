import type { ReactNode } from 'react';
import { Search, X } from 'lucide-react';
import { ReaderActionButton } from './reader-action-button';
import './sidebar-ui.css';

export function SidebarHeader({ title, actions }: { title: string; actions?: ReactNode }) {
    return <div className="reader-panel-header"><h2>{title}</h2><div className="reader-panel-actions">{actions}</div></div>;
}

export function SidebarSearch({ value, onChange, label }: { value: string; onChange: (value: string) => void; label: string }) {
    return <div className="reader-panel-search"><Search size={14} aria-hidden="true" /><input aria-label={label} placeholder={label} value={value} onChange={event => onChange(event.target.value)} />{value && <ReaderActionButton tooltip={`Clear ${label.toLowerCase()}`} className="reader-icon-button" onClick={() => onChange('')}><X size={13} /></ReaderActionButton>}</div>;
}

export function SidebarEmpty({ title, children }: { title: string; children?: ReactNode }) {
    return <div className="reader-panel-empty"><strong>{title}</strong>{children && <div>{children}</div>}</div>;
}
