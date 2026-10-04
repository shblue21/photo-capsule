/**
 * Test helper: creates a fully wired Express app using an isolated in-memory
 * SQLite database and a temporary upload directory.
 */
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import express, { Request, Response, NextFunction } from 'express';
import { DatabaseSync } from 'node:sqlite';
import { createTestDb } from '../src/db';
import { LocalStorageProvider } from '../src/storage';
import { makeAlbumsRouter } from '../src/routes/albums';
import { makePhotosRouter } from '../src/routes/photos';
import { makeHostRouter } from '../src/routes/host';
import { makeInviteRouter } from '../src/routes/invite';

export interface TestEnv {
  db: DatabaseSync;
  uploadDir: string;
  app: express.Express;
  cleanup: () => void;
}

export function buildTestApp(): TestEnv {
  const db = createTestDb();
  const uploadDir = fs.mkdtempSync(path.join(os.tmpdir(), 'photo-capsule-test-'));
  const storage = new LocalStorageProvider(uploadDir);

  const app = express();
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, '../src/views'));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use('/albums', makeAlbumsRouter(db));
  app.use('/albums', makePhotosRouter(db, storage));
  app.use('/host', makeHostRouter(db));
  app.use('/i', makeInviteRouter(db));

  app.use((_req: Request, res: Response) =>
    res.status(404).json({ error: 'not found' })
  );
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    res.status(500).json({ error: err.message });
  });

  const cleanup = () => {
    try { db.close(); } catch {}
    try { fs.rmSync(uploadDir, { recursive: true, force: true }); } catch {}
  };

  return { db, uploadDir, app, cleanup };
}

/** Synthetic real images generated with sharp, no personal photos. */
export function makeFakeJpeg(size = 1024): Buffer { return fs.readFileSync(path.join(__dirname,'fixtures/photo.jpeg')); }
export function makeFakePng(size = 1024): Buffer { return fs.readFileSync(path.join(__dirname,'fixtures/photo.png')); }

/** Creates a buffer that is NOT a valid image (plaintext) */
export function makeFakeText(): Buffer {
  return Buffer.from('this is not an image file content');
}
