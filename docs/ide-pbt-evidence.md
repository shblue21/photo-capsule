# IDE Property-Based Testing Evidence

**Lesson:** Property-Based Testing with fast-check in the Kiro IDE
**Date:** 2026-10-03
**Test file:** `tests/ide.properties.test.ts`
**Functions under test:** `isRevealed`, `validateAlbumInput` — `src/utils/albumInput.ts`
**Tooling:** fast-check 4.10.2 · Jest 29.7.0 · ts-jest 29.1.4 · IDE-selected Node executable (version not captured in that run)

---

## Actual Test Run Output

Historical command executed (the `data/evidence/` destination was local to that session):

```
CI=true node node_modules/jest/bin/jest.js tests/ide.properties.test.ts --runInBand --forceExit > data/evidence/ide-pbt.txt 2>&1
```

Committed captured output: [ide-pbt-output.txt](ide-pbt-output.txt), copied from the historical local path `data/evidence/ide-pbt.txt`:

```
ts-jest[ts-jest-transformer] (WARN) Define `ts-jest` config under `globals` is deprecated. Please do
transform: {
    <transform_regex>: ['ts-jest', { /* ts-jest config goes here in Jest */ }],
},
PASS tests/ide.properties.test.ts
  isRevealed — property-based tests
    ✓ P-IR-1 boundary: isRevealed(t, t) is true for any finite integer t (4 ms)
    ✓ P-IR-2 boundary: isRevealed(t, t-1) is false for any finite integer t (2 ms)
    ✓ P-IR-3 monotonicity: if isRevealed(t, now) then isRevealed(t, now+delta) for delta >= 0 (2 ms)
    ✓ P-IR-4 invalid numbers: NaN or ±Infinity in either argument → false (2 ms)
  validateAlbumInput — property-based tests
    ✓ P-VA-1 valid inputs: finite revealAt in (now, now+366d] with valid title never throws (22 ms)
    ✓ P-VA-2 past revealAt: revealAt <= now always throws (92 ms)
    ✓ P-VA-3 revealAt beyond 366 days: always throws (66 ms)
    ✓ P-VA-4 whitespace-only title: always throws (34 ms)
    ✓ P-VA-5 title too long (trimmed length > 100): always throws (40 ms)
    ✓ P-VA-6 returned title equals title.trim() (13 ms)
    ✓ P-VA-7 description > 500 chars: always throws (61 ms)

Test Suites: 1 passed, 1 total
Tests:       11 passed, 11 total
Snapshots:   0 total
Time:        0.938 s, estimated 2 s
Ran all test suites matching /tests\/ide.properties.test.ts/i.
Force exiting Jest: Have you considered using `--detectOpenHandles` to detect async operations that kept running after all tests finished?
```

**Result: 11/11 passed.**

---

## Requirement → Property Mapping

### `isRevealed(revealAt: number, now: number): boolean`

Source behaviour (read from `src/utils/albumInput.ts`):
```typescript
return Number.isFinite(revealAt) && Number.isFinite(now) && now >= revealAt;
```

| Property ID | Property description | Requirement | Derivation rationale | Runs |
|-------------|----------------------|-------------|----------------------|------|
| P-IR-1 | `isRevealed(t, t) === true` for any finite integer `t` | FR-14 | The condition is `now >= revealAt`; equality satisfies `>=`, so the exact reveal instant is a revealed state, not a locked one. Confirmed by the `>=` in the source. | 1000 |
| P-IR-2 | `isRevealed(t, t-1) === false` for any finite integer `t` | FR-14 | One millisecond before the boundary: `t-1 < t` fails `>=`. The ms-epoch integer representation used throughout the codebase makes 1 ms the smallest meaningful granularity. | 1000 |
| P-IR-3 | If `isRevealed(t, now)` then `isRevealed(t, now+δ)` for all δ ≥ 0 | FR-14, FR-15 | `isRevealed` is a pure function. This property checks that its output is monotonically non-decreasing as finite `now` increases with `revealAt` held constant, within the generated integer domain. It does not verify that production callers supply monotonically increasing time, or that a revealed state persists across process restarts or concurrent requests. | 1000 |
| P-IR-4 | `NaN` or `±Infinity` in either argument always returns `false` | FR-15 | FR-15 forbids client-clock overrides; non-finite values are not valid epoch timestamps. The `Number.isFinite` guard in the implementation blocks them. A non-finite `revealAt` must never accidentally unlock an album. | 200–400 per sub-case |

