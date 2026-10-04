/**
 * Cross-album access tests.
 * Token from album A must NOT grant access to album B's photos.
 */
import request from 'supertest';
import { buildTestApp, makeFakeJpeg } from './testHelper';

describe('Cross-album access prevention', () => {
  const env = buildTestApp();
  const { app } = env;
  const futureReveal = Date.now() + 30 * 24 * 3600 * 1000; // 30 days

  let albumAId: string, albumAInvite: string, albumAHost: string;
  let albumBId: string, albumBInvite: string, albumBHost: string;
  let photoInA: string;

  afterAll(() => env.cleanup());

  it('creates album A', async () => {
    const res = await request(app)
      .post('/albums')
      .send({ title: 'Album A', revealAt: futureReveal });
    expect(res.status).toBe(201);
    albumAId = res.body.albumId;
    albumAInvite = res.body.inviteToken;
    albumAHost = res.body.hostSecret;
  });

  it('creates album B', async () => {
    const res = await request(app)
      .post('/albums')
      .send({ title: 'Album B', revealAt: futureReveal });
    expect(res.status).toBe(201);
    albumBId = res.body.albumId;
    albumBInvite = res.body.inviteToken;
    albumBHost = res.body.hostSecret;
  });

  it('uploads a photo to album A', async () => {
    const res = await request(app)
      .post(`/albums/${albumAId}/photos`)
      .set('X-Invite-Token', albumAInvite)
      .attach('photo', makeFakeJpeg(), { filename: 'test.jpg', contentType: 'image/jpeg' });
    expect(res.status).toBe(201);
    photoInA = res.body.photoId;
  });

  it('invite token B cannot read photo in album A (wrong albumId path)', async () => {
    // Token B → album B id; hitting album A's photo route
    const res = await request(app)
      .get(`/albums/${albumAId}/photos/${photoInA}`)
      .set('X-Invite-Token', albumBInvite);
    expect(res.status).toBe(403);
  });

  it('invite token A cannot access album B photo list', async () => {
    // Album A's invite token used on album B's route
    const res = await request(app)
      .get(`/albums/${albumBId}/photos`)
      .set('X-Invite-Token', albumAInvite);
    expect(res.status).toBe(403);
  });

  it('host secret A cannot delete photo from album B', async () => {
    // First upload a photo to B via B's invite
    const uploadRes = await request(app)
      .post(`/albums/${albumBId}/photos`)
      .set('X-Invite-Token', albumBInvite)
      .attach('photo', makeFakeJpeg(), { filename: 'test.jpg', contentType: 'image/jpeg' });
    expect(uploadRes.status).toBe(201);
    const photoBId = uploadRes.body.photoId;

    // Try to delete it with host A's secret
    const delRes = await request(app)
      .delete(`/albums/${albumBId}/photos/${photoBId}`)
      .set('Authorization', `Bearer ${albumAHost}`);
    expect(delRes.status).toBe(403);
  });

  it('host secret B cannot access album A dashboard', async () => {
    const res = await request(app)
      .get(`/host/${albumAId}/json`)
      .set('Authorization', `Bearer ${albumBHost}`);
    expect(res.status).toBe(403);
  });
});
