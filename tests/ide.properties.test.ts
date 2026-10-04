/**
 * IDE Property-Based Testing Lesson — Photo Capsule
 *
 * Functions under test:
 *   isRevealed(revealAt, now)  — src/utils/albumInput.ts
 *   validateAlbumInput(body, now) — src/utils/albumInput.ts
 *
 * Properties are derived explicitly from requirements.md and the source
 * implementation. The requirement-to-property mapping is recorded in
 * docs/ide-pbt-evidence.md.
 *
 * Tooling: fast-check, Jest and ts-jest (versions pinned in package.json)
 */

import * as fc from 'fast-check';
import { isRevealed, validateAlbumInput } from '../src/utils/albumInput';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/** 366 days in milliseconds — the upper bound enforced by validateAlbumInput */
const MAX_OFFSET_MS = 366 * 24 * 60 * 60 * 1000;

/**
 * A fixed "now" used across all property runs so that fc.integer offsets
 * remain well-defined and reproducible. Using a concrete epoch avoids
 * reliance on the real wall clock inside property assertions.
 */
const FIXED_NOW = 1_700_000_000_000; // 2023-11-14T22:13:20Z — a stable epoch

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns a fast-check arbitrary for a valid album title:
 * 1–100 printable non-whitespace-only characters (Korean or ASCII).
 * We use fc.string with minLength 1 and pad with a guaranteed non-space
 * prefix so the trimmed result is always non-empty.
 * (fc.string can generate whitespace-only strings; the prefix prevents that.)
 */
const validTitleArb = fc
  .tuple(
    fc.string({ minLength: 1, maxLength: 1 }).filter(c => c.trim().length > 0),
    fc.string({ minLength: 0, maxLength: 98 }),
  )
  .map(([prefix, rest]) => prefix + rest)
  .filter(s => s.trim().length >= 1 && s.trim().length <= 100);

/**
 * Arbitrary for a revealAt offset strictly inside the valid window:
 * 1 ms after now … MAX_OFFSET_MS ms after now (inclusive).
 */
const validOffsetArb = fc.integer({ min: 1, max: MAX_OFFSET_MS });

// ─────────────────────────────────────────────────────────────────────────────
// Suite 1 — isRevealed
// ─────────────────────────────────────────────────────────────────────────────

