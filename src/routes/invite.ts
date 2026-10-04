import { isRevealed } from '../utils/albumInput';
import { Router, Request, Response } from 'express';
import { DatabaseSync } from 'node:sqlite';
import { getDb, getAlbumByInviteToken, listPhotosByAlbum } from '../db';

function createRouter(db?: DatabaseSync): Router {
  const router = Router();
  const resolveDb = () => db ?? getDb();

  /**
   * GET /i/:inviteToken
   * Guest landing page: shows upload form (before reveal) or photo grid (after reveal).
   */
  router.get('/:inviteToken', (req: Request, res: Response): void => {
    const { inviteToken } = req.params;

    if (!inviteToken) {
      res.status(400).send('Invalid request.');
      return;
    }

    const album = getAlbumByInviteToken(resolveDb(), inviteToken);

    if (!album) {
      res.status(404).render('error', {
        title: 'Album not found',
        message: 'This invitation link is not valid.',
      });
      return;
    }

    const revealed = isRevealed(album.reveal_at, Date.now());
    const photos = revealed ? listPhotosByAlbum(resolveDb(), album.id) : [];

    res.render('invite', {
      album,
      inviteToken,
      revealed,
      serverNow: Date.now(),
      photos,
      revealDate: new Date(album.reveal_at).toLocaleString('en-US', { timeZone: 'UTC', timeZoneName: 'short' }),
    });
  });

  return router;
}

export default createRouter();
export { createRouter as makeInviteRouter };
