import { Request, Response, NextFunction } from 'express';
import { getDb, getAlbumByHostSecret, Album } from '../db';

/**
 * Validates the host secret from `Authorization: Bearer <hostSecret>` header.
 * Attaches `req.album` on success.
 */
export function hostAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'A management key is required.' });
    return;
  }

  const secret = authHeader.slice('Bearer '.length).trim();
  if (!secret) {
    res.status(401).json({ error: 'The management key is empty.' });
    return;
  }

  const db = getDb();
  const album = getAlbumByHostSecret(db, secret);

  if (!album) {
    res.status(403).json({ error: 'This management key is not valid.' });
    return;
  }

  req.album = album;
  req.authKind = 'host';
  next();
}

/**
 * Validates host auth AND checks the albumId path param matches (cross-album).
 */
export function hostAuthForAlbum(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'A management key is required.' });
    return;
  }

  const secret = authHeader.slice('Bearer '.length).trim();
  if (!secret) {
    res.status(401).json({ error: 'The management key is empty.' });
    return;
  }

  const db = getDb();
  const album = getAlbumByHostSecret(db, secret);

  if (!album) {
    res.status(403).json({ error: 'This management key is not valid.' });
    return;
  }

  const albumId = req.params['albumId'];
  if (albumId && album.id !== albumId) {
    res.status(403).json({ error: 'You do not have access to this album.' });
    return;
  }

  req.album = album;
  req.authKind = 'host';
  next();
}
