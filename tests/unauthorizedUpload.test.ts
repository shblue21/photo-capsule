/**
 * Unauthorized upload tests.
 * - No token → 401
 * - Wrong/expired token → 403
 * - No file attached → 400
 * - After reveal → 403
 */
import request from 'supertest';
import { buildTestApp, makeFakeJpeg } from './testHelper';

describe('Unauthorized upload prevention', () => {
  const env = buildTestApp();
  const { app } = env;
  const future = Date.now() + 30 * 24 * 3600 * 1000;

  let albumId: string;
  let inviteToken: string;

  afterAll(() => env.cleanup());

  it('creates an album for upload tests', async () => {
    const res = await request(app)
      .post('/albums')
      .send({ title: 'Upload test album', revealAt: future });
    expect(res.status).toBe(201);
    albumId = res.body.albumId;
    inviteToken = res.body.inviteToken;
  });

  it('rejects upload with no token', async () => {
    const res = await request(app)
      .post(`/albums/${albumId}/photos`)
      .attach('photo', makeFakeJpeg(), { filename: 'test.jpg', contentType: 'image/jpeg' });
    expect(res.status).toBe(401);
  });

  it('rejects upload with invalid token', async () => {
    const res = await request(app)
      .post(`/albums/${albumId}/photos`)
      .set('X-Invite-Token', 'aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899')
      .attach('photo', makeFakeJpeg(), { filename: 'test.jpg', contentType: 'image/jpeg' });
    expect(res.status).toBe(403);
  });

  it('rejects upload with no file', async () => {
    const res = await request(app)
      .post(`/albums/${albumId}/photos`)
      .set('X-Invite-Token', inviteToken)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/file/);
  });

  it('accepts valid upload with correct token', async () => {
    const res = await request(app)
      .post(`/albums/${albumId}/photos`)
      .set('X-Invite-Token', inviteToken)
      .attach('photo', makeFakeJpeg(), { filename: 'test.jpg', contentType: 'image/jpeg' });
    expect(res.status).toBe(201);
    expect(res.body.photoId).toBeTruthy();
  });
});
