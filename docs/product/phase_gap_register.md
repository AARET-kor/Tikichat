# TikiDoc Phase Gap Register

Last updated: 2026-04-23

This register tracks the practical gaps after hardening and Batch 6A / 6B / 6C / 6D. It distinguishes code completion from real-world clinic readiness.

## Status Meanings

- `implemented`: code path exists and is connected
- `stable`: current bounded scope is reliable enough to keep
- `usable`: usable in a controlled path, but not yet daily-clinic reliable
- `pilot-ready`: plausible for controlled clinic use after manual acceptance
- `prototype`: still exploratory or fragile
- `deferred`: intentionally not built yet
- `blocked`: depends on another explicit decision or operational prerequisite

## Product Surface Model

- `Tiki Paste`: staff paste / extraction / memory-write surface.
- `My Tiki`: patient portal / patient link entry.
- `TikiBell`: patient-facing helper inside `My Tiki`.
- `Tiki Desk`: staff / clinic operations surface.
- `Tiki Room`: in-room treatment surface.

## Current Overall Status

- Hardening status: `stable`
- Batch 6A status: `usable`
- Batch 6B status: `usable / controlled-pilot`
- Batch 6C status: `stable`
- Batch 6D status: `usable polish`
- Remaining work type:
  - clinic acceptance
  - broader rollout support
  - later expansion
- Stabilization note:
  - live authenticated Tiki Room verification for `current / load-next / clear` passed
  - do not reopen hardening unless a real issue is found

## Phase Gaps

### Phase 1 — Core Entities

Implemented:

- Core clinic, patient, visit, link, form, journey, escalation, room, and aftercare structures exist.

Partial:

- None blocking current bounded scope.

Deferred:

- Schema-first redesign is explicitly deferred.

Patch before closure:

- None.

### Phase 2 — Tiki Paste / Memory

Implemented:

- Staff-auth gated memory write route.
- Clinic context is resolved from authenticated staff context.

Partial:

- Knowledge hygiene and content review remain broader product concerns.

Deferred:

- Generic knowledge CMS.

Patch before closure:

- None for current security scope.

### Phase 3 — My Tiki Portal

Implemented:

- Patient portal shell.
- Journey/forms/Ask/aftercare access.
- Patient Today / next-actions layer.
- Aftercare due, clinic review acknowledgement, and safe return items.

Partial:

- Broader patient task UX polish.

Deferred:

- Separate task engine.

Patch before clinic-ready:

- Run real patient-link walkthrough for each target language and visit state.

### Phase 4 — Activation Wedge

Implemented:

- Quick Visit.
- CSV import.
- Conservative procedure resolution.
- Patient link generation.

Partial:

- Operational speed should be observed in live desk usage, especially unmatched/ambiguous procedure cases.

Deferred:

- Aggressive fuzzy/ambiguous auto-mapping.

Patch before closure:

- None currently. Ambiguous/unmatched procedure values are intentionally not auto-assigned.

### Phase 5 — Arrival Mode

Implemented:

- Patient self-arrival.
- Staff check-in.
- Ops Board lightweight refresh.
- Staff-visible QR flow.

Partial:

- External QR dependency has been removed; current remaining risk is only real device/browser display acceptance.

Deferred:

- Kiosk redesign.

Patch before closure:

- Manual device check in the clinic front desk/tablet setup.

### Phase 6 — Ask / TikiBell

Implemented:

- Source-limited Ask policy.
- Escalation path for unsupported/urgent/doctor-required content.
- Configurable high-churn prompts/fallback/labels through narrow clinic config.

Partial:

- No full FAQ/prompt admin UI.
- Classification remains code-owned.

Deferred:

- Prompt CMS.
- Rules engine.

Patch before clinic-ready:

- Real clinic review of Ask fallback/escalation copy in target languages.

### Phase 7 — Escalation

Implemented:

- Triage classification.
- Priority and assigned role/user.
- Acknowledge/respond/resolve/close actor tracking.
- Tiki Desk cards.
- Owner/latest actor visibility.
- SLA-derived markers and attention summary.

Partial:

- No external SLA notifications.
- SLA thresholds are hardcoded defaults.

Deferred:

- Notification routing.
- SLA rules engine.

Patch before broader rollout:

- Decide whether SLA reminders need in-app-only, email/SMS, or task notification behavior.

### Phase 8 — Rooms Lite

Implemented:

- Room presets.
- Occupancy.
- Ready queue.
- Assign/clear.
- Room-ready config knobs.
- Room transition audit/journey events.

Partial:

