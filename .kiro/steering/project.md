---
inclusion: always
---

# Project Steering: Photo Capsule

## Identity
- **Project**: Photo Capsule
- **Role**: Kiro — primary implementer for Kiro University
- **Stack**: Node.js 24 + TypeScript + Express 4 + SQLite (node:sqlite)

## Invariants (never break these)
1. App binds to `127.0.0.1` only — no public exposure.
2. No real AWS calls, resource creation, or deployment in the local demo.
3. Private uploads never served via `express.static` — only through authenticated route handlers.
4. Host secret never logged, never in query strings after the one-time creation page.
5. Invite token never in query strings — path param `/i/:token` only.
6. All file storage routed through `StorageProvider` abstraction.
7. Reveal time checked on server; client clock ignored.
8. Random filenames only — original filenames discarded.
9. Full image decoding and re-encoding without EXIF before storage.
10. `data/` and `.env` gitignored.

## Language & UI
- All UI text, labels, and error messages in English.
- Mobile-first: viewport meta, responsive CSS sizing, touch targets ≥ 44 px.

## Testing
- Use Jest + supertest for HTTP integration tests.
- Synthetic decodable images only.
- Tests must cover: cross-album access, reveal boundary, unauthorized upload, malformed image.

## Evidence
- Every real action (install, compile, test run) recorded in `docs/evidence.md`.
- Never claim a tool, hook, or IDE feature ran without terminal evidence.

## S3 Migration
- Implement `StorageProvider` interface.
- Future: `S3StorageProvider` swapped via `STORAGE_BACKEND=s3` env var.
- Document remaining steps in README.

## Related guidance
Read product.md for album behavior, design.md for the accepted frontend, and testing.md for validation commands.
