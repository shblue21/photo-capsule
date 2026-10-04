# Photo review result

- **Agent and activated Power:** Kiro (session 2026-10-03) — `photo-capsule-review` power, `review` skill activated via `kiro_powers` tool.

- **Files inspected:**
  - `src/routes/photos.ts` — upload, list, serve, and delete route handlers; inline auth and cross-album binding
  - `src/utils/imageValidator.ts` — sharp decode → re-encode → EXIF-strip pipeline
  - `src/utils/albumInput.ts` — `isRevealed` function (reveal boundary logic)
  - `src/middleware/inviteAuth.ts` — `inviteAuth` and `inviteAuthForAlbum` middleware
  - `src/middleware/hostAuth.ts` — `hostAuth` and `hostAuthForAlbum` middleware
  - `src/storage.ts` — `StorageProvider` interface, `LocalStorageProvider`, path-traversal guard
  - `src/utils/tokens.ts` — `randomId()` / `randomToken()` (crypto.randomUUID)
  - `src/index.ts` — route mounting order; no `express.static` on uploads
  - `tests/malformedImage.test.ts`, `tests/revealBoundary.test.ts`, `tests/crossAlbum.test.ts`, `tests/unauthorizedUpload.test.ts`, `tests/uploadIntegrity.test.ts`, `tests/ide.properties.test.ts`
  - `.kiro/steering/project.md`, `.kiro/steering/testing.md`, `.kiro/steering/product.md`, `.kiro/steering/design.md`
  - `package.json`

- **Typecheck command and exit status:**
  `node node_modules/typescript/bin/tsc --noEmit` (run by `review.cjs` inside project root) — **exit 0**.
  Timestamp: `2026-10-02T16:30:21.915Z`. Source: [power-review.json](power-review.json).

- **Test command and actual result:**
  `node node_modules/jest/bin/jest.js --runInBand --forceExit` (run by `review.cjs` with `CI=true`) — **exit 0**.
  6 suites, 49 tests, 0 failures. Suites: `uploadIntegrity`, `ide.properties`, `malformedImage`, `revealBoundary`, `crossAlbum`, `unauthorizedUpload`.
  Full output in [power-review.txt](power-review.txt). Timestamp: `2026-10-02T16:30:21.915Z`.

- **Album isolation and reveal-time findings (file references):**

  *Album isolation:* Token-to-album binding is enforced at three independent layers:
  1. `getAlbumByInviteToken` / `getAlbumByHostSecret` (database lookup by credential — `src/db.ts`).
  2. `album.id !== albumId` cross-album check in every credential resolution helper — `src/routes/photos.ts` `resolveByInvite` (lines ~33–36), `resolveByHost` (lines ~38–41); `src/middleware/inviteAuth.ts` `inviteAuthForAlbum` (~56–59); `src/middleware/hostAuth.ts` `hostAuthForAlbum` (~59–62).
  3. Photo-level `photo.album_id !== album.id` check on serve (`src/routes/photos.ts` ~line 158) and delete (~line 181) — prevents a valid credential from reaching a photo UUID that belongs to a different album.
  Covered by `tests/crossAlbum.test.ts` (all passing).

  *Reveal boundary:* `src/utils/albumInput.ts` — `isRevealed(revealAt, now)` returns `now >= revealAt`. The exact reveal millisecond evaluates to **true** (open); one millisecond before evaluates to false. Server clock (`Date.now()`) is the sole time source; client clock is ignored. Upload is blocked if `isRevealed` returns true (`src/routes/photos.ts` ~line 71 and ~line 85). List and serve deny access if `isRevealed` returns false (guest path). Host photo-serve bypasses the reveal gate (`req.authKind === 'host'`), consistent with the pre-reveal host exception disclosed in the product spec.
  Covered by `tests/revealBoundary.test.ts` (all passing).

  *Image decoding / EXIF removal:* `src/utils/imageValidator.ts` — `validateImageBuffer` passes every upload through `sharp(buffer, {failOn:'warning'}).rotate().flatten({background:'#fff'}).jpeg({quality:90}).toBuffer()`. `.rotate()` applies and discards EXIF orientation; `.jpeg()` output strips all remaining metadata (no `withMetadata()` call). The original upload buffer is discarded; only the re-encoded buffer reaches storage.
  Covered by `tests/malformedImage.test.ts` and `tests/uploadIntegrity.test.ts`.

  *Private storage:* `src/index.ts` has no `express.static` on `data/uploads`. Photos are served exclusively via the authenticated route handler in `src/routes/photos.ts` (`resolveStorage().read()`).

  *Random filenames:* `randomId()` (`crypto.randomUUID`) + `extensionForMime(mime)` — generated in `src/routes/photos.ts` ~line 90. The multipart `originalname` field is never used.

- **Design preservation findings:**
  No UI or EJS/CSS files were modified during this review session. The lavender-and-white design (`src/views/style.ejs`) and accepted layout (`src/views/create.ejs`) were not touched. Browser validation was not performed (EJS/CSS changes were not in scope). TypeScript checks passing do not constitute frontend layout verification.

- **Unverified scope:**
  - Concurrent upload cap (race-condition path for the `MAX_PHOTOS_PER_ALBUM` check) — the `pending` map logic in `src/routes/photos.ts` was read but no concurrent stress test was run.
  - S3 migration path — `S3StorageProvider` is stubbed as a comment; its behaviour is untested.
  - EXIF metadata removal was verified by code inspection of the sharp pipeline; a round-trip byte-level EXIF check was not run as a separate test.
  - Browser-rendered layout and mobile viewport behaviour (390 px) were not checked; no browser was opened.
  - Host secret logging — absence was confirmed by code reading; no runtime log capture was performed.
  - Cloud or compliance certification: this review is local only.

- **Review action — completed:**
  The stale "magic bytes" wording in `tests/malformedImage.test.ts` was updated to describe full image decoding via sharp. Test assertions were unchanged. The save-triggered checks are recorded in `runtime-results.md`.

## Test coverage clarification

The full suite executed here includes an EXIF round-trip check and a two-concurrent-request final-slot check in uploadIntegrity.test.ts. Those bounded tests passed; broader metadata coverage and load/stress testing were not performed. See runtime-results.md for automatic versus subsequent manual Hook execution.
