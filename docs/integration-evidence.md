# Kiro MCP and Hook execution evidence

On 2026-10-03 (Asia/Seoul), the Kiro IDE Default agent called `@aws-docs/read_documentation` twice for the AWS S3 Block Public Access guide, starting at offsets 0 and 8000. The MCP returned documentation text; no AWS account API was called.

Source: https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-control-block-public-access.html

The future S3 design should retain all four public-access blocks, avoid public ACLs, and restrict object access to the application role. The app must still enforce its own invitation and reveal-time rules. Public-access blocks are not a replacement for application authorization. These are design conclusions; no S3 adapter or cloud resources were deployed.

The IDE then edited only the server-clock comment in `src/utils/albumInput.ts`. The registered PostFileSave hook automatically ran `scripts/typecheck-hook.cjs`, which executes TypeScript checking and records the exit code. It was not manually invoked.

Captured typecheck log: [hook-output.jsonl](hook-output.jsonl):

```json
{"at":"2026-10-02T15:52:01.894Z","event":"typecheck","exitCode":0}
```

The UTC log corresponds to 2026-10-03 00:52:01 in Korea. A shareable copy is `docs/hook-output.jsonl`. Configuration is in `.kiro/hooks/typecheck.json` and `.kiro/settings/mcp.json`.

A subsequent IDE configuration session triggered eight hooks across four saves. Those logs are in [docs/verification/typecheck-hook.jsonl](verification/typecheck-hook.jsonl) and [docs/verification/domain-tests-hook.jsonl](verification/domain-tests-hook.jsonl) (four entries each, 16:31–16:32 UTC on October 2, 2026), and record the IDE four-save session described in [docs/verification/runtime-results.md](verification/runtime-results.md). All eight entries record exit code 0. This later session is separate from the 15:52 MCP-session typecheck above.
