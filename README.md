# Photo Capsule

Collect event photos through an invitation link or QR code, then open the album together at an agreed time. Built with Kiro as a working local Kiro University project. The interface and public project documentation use English.

## Run locally

Requires Node.js 24 or newer and npm.

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:3000. Alternatively, run `npm run build` then `npm start`. Use the `PORT` environment variable to choose another port. `.env` files are not loaded automatically.

## Try the one-minute demo

1. Enter a capsule name and select **Quick demo · opens in 1 minute**.
2. Create the capsule and keep its management key private. The current tab remembers it.
3. Open the guest view and upload the synthetic illustrations in `docs/demo-assets/`.
4. The page automatically switches to the gallery at reveal time. Open a photo to download it.
5. The host dashboard supports pre-reveal review and two-step deletion.

The QR code points to localhost and works only on this computer. No public hosting or live S3 connection is configured.

## Behavior

- Separate invitation and management credentials; album-scoped access checks.
- Server-controlled reveal time and upload cutoff.
- Full image decoding, EXIF removal and JPEG normalization; GIFs use the first frame.
- Limits: 20 MB input, 24 million decoded pixels and 200 photos per album.
- Persistent SQLite metadata and private filesystem storage.
- Upload progress, retry feedback, keyboard-accessible photo viewing and downloads.

Anyone with the invitation can view the album after reveal. Hosts can review photos beforehand. Lost management keys cannot be recovered in this version. Original metadata and encoding are not preserved. User-authored album names and descriptions are not translated.

## Verify

```sh
npm test
npm run build
npm audit
npm audit --omit=dev
```

The suite contains 55 tests, including 11 fast-check properties. Tests use isolated databases and synthetic images. A previous browser run verified creation, three uploads, host review, scheduled reveal and downloading. See `docs/english-validation.md` for the current English UI validation. A passing dependency audit is not a security certification.

## Kiro University evidence

- [Development workflow and evidence](docs/evidence.md)
- [IDE property-based testing](docs/ide-pbt-evidence.md)
- [Design System Power review](docs/design-power-review.md)
- [MCP and Hook execution](docs/integration-evidence.md)
- [Custom agent review](docs/custom-agent-review.md)
- [Kiro workflow and runtime evidence](docs/verification/runtime-results.md)

Real S3, public deployment, multiple-server operation, Safari and physical mobile devices have not been verified. Rate limiting, account recovery, invitation revocation and cloud operating policies remain future work before public service operation.

`data/`, `.env` and `node_modules/` are excluded from Git.
