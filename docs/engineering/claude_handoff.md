# Claude Code Handoff Packet

Last updated: 2026-05-01

This packet is for safely continuing TikiDoc work after a large Codex run covering hardening, Batch 6A, Batch 6B, Batch 6C, Batch 6D, design-system work, TikiPaste web-sidecar pivot, production auth fixes, and Quick Visit / My Tiki link stabilization.

## Start Here

Do not start new implementation immediately.

First:

- read this file
- read `docs/engineering/current_state.md`
- read `docs/product/decisions.md`
- read `docs/product/phase_status.md`
- read `docs/product/phase_gap_register.md`
- inspect `git status --short`
- preserve unrelated dirty files

Known unrelated dirty file:

- `/Users/a0000/Desktop/LCAUDE/clinic-chatbot/extension/src/SidePanel.jsx`

Do not revert it unless explicitly asked.

## Product Surface Model

- `Tiki Paste`: staff paste / extraction / memory-write surface.
- `My Tiki`: patient portal / patient link entry.
- `TikiBell`: patient-facing guide/helper inside `My Tiki`.
- `Tiki Desk`: staff / clinic operations surface.
- `Tiki Room`: in-room treatment surface.

Display copy should use these names. Do not rename routes, schema fields, component names, file names, API paths, or metadata values unless explicitly approved.

## Current Batch Summary

Hardening:

- Status: stable.
- Covered auth, route scope, procedure mapping, aftercare outbound delivery, actor tracking, light audit, config foundation/write path, scheduler degraded visibility, and live Tiki Room verification.

Batch 6A:

- Status: usable.
- Added aftercare plan editor and patient/clinic configuration expansion in a narrow form.
- Not a full aftercare CMS or campaign system.

Batch 6B:

- Status: usable / controlled-pilot.
- Added browser-native Tiki Room voice input and multilingual browser TTS fallback.
- Voice remains optional and doctor-controlled.
- No backend STT/TTS, transcript storage, or auto-answering.

Batch 6C:

- Status: stable for bounded scope.
- Added escalation SLA-derived markers, stronger Tiki Desk summary surfacing, and internal QR generation via `/api/qr`.
- External QR dependency has been removed.
- No external notification system or SLA rules engine.

Batch 6D:

- Status: usable polish.
- Added staff-gated audit/history browse API and Settings -> Operations polish.
- Added small internal config editing for existing allowed room-ready and patient task knobs.
- Not a full audit dashboard, forensic explorer, admin CMS, or generic settings system.

Design-system / UX reset:

- Status: implemented and validating.
- Applied warm clinical minimalism tokens with mocha as a controlled accent.
- Updated landing, staff shell/sidebar/top bar, Tiki Desk, Protocol, Procedure Management, and My Tiki UI kit direction.
- Staff dashboard is intentionally larger and clearer than the earlier compact admin panel.
- Real device/screen visual QA is still needed.

TikiPaste pivot:

- Status: usable / pilot-ready.
- Chrome extension direction is paused.
- TikiPaste is now a web-only sidecar workspace:
  - paste conversation text
  - paste selected chat text
  - upload/drop screenshot fallback
  - generate summary, last-message intent, urgency/risk signal, recommended replies
  - copy replies
  - hand off to Quick Visit / My Tiki link / Tiki Desk
- Conversation Intake Phase 2 is implemented:
  - TikiPaste can save analyzed conversation context as a pending intake candidate
  - pending intake is clinic-scoped and staff-auth gated
  - this is a staging layer only, not an inbox or automatic CRM integration
- Conversation Intake Phase 3 is implemented:
  - staff can review pending intake in TikiPaste
  - staff can connect it to an existing patient or create a new patient
  - conversion creates a visit and generates a My Tiki link
  - conversion is staff-confirmed only; no automatic patient matching or channel sync
- Do not rebuild extension/overlay behavior unless explicitly approved.

Runtime auth / Quick Visit fixes:

- Status: coded, tested, committed, pushed; final deployed smoke test required.
- Production mock-auth fallback is disabled.
- Signup creates real Supabase Auth users.
- Login uses real Supabase Auth.
- Frontend Supabase config is build-time via `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`.
- Quick Visit requires staff auth, preserves success/link screen, avoids duplicate retry writes, and updates Tiki Desk visibility.
- My Tiki generated links encode tokens and token auth selects only required `patient_links` fields.
- Tiki Desk and document scroll were restored after enlargement.

