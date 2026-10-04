---
name: photo-capsule-review
description: Review a photo-capsule project using its specs, persistent rules and local validation, then report evidence.
---

# Review Photo Capsule

1. Read the target project's .kiro/steering files, requirements and package.json. Confirm it is the intended trusted project before executing its tests.
2. Trace guest and host credentials through the photo routes. Check album binding, exact reveal boundary, pre-reveal host exception, image decoding/EXIF removal and private storage. Check that UI changes preserve the accepted design.
3. Run the bundled scripts/review.cjs with the absolute target project directory. It uses only the target's already-installed TypeScript and Jest, preserves exit codes, and writes reports under target/data/evidence. It never installs dependencies or calls AWS.
4. Read the actual JSON and text outputs. Use references/report-template.md to create the requested report under docs/verification. Give file evidence for findings; label untested conditions.
5. Do not edit application code, stored photos, cloud resources or publish anything. Stop on a missing dependency rather than claim success. A passing check is not a security certification.