---

### `validateAlbumInput(body: unknown, now?: number)`

Source constraints (read from `src/utils/albumInput.ts`):
- `title.trim()` must be 1–100 characters
- `description` (if present) must be ≤ 500 characters
- `revealAt` must be finite, `> now`, and `<= now + 366 * 86_400_000`
- Returns `{ title: title.trim(), description: description?.trim() ?? null, revealAtMs }`

| Property ID | Property description | Requirement | Derivation rationale | Runs |
|-------------|----------------------|-------------|----------------------|------|
| P-VA-1 | Any title (trimmed 1–100 chars) + `revealAt` in `(now, now+366d]` never throws | FR-01 | Confirms no valid input is erroneously rejected. Exercises the entire valid domain simultaneously — the classic PBT "happy path roundtrip" property. | 500 |
| P-VA-2 | `revealAt <= now` always throws | FR-01 | FR-01 requires a *future* UTC reveal datetime. "Now" is not future; any past value is also invalid. Covers both `revealAt === now` and `revealAt < now`. | 500 |
| P-VA-3 | `revealAt > now + 366 days` always throws | FR-01 (impl.) | The 366-day ceiling is enforced in the source: `time > now + 366 * 86400000`. Every value exceeding this by even 1 ms must be rejected. | 500 |
| P-VA-4 | Whitespace-only title (spaces, tabs, newlines) always throws | FR-01 | FR-01 specifies title 1–100 *chars*; the implementation uses `title.trim()` to test emptiness. A string of only whitespace trims to `""` and must be rejected. | 300 |
| P-VA-5 | Title whose trimmed length > 100 always throws | FR-01 | FR-01 upper bound is 100 chars. Generated titles have trimmed length 101–200 to ensure the guard fires regardless of any surrounding whitespace. | 300 |
| P-VA-6 | `result.title === title.trim()` for all accepted inputs | FR-01 | The stored title must be the canonical trimmed form. Titles with leading/trailing spaces are accepted but must not leak whitespace into the return value. | 500 |
| P-VA-7 | `description` with length > 500 always throws | FR-01 | FR-01 caps description at 500 chars. Any string of length 501–1000 must be rejected unconditionally. | 300 |

---

## Design Decisions

**Fixed `now` epoch (`FIXED_NOW = 1_700_000_000_000`):** All properties use a stable constant rather than `Date.now()` so that offset arithmetic inside arbitraries is deterministic and reproducible across runs regardless of wall-clock time.

**`validTitleArb` construction:** `fc.string` in fast-check 4.x can generate whitespace-only strings. The arbitrary uses a guaranteed non-space prefix character filtered to ensure `trim().length >= 1`, preventing P-VA-1 and P-VA-6 from inadvertently generating titles that should fail P-VA-4.

**`numRuns` choices:** Boundary and monotonicity properties (P-IR-1–P-IR-3) use 1000 runs because the input space is a single integer range and shrinking is fast. Validation properties use 300–500 runs as a balance between coverage and the additional filtering cost of `validTitleArb`.

**No `fc.double` for `revealAt`:** The codebase stores `reveal_at` as SQLite `INTEGER` (Unix ms). Using `fc.integer` for offsets accurately models the domain; floating-point epoch values would test behaviour outside the spec.

---

## Files

| File | Purpose |
|------|---------|
| `tests/ide.properties.test.ts` | IDE-generated property test suite |
| [ide-pbt-output.txt](ide-pbt-output.txt) | Committed copy of the IDE run output; historical local destination: `data/evidence/ide-pbt.txt` |
| `docs/ide-pbt-evidence.md` | This document |
| `src/utils/albumInput.ts` | Source under test (not modified) |
| `.kiro/specs/photo-capsule/requirements.md` | Requirements source for property derivation |
