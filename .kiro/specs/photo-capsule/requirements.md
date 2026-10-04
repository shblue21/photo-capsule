# Photo Capsule — Requirements

## 1. Overview
Mobile-first English event photo application. Users create a time-locked album; photos are hidden until a chosen reveal datetime passes on the server.

## 2. Functional Requirements

### 2.1 Album Creation
- FR-01: Host creates album with English title (1–100 chars), description (optional, ≤500 chars), and a future UTC reveal datetime no more than 366 days ahead.
- FR-02: System generates a cryptographically random 32-byte hex **invite token** (shared with participants via QR).
- FR-03: System generates a separate cryptographically random 32-byte hex **host secret** (never shared publicly, used for album management).
- FR-04: System returns both tokens exactly once at creation; host secret never stored in plaintext logs or query strings.

### 2.2 QR Invitation
- FR-05: Host can view a QR code encoding the invite URL (invite token in path, not query param).
- FR-06: QR code is rendered server-side and delivered as an inline SVG or PNG via authenticated host route.

### 2.3 Photo Upload
- FR-07: Any bearer of the invite token may upload photos before reveal.
- FR-08: Accepted MIME types: image/jpeg, image/png, image/webp, image/gif.
- FR-09: Maximum file size: 20 MB per photo.
- FR-10: Maximum photos per album: 200.
- FR-11: Uploaded filenames are replaced with a cryptographically random UUID-based name; original filename is not persisted.
- FR-12: Image bytes must fully decode within 24 million pixels. Re-encode to JPEG without EXIF metadata; GIF uses its first frame.
- FR-13: Upload is rejected after reveal time (album locked).

### 2.4 Reveal Lock
- FR-14: Album is locked (photos hidden) until `Date.now() >= revealAt` on the server.
- FR-15: The reveal time check is authoritative on the server; client clock is ignored.
- FR-16: Photo file routes enforce the same reveal lock; static file serving of private uploads is prohibited.

### 2.5 Browsing & Download
- FR-17: After reveal, any bearer of the invite token may browse photo tiles and download the normalized JPEG images.
- FR-18: Host (bearer of management key) may inspect and delete photos even before reveal; this exception is disclosed on guest and creation screens.
- FR-19: Cross-album access is forbidden; token A cannot access album B.

### 2.6 Storage
- FR-20: Local filesystem storage under `data/uploads/<albumId>/`.
- FR-21: Album metadata persisted in SQLite (`data/capsule.db`).
- FR-22: Storage layer abstracted behind an interface (`StorageProvider`) ready for S3 swap.

## 3. Non-Functional Requirements
- NFR-01: Mobile-first responsive English UI (viewport meta, responsive CSS sizing, touch targets ≥ 44 px).
- NFR-02: App binds to `127.0.0.1` only; no public exposure.
- NFR-03: No AWS access, resource creation, deployment, or SDK calls.
- NFR-04: No query-string logging of secrets.
- NFR-05: All private file routes protected by token middleware; no static exposure of `data/uploads`.
- NFR-06: `data/` and `.env` in `.gitignore`.
- NFR-07: Node.js + TypeScript stack; compiled to `dist/`.
- NFR-08: Tests cover: cross-album access, reveal boundary, unauthorized uploads, malformed image rejection.
