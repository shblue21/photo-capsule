# Implementation Plan: Submission Readiness

## Overview

Eight surgical fixes to the existing Photo Capsule application covering UI behavior and documentation accuracy. No new product features, no schema changes, no new dependencies, no new source files. Changes are confined to three EJS/CSS view files and four documentation files. Source-code fixes come first (tasks 1–3), followed by a mandatory checkpoint, then documentation fixes (tasks 5, 6, 8 and 9), followed by a final verification checkpoint.

Note on hooks: the PostFileSave hooks match only `.ts` files. Saving `.ejs` or `.md` files does not trigger them. Verification for EJS/CSS changes uses `npm run build`, `npm test`, and browser inspection.

---

## Tasks

- [x] 1. Fix `src/views/host.ejs` — Enter submission, timezone label, photo-count pluralization
  - [x] 1.1 Add Enter-key submission to the management-key login section
    - Wrap the existing `<label for="key">`, `<input id="key" type="password" autocomplete="off">`, and `<button class="wide" id="enter">` in a `<form>` element.
    - Set the form attribute: `onsubmit="event.preventDefault();secret=document.getElementById('key').value.trim();if(secret)load();"`.
    - Change the button to `type="submit"` and remove `id="enter"` (it is no longer needed as an onclick target).
    - In the `<script>` block, remove the line `document.getElementById('enter').onclick=()=>{secret=document.getElementById('key').value.trim();load();};`.
    - The `if(secret)` guard in `onsubmit` ensures pressing Enter on an empty input takes no action (R1-AC2).
    - Preserve all other login-section markup, class names, and layout exactly.
    - _Requirements: 1.1, 1.2, 1.3 — Design: C-1_
  - [x] 1.2 Fix client-side timezone label in the reveal-time display
    - In the `<script>` block, locate the line: `document.getElementById('when').textContent=new Date(j.album.reveal_at).toLocaleString('en-US')+' · reveal';`
    - Replace the `toLocaleString` call with: `new Date(j.album.reveal_at).toLocaleString('en-US',{timeZone:'UTC',timeZoneName:'short'})`
    - Use exactly `{timeZone:'UTC',timeZoneName:'short'}` — this is the same options object already used in `src/index.ts` and `src/routes/invite.ts`. Do NOT add `dateStyle` or `timeStyle`; combining those with `timeZoneName` throws a TypeError in V8.
    - The resulting string will be of the form `"11/14/2023, 10:13:20 PM UTC · reveal"`.
    - _Requirements: 3.3 — Design: C-3_
  - [x] 1.3 Fix photo-count pluralization in the dashboard header
    - In the `<script>` block, locate: `document.getElementById('count').textContent=j.photoCount+' photos';`
    - Replace with: `document.getElementById('count').textContent=j.photoCount+(j.photoCount===1?' photo':' photos');`
    - _Requirements: 5.1, 5.2 — Design: C-5 (host.ejs, 1 site)_
  - [x] 1.4 Verify host.ejs changes
    - Run `npm run build` — must exit 0 (TypeScript compilation followed by copying EJS templates; browser checks validate rendered views).
    - Run `npm test` — all 55 tests must pass.
    - Open `http://localhost:3000/host/<any-album-id>` in a browser. Type a key and press Enter; confirm `load()` is called (dashboard loads or error appears in `#status`). Confirm empty-input Enter does nothing.
    - Open the host dashboard for a real album; confirm `#when` shows a date ending with "UTC · reveal".
    - Note: saving `host.ejs` does not trigger the PostFileSave hooks (they match `.ts` only).
    - _Requirements: 1.1–1.3, 3.3, 5.1–5.2_