describe('isRevealed — property-based tests', () => {

  // ── P-IR-1: Exact boundary (now === revealAt → revealed) ─────────────────
  // Derived from FR-14: "locked until Date.now() >= revealAt"
  // The >= makes the exact boundary a revealed state, not a locked one.
  test('P-IR-1 boundary: isRevealed(t, t) is true for any finite integer t', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -1e13, max: 1e13 }),
        (t) => {
          return isRevealed(t, t) === true;
        },
      ),
      { numRuns: 1000 },
    );
  });

  // ── P-IR-2: One millisecond before boundary → still locked ───────────────
  // Derived from FR-14: strict "locked until … >= revealAt" means now < revealAt
  // must return false. One-ms granularity reflects the ms-epoch representation
  // used throughout the codebase (reveal_at is an INTEGER of Unix ms).
  test('P-IR-2 boundary: isRevealed(t, t-1) is false for any finite integer t', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -1e13 + 1, max: 1e13 }),
        (t) => {
          return isRevealed(t, t - 1) === false;
        },
      ),
      { numRuns: 1000 },
    );
  });

  // ── P-IR-3: Monotonicity for nondecreasing supplied time ────────────────
  // With revealAt fixed, if now >= revealAt holds, then (now + delta) >=
  // revealAt also holds for non-negative delta within this finite domain.
  // This checks the pure function, not production-clock monotonicity or
  // a durable reveal latch across requests or process restarts.
  test('P-IR-3 monotonicity: if isRevealed(t, now) then isRevealed(t, now+delta) for delta >= 0', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1e12 }),          // revealAt
        fc.integer({ min: 0, max: 1e12 }),          // now  >= revealAt (delta from revealAt)
        fc.integer({ min: 0, max: 1e12 }),          // extra delta
        (revealAt, nowDelta, extraDelta) => {
          const now = revealAt + nowDelta;          // guaranteed now >= revealAt
          const later = now + extraDelta;
          // Pre-condition: must be revealed at `now`
          if (!isRevealed(revealAt, now)) return true; // skip (shouldn't happen given construction)
          return isRevealed(revealAt, later) === true;
        },
      ),
      { numRuns: 1000 },
    );
  });

  // ── P-IR-4: Non-finite inputs always return false ────────────────────────
  // Derived from the implementation guard: "Number.isFinite(revealAt) &&
  // Number.isFinite(now)". NaN, ±Infinity are not valid epoch values.
  // FR-15 requires the server clock to be authoritative — non-numeric clocks
  // must not accidentally unlock albums.
  test('P-IR-4 invalid numbers: NaN or ±Infinity in either argument → false', () => {
    const nonFinite = fc.oneof(
      fc.constant(NaN),
      fc.constant(Infinity),
      fc.constant(-Infinity),
    );
    const finite = fc.integer({ min: -1e13, max: 1e13 });

    // NaN revealAt
    fc.assert(
      fc.property(finite, (now) => isRevealed(NaN, now) === false),
      { numRuns: 200 },
    );

    // NaN now
    fc.assert(
      fc.property(finite, (revealAt) => isRevealed(revealAt, NaN) === false),
      { numRuns: 200 },
    );

    // Infinity revealAt (album would never be revealed — must return false
    // for any finite now since Infinity > any finite number)
    fc.assert(
      fc.property(finite, (now) => isRevealed(Infinity, now) === false),
      { numRuns: 200 },
    );

    // -Infinity revealAt (already "in the past" but is non-finite — must
    // return false per the isFinite guard regardless of direction)
    fc.assert(
      fc.property(finite, (now) => isRevealed(-Infinity, now) === false),
      { numRuns: 200 },
    );

    // Both non-finite
    fc.assert(
      fc.property(nonFinite, nonFinite, (r, n) => isRevealed(r, n) === false),
      { numRuns: 400 },
    );
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 2 — validateAlbumInput
// ─────────────────────────────────────────────────────────────────────────────

describe('validateAlbumInput — property-based tests', () => {

  // ── P-VA-1: Valid inputs always succeed ──────────────────────────────────
  // Derived from FR-01: title 1–100 chars, revealAt future UTC.
  // The 366-day upper bound is from the source implementation.
  // This property confirms the "happy path" for all combinations the spec
  // allows — no valid input should be erroneously rejected.
  test('P-VA-1 valid inputs: finite revealAt in (now, now+366d] with valid title never throws', () => {
    fc.assert(
      fc.property(
        validTitleArb,
        validOffsetArb,
        (title, offsetMs) => {
          const revealAt = FIXED_NOW + offsetMs;
          expect(() =>
            validateAlbumInput({ title, revealAt }, FIXED_NOW),
          ).not.toThrow();
        },
      ),
      { numRuns: 500 },
    );
  });

  // ── P-VA-2: revealAt <= now always throws ────────────────────────────────
  // Derived from FR-01: revealAt must be a *future* UTC datetime.
  // "Now" itself is not future; any past value is also invalid.
  test('P-VA-2 past revealAt: revealAt <= now always throws', () => {
    fc.assert(
      fc.property(
        validTitleArb,
        fc.integer({ min: 0, max: 1e12 }),   // non-negative offset into the past
        (title, pastOffset) => {
          const revealAt = FIXED_NOW - pastOffset; // now - delta  ≤  now
          expect(() =>
            validateAlbumInput({ title, revealAt }, FIXED_NOW),
          ).toThrow();
        },
      ),
      { numRuns: 500 },
    );
  });

  // ── P-VA-3: revealAt > now + 366 days always throws ──────────────────────
  // Derived from the validateAlbumInput guard:
  //   time > now + 366 * 86400000  → throws
  // FR-01 limits the reveal time to 366 days from creation.
  test('P-VA-3 revealAt beyond 366 days: always throws', () => {
    fc.assert(
      fc.property(
        validTitleArb,
        fc.integer({ min: 1, max: 1e10 }),   // how many ms beyond the limit
        (title, excess) => {
          const revealAt = FIXED_NOW + MAX_OFFSET_MS + excess;
          expect(() =>
            validateAlbumInput({ title, revealAt }, FIXED_NOW),
          ).toThrow();
        },
      ),
      { numRuns: 500 },
    );
  });

  // ── P-VA-4: Whitespace-only title always throws ──────────────────────────
  // Derived from FR-01: title must be 1–100 *chars* — the implementation
  // uses `title.trim()` to check emptiness, so a string of only spaces,
  // tabs or newlines is treated as empty and rejected.
  test('P-VA-4 whitespace-only title: always throws', () => {
    // Arbitrarily build a string of 1..100 space/tab characters
    const whitespaceOnlyArb = fc
      .array(fc.oneof(fc.constant(' '), fc.constant('\t'), fc.constant('\n')), {
        minLength: 1,
        maxLength: 100,
      })
      .map(chars => chars.join(''));

    fc.assert(
      fc.property(
        whitespaceOnlyArb,
        validOffsetArb,
        (title, offsetMs) => {
          const revealAt = FIXED_NOW + offsetMs;
          expect(() =>
            validateAlbumInput({ title, revealAt }, FIXED_NOW),
          ).toThrow();
        },
      ),
      { numRuns: 300 },
    );
  });

  // ── P-VA-5: title.trim().length > 100 always throws ─────────────────────
  // Derived from FR-01: title max 100 chars.
  // We generate a title whose trimmed length is in 101–200 to ensure the
  // guard `title.trim().length > 100` fires regardless of leading/trailing
  // whitespace.
  test('P-VA-5 title too long (trimmed length > 100): always throws', () => {
    const longTitleArb = fc
      .tuple(
        // non-space character to ensure the trimmed string is non-empty
        fc.string({ minLength: 101, maxLength: 200 }).filter(
          s => s.trim().length > 100,
        ),
      )
      .map(([s]) => s);

    fc.assert(
      fc.property(
        longTitleArb,
        validOffsetArb,
        (title, offsetMs) => {
          const revealAt = FIXED_NOW + offsetMs;
          expect(() =>
            validateAlbumInput({ title, revealAt }, FIXED_NOW),
          ).toThrow();
        },
      ),
      { numRuns: 300 },
    );
  });

  // ── P-VA-6: Returned title is always the trimmed version ─────────────────
  // Derived from FR-01 (title stored canonically) and the implementation:
  //   return { title: title.trim(), … }
  // This property ensures no leading/trailing whitespace leaks into the
  // stored value regardless of what the caller submits.
  test('P-VA-6 returned title equals title.trim()', () => {
    // Titles with optional leading/trailing spaces but non-empty trimmed core
    const titleWithSpacesArb = fc
      .tuple(
        fc.string({ minLength: 0, maxLength: 10 }).map(s => s.replace(/\S/g, ' ')), // leading spaces
        fc.string({ minLength: 1, maxLength: 80 }).filter(s => s.trim().length >= 1),
        fc.string({ minLength: 0, maxLength: 10 }).map(s => s.replace(/\S/g, ' ')), // trailing spaces
      )
      .map(([lead, core, trail]) => lead + core + trail)
      .filter(s => s.trim().length >= 1 && s.trim().length <= 100);

    fc.assert(
      fc.property(
        titleWithSpacesArb,
        validOffsetArb,
        (title, offsetMs) => {
          const revealAt = FIXED_NOW + offsetMs;
          const result = validateAlbumInput({ title, revealAt }, FIXED_NOW);
          expect(result.title).toBe(title.trim());
        },
      ),
      { numRuns: 500 },
    );
  });

  // ── P-VA-7: description > 500 chars always throws ────────────────────────
  // Derived from FR-01: description optional, ≤500 chars.
  // Any string longer than 500 characters must be rejected.
  test('P-VA-7 description > 500 chars: always throws', () => {
    const longDescArb = fc.string({ minLength: 501, maxLength: 1000 });

    fc.assert(
      fc.property(
        validTitleArb,
        validOffsetArb,
        longDescArb,
        (title, offsetMs, description) => {
          const revealAt = FIXED_NOW + offsetMs;
          expect(() =>
            validateAlbumInput({ title, revealAt, description }, FIXED_NOW),
          ).toThrow();
        },
      ),
      { numRuns: 300 },
    );
  });

});
