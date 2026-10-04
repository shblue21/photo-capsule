# Design Document

## Overview

Eight surgical fixes to the existing Photo Capsule application covering UI behavior and documentation accuracy. No new product features. No new files except documentation edits. No schema migrations. No new dependencies. The lavender-and-white design and all product invariants are preserved.

The fixes fall into three categories:

- **UI behavior** (R1): Enter submission on the host page.
- **Visual polish** (R2, R3, R4, R5): 320 px overflow, timezone label consistency, 44 px touch targets, correct pluralization.
- **Documentation accuracy** (R6, R7, R8): GIF behavior claims, PBT scope claims, hook evidence file paths.

---

## Architecture

The application is a thin Express 4 / EJS server with inline client-side JS. All eight fixes stay within the existing layers and introduce no new modules.

| Layer | Files touched | What changes |
|---|---|---|
| CSS (shared partial) | `src/views/style.ejs` | R2 (overflow), R4 (touch targets) |
| EJS templates (client-side JS) | `src/views/host.ejs` | R1 (Enter), R3 (timezone), R5 (count) |
| EJS templates (client-side JS) | `src/views/invite.ejs` | R5 (pluralization × 5 sites) |
| Documentation | `docs/integration-evidence.md` | R8 (hook paths) |
| Documentation | `docs/evidence.md` | R8 (hook paths) |
| Documentation | `docs/ide-pbt-evidence.md` | R7 (PBT rationale) |
| Documentation | `docs/custom-agent-review.md` | R6 (GIF handling) |

Server-side routes (`src/index.ts`, `src/routes/invite.ts`) already use the correct timezone format and require no change.

---

## Components and Interfaces

### C-1 — Host page Enter submission (`src/views/host.ejs`)

**Current state**: the login section is a flat `<section class="card" id="login">` containing a `<label>`, `<input id="key" type="password" autocomplete="off">`, and `<button class="wide" id="enter">`. The script assigns `document.getElementById('enter').onclick = () => { secret = …; load(); }`. No keydown handler and no form element.

**Change**: wrap the label, input, and button in a `<form>` with an `onsubmit` handler. Change the button to `type="submit"`. Remove the `onclick` assignment.

```html
<!-- Before -->
<section class="card" id="login">
  <h2>Enter with your management key</h2>
  <label for="key">The key you received when creating this capsule</label>
  <input id="key" type="password" autocomplete="off">
  <button class="wide" id="enter">Open dashboard</button>
</section>

<!-- After -->
<section class="card" id="login">
  <h2>Enter with your management key</h2>
  <form onsubmit="event.preventDefault();secret=document.getElementById('key').value.trim();if(secret)load();">
    <label for="key">The key you received when creating this capsule</label>
    <input id="key" type="password" autocomplete="off">
    <button class="wide" type="submit">Open dashboard</button>
  </form>
</section>
```

In the `<script>` block, remove:
```js
document.getElementById('enter').onclick=()=>{secret=document.getElementById('key').value.trim();load();};
```

The `if(secret)` guard in `onsubmit` satisfies R1-AC2 (empty input does nothing).

---

### C-2 — 320 px overflow (`src/views/style.ejs`)

**Current state**: the narrowest breakpoint is `@media(max-width:760px)`. At that breakpoint, `.print-back` has `left:159px` and `.orbit-two` has `width:280px` with `left:15px`. After `transform:rotate(11deg)`, the `.print-back` element's bounding box extends past 320 px. `.orbit-two` at 280 px + 15 px offset also risks overflow.

**Change**: append a new breakpoint before the `</style>` closing tag. Using `overflow:hidden` on the container is simpler and safer than recalculating absolute positions.

```css
@media(max-width:360px){
  .album-preview{overflow:hidden}
  .orbit-two{width:calc(100% - 15px)}
}
```

`overflow:hidden` clips any decorative element that escapes the container. `calc(100% - 15px)` caps `.orbit-two` to the container width minus its left offset. Layouts at 390 px and above are unaffected.

---

### C-3 — Timezone label on host page (`src/views/host.ejs`)

