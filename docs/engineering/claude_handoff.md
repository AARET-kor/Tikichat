# Claude Code Handoff Packet

Last updated: 2026-04-23

This packet is for safely continuing TikiDoc work after a large Codex run covering hardening, Batch 6A, Batch 6B, Batch 6C, and Batch 6D.

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

## Readiness Truth

| Area | Classification | What this really means |
|---|---|---|
| Aftercare plan editor | usable | Works in code for narrow admin edits. Needs real clinic admin acceptance before daily reliance. |
| My Tiki patient task layer | stable / pilot-ready | Connected to real patient portal state. Broader UX polish can wait. |
| Tiki Room browser voice | usable | Optional input aid. Browser/device quality prevents clinic-ready classification. |
| Tiki Room real clinic usability | pilot-ready | Core current/load-next/clear verified. Needs device-level acceptance per room. |
| Tiki Desk operational visibility | stable / pilot-ready | SLA, urgency, owner/latest actor, scheduler, room traffic, aftercare, and audit snippets are visible. |
| QR generation / patient link flow | stable / pilot-ready | Internal SVG QR route works in code. Front-desk device/display should still be manually verified. |

## What Is Stable

- `/api/memory` staff auth and clinic context.
- `/api/room/*` staff auth and clinic-scoped room access.
- Room current/load-next/clear flow for authenticated staff sessions.
- Tiki Desk live operational visibility for visits, rooms, escalations, aftercare, scheduler health, and audit/history snippets.
- My Tiki patient link flow and internal QR rendering.
- Patient Today / next-actions layer for arrival, forms, aftercare due, clinic review acknowledgement, and safe return.
- Narrow clinic config read/write path with strict validation and admin-only patch access.

## What Is Usable But Not Clinic-Ready

- Aftercare plan editor.
- Browser-native voice input.
- Browser TTS fallback.
- Small Settings -> Operations config editor.

These work in code but need clinic-device/operator acceptance before being treated as daily-use dependable.

## What Is Prototype-Like Or Intentionally Bounded

- Browser speech recognition is not provider-grade STT.
- Browser speech synthesis is not provider-grade TTS.
- Audit/history browse is compact reviewability, not a forensic tool.
- Config editing is narrow allowed knobs, not a generic settings page.
- Aftercare plan editor is narrow step editing, not a template/trigger CMS.

## Remaining Blockers

Blocks confident daily clinic use:

- Real clinic acceptance pass for aftercare plan editor.
- Per-room device acceptance for Tiki Room mic, TTS, browser support, session expiry, and room noise.
- Deployed DB schema confirmation for audit/history, room, aftercare, escalation, and clinic settings columns.

Blocks broader rollout:

- External notification policy for escalation SLA.
- Provider-grade STT/TTS decision if browser-native quality fails in clinic.
- More complete audit/history review/export requirements.
- Multi-clinic governance for config editing.

Later expansion only:

- Full aftercare CMS/campaign builder.
- Ask prompt CMS.
- Full audit dashboard.
- Job dashboard.
- Assignment rules engine.
- Analytics/reporting layer.

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

## Current Test Signals

Recent verified commands during the Codex run:

- `node --check server.js`
- `npm test`
- `npm run build` from `client`

Expected test count at handoff was `102` passing after 6D. If this changes, investigate before implementing new work.

Known local warning:

- Local Node may be newer than the project engine (`20.x`), producing an `EBADENGINE` warning during install. The Railway/runtime target remains Node 20.

Known dependency note:

- `qrcode` was added for internal SVG QR generation.
- `npm install` reported existing audit vulnerabilities. Do not run broad `npm audit fix --force` without approval.

## Safest Next Step

The single safest next step is release-readiness verification, not another feature:

1. Run `git status --short` and identify intended vs unrelated changes.
2. Run `node --check server.js`.
3. Run `npm test`.
4. Run `npm run build` in `client`.
5. Manually verify in a logged-in staff browser:
   - Tiki Desk escalation SLA/owner visibility
   - Settings -> Operations audit/history and config save behavior
   - My Tiki link QR generation
   - Tiki Room current/load-next/clear
6. Only then prepare a clean commit/push.

## Recommended Prompt For Claude Code

Use this prompt when handing over:

```text
Read docs/engineering/claude_handoff.md first, then current_state.md, decisions.md, phase_status.md, and phase_gap_register.md.

Do not implement new features yet.
Perform a release-readiness verification pass only:
1. inspect git status and separate intended changes from unrelated dirty files
2. run server syntax check, full tests, and client build
3. verify route/auth/config assumptions from the code
4. report any real blockers before commit/push

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
