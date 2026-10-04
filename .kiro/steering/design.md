---
inclusion: always
---

# Preserve the accepted photo app design

Use the lavender-and-white design in src/views/style.ejs and create.ejs. Visual references: docs/english-desktop.png and docs/english-mobile.png.

Keep the desktop album-preview/form pairing, mobile single column, overlapping album cards, rounded white surfaces, readable hierarchy and English wording. Reuse --accent, --ink, --muted and other shared tokens. Keep file inputs, visible keyboard focus, inline errors, upload progress and native dialog behavior.

Good: add an error message inside the existing form without changing its layout or palette.
Bad: replace the complete template, switch to a different color system, remove the album preview or change the user journey while fixing backend behavior.

For a view change, inspect the actual browser at 390px and desktop width. Check overflow and the affected create/invite/gallery flow. TypeScript success alone does not validate EJS scripts or appearance. Discuss a new visual direction before replacing the existing one.