- Room-ready config UI is small and only covers current allowed knobs.

Deferred:

- Room workflow builder.

Patch before clinic-ready:

- Verify each deployed clinic’s room presets, naming, and tablet/staff workflow.

### Phase 9 — Tiki Room

Implemented:

- Auth-gated room current/load-next/clear.
- Doctor-first room prep.
- Guided patient input -> AI summary -> selectable response loop.
- Browser-native voice input.
- Browser TTS playback with multilingual fallback status.
- Live authenticated current/load-next/clear verification passed.

Partial:

- Browser voice/TTS quality is environment-dependent.
- Room tablet identity depends on logged-in browser staff session/local room selection, not dedicated room-device auth.

Deferred:

- Backend STT/TTS.
- Transcript storage.
- Autonomous voice answer.

Patch before clinic-ready:

- Per-room device acceptance test for mic permission, speech recognition, TTS voice, session expiry, and noise conditions.

### Phase 10 — Aftercare

Implemented:

- Procedure-aware checkpoints.
- Outbound send path.
- Duplicate-send prevention.
- Structured response and concern/urgent branching.
- Scheduler health/degraded visibility.
- Tiki Desk aftercare visibility.
- Narrow aftercare plan editor.

Partial:

- Plan editor is usable but not fully clinic-ready.
- Trigger/template editing is narrow and not a CMS.
- Scheduler degraded mode is visible but not a full job dashboard.

Deferred:

- Campaign system.
- Full template/trigger CMS.
- Job dashboard.

Patch before clinic-ready:

- Real admin acceptance test:
  - edit a real procedure step
  - confirm preview
  - confirm timing warning
  - verify future patient-facing content
  - verify audit/history record

## Cross-Phase Gaps

### Aftercare Plan Editor

- Status: `usable`
- Why not clinic-ready:
  - narrow editor works in code, but real clinic admin usage has not been validated.
- When to do:
  - before relying on non-engineering staff to maintain aftercare content.
- Priority: high for clinic rollout, medium for controlled pilot.
- Code areas:
  - `server.js`
  - `src/lib/aftercare-plan-editor.js`
  - `client/src/components/mytiki/MyTikiTab.jsx`
  - `tests/aftercare-plan-editor.test.js`

### Tiki Room Browser Voice

- Status: `usable`
- Why not clinic-ready:
  - browser/device/microphone/voice availability varies.
- When to do:
  - before making voice the primary room input method.
- Priority: medium.
- Code areas:
  - `client/src/pages/TikiRoomPage.jsx`
  - `client/src/lib/roomVoice.js`
  - `tests/room-voice.test.js`

### Tiki Desk Operational Visibility

- Status: `stable / pilot-ready`
- Why not fully clinic-ready:
  - no external notification workflow and no alert center.
- When to do:
  - before broader rollout that requires proactive SLA notification.
- Priority: medium.
- Code areas:
  - `server.js`
  - `src/lib/escalation-service.js`
  - `src/lib/audit-history.js`
  - `client/src/components/mytiki/MyTikiTab.jsx`
  - `client/src/components/settings/SettingsTab.jsx`

### QR / Patient Link Flow

- Status: `stable / pilot-ready`
- Why not fully clinic-ready:
  - code is stable, but each clinic device/display setup still needs manual verification.
- When to do:
  - before go-live in front desk or tablet setup.
- Priority: low-medium.
- Code areas:
  - `server.js`
  - `src/lib/qr-code.js`
  - `client/src/lib/opsLite.js`
  - `tests/qr-code.test.js`
  - `tests/ops-lite.test.js`

## Remaining Blockers

Blocks confident daily clinic use:

- Real clinic acceptance for aftercare plan editor.
- Real room/tablet device acceptance for Tiki Room browser voice/TTS and session expiry.
- Confirmation that deployed DB schema matches expected audit/config/aftercare/room columns.

Blocks broader rollout:

- External notification policy for escalation SLA.
- Provider-grade STT/TTS decision if browser-native quality is insufficient.
- More robust admin review/export needs.
- Multi-clinic configuration governance.

Later expansion only:

- full audit/history dashboard
- aftercare CMS/campaign builder
- Ask prompt CMS
- assignment rules engine
- analytics/reporting
- job dashboard

## Explicit Non-Goals

- no broad architecture changes
- no rules engine
- no CMS
- no schema-first redesign
- no backend voice pipeline unless explicitly approved
- no new major feature bucket without alignment

## Safest Next Step

Run a release-readiness verification pass and prepare a clean commit/push. Do not start new implementation before that pass.
