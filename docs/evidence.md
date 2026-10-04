# Development workflow and evidence

Verified development workflow and supporting artifacts.

## Implementation and verification

Kiro CLI 2.21.4 produced the initial specs, steering, routes and 28 tests.

Kiro IDE activated the AWS Design System Power for a UI review, generated and ran 11 property tests, and selected the photo-reviewer agent to inspect the app and run the then-current 47-test suite. Two regression tests subsequently brought the suite to 49. The current suite contains 55 tests, including storage-completion boundary and review-Power dependency checks.

## Verified lesson activity

| Lesson | Observed activity | Artifact |
|---|---|---|
| Specs | Kiro created requirements, design and tasks before initial implementation | `.kiro/specs/photo-capsule/` |
| Steering | Four always-included files appeared in a new IDE session | `.kiro/steering/`, `verification/runtime-results.md` |
| Hooks | IDE saves triggered typechecking and the existing 49-test suite | `.kiro/hooks/`, [docs/hook-output.jsonl](hook-output.jsonl) (15:52 UTC typecheck), [typecheck](verification/typecheck-hook.jsonl) and [domain-tests](verification/domain-tests-hook.jsonl) logs in `docs/verification/` (16:31–16:32 UTC, four-save session) |
| PBT | IDE-generated properties executed successfully | `ide-pbt-evidence.md` |
| Powers | Official design review and the installed custom review Power | `design-power-review.md`, `verification/power-review.md` |
| MCP | AWS Documentation MCP retrieved S3 public-access guidance | `integration-evidence.md` |
| Custom agents | photo-reviewer inspected routes and ran tests | `custom-agent-review.md` |

The custom Power was imported and exercised in Kiro.

## Scope and limitations

Prior local browser checks used synthetic images and verified creation, QR display, uploads, host review, timed reveal and downloading. Mobile checks used a 390px browser viewport, not a physical phone. See `english-validation.md` for English UI validation.

Automatic Hook results and manual runs are identified in `verification/runtime-results.md`. The app uses local SQLite and filesystem storage; live S3 and public hosting have not been verified.
