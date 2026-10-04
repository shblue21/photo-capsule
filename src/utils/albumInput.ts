/**
 * `now` defaults to `Date.now()` so the server clock is always authoritative.
 * Callers (route handlers) rely on this default; tests pass an explicit value
 * to control time without mocking globals.
 */
export function validateAlbumInput(body: unknown, now = Date.now()) {
  if (!body || typeof body !== 'object') throw new Error('Please enter the album details.');
  const {title, description, revealAt} = body as Record<string, unknown>;
  if (typeof title !== 'string' || !title.trim() || title.trim().length > 100) throw new Error('The title must contain 1 to 100 characters.');
  if (description !== undefined && (typeof description !== 'string' || description.length > 500)) throw new Error('The description must be text of at most 500 characters.');
  const time = typeof revealAt === 'number' ? revealAt : typeof revealAt === 'string' ? Date.parse(revealAt) : NaN;
  if (!Number.isFinite(time) || time <= now || time > now + 366 * 86400000) throw new Error('Choose a future reveal time within 366 days.');
  return {title: title.trim(), description: typeof description === 'string' ? description.trim() : null, revealAtMs: time};
}
export function isRevealed(revealAt: number, now: number): boolean { return Number.isFinite(revealAt) && Number.isFinite(now) && now >= revealAt; }
