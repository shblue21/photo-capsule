import { isRevealed } from '../utils/albumInput';
import { Router, Request, Response } from 'express';
import { DatabaseSync } from 'node:sqlite';
import { getDb, getAlbumById, listPhotosByAlbum, getAlbumByHostSecret } from '../db';

function createRouter(db?: DatabaseSync): Router {
  const router = Router();
  const resolveDb = () => db ?? getDb();

  /** Inline host auth using injected db */
  function requireHost(req: Request, res: Response): { album: import('../db').Album } | null {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'A management key is required.' });
      return null;
    }
    const secret = authHeader.slice('Bearer '.length).trim();
    const album = getAlbumByHostSecret(resolveDb(), secret);
    if (!album) {
      res.status(403).json({ error: 'This management key is not valid.' });
      return null;
    }
    if (album.id !== req.params['albumId']) {
      res.status(403).json({ error: 'You do not have access to this album.' });
      return null;
    }
    return { album };
  }

  /**
   * GET /host/:albumId/json
   * Host dashboard data as JSON (API).
   */
  router.get('/:albumId/json', (req: Request, res: Response): void => {
    const auth = requireHost(req, res);
    if (!auth) return;
    const { album } = auth;

    const photos = listPhotosByAlbum(resolveDb(), album.id);
    const revealed = isRevealed(album.reveal_at, Date.now());

    res.json({
      album: {
        id: album.id,
        title: album.title,
        description: album.description,
        reveal_at: album.reveal_at,
        created_at: album.created_at,
      },
      revealed,
      photoCount: photos.length,
      photos: photos.map((p) => ({ id: p.id, mime_type: p.mime_type, uploaded_at: p.uploaded_at })),
      inviteUrl: `/i/${album.invite_token}`,
    });
  });

  /**
   * GET /host/:albumId
   * Host dashboard HTML.
   */
  router.get('/:albumId', (req: Request, res: Response): void => {
    res.render('host', {albumId: req.params['albumId']});
  });

  return router;
}

export default createRouter();
export { createRouter as makeHostRouter };
