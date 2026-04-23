# TikiDoc Phase Gap Register

Last updated: 2026-04-23

Visible naming system:

- `My Tiki` = patient portal / patient link entry
- `TikiBell` = patient-facing helper inside My Tiki
- `Tiki Desk` = staff / clinic operations surface
- `Tiki Room` = in-room treatment surface

Status meanings:

- `implemented`: code path exists and is connected
- `partial`: real slice exists, but operational or control gaps remain
- `deferred`: intentionally not built yet
- `next`: recommended next closure or hardening task

## Current register

## Current overall status

- Hardening status: `stable`
- Active roadmap: `Batch 6`
- Remaining work type: `deferred / later expansion only`
- Stabilization note:
  - the final live authenticated Tiki Room verification for `current / load-next / clear` passed
  - do not reopen Batch 5 stabilization unless a real issue is found

### Batch 5A — clinic config layer

Implemented:
- Minimal clinic-level config foundation using `clinics.settings.tikidoc_rules`
- Ask and Room consumers now read the config layer
- Staff config write path:
  - `GET /api/staff/clinic-rule-config`
  - `PATCH /api/staff/clinic-rule-config`
- Strict allowlist validation for:
  - `ask.quick_prompts`
  - `ask.fallback_copy`
  - `ask.escalation_labels`
  - `rooms.room_ready.require_checked_in`
  - `rooms.room_ready.require_intake_done`
  - `rooms.room_ready.require_consent_done`
  - `rooms.room_ready.allowed_stages`
- `owner` / `admin` only patch access
- Audit record written for each successful config update

Partial:
- There is no internal UI for editing the allowed config yet.
- Audit for config writes is lightweight and stored through existing audit log infrastructure.

Deferred / Later:
- Not done:
  - any admin CMS
  - any generic settings page
  - any no-code builder
  - any rules engine
- Why:
  - Batch 5A was only meant to create a safe config foundation and write path.
- When:
  - only if operations prove that the small API-only path is too cumbersome
- Batch:
  - later hardening, not Batch 5A

Next:
- none required for stabilization
- future work belongs to Batch 6 expansion only

What must explicitly NOT be built yet:
- full admin UI
- visual rule editor
- arbitrary JSON editor for all clinic settings
- universal policy/rules engine

### Batch 5B — operational signals and taxonomy

Implemented:
- Shared Tiki Desk urgency/status metadata helper
- Unified escalation priority labels and aftercare risk labels in the staff UI
- Derived urgency markers normalized for:
  - escalation
  - aftercare
  - arrival
  - room-ready
- Naming boundary documentation updated:
  - visit workflow uses `stage`
  - escalation lifecycle uses `status`
  - aftercare event response uses `response_status`
  - urgency remains derived, not persisted as a second workflow engine

Partial:
- The shared taxonomy is currently centered on the Tiki Desk staff surface.
- Backend status models were intentionally not rewritten.

Deferred / Later:
- Not done:
  - a global cross-app status presentation layer
  - broader audit/ownership standardization
- Why:
  - Batch 5B was limited to control-layer hardening, not a workflow rewrite
- When:
  - Batch 5C
- Batch:
  - Batch 5C

Next:
- none required for stabilization
- future work belongs to Batch 6 expansion only

What must explicitly NOT be built yet:
- large status refactor
- duplicated workflow engine
- alert center
- notification routing system

### Batch 5C — trustworthiness hardening

Implemented:
- Light audit trail for key escalation / aftercare / room transitions
- Ownership / actor tracking standardization
- Aftercare scheduler health visibility:
  - healthy vs degraded runtime determination
  - startup logs
  - staff API payload
  - staff-visible degraded notice
- final live authenticated Tiki Room verification passed

Partial:
- no broader history browse UI
- no broader cross-surface scheduler alerting beyond the small staff surfacing

Deferred / Later:
- Not done:
  - fuller audit/history browse UI
  - stronger cross-surface staff summary surfacing
- Why:
  - Batch 5C was limited to trustworthiness hardening, not admin/reporting expansion
- When:
  - Batch 6 or later polish, if operationally needed
- Batch:
  - Batch 6 / later expansion

Next:
- Batch 6 roadmap only

What must explicitly NOT be built yet:
- audit dashboard
- forensic explorer
- assignment rules engine
- distributed scheduler platform

## Deferred / Later

Still intentionally not built:

- Batch 6: richer voice / TTS for Tiki Room
  - Why:
    - current room loop is intentionally text-input + browser speech placeholder
  - When:
    - Batch 6

- Batch 6: aftercare trigger editor
  - Why:
    - aftercare templates and triggers are still intentionally code/config driven
  - When:
    - Batch 6

- Later hardening: external QR dependency removal
  - Why:
    - current literal QR flow uses an external QR image service and is operationally acceptable but not ideal
  - When:
    - later hardening after current ops closure work

## Recommended next step

- Start Batch 6 roadmap items only
- Do not reopen stabilization work unless a real issue is found in operations
