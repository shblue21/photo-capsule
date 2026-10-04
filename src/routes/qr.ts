import { Router, Request, Response } from 'express';
import { DatabaseSync } from 'node:sqlite';
import QRCode from 'qrcode';
import { getDb, getAlbumByHostSecret } from '../db';

function createRouter(db?: DatabaseSync): Router {
  const router = Router();
  const resolveDb = () => db ?? getDb();

  function requireHost(req: Request, res: Response) {
    const authHeader = req.headers['authorization'];
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'A management key is required.' });
      return null;
    }
    const secret = authHeader.slice('Bearer '.length).trim();
    const album = getAlbumByHostSecret(resolveDb(), secret);
    if (!album) { res.status(403).json({ error: 'This management key is not valid.' }); return null; }
    if (album.id !== req.params['albumId']) {
      res.status(403).json({ error: 'You do not have access to this album.' });
      return null;
    }
    return album;
  }

  /** GET /host/:albumId/qr — PNG */
  router.get('/:albumId/qr', async (req: Request, res: Response): Promise<void> => {
    const album = requireHost(req, res);
    if (!album) return;

    const inviteUrl = `${req.protocol}://${req.get('host')}/i/${album.invite_token}`;
    try {
      const qrPng = await QRCode.toBuffer(inviteUrl, { type: 'png', width: 300, margin: 2 });
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'no-store');
      res.send(qrPng);
    } catch {
      res.status(500).json({ error: 'Could not generate the QR code.' });
    }
  });

  /** GET /host/:albumId/qr.svg — SVG */
  router.get('/:albumId/qr.svg', async (req: Request, res: Response): Promise<void> => {
    const album = requireHost(req, res);
    if (!album) return;

    const inviteUrl = `${req.protocol}://${req.get('host')}/i/${album.invite_token}`;
    try {
      const svg = await QRCode.toString(inviteUrl, { type: 'svg' });
      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader('Cache-Control', 'no-store');
      res.send(svg);
    } catch {
      res.status(500).json({ error: 'Could not generate the QR code.' });
    }
  });

  return router;
}

export default createRouter();
export { createRouter as makeQrRouter };