- [x] 2. Fix `src/views/invite.ejs` — five pluralization sites
  - [x] 2.1 Fix upload-button label pluralization in `render()`
    - Locate: `btn.textContent=pending.length?'Add '+pending.length+' photos':'Choose your photos';`
    - Replace with: `btn.textContent=pending.length?'Add '+pending.length+(pending.length===1?' photo':' photos'):'Choose your photos';`
    - _Requirements: 5.6, 5.7 — Design: C-5 (invite.ejs site 1)_
  - [x] 2.2 Fix upload-progress pluralization
    - Locate: `status.textContent=(i+1)+' / '+total+' photos uploading…';`
    - Replace with: `status.textContent=(i+1)+' / '+total+(total===1?' photo uploading…':' photos uploading…');`
    - _Requirements: 5.5 — Design: C-5 (invite.ejs site 2)_
  - [x] 2.3 Fix upload-completion status pluralization
    - Locate: `status.textContent=ok+' photos added.'+(errors.length?'\n'+errors.join('\n'):' See you at the reveal!');`
    - Replace with: `status.textContent=ok+(ok===1?' photo added.':' photos added.')+(errors.length?'\n'+errors.join('\n'):' See you at the reveal!');`
    - _Requirements: 5.3, 5.4 — Design: C-5 (invite.ejs site 3)_
  - [x] 2.4 Fix retry-button label pluralization
    - Locate: `if(retry.length)btn.textContent='Retry '+retry.length+' photos';`
    - Replace with: `if(retry.length)btn.textContent='Retry '+retry.length+(retry.length===1?' photo':' photos');`
    - _Requirements: 5.8 — Design: C-5 (invite.ejs site 4)_
  - [x] 2.5 Fix post-reveal gallery count pluralization
    - Locate: `status.textContent=j.photos.length?j.photos.length+' shared moments.':'No photos were added.';`
    - Replace with: `status.textContent=j.photos.length?j.photos.length+(j.photos.length===1?' shared moment.':' shared moments.'):'No photos were added.';`
    - _Requirements: 5.9, 5.10 — Design: C-5 (invite.ejs site 5)_
  - [x] 2.6 Verify invite.ejs changes
    - Run `npm run build` — must exit 0.
    - Run `npm test` — all 55 tests must pass.
    - Open the guest upload page in a browser. Select exactly 1 file and confirm the button reads "Add 1 photo". Upload it and confirm completion reads "1 photo added."
    - Note: saving `invite.ejs` does not trigger the PostFileSave hooks (they match `.ts` only).
    - _Requirements: 5.3–5.10_

- [x] 3. Fix `src/views/style.ejs` — 320 px overflow and 44 px touch targets
  - [x] 3.1 Add 320 px breakpoint to contain decorative overflow
    - Locate the final `@media` rule in `style.ejs` (`@media(prefers-reduced-motion:reduce){*{transition:none!important}}`).
    - Append the following new rule immediately after it, before the closing `</style>` tag:
      `@media(max-width:360px){.album-preview{overflow:hidden}.orbit-two{width:calc(100% - 15px)}}`
    - Do not modify the `@media(max-width:760px)` block or any other existing breakpoint.
    - _Requirements: 2.1, 2.2, 2.3, 2.4 — Design: C-2_
  - [x] 3.2 Raise `.quick-button` min-height to 44 px and add min-height to `.brand`
    - In the `.quick-button` rule, change `min-height:34px` to `min-height:44px`.
    - In the `.brand` rule, append `;min-height:44px` to the existing property list before its closing `}`.
    - Do not change any other property on either rule, and do not touch the global `button,.button` rule (which already sets `min-height:46px`).
    - _Requirements: 4.1, 4.2, 4.6, 4.7 — Design: C-4_
  - [x] 3.3 Verify style.ejs changes
    - Run `npm run build` — must exit 0.
    - Open `http://localhost:3000` in a browser with DevTools open.
    - At 320 px emulated viewport: confirm no horizontal scrollbar; verify `document.body.scrollWidth === 320` in the console.
    - In the console run: `getComputedStyle(document.querySelector('.quick-button')).minHeight` — must return `"44px"`.
    - In the console run: `document.querySelector('.brand').getBoundingClientRect().height` — must return a number ≥ `44`.
    - Note: saving `style.ejs` does not trigger the PostFileSave hooks (they match `.ts` only).
    - _Requirements: 2.1–2.4, 4.1, 4.2_

- [x] 4. Checkpoint — source-code fixes verified before documentation
  - All three source files edited (tasks 1–3) and their verification steps passed.
  - `npm test` passes (55 tests) and `npm run build` exits 0.
  - Browser checks for Enter submission, timezone label, pluralization at count=1, 320 px overflow, and touch-target sizes all confirmed.
  - Verification results (October 4, 2026, isolated local data): empty-key Enter sent 0 login requests; valid-key Enter sent 1 and loaded the dashboard; the reveal label included UTC.
  - Single-photo flow: `Add 1 photo` → synthetic upload failure → `Retry 1 photo` → `1 photo added.`; host count `1 photo`; after the actual reveal time, gallery count `1 shared moment.`. No page JavaScript errors occurred.
  - Viewport/scroll widths: 320/320, 390/390, 1440/1440. Quick-demo min-height: 44px at each width. Brand height: 54.375px at 320px and 44px at the other widths.
  - Do not proceed to documentation tasks (5, 6, 8 and 9) until this checkpoint is cleared.

