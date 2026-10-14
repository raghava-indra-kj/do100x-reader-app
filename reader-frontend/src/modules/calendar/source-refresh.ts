/** A failed or removed feed must not prevent unrelated calendars from refreshing. */
export async function refreshSources(
  ids: string[],
  refresh: (id: string) => Promise<{ error: string | null }>,
  stopped: () => boolean,
) {
  let failures = 0;
  for (const id of ids) {
    if (stopped()) break;
    try { if ((await refresh(id)).error) failures++; }
    catch { failures++; }
  }
  return failures;
}
