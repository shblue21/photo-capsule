import request from 'supertest';
import sharp from 'sharp';
import {buildTestApp, makeFakeJpeg} from './testHelper';
import {MAX_PHOTOS_PER_ALBUM} from '../src/utils/imageValidator';
import {insertPhoto} from '../src/db';
import {randomId} from '../src/utils/tokens';

describe('real image and input integrity',()=>{
 const env=buildTestApp();afterAll(()=>env.cleanup());
 const create=()=>request(env.app).post('/albums').send({title:'Photo test',revealAt:Date.now()+60000});
 it.each([{}, {title:[]}, {title:' '}, {title:'x',description:{}}, {title:'x',revealAt:'bad'}])('rejects malformed creation %j',async bad=>{const r=await request(env.app).post('/albums').send({revealAt:Date.now()+60000,...bad});expect(r.status).toBe(400);});
 it('strips EXIF and returns a decodable image',async()=>{const a=(await create()).body;const b=await sharp(makeFakeJpeg()).withMetadata({exif:{IFD0:{Artist:'synthetic-test'}}}).jpeg().toBuffer();const up=await request(env.app).post(`/albums/${a.albumId}/photos`).set('X-Invite-Token',a.inviteToken).attach('photo',b,{filename:'sample.jpg'});expect(up.status).toBe(201);const r=await request(env.app).get(`/albums/${a.albumId}/photos/${up.body.photoId}`).set('Authorization','Bearer '+a.hostSecret);expect(r.status).toBe(200);const meta=await sharp(r.body).metadata();expect(meta.exif).toBeUndefined();expect(meta.width).toBe(40);});
 it('does not overbook the final album slot with concurrent uploads',async()=>{const a=(await create()).body;for(let i=0;i<MAX_PHOTOS_PER_ALBUM-1;i++)insertPhoto(env.db,{id:randomId(),album_id:a.albumId,stored_name:randomId()+'.jpg',mime_type:'image/jpeg',size_bytes:1,uploaded_at:Date.now()});const send=()=>request(env.app).post(`/albums/${a.albumId}/photos`).set('X-Invite-Token',a.inviteToken).attach('photo',makeFakeJpeg(),{filename:'sample.jpg'});const results=await Promise.all([send(),send()]);expect(results.map(x=>x.status).sort()).toEqual([201,400]);});
 it('rejects truncated images even with valid JPEG header',async()=>{const a=(await create()).body;const r=await request(env.app).post(`/albums/${a.albumId}/photos`).set('X-Invite-Token',a.inviteToken).attach('photo',makeFakeJpeg().subarray(0,16),{filename:'broken.jpg'});expect(r.status).toBe(400);});
});

describe('host browser boundary',()=>{
 const env=buildTestApp();afterAll(()=>env.cleanup());
 it('serves only a login shell without exposing album metadata or management key',async()=>{const a=(await request(env.app).post('/albums').send({title:'Private-title-unique',description:'Private-description-unique',revealAt:Date.now()+60000})).body;const r=await request(env.app).get(`/host/${a.albumId}`);expect(r.status).toBe(200);for(const value of [a.hostSecret,a.inviteToken,'Private-title-unique','Private-description-unique'])expect(r.text).not.toContain(value);expect((await request(env.app).get(`/host/${a.albumId}/json`)).status).toBe(401);});
 it('requires participant invitation for uploads even with a host credential',async()=>{const a=(await request(env.app).post('/albums').send({title:'Host upload test',revealAt:Date.now()+60000})).body;const r=await request(env.app).post(`/albums/${a.albumId}/photos`).set('Authorization','Bearer '+a.hostSecret).attach('photo',makeFakeJpeg(),{filename:'sample.jpg'});expect(r.status).toBe(401);});
});
