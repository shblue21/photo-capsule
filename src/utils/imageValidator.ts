import sharp from 'sharp';
export const ALLOWED_MIME_TYPES = new Set(['image/jpeg','image/png','image/webp','image/gif']);
export const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;
export const MAX_PHOTOS_PER_ALBUM = 200;
export interface ValidationResult { valid:boolean; error?:string; mime?:string; buffer?:Buffer }
export async function validateImageBuffer(buffer:Buffer):Promise<ValidationResult> {
  if (!buffer.length || buffer.length > MAX_FILE_SIZE_BYTES) return {valid:false,error:'Photos must be non-empty and no larger than 20 MB.'};
  try {
    const image = sharp(buffer, {limitInputPixels: 24000000, failOn:'warning', animated:false});
    const meta = await image.metadata();
    if (!['jpeg','png','webp','gif'].includes(meta.format || '')) return {valid:false,error:'Choose a JPEG, PNG, WebP, or GIF image.'};
    // Decode every pixel and re-encode; default output strips EXIF/location metadata.
    const normalized = await image.rotate().flatten({background:'#fff'}).jpeg({quality:90}).toBuffer();
    if (normalized.length > MAX_FILE_SIZE_BYTES) return {valid:false,error:'The processed image is too large.'};
    return {valid:true,mime:'image/jpeg',buffer:normalized};
  } catch { return {valid:false,error:'This image is damaged or too large. Please choose another photo.'}; }
}
