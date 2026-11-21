import type { ReactNode } from 'react';

type IconProps = { size?: number };

function Tile({ size = 28, color, children }: IconProps & { color: string; children: ReactNode }) {
    return <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true" focusable="false">
        <rect width="40" height="40" rx="11" fill={color} />
        {children}
    </svg>;
}

export function ReaderIcon(props: IconProps) {
    return <Tile {...props} color="#FFE5D3">
        <path d="M6 11c5-1 10 0 14 3 4-3 9-4 14-3v19c-5-1-10 0-14 3-4-3-9-4-14-3z" fill="#983A23" />
        <path d="M8 9c5 0 9 1 12 4v17c-4-3-8-4-12-4z" fill="#E6804D" />
        <path d="M20 13c4-3 8-4 12-4v17c-4 0-8 1-12 4z" fill="#FFF8E8" />
        <path d="m25 10 4-1v11l-2-1-2 2z" fill="#BE4E2B" />
    </Tile>;
}

export function FinanceIcon(props: IconProps) {
    return <Tile {...props} color="#D9EEE6">
        <path d="M7 13 27 7l4 16-20 6z" fill="#307466" />
        <rect x="7" y="14" width="26" height="17" rx="3" fill="#205A52" />
        <path d="M8 15h23v4H8z" fill="#63A594" />
        <circle cx="28" cy="26" r="7" fill="#EDBB61" />
        <circle cx="28" cy="26" r="4.4" stroke="#946120" strokeWidth="1.6" />
    </Tile>;
}

export function TasksIcon(props: IconProps) {
    return <Tile {...props} color="#DCEAFF">
        <rect x="10" y="7" width="21" height="27" rx="3" fill="#386094" />
        <rect x="7" y="9" width="21" height="23" rx="3" fill="#FAFDFF" />
        <path d="M13 8h10" stroke="#24496F" strokeWidth="4" strokeLinecap="round" />
        <path d="m10.5 17 2 2 3.5-4m-5.5 10 2 2 3.5-4" stroke="#287B92" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M19 17h5m-5 8h5" stroke="#6587AA" strokeWidth="2" strokeLinecap="round" />
    </Tile>;
}

export function CalendarIcon(props: IconProps) {
    return <Tile {...props} color="#EBE4FB">
        <rect x="7" y="10" width="26" height="23" rx="4" fill="#70558D" />
        <rect x="7" y="9" width="26" height="22" rx="4" fill="#FFFCFF" />
        <path d="M7 13a4 4 0 0 1 4-4h18a4 4 0 0 1 4 4v3H7z" fill="#8A68AB" />
        <path d="M14 7v5m12-5v5" stroke="#45345A" strokeWidth="3" strokeLinecap="round" />
        <path d="M12 20h4m3 0h4m-11 5h4" stroke="#C2AFD3" strokeWidth="2.5" />
        <circle cx="26" cy="25" r="3.4" fill="#9166B8" />
    </Tile>;
}

export function HabitsIcon(props: IconProps) {
    return <Tile {...props} color="#E6EBCB">
        <path d="M20 25V14" stroke="#3C643E" strokeWidth="2.5" />
        <path d="M20 17C19 9 24 6 31 6c0 7-4 12-11 11Z" fill="#38704B" />
        <path d="M20 21C12 22 8 16 8 11c7 0 12 3 12 10Z" fill="#84A35B" />
        <path d="M12 24h16l-3 9H15z" fill="#AA5B37" />
        <rect x="11" y="22" width="18" height="4" rx="1.5" fill="#DB8757" />
    </Tile>;
}

export function VocabularyIcon(props: IconProps) {
    return <Tile {...props} color="#F9E7BF">
        <rect x="7" y="9" width="24" height="20" rx="3" transform="rotate(-12 19 19)" fill="#B77836" />
        <rect x="10" y="13" width="24" height="19" rx="3" fill="#855023" />
        <rect x="10" y="12" width="24" height="18" rx="3" fill="#FFF9E8" />
        <path d="m13.5 25.5 4.2-9 4.2 9m-6.8-3.2h5.2" stroke="#844523" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M25 19h5m-5 4h3.5" stroke="#B48048" strokeWidth="2" strokeLinecap="round" />
    </Tile>;
}

export function SettingsIcon(props: IconProps) {
    return <Tile {...props} color="#E1E8F0">
        <path d="M17.5 6h5l.8 3.8 2.1.9 3.2-2.1 3.5 3.5-2.1 3.2.9 2.1 3.6.7v5l-3.6.7-.9 2.1 2.1 3.2-3.5 3.5-3.2-2.1-2.1.9-.8 3.6h-5l-.8-3.6-2.1-.9-3.2 2.1-3.5-3.5 2.1-3.2-.9-2.1-3.6-.7v-5l3.6-.7.9-2.1-2.1-3.2 3.5-3.5 3.2 2.1 2.1-.9z" fill="#49617B" />
        <circle cx="20" cy="20.5" r="8.2" fill="#96AFC5" />
        <circle cx="20" cy="20.5" r="5.3" fill="#FAFCFD" />
        <path d="m20 20.5 2.7-3" stroke="#40566A" strokeWidth="2.3" strokeLinecap="round" />
    </Tile>;
}

export function HomeIcon(props: IconProps) {
    return <Tile {...props} color="#E5E9F0">
        <path d="M9 18 20 9l11 9v13H9z" fill="#536680" />
        <path d="m7 18 13-11 13 11-2 3-11-9-11 9z" fill="#293D58" />
        <path d="M17 32v-9h6v9z" fill="#F9DBA6" />
    </Tile>;
}

export function LauncherIcon({ size = 18 }: IconProps) {
    return <svg width={size} height={size} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <rect x="2" y="2" width="7" height="7" rx="2.2" />
        <circle cx="14.5" cy="5.5" r="3.5" fill="#E77D50" />
        <rect x="2" y="11" width="7" height="7" rx="2.2" />
        <rect x="11" y="11" width="7" height="7" rx="2.2" />
    </svg>;
}
