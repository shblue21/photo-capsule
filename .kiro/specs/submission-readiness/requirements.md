# Requirements Document

## Introduction

This spec addresses eight polish and correctness issues in the existing Photo Capsule application covering UI behavior and documentation accuracy. No new product features are introduced. All changes are limited to fixing existing behavior (UI interaction, layout, time display, touch target sizing, count grammar) and correcting inaccurate or stale claims in the documentation. The English lavender-and-white interface and all existing product invariants are preserved throughout.

## Glossary

- **Host_Page**: The management page rendered by `src/views/host.ejs`, accessed at `/host/:albumId`.
- **Create_Page**: The capsule creation page rendered by `src/views/create.ejs`, served at `/`.
- **Invite_Page**: The guest upload and gallery page rendered by `src/views/invite.ejs`, served at `/i/:token`.
- **Created_Page**: The post-creation confirmation page rendered by `src/views/created.ejs`.
- **Management_Key_Input**: The `<input id="key">` element on the Host_Page used to enter the host secret.
- **Album_Preview**: The decorative section on the Create_Page containing `.orbit`, `.print`, `.preview-note`, and `.floating-spark` elements.
- **RevealDate**: A human-readable string representing when the capsule opens, rendered server-side into `created.ejs` and `invite.ejs` templates, and constructed client-side in `host.ejs`.
- **Photo_Count**: Any integer count of photos displayed in the UI — in the Host_Page header (`<span id="count">`), the Invite_Page post-upload status line, and the upload progress line.
- **Interactive_Target**: Any clickable or tappable UI element: buttons, links, and labeled inputs.
- **GIF_Claim**: Any statement in documentation about how animated GIF inputs are handled by the server.
- **PBT_Claim**: Any reference in documentation to property-based test files, their output, their evidence paths, or what the properties prove.
- **Hook_Evidence_Reference**: Any path cited in documentation to a hook output file.
- **Sharp**: The Node.js image processing library used in `src/utils/imageValidator.ts`. With `animated: false` (the default), Sharp reads and converts only the first frame of a multi-frame GIF; it does not reject animated GIFs.
- **EARS**: Easy Approach to Requirements Syntax — the pattern set used throughout this document.

---

## Requirements

### Requirement 1: Management-Key Enter Submission

**User Story:** As a host, I want to press Enter after typing my management key so that I can open the dashboard without reaching for the mouse.

#### Acceptance Criteria

1. WHEN the Management_Key_Input has keyboard focus and the Enter key is pressed, THE Host_Page SHALL submit the management key and invoke the same load sequence as clicking the "Open dashboard" button.
2. WHILE the Management_Key_Input value is empty and the Enter key is pressed, THE Host_Page SHALL take no action.
3. THE implementation MAY wrap the management-key section in a native `<form>` element provided the form's `submit` event calls `preventDefault()` so no HTTP navigation occurs; the existing login-section layout SHALL be preserved.

---

### Requirement 2: 320 px Decorative Overflow

**User Story:** As a mobile user on a narrow device (320 px viewport width), I want the create page to display without horizontal overflow so that I can use the page without scrolling sideways.

#### Acceptance Criteria

1. WHEN the viewport width is 320 px, THE Create_Page SHALL render with no horizontal overflow on any element.
2. WHEN the viewport width is 320 px, THE Album_Preview decorative elements (`.orbit`, `.print`, `.preview-note`, `.floating-spark`) SHALL remain within the bounds of their container.
3. WHEN the viewport width is 320 px, THE Album_Preview container SHALL either clip overflow or reduce to a size that contains all child elements without exceeding the viewport width.
4. IF a 320 px breakpoint rule is added, THEN THE Create_Page SHALL preserve the existing layout and palette at viewport widths of 390 px and above.

---

### Requirement 3: Consistent Timezone Labels

**User Story:** As a guest or host, I want every displayed reveal time to include a clear timezone label so that I can confirm the reveal time without ambiguity.

#### Acceptance Criteria

1. THE Created_Page SHALL display the reveal time with a timezone abbreviation (e.g. "UTC") appended to the formatted date string.
2. THE Invite_Page SHALL display the RevealDate with a timezone abbreviation appended to the formatted date string.
3. WHEN the Host_Page client-side script constructs the reveal time string from `j.album.reveal_at`, THE Host_Page SHALL include a timezone label in the rendered text — using `{ timeZone: 'UTC', timeZoneName: 'short' }` as the `toLocaleString` options, which is the same valid format already used in `src/index.ts` and `src/routes/invite.ts`.
4. THE Server SHALL use a consistent timezone (UTC) when formatting RevealDate strings in `src/index.ts` and `src/routes/invite.ts`, matching existing behavior.
5. IF the RevealDate already includes a timezone abbreviation from the server, THEN THE template SHALL NOT append a duplicate label.

---

### Requirement 4: Minimum 44 px Interactive Targets

**User Story:** As a mobile user, I want every button and link to be at least 44 px tall so that I can tap them reliably without mis-tapping adjacent elements.

#### Acceptance Criteria

1. THE Create_Page `.quick-button` element SHALL have a computed `min-height` of at least 44 px.
2. THE Create_Page `.brand` navigation link SHALL have a computed height of at least 44 px.
3. THE Host_Page "Open dashboard" button SHALL have a computed `min-height` of at least 44 px.
4. THE Invite_Page "Save photo" link inside the dialog SHALL have a computed `min-height` of at least 44 px.
5. THE Invite_Page "Close" button inside the dialog SHALL have a computed `min-height` of at least 44 px.
6. WHERE a specific element's visual design would be impacted by changing its height, THE style rule SHALL use `min-height` rather than `height` to avoid collapsing the element's content.
7. IF any existing `button` or `.button` style already enforces `min-height: 46px`, THEN that rule SHALL be confirmed still applied to the elements listed above; only elements falling short of 44 px SHALL be corrected.

