import * as crypto from 'crypto';

/**
 * Generates a cryptographically random hex token of the specified byte length.
 * Default: 32 bytes → 64 hex chars
 */
export function randomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Generates a cryptographically random UUID v4.
 */
export function randomId(): string {
  return crypto.randomUUID();
}

/**
 * Returns the extension (including dot) for a given MIME type.
 * Falls back to empty string for unknown types.
 */
export function extensionForMime(mime: string): string {
  const map: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
  };
  return map[mime] ?? '';
}
