import { DatabaseSync } from 'node:sqlite';
import * as fs from 'fs';
import * as path from 'path';

const DB_PATH = process.env['DB_PATH'] ?? './data/capsule.db';

// Ensure data directory exists
const dbDir = path.dirname(path.resolve(DB_PATH));
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

let _db: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (!_db) {
    _db = new DatabaseSync(path.resolve(DB_PATH));
    _db.exec(`PRAGMA journal_mode=WAL;`);
    _db.exec(`PRAGMA foreign_keys=ON;`);
    initSchema(_db);
  }
  return _db;
}

export function closeDb(): void {
  if (_db) {
    _db.close();
    _db = null;
  }
}

/** For tests: create a fresh in-memory database */
export function createTestDb(): DatabaseSync {
  const db = new DatabaseSync(':memory:');
  db.exec(`PRAGMA foreign_keys=ON;`);
  initSchema(db);
  return db;
}

function initSchema(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS albums (
      id           TEXT PRIMARY KEY,
      title        TEXT NOT NULL,
      description  TEXT,
      invite_token TEXT UNIQUE NOT NULL,
      host_secret  TEXT UNIQUE NOT NULL,
      reveal_at    INTEGER NOT NULL,
      created_at   INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS photos (
      id           TEXT PRIMARY KEY,
      album_id     TEXT NOT NULL REFERENCES albums(id),
      stored_name  TEXT NOT NULL,
      mime_type    TEXT NOT NULL,
      size_bytes   INTEGER NOT NULL,
      uploaded_at  INTEGER NOT NULL
    );
  `);
}

// ─── Album helpers ────────────────────────────────────────────────────────────

export interface Album {
  id: string;
  title: string;
  description: string | null;
  invite_token: string;
  host_secret: string;
  reveal_at: number;
  created_at: number;
}

export interface Photo {
  id: string;
  album_id: string;
  stored_name: string;
  mime_type: string;
  size_bytes: number;
  uploaded_at: number;
}

export function insertAlbum(db: DatabaseSync, album: Album): void {
  db.prepare(`
    INSERT INTO albums (id, title, description, invite_token, host_secret, reveal_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(album.id, album.title, album.description ?? null, album.invite_token, album.host_secret, album.reveal_at, album.created_at);
}

export function getAlbumById(db: DatabaseSync, id: string): Album | undefined {
  return db.prepare<Album>(`SELECT * FROM albums WHERE id = ?`).get(id) as Album | undefined;
}

export function getAlbumByInviteToken(db: DatabaseSync, token: string): Album | undefined {
  return db.prepare<Album>(`SELECT * FROM albums WHERE invite_token = ?`).get(token) as Album | undefined;
}

export function getAlbumByHostSecret(db: DatabaseSync, secret: string): Album | undefined {
  return db.prepare<Album>(`SELECT * FROM albums WHERE host_secret = ?`).get(secret) as Album | undefined;
}

export function insertPhoto(db: DatabaseSync, photo: Photo): void {
  db.prepare(`
    INSERT INTO photos (id, album_id, stored_name, mime_type, size_bytes, uploaded_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(photo.id, photo.album_id, photo.stored_name, photo.mime_type, photo.size_bytes, photo.uploaded_at);
}

export function getPhotoById(db: DatabaseSync, id: string): Photo | undefined {
  return db.prepare<Photo>(`SELECT * FROM photos WHERE id = ?`).get(id) as Photo | undefined;
}

export function listPhotosByAlbum(db: DatabaseSync, albumId: string): Photo[] {
  return db.prepare<Photo>(`SELECT * FROM photos WHERE album_id = ? ORDER BY uploaded_at ASC`).all(albumId) as Photo[];
}

export function countPhotosByAlbum(db: DatabaseSync, albumId: string): number {
  const row = db.prepare<{ count: number }>(`SELECT COUNT(*) as count FROM photos WHERE album_id = ?`).get(albumId) as { count: number } | undefined;
  return row?.count ?? 0;
}

export function deletePhoto(db: DatabaseSync, id: string): void {
  db.prepare(`DELETE FROM photos WHERE id = ?`).run(id);
}
