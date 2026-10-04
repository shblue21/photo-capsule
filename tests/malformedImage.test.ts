/**
 * Malformed image rejection tests.
 * - Plaintext/binary non-image → 400
 * - Zero-byte file → 400
 * - Non-image data disguised as .jpg (sharp decode fails) → 400
 * - Valid JPEG (passes full sharp decode) → 201
 * - Valid PNG (passes full sharp decode) → 201
 */
import request from 'supertest';
import { buildTestApp, makeFakeJpeg, makeFakePng, makeFakeText } from './testHelper';

describe('Malformed image rejection', () => {
  const env = buildTestApp();
  const { app } = env;
  const future = Date.now() + 30 * 24 * 3600 * 1000;

  let albumId: string;
  let inviteToken: string;

  afterAll(() => env.cleanup());

  it('creates an album', async () => {
    const res = await request(app)
      .post('/albums')
      .send({ title: 'Image validation test', revealAt: future });
    expect(res.status).toBe(201);
    albumId = res.body.albumId;
    inviteToken = res.body.inviteToken;
  });

  it('rejects zero-byte file', async () => {
    const res = await request(app)
      .post(`/albums/${albumId}/photos`)
      .set('X-Invite-Token', inviteToken)
      .attach('photo', Buffer.alloc(0), { filename: 'empty.jpg', contentType: 'image/jpeg' });
    expect(res.status).toBe(400);
  });

  it('rejects plaintext disguised as JPEG', async () => {
    const res = await request(app)
      .post(`/albums/${albumId}/photos`)
      .set('X-Invite-Token', inviteToken)
      .attach('photo', makeFakeText(), { filename: 'notanimage.jpg', contentType: 'image/jpeg' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeTruthy();
  });

  it('rejects a PDF disguised as JPEG', async () => {
    // PDF magic: %PDF
    const pdf = Buffer.alloc(512);
    pdf[0] = 0x25; pdf[1] = 0x50; pdf[2] = 0x44; pdf[3] = 0x46; // %PDF
    const res = await request(app)
      .post(`/albums/${albumId}/photos`)
      .set('X-Invite-Token', inviteToken)
      .attach('photo', pdf, { filename: 'fake.jpg', contentType: 'image/jpeg' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/damaged|large|photo/i);
  });

  it('accepts a valid JPEG (passes full image decode)', async () => {
    const res = await request(app)
      .post(`/albums/${albumId}/photos`)
      .set('X-Invite-Token', inviteToken)
      .attach('photo', makeFakeJpeg(4096), { filename: 'photo.jpg', contentType: 'image/jpeg' });
    expect(res.status).toBe(201);
  });

  it('accepts a valid PNG (passes full image decode)', async () => {
    const res = await request(app)
      .post(`/albums/${albumId}/photos`)
      .set('X-Invite-Token', inviteToken)
      .attach('photo', makeFakePng(4096), { filename: 'photo.png', contentType: 'image/png' });
    expect(res.status).toBe(201);
  });

  it('rejects header-only corrupt GIF', async () => {
    // GIF magic: GIF87a or GIF89a
    const gif = Buffer.alloc(64, 0x00);
    gif[0] = 0x47; gif[1] = 0x49; gif[2] = 0x46; gif[3] = 0x38; gif[4] = 0x39; gif[5] = 0x61;
    // GIF header present, but sharp cannot fully decode the truncated body → rejected
    const res = await request(app)
      .post(`/albums/${albumId}/photos`)
      .set('X-Invite-Token', inviteToken)
      .attach('photo', gif, { filename: 'anim.gif', contentType: 'image/gif' });
    expect(res.status).toBe(400);
  });
});
