import { validateAlbumInput } from './utils/albumInput';
import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';

// ─── Routes (default exports use singleton db/storage) ───────────────────────
import albumsRouter from './routes/albums';
import inviteRouter from './routes/invite';
import photosRouter from './routes/photos';
import hostRouter from './routes/host';
import qrRouter from './routes/qr';
import { getDb, insertAlbum } from './db';
import { randomToken, randomId } from './utils/tokens';

// ─── Ensure data directories exist ───────────────────────────────────────────
const uploadDir = path.resolve(process.env['UPLOAD_DIR'] ?? './data/uploads');
fs.mkdirSync(uploadDir, { recursive: true });

// ─── App ───────────────────────────────────────────────────────────────────────
export const app = express();

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Body parsers
app.use((_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); res.setHeader('Referrer-Policy', 'no-referrer'); res.setHeader('X-Content-Type-Options', 'nosniff'); next(); });
app.get('/favicon.ico', (_req,res) => { res.status(204).end(); });
app.use(express.json({limit:'16kb'}));
app.use(express.urlencoded({ extended: true }));

// ─── NEVER serve data/uploads as static ──────────────────────────────────────
// uploads are only accessible through authenticated route handlers in photos.ts

// ─── Routes ──────────────────────────────────────────────────────────────────

// Home: album creation form
app.get('/', (_req: Request, res: Response) => {
  res.render('create');
});

// Album creation API (JSON)
app.use('/albums', albumsRouter);

// Photo upload/serve
app.use('/albums', photosRouter);

// Invite landing page
app.use('/i', inviteRouter);

// QR code (must come before /host/:albumId to avoid conflict with :albumId/json etc.)
app.use('/host', qrRouter);

// Host dashboard
app.use('/host', hostRouter);

// ─── HTML form create endpoint ────────────────────────────────────────────────
import QRCode from 'qrcode';

app.post('/create', async (req: Request, res: Response): Promise<void> => {
  let input;
  try { input = validateAlbumInput(req.body); } catch (e) { res.status(400).render('error', {title: 'Check your input', message: (e as Error).message}); return; }
  const {title, description, revealAtMs} = input;

  const id = randomId();
  const inviteToken = randomToken(32);
  const hostSecret = randomToken(32);

  const db = getDb();
  insertAlbum(db, {
    id,
    title: title.trim(),
    description: description?.trim() ?? null,
    invite_token: inviteToken,
    host_secret: hostSecret,
    reveal_at: revealAtMs,
    created_at: Date.now(),
  });

  const fullInviteUrl = `${req.protocol}://${req.get('host')}/i/${inviteToken}`;
  // QR as data URL — host secret never appears in URL or query string
  const qrDataUrl = await QRCode.toDataURL(fullInviteUrl, { width: 300, margin: 2 });

  res.render('created', {
    albumId: id,
    album: { id, title: title.trim(), description: description?.trim() ?? null },
    inviteToken,
    hostSecret,
    inviteUrl: fullInviteUrl,
    qrDataUrl,
    revealDate: new Date(revealAtMs).toLocaleString('en-US', { timeZone: 'UTC', timeZoneName: 'short' }),
  });
});

// ─── 404 & Error handlers ─────────────────────────────────────────────────────
app.use((_req: Request, res: Response) => {
  if (_req.headers['accept']?.includes('application/json')) {
    res.status(404).json({ error: 'The requested route was not found.' });
  } else {
    res.status(404).render('error', { title: 'Page not found', message: 'This page does not exist.' });
  }
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack);
  if (_req.headers['accept']?.includes('application/json')) {
    res.status(500).json({ error: 'A server error occurred.' });
  } else {
    res.status(500).render('error', { title: 'Server error', message: 'Something went wrong. Please try again.' });
  }
});

// ─── Start (only when run directly) ──────────────────────────────────────────
if (require.main === module) {
  const PORT = parseInt(process.env['PORT'] ?? '3000', 10);
  const HOST = '127.0.0.1'; // bind localhost only — NFR-02
  app.listen(PORT, HOST, () => {
    console.log(`Photo Capsule is running at: http://${HOST}:${PORT}`);
  });
}
