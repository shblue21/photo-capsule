import { Request, Response, NextFunction } from 'express';
import { getDb, getAlbumByInviteToken, Album } from '../db';

// Augment Express Request to carry the resolved album
declare global {
  namespace Express {
    interface Request {
      album?: Album;
      authKind?: 'invite' | 'host';
    }
  }
}

/**
 * Validates the invite token from the path parameter `:inviteToken`
 * OR from the custom header `X-Invite-Token`.
 * Attaches `req.album` on success.
 */
export function inviteAuth(req: Request, res: Response, next: NextFunction): void {
  const token =
    req.params['inviteToken'] ??
    (req.headers['x-invite-token'] as string | undefined);

  if (!token) {
    res.status(401).json({ error: 'An invitation token is required.' });
    return;
  }

  const db = getDb();
  const album = getAlbumByInviteToken(db, token);

  if (!album) {
    res.status(403).json({ error: 'This invitation is not valid.' });
    return;
  }

  req.album = album;
  req.authKind = 'invite';
  next();
}

/**
 * For photo routes: validates that the album resolved from the invite token
 * matches the `:albumId` in the route path (cross-album protection).
 */
export function inviteAuthForAlbum(req: Request, res: Response, next: NextFunction): void {
  const token = req.headers['x-invite-token'] as string | undefined;
  if (!token) {
    res.status(401).json({ error: 'An invitation token is required.' });
    return;
  }

  const db = getDb();
  const album = getAlbumByInviteToken(db, token);

  if (!album) {
    res.status(403).json({ error: 'This invitation is not valid.' });
    return;
  }

  const albumId = req.params['albumId'];
  if (albumId && album.id !== albumId) {
    res.status(403).json({ error: 'You do not have access to this album.' });
    return;
  }

  req.album = album;
  req.authKind = 'invite';
  next();
}
