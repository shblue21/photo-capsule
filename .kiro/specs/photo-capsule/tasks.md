# Photo Capsule — Tasks

## Phase 1: Project Scaffold
- [x] T-01: Create directory structure
- [x] T-02: Write requirements.md
- [x] T-03: Write design.md
- [x] T-04: Write tasks.md (this file)
- [x] T-05: Write .kiro/steering/project.md

## Phase 2: Core Infrastructure
- [x] T-06: package.json, tsconfig.json, .env.example, .gitignore
- [x] T-07: src/db.ts — SQLite schema + CRUD helpers
- [x] T-08: src/storage.ts — StorageProvider interface + LocalStorage impl
- [x] T-09: src/utils/tokens.ts — crypto random helpers
- [x] T-10: src/utils/imageValidator.ts — full decode + metadata stripping + size + concurrent count validation
- [x] T-11: src/middleware/inviteAuth.ts
- [x] T-12: src/middleware/hostAuth.ts

## Phase 3: Routes
- [x] T-13: src/routes/albums.ts — POST /albums
- [x] T-14: src/routes/invite.ts — GET /i/:inviteToken
- [x] T-15: src/routes/photos.ts — POST + GET photo routes
- [x] T-16: src/routes/host.ts — host dashboard + delete
- [x] T-17: src/routes/qr.ts — QR code generation

## Phase 4: Views (English EJS)
- [x] T-18: src/views/create.ejs — album creation form
- [x] T-19: src/views/created.ejs — one-time host secret display
- [x] T-20: src/views/invite.ejs — guest upload page
- [x] T-21: src/views/invite.ejs — post-reveal authenticated photo grid
- [x] T-22: src/views/host.ejs — host dashboard

## Phase 5: Entry Point
- [x] T-23: src/index.ts — Express app, bind 127.0.0.1

## Phase 6: Tests
- [x] T-24: tests/crossAlbum.test.ts
- [x] T-25: tests/revealBoundary.test.ts
- [x] T-26: tests/unauthorizedUpload.test.ts
- [x] T-27: tests/malformedImage.test.ts

## Phase 7: Documentation
- [x] T-28: README.md
- [x] T-29: docs/evidence.md — record actual actions

## Completion scope

Local implementation and 49 tests verified on 2026-10-03. Real S3 and public hosting remain outside this local implementation. See docs/evidence.md for the lesson evidence.
