# Photo Capsule — Design

## 1. Stack
| Layer | Choice | Reason |
|---|---|---|
| Runtime | Node.js 24+ | Built-in node:sqlite support |
| Language | TypeScript 5 | Type safety |
| HTTP | Express 4 | Minimal, well-known |
| DB | node:sqlite | Built-in synchronous SQLite |
| File upload | multer | Bounded in-memory multipart uploads |
| QR | qrcode | Pure-JS, no native deps |
| Image validation | sharp | Full decoding, EXIF removal and JPEG normalization |
| Test | Jest + supertest + fast-check | Integration and property-based tests |
| UI templating | EJS | Simple server-rendered English HTML |

## 2. Directory Layout
```
photo-capsule/
├── src/
│   ├── index.ts          # Entry point, Express app setup
│   ├── db.ts             # SQLite schema + query helpers
│   ├── storage.ts        # StorageProvider interface + LocalStorage impl
│   ├── middleware/
│   │   ├── inviteAuth.ts # Validates invite token → attaches album
│   │   └── hostAuth.ts   # Validates host secret → attaches album
│   ├── routes/
│   │   ├── albums.ts     # POST /albums (create)
│   │   ├── invite.ts     # GET /i/:inviteToken (join page / QR landing)
│   │   ├── photos.ts     # POST /albums/:id/photos, GET /albums/:id/photos/:photoId
│   │   ├── host.ts       # GET /host/:albumId and /json (host shell/data)
│   │   └── qr.ts         # GET /host/:albumId/qr
│   ├── utils/
│   │   ├── tokens.ts     # crypto.randomBytes helpers
│   │   └── imageValidator.ts  # Full decoding, metadata removal and image limits
│   └── views/
│       ├── create.ejs
│       ├── created.ejs
│       ├── invite.ejs
│       ├── style.ejs
│       └── host.ejs
├── tests/
│   ├── crossAlbum.test.ts
│   ├── revealBoundary.test.ts
│   ├── unauthorizedUpload.test.ts
│   └── malformedImage.test.ts
├── data/                 # gitignored; SQLite + uploads
├── docs/
│   └── evidence.md
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

## 3. Database Schema
```sql
CREATE TABLE albums (
  id TEXT PRIMARY KEY,          -- random UUID
  title TEXT NOT NULL,
  description TEXT,
  invite_token TEXT UNIQUE NOT NULL,
  host_secret TEXT UNIQUE NOT NULL,
  reveal_at INTEGER NOT NULL,   -- Unix ms
  created_at INTEGER NOT NULL
);

CREATE TABLE photos (
  id TEXT PRIMARY KEY,          -- random UUID
  album_id TEXT NOT NULL REFERENCES albums(id),
  stored_name TEXT NOT NULL,    -- random UUID filename
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  uploaded_at INTEGER NOT NULL
);
```

## 4. StorageProvider Interface
```typescript
interface StorageProvider {
  save(albumId: string, filename: string, buffer: Buffer): Promise<void>;
  read(albumId: string, filename: string): Promise<Buffer>;
  delete(albumId: string, filename: string): Promise<void>;
  ensureAlbumDir(albumId: string): Promise<void>;
  // S3 is future work; no live adapter is implemented.
}
```

## 5. Security Model
- Invite token: path param `/i/:inviteToken` — grants upload + post-reveal browse.
- Host secret: `Authorization: Bearer <hostSecret>` header — grants host dashboard, delete, QR.
- File routes: `/albums/:id/photos/:photoId` — credential and album checks are enforced in the route handlers; never served via `express.static`. Host-only deletion uses the same photo route with DELETE.
- Do not log credentials. No request-logging middleware is installed; the app adds no-store and no-referrer response headers.
- Filenames: `crypto.randomUUID()` + original extension stripped → `.jpg` after normalization.

## 6. Reveal Lock Logic
```
GET /albums/:id/photos/:photoId
  1. Validate token (invite or host)
  2. Confirm token → album matches :id  (cross-album check)
  3. If Date.now() < album.reveal_at AND requester is not host → 403
  4. Read the normalized photo buffer from StorageProvider
```

## 7. UI Flow (English)
1. `/` → Create capsule form
2. POST `/create` → creation confirmation with a private management key. Store the key in sessionStorage; host data requests use an Authorization header, never a query string.
3. Host shares `/i/:inviteToken` QR with guests
4. Guest lands on invite page, uploads photos
5. After reveal_at: guests see photo grid; host sees grid + delete buttons

## 8. S3 Migration Path (future)
- Implement `S3StorageProvider implements StorageProvider`
- Swap in `src/storage.ts` factory based on `STORAGE_BACKEND=s3` env var
- Add `AWS_BUCKET`, `AWS_REGION` env vars
- No other code changes required