**Current state** in `host.ejs` client-side script:
```js
document.getElementById('when').textContent =
  new Date(j.album.reveal_at).toLocaleString('en-US') + ' · reveal';
```
This uses the visitor's local timezone with no label.

**Server reference** (`src/index.ts` and `src/routes/invite.ts` — already correct, no changes needed):
```ts
new Date(revealAtMs).toLocaleString('en-US', { timeZone: 'UTC', timeZoneName: 'short' })
// e.g. "11/14/2023, 10:13:20 PM UTC"
```

> **Important**: `{ timeZone: 'UTC', timeZoneName: 'short' }` is the valid format. Combining `dateStyle`/`timeStyle` with `timeZoneName` throws a `TypeError` in V8 and must not be used.

**Change** in `host.ejs` script:
```js
// Before
document.getElementById('when').textContent =
  new Date(j.album.reveal_at).toLocaleString('en-US') + ' · reveal';

// After
document.getElementById('when').textContent =
  new Date(j.album.reveal_at).toLocaleString('en-US',
    {timeZone:'UTC',timeZoneName:'short'})
  + ' · reveal';
```

This produces the same format as the server-rendered pages (e.g. `11/14/2023, 10:13:20 PM UTC · reveal`).

---

### C-4 — Touch targets (`src/views/style.ejs`)

**Current state**: the global `button,.button` rule sets `min-height:46px`. Two elements fall short:

- `.quick-button` has an explicit override: `min-height:34px` — below 44 px.
- `.brand` has no `min-height` rule — height depends on font size and line-height only.

All other targeted elements (dialog Save/Close buttons) inherit the global 46 px rule and are already compliant.

**Change** in `style.ejs`:

```css
/* In .quick-button rule — change min-height */
/* Before: */ min-height:34px
/* After:  */ min-height:44px

/* In .brand rule — add min-height */
/* Before: */ .brand{display:inline-flex;align-items:center;gap:9px;…}
/* After:  */ .brand{display:inline-flex;align-items:center;gap:9px;…;min-height:44px}
```

---

### C-5 — Pluralization (`src/views/host.ejs`, `src/views/invite.ejs`)

All sites use a ternary inline at the point of use. No shared helper is introduced.

**Pattern**: `count + (count === 1 ? ' photo' : ' photos')`

**`host.ejs`** (1 site):
```js
// Before
document.getElementById('count').textContent = j.photoCount + ' photos';
// After
document.getElementById('count').textContent =
  j.photoCount + (j.photoCount === 1 ? ' photo' : ' photos');
```

**`invite.ejs`** (5 sites):

1. Upload button in `render()`:
```js
// Before
btn.textContent = pending.length ? 'Add ' + pending.length + ' photos' : 'Choose your photos';
// After
btn.textContent = pending.length
  ? 'Add ' + pending.length + (pending.length === 1 ? ' photo' : ' photos')
  : 'Choose your photos';
```

2. Progress line in `btn.onclick` loop:
```js
// Before
status.textContent = (i+1) + ' / ' + total + ' photos uploading…';
// After
status.textContent = (i+1) + ' / ' + total +
  (total === 1 ? ' photo uploading…' : ' photos uploading…');
```

3. Completion status:
```js
// Before
status.textContent = ok + ' photos added.' + (errors.length ? '\n' + errors.join('\n') : ' See you at the reveal!');
// After
status.textContent = ok + (ok === 1 ? ' photo added.' : ' photos added.')
  + (errors.length ? '\n' + errors.join('\n') : ' See you at the reveal!');
```

4. Retry button:
```js
// Before
if(retry.length) btn.textContent = 'Retry ' + retry.length + ' photos';
// After
if(retry.length) btn.textContent = 'Retry ' + retry.length +
  (retry.length === 1 ? ' photo' : ' photos');
```

5. Post-reveal gallery count (in the `revealed` branch):
```js
// Before
status.textContent = j.photos.length ? j.photos.length + ' shared moments.' : 'No photos were added.';
// After
status.textContent = j.photos.length
  ? j.photos.length + (j.photos.length === 1 ? ' shared moment.' : ' shared moments.')
  : 'No photos were added.';
```

