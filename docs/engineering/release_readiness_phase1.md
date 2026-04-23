# Phase 1 Release-Readiness Verification

Last updated: 2026-04-23

Scope: verification and handoff hygiene only. No new feature implementation.

## Goal

Confirm the current hardening + Batch 6A / 6B / 6C / 6D work is safe enough to use as the next release-readiness baseline before starting clinic acceptance or UX reset work.

Target classification: `pilot-ready baseline`, not `clinic-ready`.

## Verification Commands Run

### Git Status

Command:

```bash
git status --short
```

Result:

- Worktree is dirty with intended product/docs/tests/build changes.
- One known unrelated dirty file remains:
  - `extension/src/SidePanel.jsx`
- Do not include `extension/src/SidePanel.jsx` in the release commit unless explicitly approved.

### Route / Auth / QR Assumption Search

Commands:

```bash
rg -n "app\\.(get|post|patch)\\(\\\"/api/(memory|room|staff/clinic-rule-config|staff/audit-history|qr)|requireStaffAuth|requireRole\\(" server.js tests/route-guards.test.js
rg -n "api\\.qrserver|qrserver|create-qr-code" client src server.js public tests --glob '!tests/qr-code.test.js' || true
```

Result:

- Staff-gated route patterns are present for memory, room, clinic config, aftercare editor, and audit-history surfaces.
- No external QR provider references remain in runtime code or built assets.
- The only remaining QR-provider text is the negative assertion in `tests/qr-code.test.js`.

### Server Syntax

Command:

```bash
node --check server.js
```

Result:

- Passed.

### Full Test Suite

Command:

```bash
npm test
```

Result:

- Passed.
- Test count: `102`
- Failures: `0`
- Noted warning:
  - `DEP0040` warning for `punycode` from dependencies.
  - This is not a release blocker in this pass.

### Client Production Build

Command:

```bash
cd client && npm run build
```

Result:

- Passed.
- Vite transformed `1657` modules.
- Built assets:
  - `public/index.html`
  - `public/assets/index-C-2SqFDq.css`
  - `public/assets/index-DERG6w-G.js`
- Noted warning:
  - Vite chunk size warning for the main app bundle.
  - This is not a release blocker in this pass.

### Whitespace / Patch Sanity

Command:

```bash
git diff --check
```

Result:

- Passed.

## Intended Release Change Areas

Product/code changes expected in the release set:

- `server.js`
- `src/lib/aftercare-plan-editor.js`
- `src/lib/audit-history.js`
- `src/lib/clinic-rule-config.js`
- `src/lib/clinic-rule-config-validate.js`
- `src/lib/escalation-service.js`
- `src/lib/qr-code.js`
- `client/src/components/mytiki/MyTikiTab.jsx`
- `client/src/components/settings/SettingsTab.jsx`
- `client/src/lib/opsLite.js`
- `client/src/lib/roomVoice.js`
- `client/src/pages/MyTikiPortal.jsx`
- `client/src/pages/TikiRoomPage.jsx`
- `package.json`
- `package-lock.json`
- `public/index.html`
- current generated `public/assets/` files
- matching tests under `tests/`
- tracking docs under `docs/`

Explicitly exclude unless separately reviewed:

- `extension/src/SidePanel.jsx`

## Manual QA Status

Not completed in this verification pass:

- real logged-in staff browser QA
- real room/tablet browser QA
- real DB-backed Settings -> Operations save/read QA
- real patient-link QR display scan on clinic/front-desk device

These should move into Phase 2 clinic acceptance, or be completed before a production push if the release process requires live browser acceptance first.

## Current Blockers

Code/test/build blockers:

- None found in this pass.

Release hygiene blockers:

- Dirty worktree must be staged carefully.
- `extension/src/SidePanel.jsx` must remain excluded unless intentionally included.

Operational blockers before calling this `clinic-ready`:

- Aftercare plan editor needs real clinic admin acceptance.
- Tiki Room needs device/browser acceptance per room.
- Deployed DB schema must match expected audit/config/room/aftercare/escalation columns.

## Recommendation

Proceed to Phase 2 clinic acceptance after a careful commit/push of the intended release set.

Do not start:

- external notifications
- backend voice pipeline
- CMS
- rules engine
- schema-first redesign
- broad Tiki Desk redesign
