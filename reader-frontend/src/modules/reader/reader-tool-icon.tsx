const toolMarks = {
    contents: <>
        <path d="M4 6h16M5 10v8h4m-4-6h4" />
        <path d="M12 12h8m-8 6h6" />
    </>,
    subpages: <>
        <path d="M3.5 5.5v12h5M3.5 8h5" />
        <rect x="9" y="3.5" width="10" height="7.5" rx="1.5" />
        <rect x="9" y="14" width="12" height="7" rx="1.5" />
    </>,
    quizzes: <>
        <rect x="3.5" y="3" width="17" height="18" rx="2.5" />
        <path d="m6.5 8.5 1.6 1.6 3-3.4M14 8.5h3m-3 7h3" />
        <circle cx="8.6" cy="15.5" r="1.6" />
    </>,
    comments: <>
        <path d="M5 3.5h11a2 2 0 0 1 2 2V12a2 2 0 0 1-2 2H9l-5.5 4v-4.3A2 2 0 0 1 3 12V5.5a2 2 0 0 1 2-2Z" />
        <path d="M7 8.5h7M21 8.5v8a1.5 1.5 0 0 1-1.5 1.5v3l-5-3H10" />
    </>,
    vocabulary: <>
        <rect x="3" y="5" width="18" height="15" rx="2.5" />
        <path d="M14 5v7l2.3-1.6 2.2 1.6V5M6.5 16l2.4-6 2.4 6m-3.9-2h3" />
    </>,
    meaning: <>
        <circle cx="10" cy="10" r="7" />
        <path d="m15.3 15.3 5.2 5.2M7.4 12.8l2.6-6.1 2.6 6.1m-4.2-1.9h3.2" />
    </>,
    explanation: <>
        <path d="M8.5 16c0-1.5-.6-2.3-1.7-3.5a6.5 6.5 0 1 1 10.4 0c-1.1 1.2-1.7 2-1.7 3.5Z" />
        <path d="M9 19h6m-5 2.5h4M12 16v-5l-2-2m2 2 2-2" />
    </>,
    doubt: <>
        <path d="M12 3a8.5 8.5 0 0 1 0 17c-1.2 0-2.5-.2-3.5-.7L4 21l1-4.4A8.5 8.5 0 0 1 12 3Z" />
        <path d="M9.6 8.9a2.5 2.5 0 0 1 4.9.6c0 2-2.5 2.3-2.5 4" />
        <circle cx="12" cy="16" r="1" fill="currentColor" stroke="none" />
    </>,
    focus: <>
        <path d="M8 3.5H4v4m12-4h4v4m0 9v4h-4m-8 0H4v-4" />
        <path d="M8 9h8m-8 3h8m-8 3h5" />
    </>,
    'exit-focus': <>
        <rect x="3" y="4.5" width="18" height="15" rx="2.5" />
        <path d="M9 5v14M5.8 8h.7m-.7 3h.7m6.5-2h5m-5 3.5h3.5" />
    </>,
    parent: <path d="m9.5 4.5-6 5.5 6 5.5M4 10h11a4.5 4.5 0 0 1 4.5 4.5v4" />,
    previous: <path d="m14.5 5.5-6 6.5 6 6.5" />,
    next: <path d="m9.5 5.5 6 6.5-6 6.5" />,
    'reading-settings': <>
        <path d="m3.5 13 3.8-9 3.8 9m-6.3-3h5m4.2-3h6m-3 4h3M3.5 18h6m5 0h6" />
        <circle cx="12" cy="18" r="2.5" />
    </>,
    'copy-section': <>
        <path d="M5 14H3.5V4.5H16v2" />
        <rect x="7.5" y="8.5" width="13" height="11" rx="2" />
        <path d="M11 12.2h6m-6 3.6h4" />
    </>,
    'copy-page': <>
        <path d="M5.5 16.5H3.8V3.3H15v1.8" />
        <path d="M8 7h8l4 4v9.2H8zM15.5 7v4.5H20M11 15h6m-6 2.8h4" />
    </>,
    'text-smaller': <path d="m2.5 17 4.4-10 4.4 10m-7-3h5.2M15 12h6" />,
    'text-larger': <path d="m2 18 5-12.5L12 18m-8.3-3.7h6.6M15 12h6m-3-3v6" />,
    dictionary: <>
        <path d="M12 6.5C9.7 4.8 6.9 4.3 2.7 5.2v13c3.8-.8 6.4-.4 9.3 1.4 2.9-1.8 5.5-2.2 9.3-1.4v-13c-4.2-.9-7-.4-9.3 1.3Zm0 .2v12.5" />
        <path d="m5.2 13.4 1.7-4.8 1.8 5m-2.9-1.4h2.4m7-2.8 3.4-.3m-3.4 3.6 3.4-.3" strokeWidth="1.4" />
    </>,
    share: <>
        <path d="m2.8 10 18-7-6.6 18-3.8-6.9L2.8 10Z" />
        <path d="M10.4 14.1 20.8 3" />
    </>,
    inbox: <>
        <path d="m3 14.5 3.2-7h3M21 14.5l-3.2-7h-3M3 14.5v4.2c0 1 .6 1.5 1.5 1.5h15c.9 0 1.5-.5 1.5-1.5v-4.2h-5.4L14 17h-4l-1.6-2.5H3Z" />
        <path d="M12 3v8.3m-2.6-2.7 2.6 2.7 2.6-2.7" />
    </>,
    search: <>
        <circle cx="10.5" cy="10.5" r="6.6" />
        <path d="m15.5 15.5 5 5" />
    </>,
    break: <>
        <path d="M4 10h12v4.5a5.5 5.5 0 0 1-5.5 5.5h-1A5.5 5.5 0 0 1 4 14.5Zm12 1h1.5a2.8 2.8 0 1 1 0 5.6h-1.8M7 7c-1.8-2 1.8-2 0-4m5 4c-1.8-2 1.8-2 0-4" />
    </>,
    more: <g fill="currentColor" stroke="none">
        <circle cx="5" cy="12" r="1.7" /><circle cx="12" cy="12" r="1.7" /><circle cx="19" cy="12" r="1.7" />
    </g>,
};

export function ReaderToolIcon({ name, size = 18, className }: {
    name: keyof typeof toolMarks;
    size?: number;
    className?: string;
}) {
    return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"
        strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" className={className}>
        {toolMarks[name]}
    </svg>;
}