---

### C-6 — GIF documentation (`docs/` files)

**Finding**: Sharp 0.35.5 `animated:false` reads the first frame only (confirmed from installed type definitions: *"Set to `true` to read all frames/pages of an animated image… (optional, default false)"*, and a live test producing `pages:1` with successful JPEG conversion).

**Result**:
- `invite.ejs` hint "GIFs are saved as a single frame." — **accurate, no change.**
- `README.md` "GIFs use the first frame." — **accurate, no change.**
- Check `docs/evidence.md` and `docs/custom-agent-review.md` for any language claiming animated GIFs are *rejected*. If found, replace with "only the first frame is decoded and re-encoded as JPEG." If no such language is present, no edit is needed. This is a conditional find-and-fix.

---

### C-7 — PBT rationale (`docs/ide-pbt-evidence.md`)

**Current state** — P-IR-3 Derivation rationale column:
> "Reveal is a one-way latch: once now >= revealAt, adding any non-negative δ preserves the inequality. FR-15 requires the server clock to be authoritative and only move forward."

The second sentence overclaims: it asserts a runtime property of the server clock that the property test does not demonstrate. `isRevealed(revealAt, now)` is a pure function; the test supplies `now` explicitly. No HTTP request, process restart, or server clock is involved.

**Replacement text** for the Derivation rationale cell:
> "`isRevealed` is a pure function. This property demonstrates that its output is monotonically non-decreasing as `now` increases when `revealAt` is held constant: once `isRevealed` returns true for a given `now`, it returns true for any larger value. The property does not verify that production callers supply a monotonically increasing `now`, nor that the revealed state persists across process restarts or concurrent requests."

All other content in the table row (Property ID, Property description, Requirement, Runs) and the full test pass record (11/11, run counts) are unchanged.

---

### C-8 — Hook evidence references (`docs/` files)

**Verified file inventory**:

| File | Content | Status |
|---|---|---|
| `docs/hook-output.jsonl` | `{"at":"2026-10-02T15:52:01.894Z","event":"typecheck","exitCode":0}` | Exists — the MCP-session typecheck hook |
| `docs/verification/typecheck-hook.jsonl` | Four entries, 16:31–16:32 UTC | Exists — later IDE four-save session |
| `docs/verification/domain-tests-hook.jsonl` | Four entries, 16:31–16:32 UTC | Exists — later IDE four-save session |

These represent **two distinct sessions**:
- **15:52 UTC session**: the MCP S3-documentation edit that triggered one typecheck hook, logged in `docs/hook-output.jsonl`.
- **16:31–16:32 UTC session**: the IDE four-save configuration pass that triggered eight hooks (four domain-test + four typecheck), logged in `docs/verification/`.

**`docs/integration-evidence.md`**:
- **Preserve** the existing paragraph referencing `docs/hook-output.jsonl` and timestamp `2026-10-02T15:52:01.894Z` — this is accurate for the MCP session.
- **Add** a sentence referencing the later session logs: `docs/verification/typecheck-hook.jsonl` and `docs/verification/domain-tests-hook.jsonl` (four entries each, 16:31–16:32 UTC), noting they record the IDE four-save session described in `docs/verification/runtime-results.md`.

**`docs/evidence.md`** — Hooks table row artifact column currently reads `".kiro/hooks/, verification/ logs"`. Update to specifically name both artifact groups:
> `.kiro/hooks/`, `docs/hook-output.jsonl` (15:52 UTC typecheck), `docs/verification/` (16:31–16:32 UTC, four-save session)

---

## Data Models

No database schema changes. No new data models. The `reveal_at` column remains an INTEGER (Unix ms epoch). The only change to how data is used is the display formatting of `reveal_at` in `host.ejs` client-side JS — the value itself is unmodified.

---

## Correctness Properties

### Property 1: Enter submission fires load() once

**Validates: Requirements 1.1, 1.2**

