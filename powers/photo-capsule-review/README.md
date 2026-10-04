# Photo Capsule Review Power

Reusable Kiro review workflow for private event-photo apps.

## Install in Kiro

Open Powers → Add Custom Power → Import power from a folder, and select this directory. POWER.md supplies the IDE entry point; plugin.json is the package manifest; skills/review contains the workflow, executable script and report template.

Ask Kiro: "Activate photo-capsule-review and review this project using its specs and steering. Run the bundled checks and write a report using the template. Do not change application code."

## Local command

After reviewing and trusting the target project and installing its declared dependencies:

```sh
node powers/photo-capsule-review/skills/review/scripts/review.cjs .
```

The script runs installed TypeScript and Jest only, preserves their exit status and saves JSON/text under data/evidence. It requires Node.js 24+ and does not call AWS or install packages. Existing test commands execute project code; use only on a trusted project.

The Power was installed, activated and executed in Kiro IDE on 2026-10-03. See docs/verification/runtime-results.md in the Photo Capsule repository for the observed results. This is execution evidence, not a security certification.
