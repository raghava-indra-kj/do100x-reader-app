import { useEffect, useState } from 'react';

export function useViewport(query: string | null) {
    const [matches, setMatches] = useState(() =>
        Boolean(query && typeof window !== 'undefined' && window.matchMedia?.(query).matches));
    useEffect(() => {
        if (!query || typeof window.matchMedia !== 'function') return;
        const media = window.matchMedia(query);
        const update = () => setMatches(media.matches);
        update();
        media.addEventListener('change', update);
        return () => media.removeEventListener('change', update);
    }, [query]);
    return matches;
}