Pressing Enter on a non-empty `#key` input invokes `load()` exactly once. Pressing Enter on an empty input invokes `load()` zero times.

### Property 2: No horizontal overflow at 320 px

**Validates: Requirements 2.1, 2.2, 2.3**

For every element on the Create Page at 320 px viewport width, `element.scrollWidth <= document.body.clientWidth`.

### Property 3: RevealDate always contains a timezone label

**Validates: Requirements 3.3**

For any valid `reveal_at` epoch value, the string produced by `new Date(reveal_at).toLocaleString('en-US', {timeZone:'UTC', timeZoneName:'short'})` contains the substring "UTC".

### Property 4: Interactive targets meet 44 px minimum

**Validates: Requirements 4.1, 4.2**

`parseFloat(getComputedStyle(quickButton).minHeight) >= 44` and `brandLink.getBoundingClientRect().height >= 44` at any viewport width.

### Property 5: Pluralization is count-correct

**Validates: Requirements 5.1, 5.3, 5.5, 5.6, 5.8, 5.9**

For any integer `n`: if `n === 1` the rendered string contains "1 photo" (not "1 photos") and "1 shared moment" (not "1 shared moments"); if `n !== 1` the rendered string contains `n + " photos"` and `n + " shared moments"`.

### Property 6: No GIF rejection language in docs

**Validates: Requirements 6.2, 6.3**

Documentation states that valid animated GIFs are decoded to their first frame and re-encoded as JPEG. Claims that corrupt or truncated GIF data is rejected remain valid; inspect meaning in context rather than banning words.

### Property 7: P-IR-3 rationale does not overclaim server-clock monotonicity

**Validates: Requirements 7.1, 7.2**

The P-IR-3 rationale describes monotonicity for a fixed reveal time and nondecreasing finite supplied time. It explicitly limits the claim to the pure function and does not infer monotonic production clocks or a durable reveal latch.

### Property 8: Hook evidence references resolve to the correct captures

**Validates: Requirements 8.1, 8.2, 8.4**

The integration document links the committed `docs/hook-output.jsonl` capture for 15:52 UTC and the two `docs/verification/` Hook logs for 16:31–16:32 UTC. Each link resolves and each described event matches its original timestamp and exit code. Historical or generated output paths elsewhere are allowed when clearly identified.

---

## Error Handling

The form `onsubmit` guard `if(secret)` prevents calling `load()` with an empty key (R1-AC2). The existing `load()` error handler remains unchanged: on a failed fetch it sets `status.textContent = e.message` and un-hides the login section. No new error paths are introduced.

---

## Testing Strategy

- **R1 (Enter)**: `npm test` does not cover keypress events in EJS templates. Verify by opening `/host/:id` in a browser, typing a key, and pressing Enter. Observe that the dashboard loads or an error appears in `#status`.
- **R2 (overflow)**: open `/` in Chrome DevTools with a 320 px custom device. Verify no horizontal scrollbar and `document.body.scrollWidth === 320`.
- **R3 (timezone)**: `npm test` covers server-rendered HTML via supertest; add an assertion that the `revealDate` variable in a created-album response contains "UTC". For `host.ejs`, inspect the `#when` element after loading the dashboard.
- **R4 (touch targets)**: inspect `.quick-button` and `.brand` computed styles in the browser at any viewport width.
- **R5 (pluralization)**: the ternary expressions are pure JS; they can be unit-tested by evaluating the expression with `count=1` and `count=2`. Alternatively, verify visually by uploading exactly one photo and inspecting the status text.
- **R6 (GIF docs)**: Read the GIF claims in context. Confirm valid animated GIFs use the first frame; retain accurate rejection claims for corrupt GIF data.
- **R7 (PBT rationale)**: Confirm the P-IR-3 rationale states the pure-function result and excludes guarantees about production-clock monotonicity or persistent state.
- **R8 (hook paths)**: Resolve the committed Hook links and compare the described sessions, timestamps and exit codes with the unchanged captures.

EJS/CSS changes require browser validation; TypeScript post-save hooks do not cover frontend layout or documentation.