---

### Requirement 5: Correct Photo-Count Pluralization

**User Story:** As a host or guest viewing a capsule with exactly one photo or one pending retry, I want the interface to display grammatically correct singular forms so that the text is natural.

#### Acceptance Criteria

1. WHEN `j.photoCount` equals 1, THE Host_Page `<span id="count">` SHALL display "1 photo".
2. WHEN `j.photoCount` is not equal to 1, THE Host_Page `<span id="count">` SHALL display the count followed by " photos".
3. WHEN the upload batch completes and exactly 1 photo was successfully added, THE Invite_Page status line SHALL display "1 photo added." not "1 photos added."
4. WHEN the upload batch completes and the count of successfully added photos is not equal to 1, THE Invite_Page status line SHALL display the count followed by " photos added."
5. WHEN the upload progress indicator is active and exactly 1 photo in the batch is uploading, THE Invite_Page SHALL display "1 / 1 photo uploading…" not "1 / 1 photos uploading…".
6. WHEN exactly 1 file is selected and pending upload, THE Invite_Page upload button SHALL display "Add 1 photo" not "Add 1 photos".
7. WHEN the count of files selected is not equal to 1, THE Invite_Page upload button SHALL display "Add N photos".
8. WHEN exactly 1 photo failed and the retry button is shown, THE Invite_Page SHALL display "Retry 1 photo" not "Retry 1 photos".
9. WHEN the post-reveal gallery loads and exactly 1 photo is present, THE Invite_Page status line SHALL display "1 shared moment." not "1 shared moments."
10. WHEN the post-reveal gallery loads and the count of photos is not equal to 1, THE Invite_Page status line SHALL display the count followed by " shared moments."

---

### Requirement 6: Correct GIF-Handling Claims in Documentation

**User Story:** As a reader of the documentation, I want GIF-handling claims to accurately reflect what the code does so that the documentation is honest and verifiable.

#### Acceptance Criteria

1. THE `invite.ejs` upload hint text that reads "GIFs are saved as a single frame." SHALL be preserved, because Sharp 0.35.5 with `animated: false` decodes only the first frame of a multi-frame GIF and re-encodes it as JPEG — this description is accurate.
2. THE `docs/evidence.md` SHALL NOT contain any reviewer or historical claim that animated GIFs are rejected at decode time or that `animated: false` causes Sharp to throw; Sharp 0.35.5 with `animated: false` processes the first frame successfully and such rejection claims are factually incorrect.
3. IF any file in `docs/` describes the animated-GIF behavior using language that implies rejection (e.g. "Sharp rejects animated GIFs", "animated GIFs are not supported", "animated: false rejects"), THEN that language SHALL be corrected to state that only the first frame is decoded and the result is re-encoded as JPEG.
4. THE corrections SHALL NOT alter accurate statements about accepted MIME types, image pixel limits, EXIF removal, or JPEG normalization.

---

### Requirement 7: Accurate PBT-Evidence Claims in Documentation

**User Story:** As a reader of the property-based testing evidence, I want the documented claims about what the properties prove to accurately reflect the scope of the test so that the evidence is not overstated.

#### Acceptance Criteria

1. THE `docs/ide-pbt-evidence.md` rationale for property P-IR-3 SHALL NOT assert that the property proves the server clock is monotonic or that the reveal latch is persistent across HTTP requests; the property only demonstrates the mathematical monotonicity of the pure `isRevealed` function when `now` is supplied by the caller.
2. THE corrected rationale SHALL state that: `isRevealed` is a pure function whose output is monotonically non-decreasing as `now` increases when `revealAt` is held constant; proving this for the function does not prove that callers supply a monotonically increasing `now`, nor that the latch state is durable across process restarts.
3. THE `docs/ide-pbt-evidence.md` "Design Decisions" section note about `FIXED_NOW` SHALL remain accurate: using a fixed epoch prevents the test from depending on the real wall clock.
4. THE corrections SHALL NOT remove the P-IR-3 test pass result, its run count, or any other accurately reported test output.

---

### Requirement 8: Accurate and Current Hook-Evidence References

**User Story:** As a reader following evidence links in the documentation, I want every referenced file path to point to a file that actually exists and to the correct session so that the claims are precisely verifiable.

#### Acceptance Criteria

1. THE `docs/integration-evidence.md` SHALL preserve its reference to `docs/hook-output.jsonl` and the timestamp `2026-10-02T15:52:01.894Z`; this file exists and contains exactly that entry, recording the MCP-session typecheck hook that fired during the S3-documentation edit. This reference SHALL NOT be changed to a `docs/verification/` path.
2. THE `docs/integration-evidence.md` SHALL also reference the two later automatic-hook log files — `docs/verification/typecheck-hook.jsonl` and `docs/verification/domain-tests-hook.jsonl` — which record the four-save IDE session at 16:31–16:32 UTC, as a separate distinct evidence item from the 15:52 entry.
4. THE `docs/evidence.md` lesson table row for Hooks SHALL cite both `docs/hook-output.jsonl` (MCP-session typecheck, 15:52 UTC) and `docs/verification/` (later four-save session logs) as distinct artifact references.
5. WHEN hook evidence references are updated or added, THE factual description of what each hook did — its trigger, exit code, and timestamp — SHALL be preserved or made more precise; no factual content SHALL be removed.
6. THE corrections SHALL NOT alter any accurate statements about what hooks ran, what exit codes were observed, or what timestamps were recorded.