- [x] 5. Fix `docs/ide-pbt-evidence.md` — narrow P-IR-3 derivation rationale
  - [x] 5.1 Replace the overclaiming sentence in the P-IR-3 table row
    - Open `docs/ide-pbt-evidence.md` and locate the P-IR-3 row in the `isRevealed` requirement-to-property table.
    - In the "Derivation rationale" cell, the current text ends with the sentence: `"FR-15 requires the server clock to be authoritative and only move forward."`
    - Replace that sentence only with: `"isRevealed is a pure function. This property demonstrates that its output is monotonically non-decreasing as \`now\` increases when \`revealAt\` is held constant: once \`isRevealed\` returns true for a given \`now\`, it returns true for any larger value. The property does not verify that production callers supply a monotonically increasing \`now\`, nor that the revealed state persists across process restarts or concurrent requests."`
    - Do NOT alter the Property ID (`P-IR-3`), Property description, Requirement column, or Runs column.
    - Do NOT remove the test pass result (11/11), any run count, or any other content in the file.
    - _Requirements: 7.1, 7.2, 7.3, 7.4 — Design: C-7_
  - [x] 5.2 Verify the rationale is narrowed correctly
    - Read `docs/ide-pbt-evidence.md` P-IR-3 row and confirm the sentence "FR-15 requires the server clock to be authoritative and only move forward." is gone and replaced with the scoped pure-function description.
    - Confirm the P-IR-3 test pass result, run count (1000), and all other table rows are unchanged.
    - _Requirements: 7.1, 7.4_

- [x] 6. Fix `docs/integration-evidence.md` — add later hook-session reference
  - [x] 6.1 Add a paragraph referencing the four-save IDE session logs
    - Open `docs/integration-evidence.md`.
    - Preserve the existing paragraph that references `docs/hook-output.jsonl` and the timestamp `2026-10-02T15:52:01.894Z` exactly as written — this is the MCP-session typecheck entry and must NOT be changed, moved, or have its path altered.
    - After the final sentence of that existing paragraph, add a new paragraph:
      `"A subsequent IDE configuration session triggered eight hooks across four saves. Those logs are in \`docs/verification/typecheck-hook.jsonl\` and \`docs/verification/domain-tests-hook.jsonl\` (four entries each, 16:31–16:32 UTC), and record the IDE four-save session described in \`docs/verification/runtime-results.md\`."`
    - Do NOT change `docs/hook-output.jsonl` to any other path — those two files record two distinct sessions.
    - _Requirements: 8.1, 8.2, 8.5, 8.6 — Design: C-8_
  - [x] 6.2 Verify the original reference is preserved and the new paragraph is present
    - Confirm `docs/integration-evidence.md` still contains `docs/hook-output.jsonl` and the timestamp `2026-10-02T15:52:01.894Z`.
    - Confirm it also now references `docs/verification/typecheck-hook.jsonl` and `docs/verification/domain-tests-hook.jsonl`.
    - Confirm `data/evidence/typecheck-hook.jsonl` does not appear anywhere in the file.
    - _Requirements: 8.1, 8.2_

- [x] 8. Fix `docs/evidence.md` — hooks row artifact column and conditional GIF check
  - [x] 8.1 Update the Hooks row artifact column to name both evidence groups
    - Open `docs/evidence.md` and locate the Hooks row in the "Verified lesson activity" table.
    - The current Artifact cell reads: `".kiro/hooks/, verification/ logs"`
    - Replace that cell content with: `.kiro/hooks/`, `docs/hook-output.jsonl` (15:52 UTC typecheck), `docs/verification/` (16:31–16:32 UTC, four-save session)
    - Do not modify any other row.
    - _Requirements: 8.4, 8.5, 8.6 — Design: C-8_
  - [x] 8.2 Correct the GIF-rejection claim in evidence.md if present
    - Read `docs/evidence.md` for any text asserting that Sharp with `animated:false` rejects animated GIFs at the decode stage, throws an error, or refuses them.
    - If such a claim is found, rewrite that specific sentence to accurately state: "Sharp processes only the first frame of an animated GIF and re-encodes it as JPEG."
    - If no such claim is present, no edit is needed.
    - Do not alter accurate statements about EXIF removal, JPEG normalization, accepted MIME types, or pixel limits.
    - _Requirements: 6.2, 6.3 — Design: C-6_
  - [x] 8.3 Verify evidence.md is accurate
    - Confirm the Hooks row artifact cell now names both evidence groups with their timestamps.
    - Confirm no sentence in the file asserts that animated GIFs are rejected or refused by Sharp.
    - _Requirements: 6.2, 8.4_