## Readiness Truth

| Area | Classification | What this really means |
|---|---|---|
| Aftercare plan editor | usable | Works in code for narrow admin edits. Needs real clinic admin acceptance before daily reliance. |
| My Tiki patient task layer | stable / pilot-ready | Connected to real patient portal state. Broader UX polish can wait. |
| Tiki Room browser voice | usable | Optional input aid. Browser/device quality prevents clinic-ready classification. |
| Tiki Room real clinic usability | pilot-ready | Core current/load-next/clear verified. Needs device-level acceptance per room. |
| Tiki Desk operational visibility | stable / pilot-ready | SLA, urgency, owner/latest actor, scheduler, room traffic, aftercare, and audit snippets are visible. |
| QR generation / patient link flow | stable / pilot-ready | Internal SVG QR route works in code. Front-desk device/display should still be manually verified. |
| TikiPaste web-sidecar | usable / pilot-ready | Practical staff sidecar exists. It is not extension-based and does not read arbitrary browser DOM. |
| Production signup/login | stable after deploy | Uses real Supabase Auth. Requires correct Railway env and rebuilt frontend bundle. |
| Quick Visit + My Tiki link | stable after deploy smoke test | Code/tests pass and latest commit is pushed. Verify one new generated link after deploy. |
| Staff dashboard scroll | stable after deploy smoke test | Scroll code is patched. Verify at normal zoom on real staff viewport. |

## What Is Stable

- `/api/memory` staff auth and clinic context.
- `/api/room/*` staff auth and clinic-scoped room access.
- Room current/load-next/clear flow for authenticated staff sessions.
- Tiki Desk live operational visibility for visits, rooms, escalations, aftercare, scheduler health, and audit/history snippets.
- My Tiki patient link flow and internal QR rendering.
- Quick Visit patient + visit + My Tiki link creation after latest deploy smoke test.
- Production real-auth signup/login when Railway/Supabase env values are aligned.
- Patient Today / next-actions layer for arrival, forms, aftercare due, clinic review acknowledgement, and safe return.
- Narrow clinic config read/write path with strict validation and admin-only patch access.
- TikiPaste web-sidecar workflow for staff-pasted conversations.
- Design-system tokens and larger staff/product surfaces.

## What Is Usable But Not Clinic-Ready

- Aftercare plan editor.
- Browser-native voice input.
- Browser TTS fallback.
- Small Settings -> Operations config editor.
- TikiPaste screenshot fallback and staff handoff workflow.
- My Tiki multilingual patient UI after the latest visual pass.

These work in code but need clinic-device/operator acceptance before being treated as daily-use dependable.

## What Is Prototype-Like Or Intentionally Bounded

- Browser speech recognition is not provider-grade STT.
- Browser speech synthesis is not provider-grade TTS.
- Audit/history browse is compact reviewability, not a forensic tool.
- Config editing is narrow allowed knobs, not a generic settings page.
- Aftercare plan editor is narrow step editing, not a template/trigger CMS.
- TikiPaste is not an automatic browser reader.
- Conversation intake is not an omnichannel inbox and should not grow unread/thread/sending semantics without explicit product alignment.
- Pending intake conversion is implemented, but broader matching remains manual and should not be widened into CRM replacement behavior without explicit approval.
- My Tiki UI kit is not a full patient CMS.
- Design-system standardization is not a product architecture refactor.

## Remaining Blockers

Blocks confident daily clinic use:

- Real clinic acceptance pass for aftercare plan editor.
- Per-room device acceptance for Tiki Room mic, TTS, browser support, session expiry, and room noise.
- Deployed DB schema confirmation for audit/history, room, aftercare, escalation, and clinic settings columns.
- Latest deploy smoke test:
  - create new patient + visit
  - open generated My Tiki link
  - confirm Tiki Desk scroll at 100% zoom
  - confirm new visit appears in the appropriate date filter

Blocks broader rollout:

- External notification policy for escalation SLA.
- Provider-grade STT/TTS decision if browser-native quality fails in clinic.
- More complete audit/history review/export requirements.
- Multi-clinic governance for config editing.
- More complete staff/device QA for TikiPaste sidecar in real chat workflows.
- My Tiki multilingual visual QA across patient devices.

