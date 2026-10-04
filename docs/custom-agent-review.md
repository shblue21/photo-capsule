# Photo Capsule — Photo-Reviewer Agent Report

**Reviewer:** photo-reviewer (Kiro custom agent)
**Date:** 2026-10-03
**Scope:** `src/routes/photos.ts`, `src/routes/invite.ts`, `src/routes/host.ts`, `src/storage.ts` + all files in `tests/`
**Method:** Static code inspection + live test run. Every claim is attributed to a specific file and line or to a named passing test.

---

## Test Run

Command:

```
CI=true node node_modules/jest/bin/jest.js --runInBand --forceExit --verbose
```

Result: **47 passed, 0 failed, 6 suites** in 1.337 s (exit 0).

| Suite | Tests |
|-------|-------|
| `uploadIntegrity.test.ts` | 8 |
| `ide.properties.test.ts` | 11 |
| `malformedImage.test.ts` | 7 |
| `revealBoundary.test.ts` | 9 |
| `crossAlbum.test.ts` | 6 |
| `unauthorizedUpload.test.ts` | 6 |

---

## 1. Cross-Album Access

### Code inspection

Three independent enforcement layers exist.

**Layer 1 — token-to-album binding in middleware** (`photos.ts` lines 34–43):

```typescript
function resolveByInvite(token, albumId, res) {
  const album = getAlbumByInviteToken(resolveDb(), token);
  if (!album) { res.status(403)…; return null; }
  if (album.id !== albumId) { res.status(403)…; return null; }  // cross-album block
  return album;
}
```

`resolveByHost` (`photos.ts` lines 45–51) applies the same `album.id !== albumId` check. The DB lookup is by token value; the `:albumId` URL param is compared against the DB result, not used for the lookup itself. Token A cannot physically retrieve album B's DB row, and the path-param comparison is a second independent gate.

**Layer 2 — photo-to-album binding on serve/delete** (`photos.ts` lines 178 and 216):

```typescript
if (photo.album_id !== album.id) {
  res.status(403).json({ error: 'You do not have access to this album.' });
  return;
}
```

`getPhotoById` fetches globally by `photoId`; this check prevents a valid token for album A from serving a photo that belongs to album B even if the caller guesses a valid `photoId`.

**Layer 3 — host route** (`host.ts` lines 23–26): same `album.id !== req.params['albumId']` pattern.

### Tests observed (all passing)

- `crossAlbum.test.ts` — "invite token B cannot read photo in album A" → 403 ✓
- `crossAlbum.test.ts` — "invite token A cannot access album B photo list" → 403 ✓
- `crossAlbum.test.ts` — "host secret A cannot delete photo from album B" → 403 ✓
- `crossAlbum.test.ts` — "host secret B cannot access album A dashboard" → 403 ✓

### Gap

`GET /host/:albumId` (HTML shell, `host.ts` line 62) renders the host page without calling `requireHost`:

```typescript
router.get('/:albumId', (req, res) => {
  res.render('host', { albumId: req.params['albumId'] });
});
```

The page is a client-side shell that calls `GET /host/:albumId/json` (auth-gated) via fetch; no photo data is in the initial render. No data leak, but the HTML shell returns 200 to any unauthenticated request for any `albumId`. No test covers this route. Low risk for a local-only app; worth noting.

---

## 2. Reveal Boundary

### Code inspection

`isRevealed` (`albumInput.ts` line 15):

```typescript
export function isRevealed(revealAt, now) {
  return Number.isFinite(revealAt) && Number.isFinite(now) && now >= revealAt;
}
```

The `>=` makes the exact reveal instant a revealed state. Both args must be finite; `NaN` or `±Infinity` always returns false.

Enforcement points in `photos.ts`:

| Handler | Line | Rule |
|---------|------|------|
| Upload (pre-validation) | 70 | `if (isRevealed(…)) → 403` — blocks upload after reveal |
| Upload (post-validation TOCTOU guard) | 94 | Second `isRevealed` call after `validateImageBuffer` |
| List photos | 129 | `if (!isRevealed(…)) → 403` — guests cannot list before reveal |
| Serve photo (guest path) | 170 | `if (!isHost && !isRevealed(…)) → 403` |

`invite.ts` line 33 gates `listPhotosByAlbum` correctly:

```typescript
const revealed = isRevealed(album.reveal_at, Date.now());
const photos = revealed ? listPhotosByAlbum(resolveDb(), album.id) : [];
```

