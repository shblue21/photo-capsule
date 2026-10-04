import * as fs from 'fs';
import * as path from 'path';
import * as fsp from 'fs/promises';

/**
 * Abstraction layer for photo storage.
 * Swap LocalStorageProvider for S3StorageProvider to migrate to S3.
 */
export interface StorageProvider {
  save(albumId: string, filename: string, buffer: Buffer): Promise<void>;
  read(albumId: string, filename: string): Promise<Buffer>;
  delete(albumId: string, filename: string): Promise<void>;
  ensureAlbumDir(albumId: string): Promise<void>;
}

export class LocalStorageProvider implements StorageProvider {
  private baseDir: string;

  constructor(baseDir?: string) {
    this.baseDir = path.resolve(baseDir ?? process.env['UPLOAD_DIR'] ?? './data/uploads');
  }

  async ensureAlbumDir(albumId: string): Promise<void> {
    this.resolveFilePath(albumId, 'probe');
    const dir = path.join(this.baseDir, albumId);
    await fsp.mkdir(dir, { recursive: true });
  }

  async save(albumId: string, filename: string, buffer: Buffer): Promise<void> {
    await this.ensureAlbumDir(albumId);
    const filePath = this.resolveFilePath(albumId, filename);
    await fsp.writeFile(filePath, buffer);
  }

  async read(albumId: string, filename: string): Promise<Buffer> {
    const filePath = this.resolveFilePath(albumId, filename);
    return fsp.readFile(filePath);
  }

  async delete(albumId: string, filename: string): Promise<void> {
    const filePath = this.resolveFilePath(albumId, filename);
    try {
      await fsp.unlink(filePath);
    } catch {
      // Ignore missing file on delete
    }
  }

  /**
   * Resolves and validates a file path to prevent directory traversal.
   * Throws if the resolved path escapes the album directory.
   */
  private resolveFilePath(albumId: string, filename: string): string {
    // albumId and filename must not contain path separators or dots that escape
    if (!/^[a-zA-Z0-9_-]+$/.test(albumId) || !/^[a-zA-Z0-9_-]+\.[a-zA-Z0-9]+$/.test(filename) && filename !== 'probe') throw new Error('Invalid storage key');
    const safeAlbumId = path.basename(albumId);
    const safeFilename = path.basename(filename);
    const albumDir = path.join(this.baseDir, safeAlbumId);
    const filePath = path.join(albumDir, safeFilename);
    if (!filePath.startsWith(albumDir + path.sep) && filePath !== albumDir) {
      throw new Error('Path traversal detected');
    }
    return filePath;
  }
}

// Singleton storage instance for the application
let _storage: StorageProvider | null = null;

export function getStorage(): StorageProvider {
  if (!_storage) {
    // Future: if (process.env.STORAGE_BACKEND === 's3') { _storage = new S3StorageProvider(); }
    _storage = new LocalStorageProvider();
  }
  return _storage;
}

/** For tests: use a fresh isolated storage */
export function createTestStorage(baseDir: string): StorageProvider {
  fs.mkdirSync(baseDir, { recursive: true });
  return new LocalStorageProvider(baseDir);
}
