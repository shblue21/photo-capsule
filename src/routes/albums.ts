import { validateAlbumInput } from '../utils/albumInput';
import { Router, Request, Response } from 'express';
import { DatabaseSync } from 'node:sqlite';
import { insertAlbum, getDb } from '../db';
import { randomToken, randomId } from '../utils/tokens';

function createRouter(db?: DatabaseSync): Router {
  const router = Router();
  const resolveDb = () => db ?? getDb();

  /**
   * POST /albums
   * Body (JSON or form): title, description?, revealAt (ISO string or Unix ms)
   * Returns: albumId, inviteToken, hostSecret (one-time)
   */
  router.post('/', (req: Request, res: Response): void => {
    let input;
    try { input = validateAlbumInput(req.body); } catch (e) { res.status(400).json({error: (e as Error).message}); return; }
    const {title, description, revealAtMs} = input;

    // ─── Create album ────────────────────────────────────────────────────────
    const id = randomId();
    const inviteToken = randomToken(32);
    const hostSecret = randomToken(32);
    const now = Date.now();

    insertAlbum(resolveDb(), {
      id,
      title: title.trim(),
      description: description?.trim() ?? null,
      invite_token: inviteToken,
      host_secret: hostSecret,
      reveal_at: revealAtMs,
      created_at: now,
    });

    res.status(201).json({
      albumId: id,
      inviteToken,
      hostSecret,
      inviteUrl: `/i/${inviteToken}`,
      hostDashboardUrl: `/host/${id}`,
      revealAt: new Date(revealAtMs).toISOString(),
    });
  });

  return router;
}

export default createRouter();
export { createRouter as makeAlbumsRouter };
