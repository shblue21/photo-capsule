---
inclusion: always
---

# Photo Capsule product rules

Photo Capsule is a working local photo time capsule. Keep the first version focused on collecting and revealing event photos.

## User flow

Host creates a capsule, shares an invitation/QR, guests upload before the reveal, and the server unlocks the gallery at the agreed time. The host has a separate management key and can inspect/delete before reveal; disclose this exception to guests. Public reveal also closes uploads. Quick demo mode is one minute.

## Data and boundaries

Album, photo, invitation token and management key are distinct. Bind both the credential and photo to the requested album. Never infer authorization from a filename. Metadata lives in SQLite and images behind StorageProvider; no public static upload directory. Use server time and treat the exact reveal instant as open. Decode photos, remove EXIF, persist random filenames. Examples must be synthetic.

Good: check token → album ownership → server reveal time → read photo.
Bad: hide a gallery in the browser while the image URL remains public.

No real AWS calls, public hosting or publication in the current local scope.
