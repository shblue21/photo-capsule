import { isRevealed } from '../utils/albumInput';
import { Router, Request, Response, NextFunction } from 'express';
import { memoryStorage, MulterError } from 'multer';
import multer from 'multer';
import { DatabaseSync } from 'node:sqlite';
import {
  getDb,
  getAlbumByInviteToken,
  getAlbumByHostSecret,
  insertPhoto,
  getPhotoById,
  listPhotosByAlbum,
  countPhotosByAlbum,
  deletePhoto,
} from '../db';
import { getStorage, StorageProvider } from '../storage';
import { validateImageBuffer, MAX_PHOTOS_PER_ALBUM } from '../utils/imageValidator';
import { randomId, extensionForMime } from '../utils/tokens';
import type { Album } from '../db';

// Accept up to 1 file at a time named "photo"; store in memory for validation
const upload = multer({
  storage: memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // hard cap slightly above our 20MB rule
});

function createRouter(db?: DatabaseSync, storage?: StorageProvider): Router {
  const router = Router();
  const resolveDb = () => db ?? getDb();
  const resolveStorage = () => storage ?? getStorage();
  const pending = new Map<string, number>();

  // ── Auth helpers (inline, using injected db) ────────────────────────────────

  function resolveByInvite(token: string, albumId: string, res: Response): Album | null {
    const album = getAlbumByInviteToken(resolveDb(), token);
    if (!album) { res.status(403).json({ error: 'This invitation is not valid.' }); return null; }
    if (album.id !== albumId) { res.status(403).json({ error: 'You do not have access to this album.' }); return null; }
    return album;
  }

  function resolveByHost(secret: string, albumId: string, res: Response): Album | null {
    const album = getAlbumByHostSecret(resolveDb(), secret);
    if (!album) { res.status(403).json({ error: 'This management key is not valid.' }); return null; }
    if (album.id !== albumId) { res.status(403).json({ error: 'You do not have access to this album.' }); return null; }
    return album;
  }

  // ─── Upload ─────────────────────────────────────────────────────────────────

  /**
   * POST /albums/:albumId/photos
   * Requires: X-Invite-Token header (must match the album)
   */
  router.post(
    '/:albumId/photos',
    (req: Request, res: Response, next: NextFunction): void => {
      const token = req.headers['x-invite-token'] as string | undefined;
      if (!token) { res.status(401).json({ error: 'An invitation token is required.' }); return; }
      const album = resolveByInvite(token, req.params['albumId']!, res);
      if (!album) return;
      req.album = album;
      req.authKind = 'invite';
      next();
    },
    upload.single('photo'),
    async (req: Request, res: Response): Promise<void> => {
      const album = req.album!;

      if (isRevealed(album.reveal_at, Date.now())) {
        res.status(403).json({ error: 'Uploads are closed after reveal.' });
        return;
      }

      if (!req.file) {
        res.status(400).json({ error: 'Please attach a photo file.' });
        return;
      }

      const count = countPhotosByAlbum(resolveDb(), album.id) + (pending.get(album.id) || 0);
      if (count >= MAX_PHOTOS_PER_ALBUM) {
        res.status(400).json({ error: `Each album can hold up to ${MAX_PHOTOS_PER_ALBUM} photos.` });
        return;
      }

      pending.set(album.id, (pending.get(album.id) || 0) + 1);
      try {
      const result = await validateImageBuffer(req.file.buffer);
      if (!result.valid) {
        res.status(400).json({ error: result.error });
        return;
      }

      if (isRevealed(album.reveal_at, Date.now())) { res.status(403).json({error:'The album has opened. Uploads are now closed.'}); return; }
      const mime = result.mime!;
      const storedName = randomId() + extensionForMime(mime);

      await resolveStorage().save(album.id, storedName, result.buffer!);

      const uploadedAt = Date.now();
      if (isRevealed(album.reveal_at, uploadedAt)) {
        await resolveStorage().delete(album.id, storedName);
        res.status(403).json({ error: 'The album has opened. Uploads are now closed.' });
        return;
      }

      const photoId = randomId();
      try { insertPhoto(resolveDb(), {
        id: photoId,
        album_id: album.id,
        stored_name: storedName,
        mime_type: mime,
        size_bytes: result.buffer!.length,
        uploaded_at: uploadedAt,
      }); } catch(e) { await resolveStorage().delete(album.id, storedName); throw e; }

      res.status(201).json({ photoId, albumId: album.id });
      } catch { res.status(500).json({error:"Could not save the photo. Please try again."}); } finally { const n = (pending.get(album.id) || 1) - 1; if(n) pending.set(album.id,n); else pending.delete(album.id); }
    }
  );

  // ─── List photos ─────────────────────────────────────────────────────────────

  router.get(
    '/:albumId/photos',
    (req: Request, res: Response, next: NextFunction): void => {
      const token = req.headers['x-invite-token'] as string | undefined;
      if (!token) { res.status(401).json({ error: 'An invitation token is required.' }); return; }
      const album = resolveByInvite(token, req.params['albumId']!, res);
      if (!album) return;
      req.album = album;
      next();
    },
    (req: Request, res: Response): void => {
      const album = req.album!;
      if (!isRevealed(album.reveal_at, Date.now())) {
        res.status(403).json({ error: `This album is locked until: ${new Date(album.reveal_at).toISOString()}` });
        return;
      }
      const photos = listPhotosByAlbum(resolveDb(), album.id);
      res.json({ photos: photos.map(p => ({id:p.id,mime_type:p.mime_type,uploaded_at:p.uploaded_at})) });
    }
  );

  // ─── Serve single photo ───────────────────────────────────────────────────────

  router.get(
    '/:albumId/photos/:photoId',
    (req: Request, res: Response, next: NextFunction): void => {
      const inviteToken = req.headers['x-invite-token'] as string | undefined;
      const authHeader = req.headers['authorization'] as string | undefined;

      let album: Album | null = null;
      let authKind: 'invite' | 'host' = 'invite';

      if (authHeader?.startsWith('Bearer ')) {
        const secret = authHeader.slice('Bearer '.length).trim();
        album = resolveByHost(secret, req.params['albumId']!, res);
        if (!album) return;
        authKind = 'host';
      } else if (inviteToken) {
        album = resolveByInvite(inviteToken, req.params['albumId']!, res);
        if (!album) return;
      } else {
        res.status(401).json({ error: 'Authentication is required.' });
        return;
      }

      req.album = album;
      req.authKind = authKind;
      next();
    },
    async (req: Request, res: Response): Promise<void> => {
      const album = req.album!;
      const isHost = req.authKind === 'host';

      if (!isHost && !isRevealed(album.reveal_at, Date.now())) {
        res.status(403).json({ error: `This album is locked until: ${new Date(album.reveal_at).toISOString()}` });
        return;
      }

      const photo = getPhotoById(resolveDb(), req.params['photoId']!);
      if (!photo) { res.status(404).json({ error: 'Photo not found.' }); return; }

      if (photo.album_id !== album.id) {
        res.status(403).json({ error: 'You do not have access to this album.' });
        return;
      }

      try {
        const buffer = await resolveStorage().read(album.id, photo.stored_name);
        res.setHeader('Content-Type', photo.mime_type);
        res.setHeader('Content-Disposition', `inline; filename="${photo.id}"`);
        res.setHeader('Cache-Control', 'no-store');
        res.send(buffer);
      } catch {
        res.status(404).json({ error: 'File not found.' });
      }
    }
  );

  // ─── Delete photo (host only) ─────────────────────────────────────────────────

  router.delete(
    '/:albumId/photos/:photoId',
    (req: Request, res: Response, next: NextFunction): void => {
      const authHeader = req.headers['authorization'] as string | undefined;
      if (!authHeader?.startsWith('Bearer ')) {
        res.status(401).json({ error: 'A management key is required.' });
        return;
      }
      const secret = authHeader.slice('Bearer '.length).trim();
      const album = resolveByHost(secret, req.params['albumId']!, res);
      if (!album) return;
      req.album = album;
      req.authKind = 'host';
      next();
    },
    async (req: Request, res: Response): Promise<void> => {
      const album = req.album!;
      const photo = getPhotoById(resolveDb(), req.params['photoId']!);
      if (!photo) { res.status(404).json({ error: 'Photo not found.' }); return; }
      if (photo.album_id !== album.id) {
        res.status(403).json({ error: 'You do not have access to this album.' });
        return;
      }
      await resolveStorage().delete(album.id, photo.stored_name);
      deletePhoto(resolveDb(), photo.id);
      res.json({ deleted: photo.id });
    }
  );

  // Multer error handler
  router.use((err: Error, _req: Request, res: Response, _next: NextFunction): void => {
    if (err instanceof MulterError) {
      res.status(400).json({ error: `Upload error: ${err.message}` });
    } else {
      res.status(500).json({ error: 'A server error occurred.' });
    }
  });

  return router;
}

export default createRouter();
export { createRouter as makePhotosRouter };
