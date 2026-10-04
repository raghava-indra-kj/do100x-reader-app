import { useEffect, useState } from 'react';
import { searchPages } from '@domain/page/services/pages-service';
import type { PageSearchResponse } from '@domain/page/models/page-search';

export function usePageSearch(query: string) {
    const [attempt, setAttempt] = useState(0);
    const [state, setState] = useState<{ query: string; data: PageSearchResponse | null; error: string | null; loading: boolean }>({ query, data: null, error: null, loading: true });
    useEffect(() => {
        const controller = new AbortController();
        setState({ query, data: null, error: null, loading: true });
        const timer = window.setTimeout(() => {
            void searchPages({ q: query.trim(), signal: controller.signal }).then(result => {
                if (controller.signal.aborted) return;
                setState({ query, data: result.ok ? result.data : null, error: result.ok ? null : result.error.message, loading: false });
            });
        }, query.trim() ? 200 : 0);
        return () => { window.clearTimeout(timer); controller.abort(); };
    }, [query, attempt]);
    // Do not expose the preceding query's results, even before effect cleanup runs.
    return { ...(state.query === query ? state : { data: null, error: null, loading: true }), retry: () => setAttempt(value => value + 1) };
}
