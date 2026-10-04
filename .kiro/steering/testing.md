---
inclusion: always
---

# Tests and evidence

Node.js 24+, Jest, supertest and fast-check. Existing tests use isolated databases and synthetic decodable images. Never operate on the user's stored photos during a test.

- Source changes to album access, clock rules or storage: run npm test and npm run build.
- PostFileSave typecheck hook: existing scripts/typecheck-hook.cjs.
- PostFileSave domain-test hook: scripts/domain-tests-hook.cjs, selected src/tests TypeScript paths.
- Review Power: node powers/photo-capsule-review/skills/review/scripts/review.cjs .
- EJS/CSS edits require browser validation; these TypeScript hooks do not cover frontend layout.

Preserve the subprocess exit status. Do not use a pipeline to tail output unless pipefail or explicit child-exit propagation is in place.

Example domain rules: guest access is false one millisecond before reveal and true at reveal; album A credentials cannot access album B; corrupt images are rejected even with a valid header; simultaneous uploads cannot exceed the album cap.

Reports must identify command, observed exit status, passed tests and untested scope. Distinguish Kiro-triggered hooks from manually run scripts. Do not turn a configuration file, reviewer claim or local test into proof of cloud operation.