Later expansion only:

- Full aftercare CMS/campaign builder.
- Ask prompt CMS.
- Full audit dashboard.
- Job dashboard.
- Assignment rules engine.
- Analytics/reporting layer.
- Chrome extension / native overlay for TikiPaste.
- Automatic chat DOM reader.
- Backend OCR platform.

## Guardrails

Do not:

- make broad architecture changes
- introduce a rules engine
- introduce an admin CMS
- do schema-first redesign
- add backend voice pipeline unless explicitly approved
- add a new major feature bucket without alignment
- rename internal technical routes/schema/components as part of product naming
- confuse “tests pass” with “clinic-ready”
- reintroduce production mock-auth fallback
- assume updating Railway `VITE_*` values is enough without rebuilding the frontend bundle
- rely on old patient links generated before the latest token/link hotfix when verifying current behavior

Prefer:

- small, reviewable patches
- auth/clinic scope preservation
- current defaults as fallback
- append-only event history for operational transitions
- explicit distinction between implemented, usable, pilot-ready, and clinic-ready

## Current Important Code Areas

- `server.js`
- `client/src/components/mytiki/MyTikiTab.jsx`
- `client/src/components/settings/SettingsTab.jsx`
- `client/src/pages/MyTikiPortal.jsx`
- `client/src/components/magic/TikiPasteTab.jsx`
- `client/src/components/mytiki/QuickVisitCreate.jsx`
- `client/src/lib/supabase.js`
- `client/src/index.css`
- `client/src/pages/TikiRoomPage.jsx`
- `client/src/lib/opsLite.js`
- `client/src/lib/roomVoice.js`
- `src/lib/aftercare-plan-editor.js`
- `src/lib/aftercare-service.js`
- `src/lib/audit-history.js`
- `src/lib/clinic-rule-config.js`
- `src/lib/clinic-rule-config-validate.js`
- `src/lib/escalation-service.js`
- `src/lib/ops-audit.js`
- `src/lib/qr-code.js`
- `src/lib/tiki-room.js`
- `src/middleware/auth.js`

## Current Test Signals

Recent verified commands during the Codex run:

- `node --check server.js`
- `npm test`
- `npm run build` from `client`

Expected test count after latest Quick Visit / link / scroll fixes is `126` passing. If this changes, investigate before implementing new work.

Known local warning:

- Local Node may be newer than the project engine (`20.x`), producing an `EBADENGINE` warning during install. The Railway/runtime target remains Node 20.

Known dependency note:

- `qrcode` was added for internal SVG QR generation.
- `npm install` reported existing audit vulnerabilities. Do not run broad `npm audit fix --force` without approval.

## Safest Next Step

The single safest next step is a deployed logged-in smoke test, not another feature:

1. Run `git status --short` and identify intended vs unrelated changes.
2. Run `node --check server.js`.
3. Run `npm test`.
4. Run `npm run build`.
5. Wait for Railway to deploy latest `main`.
6. Manually verify in a logged-in staff browser:
   - create one new patient + visit
   - confirm success/link screen stays visible
   - open the generated `/t/:token`
   - confirm My Tiki loads instead of invalid-link state
   - confirm Tiki Desk scrolls at normal zoom
   - confirm the new visit appears in the correct date range
7. Only after that continue with My Tiki preview surfacing or staff/admin polish.

## Recommended Prompt For Claude Code

Use this prompt when handing over:

```text
Read docs/engineering/claude_handoff.md first, then current_state.md, decisions.md, phase_status.md, and phase_gap_register.md.

Do not implement new features yet.
Perform a deployed smoke test and readiness verification pass only:
1. inspect git status and separate intended changes from unrelated dirty files
2. run server syntax check, full tests, and client build
3. verify Railway/Supabase auth env alignment if login fails
4. create one Quick Visit patient + visit in the deployed app
5. open the generated My Tiki link
6. verify Tiki Desk scroll and new visit visibility
7. report any real blockers before further implementation

Guardrails:
- no broad architecture changes
- no rules engine
- no CMS
- no schema-first redesign
- no backend voice pipeline
- no new feature bucket
- preserve internal technical names

Return a concise readiness report and exact files that should be included in the next commit.
```
