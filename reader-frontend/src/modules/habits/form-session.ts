import { useEffect, useRef, useState } from 'react';

/** One operation at a time, including clicks before React has rendered busy. */
export function useHabitFormSession() {
  const [busy, setBusy] = useState(false);
  const active = useRef(true), locked = useRef(false), generation = useRef(0);
  useEffect(() => {
    active.current = true;
    return () => { active.current = false; generation.current++; };
  }, []);
  return {
    busy,
    locked,
    begin() {
      if (!active.current || locked.current) return null;
      locked.current = true; setBusy(true);
      return ++generation.current;
    },
    current(token: number) { return active.current && generation.current === token; },
    finish(token: number) {
      if (!active.current || generation.current !== token) return;
      locked.current = false; setBusy(false);
    },
    close(action: () => void) {
      if (!active.current || locked.current) return;
      active.current = false; generation.current++; action();
    },
  };
}

export const sameDraft = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);
