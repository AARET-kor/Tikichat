# Current Engineering State

Last updated: 2026-04-23

This document is the short engineering truth snapshot for TikiDoc after the hardening pass and Batch 6A / 6B / 6C / 6D work.

## Product Surface Model

- `Tiki Paste`: staff paste / extraction / memory-write surface.
- `My Tiki`: patient portal and patient link entry point.
- `TikiBell`: patient-facing guide/helper persona inside `My Tiki`, especially Ask and reassurance copy.
- `Tiki Desk`: staff / clinic operations surface.
- `Tiki Room`: in-room treatment surface for doctor-controlled live communication.

Internal technical names are intentionally not fully renamed yet. Keep route names, schema fields, file names, and component names stable unless a future migration is explicitly approved.

## Latest Migrations

- `027_patient_ask.sql`
- `028_escalation_triage.sql`
- `029_rooms_lite.sql`
- `030_tiki_room.sql`
- `031_aftercare_engine.sql`
- `033_light_audit_trail.sql`

No new schema migration was added for Batch 6C / 6D. Recent QR and audit-history work reuses app code, `audit_logs`, `patient_journey_events`, and existing clinic settings.

## Current Implementation Status

Stable:

- Staff auth gates for `/api/memory` and `/api/room/*`.
- Clinic-scoped room access for authenticated staff sessions.
- Tiki Desk room traffic visibility, load-next, clear, and current patient flow.
- My Tiki patient link flow and internal QR rendering through `/api/qr`.
- Clinic rule config read/write path for the narrow allowlisted keys.
- Scheduler health/degraded visibility for aftercare.
- Light audit/actor tracking for key escalation, room, and aftercare transitions.
- Tiki Desk operational visibility: urgency markers, escalation owner/latest actor line, SLA-derived markers, scheduler notice, and recent audit/history browse.

Usable but not fully clinic-ready:

- Aftercare plan editor. It can edit narrow step fields and preview patient-facing content, but it still needs real clinic admin workflow validation before daily reliance.
- Tiki Room browser-native voice input and browser TTS fallback. They are useful optional aids, but quality depends on browser, device, microphone permission, room noise, and installed voices.
- Tiki Room live communication loop. Current/load-next/clear manual verification passed, but clinic deployment still needs device/browser acceptance testing per room.

Prototype-level or intentionally bounded:

- Settings / operations polish is intentionally small. It is not a full admin CMS, rule builder, audit dashboard, or forensic explorer.
- Ask and room-ready config are narrow knobs layered over code-owned workflow logic.
- Browser voice is not a backend STT/TTS pipeline and does not store transcripts.

Intentionally deferred:

- Backend voice/STT/TTS providers.
- Broad notification orchestration.
- Full audit/history explorer.
- Full CMS/no-code editor for aftercare or Ask.
- Generic rules engine.
- Schema-first redesign of workflow state.

## Batch Summary

Hardening status:

- Status: stable.
- Batch 1-5 hardening covered auth, procedure mapping, outbound aftercare, live refresh/QR/today actions, actor tracking, audit coverage, config foundation/write path, operational markers, scheduler health, and live Tiki Room verification.
- Reopen hardening only for a real issue found in operation.

Batch 6A status:

- Status: usable.
- Patient / clinic configuration expansion implemented in a narrow form:
  - aftercare plan editor
  - patient task layer expansion
  - clinic rule config expansion for allowed high-churn knobs
- Not clinic-ready as a broad admin editing product. It is an operationally useful narrow editor, not a CMS.

Batch 6B status:

- Status: usable / controlled-pilot.
- Tiki Room browser-native voice input exists when supported.
- Tiki Room multilingual browser TTS fallback exists with visible fallback status.
- Doctor-controlled behavior remains unchanged:
  - voice fills the existing input flow
  - no auto-answer
  - no backend voice API
  - no transcript storage
- Not equivalent to clinical-grade STT/TTS.

Batch 6C status:

- Status: stable for current scope.
- Implemented:
  - escalation SLA-derived markers and Tiki Desk attention summary
  - stronger staff summary surfacing
  - internal QR generation via `/api/qr`, removing the external QR image dependency
- Not implemented:
  - external notifications
  - alert center
  - SLA rules engine

Batch 6D status:

- Status: usable polish.
- Implemented:
  - staff-gated recent audit/history browse API
  - Settings -> Operations surface for compact history browsing
  - small internal config editing polish for existing allowed room-ready and patient task knobs
- Not implemented:
  - forensic explorer
  - audit dashboard
  - generic settings page

## Readiness Truth

| Area | Classification | Truth |
|---|---|---|
| Aftercare plan editor | usable | Works in code for narrow edits, preview, and admin-only save. Not yet proven safe for unsupervised daily clinic admin use. |
| My Tiki patient task layer | stable / pilot-ready | Today / next actions include arrival, forms, aftercare due, clinic review ack, and safe return. Broader UX polish remains later. |
| Tiki Room browser voice | usable | Optional browser-native input aid. Not clinic-ready as a primary voice system. |
| Tiki Room real clinic usability | pilot-ready | Current/load-next/clear live authenticated verification passed. Needs room-device acceptance in each real deployment. |
| Tiki Desk operational visibility | stable / pilot-ready | Urgency, SLA, owner/latest actor, room traffic, scheduler health, and audit/history browse are visible. No notification center. |
| QR generation / patient link flow | stable / pilot-ready | Staff-visible QR now renders internally via `/api/qr`; patient links continue to target app routes. |

## Remaining Blockers

Blocks confident daily clinic use:

- Real clinic acceptance pass for aftercare plan editor with an admin/owner editing actual procedures and verifying generated future patient messaging.
- Tiki Room device-level QA in the clinic rooms that will actually run it, especially microphone permission, browser speech recognition, TTS voice availability, and tablet session persistence.
- Confirmation that deployed DB has the expected `audit_logs`, `patient_journey_events`, `clinics.settings`, room, escalation, and aftercare tables/columns.

Blocks broader rollout:

- External notifications / SLA notification policy.
- Provider-grade STT/TTS decision if browser-native quality is insufficient.
- Fuller audit/history browse and export needs.
- More polished staff/admin editing UX for non-technical operators.
- Multi-clinic operational configuration review beyond the current narrow knobs.

Later expansion only:

- CMS-like aftercare trigger/template builder.
- No-code Ask prompt editor.
- Assignment rules engine.
- Analytics/reporting dashboards.
- Dedicated incident management or job dashboard.

## Guardrails For Next Agent

Do not:

- make broad architecture changes
- introduce a rules engine
- introduce an admin CMS
- do schema-first redesign
- add backend voice pipeline unless explicitly approved
- add a new major feature bucket without alignment
- rename routes, schema, internal APIs, or technical components as part of display-copy cleanup
- confuse “tests pass” with “safe for daily clinic use”

Prefer:

- small route/helper/UI patches
- preserving current hardcoded defaults
- clinic-scoped authenticated context
- append-only history for operational events
- explicit “works in code” vs “verified in clinic” language

## Current Dirty-Worktree Note

Recent work has touched product files, docs, tests, and build artifacts. There is also an unrelated dirty file:

- `/Users/a0000/Desktop/LCAUDE/clinic-chatbot/extension/src/SidePanel.jsx`

Do not revert or include unrelated changes unless explicitly instructed.

## Safest Next Step

The single safest next step is a release-readiness verification pass, not new feature work:

- run the full test/build suite
- review route guards and DB assumptions
- manually verify Settings -> Operations, My Tiki link QR, Tiki Desk escalation visibility, and Tiki Room room-device flow in a logged-in staff session
- then commit/push only the intended app/docs/build changes