`Date.now()` is the server wall clock in all cases; no client-supplied timestamp is accepted anywhere.

The double `isRevealed` at lines 70 and 94 addresses a real window: `validateImageBuffer` calls Sharp asynchronously (~10 ms). An album could cross its reveal boundary during that window. The second check closes it.

### Tests observed

- `revealBoundary.test.ts` — "guest cannot list photos in locked album" → 403, body `/locked/` ✓
- `revealBoundary.test.ts` — "guest cannot view a specific photo in locked album" → 403 ✓
- `revealBoundary.test.ts` — "guest CAN list photos after reveal" → 200 ✓
- `revealBoundary.test.ts` — "upload is BLOCKED after reveal" → 403, body `/after reveal/` ✓
- `revealBoundary.test.ts` — "rejects album creation with past reveal time" → 400, body `/future/` ✓
- PBT P-IR-1 — exact boundary (`now === revealAt` revealed; `now === revealAt - 1` locked) over 1000 inputs ✓
- PBT P-IR-3 — monotonicity (once revealed, always revealed) over 1000 inputs ✓

---

## 3. Host vs Guest Permissions

### Code inspection

**Guest (invite token) can:**
- Upload photos before reveal — `photos.ts` line 57 (`X-Invite-Token` middleware)
- List photos after reveal — `photos.ts` line 119
- Serve a single photo after reveal — `photos.ts` line 170

**Host (Bearer secret) can additionally:**
- Serve any photo regardless of reveal time — `photos.ts` line 170: `if (!isHost && !isRevealed(…))`
- Delete any photo in their album — `photos.ts` line 202 (host-only middleware on DELETE)
- View dashboard JSON including full photo list — `host.ts` line 35

**Correctly excluded:**
- Guests cannot delete: `DELETE /albums/:id/photos/:photoId` checks `Authorization: Bearer` and returns 401 without it (`photos.ts` line 200).
- Guests cannot access another album's host dashboard: `host.ts` lines 23–26.

**Not tested by an integration test:** Host attempting to upload (Bearer present, no `X-Invite-Token`). By code inspection the upload middleware at `photos.ts` line 58 checks only `X-Invite-Token` and returns 401 if absent; a Bearer header is ignored. No test exercises this path.

### Tests observed

- `revealBoundary.test.ts` — "host CAN view photo in locked album (host bypass)" → 200, `content-type: image/*` ✓
- `crossAlbum.test.ts` — "host secret A cannot delete photo from album B" → 403 ✓
- `unauthorizedUpload.test.ts` — "rejects upload with no token" → 401 ✓
- `unauthorizedUpload.test.ts` — "rejects upload with invalid token" → 403 ✓

---

## 4. Image Normalization (EXIF Stripping)

### Code inspection

`imageValidator.ts` — full pipeline:

```typescript
const image = sharp(buffer, { limitInputPixels: 24000000, failOn: 'warning', animated: false });
const meta = await image.metadata();
if (!['jpeg','png','webp','gif'].includes(meta.format || ''))
  return { valid: false, error: '…' };
const normalized = await image.rotate().flatten({ background: '#fff' }).jpeg({ quality: 90 }).toBuffer();
```

Key properties confirmed by reading the source:

- **All accepted formats re-encoded as JPEG.** Sharp's `.toBuffer()` without `.withMetadata()` strips all Exif, XMP, IPTC, GPS, and ICC profile data by default.
- **`.rotate()`** bakes EXIF orientation into pixels before stripping.
- **`.flatten({ background: '#fff' })`** composites PNG/WebP alpha onto white before JPEG conversion.
- **`failOn: 'warning'`** rejects corrupt or truncated images that pass a magic-byte check.
- **`limitInputPixels: 24000000`** (~24 MP) prevents decompression bomb memory exhaustion.
- **`animated: false`** (the default) causes Sharp to decode only the first frame of an animated GIF — the remaining frames are discarded and the first frame is re-encoded as JPEG.
- **Original filename never stored.** `storedName` is `randomId() + extensionForMime(mime)` — `crypto.randomUUID() + '.jpg'`. `req.file.originalname` is never referenced anywhere in `photos.ts`.
- Post-encode size is re-checked (`imageValidator.ts` line 14) to catch cases where a small input produces an oversized JPEG output.
- Multer's hard cap is 25 MB (`photos.ts` line 24), 5 MB above the 20 MB business rule, ensuring multer does not reject the request before the code can emit a user-facing error.

