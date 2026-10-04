/**
 * Reveal boundary tests.
 * Guests cannot see photos before reveal; can see them after.
 * Uploads are blocked after reveal.
 * Host can always see photos (before and after reveal).
 */
import request from 'supertest';
import { buildTestApp, makeFakeJpeg } from './testHelper';

describe('Reveal boundary enforcement', () => {
  const env = buildTestApp();
  const { app, db } = env;

  // Album with reveal in the distant future (locked)
  let lockedAlbumId: string, lockedInvite: string, lockedHost: string;
  // Album with reveal already in the past (revealed)
  let revealedAlbumId: string, revealedInvite: string, revealedHost: string;
  let photoInRevealed: string;

  afterAll(() => env.cleanup());

  it('creates a locked album (reveal far in future)', async () => {
    const future = Date.now() + 30 * 24 * 3600 * 1000;
    const res = await request(app)
      .post('/albums')
      .send({ title: 'Locked album', revealAt: future });
    expect(res.status).toBe(201);
    lockedAlbumId = res.body.albumId;
    lockedInvite = res.body.inviteToken;
    lockedHost = res.body.hostSecret;
  });

  it('creates a revealed album by backdating reveal_at directly in DB', async () => {
    // Create with future reveal first
    const future = Date.now() + 30 * 24 * 3600 * 1000;
    const res = await request(app)
      .post('/albums')
      .send({ title: 'Open album', revealAt: future });
    expect(res.status).toBe(201);
    revealedAlbumId = res.body.albumId;
    revealedInvite = res.body.inviteToken;
    revealedHost = res.body.hostSecret;

    // Upload a photo while locked
    const uploadRes = await request(app)
      .post(`/albums/${revealedAlbumId}/photos`)
      .set('X-Invite-Token', revealedInvite)
      .attach('photo', makeFakeJpeg(), { filename: 'test.jpg', contentType: 'image/jpeg' });
    expect(uploadRes.status).toBe(201);
    photoInRevealed = uploadRes.body.photoId;

    // Backdate the reveal time to 1ms ago
    db.prepare('UPDATE albums SET reveal_at = ? WHERE id = ?').run(Date.now() - 1, revealedAlbumId);
  });

  // ── Locked album tests ─────────────────────────────────────────────────────

  it('guest cannot list photos in locked album', async () => {
    const res = await request(app)
      .get(`/albums/${lockedAlbumId}/photos`)
      .set('X-Invite-Token', lockedInvite);
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/locked/);
  });

  it('guest cannot view a specific photo in locked album', async () => {
    // Upload a photo first
    const up = await request(app)
      .post(`/albums/${lockedAlbumId}/photos`)
      .set('X-Invite-Token', lockedInvite)
      .attach('photo', makeFakeJpeg(), { filename: 'test.jpg', contentType: 'image/jpeg' });
    expect(up.status).toBe(201);
    const photoId = up.body.photoId;

    const res = await request(app)
      .get(`/albums/${lockedAlbumId}/photos/${photoId}`)
      .set('X-Invite-Token', lockedInvite);
    expect(res.status).toBe(403);
  });

  it('host CAN view photo in locked album (host bypass)', async () => {
    const up = await request(app)
      .post(`/albums/${lockedAlbumId}/photos`)
      .set('X-Invite-Token', lockedInvite)
      .attach('photo', makeFakeJpeg(), { filename: 'test.jpg', contentType: 'image/jpeg' });
    const photoId = up.body.photoId;

    const res = await request(app)
      .get(`/albums/${lockedAlbumId}/photos/${photoId}`)
      .set('Authorization', `Bearer ${lockedHost}`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/image/);
  });

  // ── Revealed album tests ───────────────────────────────────────────────────

  it('guest CAN list photos after reveal', async () => {
    const res = await request(app)
      .get(`/albums/${revealedAlbumId}/photos`)
      .set('X-Invite-Token', revealedInvite);
    expect(res.status).toBe(200);
    expect(res.body.photos.length).toBeGreaterThan(0);
  });

  it('guest CAN view photo after reveal', async () => {
    const res = await request(app)
      .get(`/albums/${revealedAlbumId}/photos/${photoInRevealed}`)
      .set('X-Invite-Token', revealedInvite);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/image/);
  });

  it('upload is BLOCKED after reveal', async () => {
    const res = await request(app)
      .post(`/albums/${revealedAlbumId}/photos`)
      .set('X-Invite-Token', revealedInvite)
      .attach('photo', makeFakeJpeg(), { filename: 'test.jpg', contentType: 'image/jpeg' });
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/after reveal/);
  });

  // ── Creation validation ────────────────────────────────────────────────────

  it('rejects album creation with past reveal time', async () => {
    const res = await request(app)
      .post('/albums')
      .send({ title: 'Past album', revealAt: Date.now() - 1000 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/future/);
  });
});
