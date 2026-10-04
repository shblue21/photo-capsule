# English baseline validation

English UI validation performed October 3, 2026.

## Changes

The creation, confirmation, guest upload, gallery, management and error screens use English. Server validation and error responses, accessibility labels, demo labels, test fixtures and public documentation were translated. HTML language is en. Shared colors, layout, controls and authorization behavior were preserved.

README, Steering, specs and evidence descriptions use English. The design specification was updated to Node.js 24+, node:sqlite, sharp, the actual templates and management-key flow. The test suite contains 49 tests.

## Observed checks

- npm test: six suites and 49 tests passed after translation.
- npm run build: successful.
- Browser at 1365×900 and 390×844: inspected the English creation page.
- Real local workflow: created an English-named album, uploaded three synthetic images, opened the host dashboard, waited for the server-controlled one-minute reveal, viewed three guest photos and downloaded one successfully.
- Browser workflow: no JavaScript errors; no Korean text in the final page body.
- Text scan: no Korean characters in current source, tests, .kiro, scripts, Powers or public docs.

Screenshots: english-desktop.png, english-mobile.png and english-gallery.png.

## Boundaries

Browser-native date/time controls follow browser/OS locale even though the app language is English. Date strings rendered by the server are explicitly English and labeled UTC; the management view also displays dates in English with an explicit UTC label.

User-created album titles and descriptions are not automatically translated.
