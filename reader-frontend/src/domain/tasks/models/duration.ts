/** Keep saved time precise, including sessions shorter than one minute. */
export function formatTrackedDuration(value: number): string {
  const total = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return (
    [hours && `${hours}h`, minutes && `${minutes}m`, seconds && `${seconds}s`]
      .filter(Boolean)
      .join(" ") || "0s"
  );
}
