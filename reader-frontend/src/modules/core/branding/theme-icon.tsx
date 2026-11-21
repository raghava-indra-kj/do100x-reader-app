import { Theme } from '@modules/core/theme/theme';

export function ThemeIcon({ theme }: { theme: Theme }) {
    return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0">
        {theme === Theme.LIGHT ? <>
            <circle cx="12" cy="12" r="11" fill="#FBE7BD" />
            <circle cx="12" cy="12" r="4.5" fill="#C67922" />
            <path d="M12 4v2m0 12v2M4 12h2m12 0h2M6.3 6.3l1.4 1.4m8.6 8.6 1.4 1.4m0-11.4-1.4 1.4m-8.6 8.6-1.4 1.4" stroke="#94551A" strokeWidth="1.4" strokeLinecap="round" />
        </> : theme === Theme.DARK ? <>
            <circle cx="12" cy="12" r="11" fill="#303751" />
            <path d="M14 5a7.4 7.4 0 1 0 5 10A7.8 7.8 0 0 1 14 5Z" fill="#F7E7BE" />
            <circle cx="17" cy="7" r="1.3" fill="#D9BB89" />
        </> : <>
            <circle cx="12" cy="12" r="11" fill="#21483D" />
            <circle cx="16" cy="8" r="3" fill="#E7D597" />
            <path d="m9 5-5 10h3l-2 4h9l-2-4h2z" fill="#A7C898" />
        </>}
    </svg>;
}