- [x] 9. Fix `docs/custom-agent-review.md` — correct the GIF-rejection claim
  - [x] 9.1 Correct the false `animated: false` description at line 180
    - Open `docs/custom-agent-review.md` and locate the bullet that reads:
      `"**\`animated: false\`** causes Sharp to reject animated GIF payloads at the decode stage — the GIF magic bytes pass format detection but the body is refused."`
    - Replace it with:
      `"**\`animated: false\`** (the default) causes Sharp to decode only the first frame of an animated GIF — the remaining frames are discarded and the first frame is re-encoded as JPEG."`
    - Do not alter any other bullet in that list, and do not change the `malformedImage.test.ts` test descriptions that follow (those tests correctly reject *corrupt* GIFs, not animated ones).
    - _Requirements: 6.2, 6.3 — Design: C-6_
  - [x] 9.2 Verify custom-agent-review.md is accurate
    - Confirm the `animated: false` bullet no longer claims Sharp refuses or rejects animated GIFs.
    - Confirm the surrounding bullets (failOn, limitInputPixels, flatten, rotate, etc.) and the test observation block are unchanged.
    - _Requirements: 6.3_

- [x] 10. Final checkpoint — all fixes complete and verified
  - Run `npm test` — all 55 tests must pass.
  - Run `npm run build` — must exit 0.
  - Read the four corrected doc files and confirm:
    - `docs/ide-pbt-evidence.md` P-IR-3 rationale no longer claims server-clock monotonicity.
    - `docs/integration-evidence.md` preserves the 15:52 `docs/hook-output.jsonl` entry and adds the `docs/verification/` paragraph.
    - `docs/evidence.md` Hooks references name both evidence groups.
    - `docs/custom-agent-review.md` and `docs/evidence.md` contain no sentence asserting that animated GIFs are rejected or refused by Sharp.
  - All original log timestamps (`2026-10-02T15:52:01.894Z`, 16:31–16:32 UTC entries) are preserved in their respective files.

---

## Notes

- All verification sub-tasks are required — they are not optional checkpoints.
- The PostFileSave hooks match only `\.ts$` files. Saving `.ejs` or `.md` files does not trigger them. All verification for view and documentation changes uses `npm run build`, `npm test`, and browser or file inspection.
- Use exactly `{timeZone:'UTC',timeZoneName:'short'}` for the host-page timezone fix (task 1.2). Do NOT add `dateStyle` or `timeStyle` — combining those with `timeZoneName` throws a TypeError in V8.
- The `docs/hook-output.jsonl` (15:52 UTC) and `docs/verification/typecheck-hook.jsonl` (16:31–16:32 UTC) files record two distinct sessions. Never conflate them or replace one reference with the other.
- GIF correction tasks (8.2, 9.1) target semantic meaning — whether the text falsely claims Sharp *refuses* animated GIFs. Do not search for blanket word matches; read the sentence in context.
- Original log timestamps must be preserved in all documentation files after editing.
- Source-code tasks (waves 0–2) must complete and pass checkpoint task 4 before any documentation task (wave 3) begins.


## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3", "2.1", "2.2", "2.3", "2.4", "2.5", "3.1", "3.2"] },
    { "id": 1, "tasks": ["1.4", "2.6", "3.3"] },
    { "id": 2, "tasks": ["4"] },
    { "id": 3, "tasks": ["5.1", "6.1", "8.1", "8.2", "9.1"] },
    { "id": 4, "tasks": ["5.2", "6.2", "8.3", "9.2"] },
    { "id": 5, "tasks": ["10"] }
  ]
}
```
