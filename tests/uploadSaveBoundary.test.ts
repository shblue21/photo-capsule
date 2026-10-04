import express from 'express';
import request from 'supertest';
import { createTestDb, countPhotosByAlbum, listPhotosByAlbum } from '../src/db';
import { makeAlbumsRouter } from '../src/routes/albums';
import { makePhotosRouter } from '../src/routes/photos';
import { StorageProvider } from '../src/storage';
import { makeFakeJpeg } from './testHelper';

describe('upload completion at the reveal boundary', () => {
  test.each([-1, 0, 1])('storage finishes at revealAt %+d ms', async offset => {
    const now = 1_800_000_000_000;
    const revealAt = now + 60_000;
    const clock = jest.spyOn(Date, 'now').mockReturnValue(now);
    const db = createTestDb();
    const files = new Map<string, Buffer>();
    const remove = jest.fn(async (_album: string, name: string) => { files.delete(name); });
    const storage: StorageProvider = {
      async save(_album, name, buffer) {
        files.set(name, buffer);
        clock.mockReturnValue(revealAt + offset);
      },
      async read(_album, name) { return files.get(name)!; },
      delete: remove,
      async ensureAlbumDir() {},
    };
    const app = express();
    app.use(express.json());
    app.use('/albums', makeAlbumsRouter(db));
    app.use('/albums', makePhotosRouter(db, storage));
    try {
      const created = await request(app).post('/albums').send({title: 'Save boundary', revealAt});
      expect(created.status).toBe(201);
      const album = created.body;
      const result = await request(app).post(`/albums/${album.albumId}/photos`)
        .set('X-Invite-Token', album.inviteToken)
        .attach('photo', makeFakeJpeg(), {filename: 'synthetic.jpg'});
      expect(result.status).toBe(offset < 0 ? 201 : 403);
      expect(countPhotosByAlbum(db, album.albumId)).toBe(offset < 0 ? 1 : 0);
      expect(files.size).toBe(offset < 0 ? 1 : 0);
      expect(remove).toHaveBeenCalledTimes(offset < 0 ? 0 : 1);
      if (offset < 0) expect(listPhotosByAlbum(db, album.albumId)[0]!.uploaded_at).toBe(revealAt - 1);
      else expect(result.body.error).toBe('The album has opened. Uploads are now closed.');
    } finally {
      clock.mockRestore();
      db.close();
    }
  });
});