### Tests observed

- `uploadIntegrity.test.ts` — "strips EXIF and returns a decodable image": uploads a JPEG with embedded `Artist: synthetic-test` EXIF, downloads via host route, asserts `meta.exif === undefined` and `meta.width === 40` ✓
- `uploadIntegrity.test.ts` — "rejects truncated images even with valid JPEG header" → 400 ✓
- `malformedImage.test.ts` — zero-byte → 400, plaintext → 400, PDF magic bytes → 400, corrupt GIF header → 400 ✓
- `malformedImage.test.ts` — valid JPEG → 201, valid PNG → 201 ✓

---

## 5. Storage Layer

### Code inspection

`LocalStorageProvider.resolveFilePath` (`storage.ts` lines 53–64) applies three defences:

**1. Allowlist regex** on both inputs:
```typescript
if (!/^[a-zA-Z0-9_-]+$/.test(albumId) ||
    !/^[a-zA-Z0-9_-]+\.[a-zA-Z0-9]+$/.test(filename) && filename !== 'probe')
  throw new Error('Invalid storage key');
```
Both patterns reject dots, slashes, and null bytes. `albumId` originates from `crypto.randomUUID()` (hex + hyphens); `filename` from `randomId() + extensionForMime()` (UUID + `.jpg`). Neither originates from user input.

Note on operator precedence: `&&` binds tighter than `||`, so this parses as `!albumId_ok || (!filename_ok && filename !== 'probe')`. The logic is correct — if `albumId` fails, it short-circuits to throw regardless of `filename`. The `'probe'` exception is internal to `ensureAlbumDir` and is never reachable from user-controlled input.

**2. `path.basename`** on both values as a second normalisation pass.

**3. `startsWith(albumDir + path.sep)` confirmation** that the resolved path remains inside the per-album subdirectory.

`express.static` is absent from the entire codebase (grep across `src/**/*.ts` — zero matches). All file reads go through `resolveStorage().read()`.

`Cache-Control: no-store` is set on every served photo response (`photos.ts` line 187).

`Content-Disposition` filename is `photo.id` (a UUID from the DB row), not `photo.stored_name` or any user value, eliminating header injection risk.

---

## Summary of the 47-test review

The two test gaps listed below were subsequently covered by the regression tests described after this table.

| Area | Verdict | Evidence type |
|------|---------|---------------|
| Cross-album token isolation | ✅ Two independent DB+path checks per route | Code inspection `photos.ts` 34–51, `host.ts` 23–26; 4 passing tests |
| Cross-album photo-ID isolation | ✅ `photo.album_id !== album.id` on serve and delete | Code inspection `photos.ts` 178, 216; 1 passing cross-album delete test |
| Reveal boundary (server clock) | ✅ `Date.now()` only; no client clock path | Code inspection `albumInput.ts`, `invite.ts`, `photos.ts`; 5 passing boundary tests |
| Reveal TOCTOU window | ✅ Double `isRevealed` call brackets async Sharp call | Code inspection `photos.ts` 70 and 94 |
| Host pre-reveal bypass | ✅ `isHost` flag skips reveal gate on serve | Code inspection `photos.ts` 170; 1 passing host bypass test |
| Image EXIF stripping | ✅ Full re-encode; no `.withMetadata()`; confirmed by test | Code inspection `imageValidator.ts`; EXIF test passes with `meta.exif === undefined` |
| Original filename discarded | ✅ UUID-based `storedName`; `originalname` never read | Code inspection `photos.ts` 97; no reference to `originalname` |
| Static file exposure | ✅ `express.static` absent; all reads via `StorageProvider` | grep `src/**/*.ts` — zero matches |
| Path traversal | ✅ Triple defence: regex + basename + startsWith | Code inspection `storage.ts` 53–64 |
| Gap — unauthenticated HTML shell | ⚠️ `GET /host/:albumId` returns 200 without auth; no data exposed; no test | Code inspection `host.ts` 62 |
| Gap — host upload attempt | ⚠️ No integration test; expected 401 by code inspection | Code inspection `photos.ts` 58 |

## Regression test coverage

The two test gaps noted in this historical report were addressed in `tests/uploadIntegrity.test.ts`. Final local run: 49 tests passed. This does not extend the report to cloud or production behavior.
