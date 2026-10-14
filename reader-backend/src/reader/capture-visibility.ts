/** Central page visibility applies equally to HTTP, MCP and transactions.
 * Collection queries omit captures. Direct IDs can read unexpired captures.
 * Lifecycle services explicitly supply captureExpiresAt for inbox/purge queries.
 */
export function captureVisibilityWhere(where: Record<string, unknown> = {}, now = new Date()): Record<string, unknown> {
  if (Object.prototype.hasOwnProperty.call(where, 'captureExpiresAt')) return where;
  const direct = typeof where.id === 'string' || (typeof where.id === 'object' && where.id !== null);
  const visibility = direct
    ? { OR: [{ captureExpiresAt: null }, { captureExpiresAt: { gt: now } }] }
    : { captureExpiresAt: null };
  return { ...where, AND: [...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []), visibility] };
}
