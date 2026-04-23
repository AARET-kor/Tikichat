# TikiDoc Product Decisions

Last updated: 2026-04-23

## Product Surface Naming

- `Tiki Paste` = staff paste / extraction / memory-write surface.
- `My Tiki` = patient portal / patient link entry.
- `TikiBell` = patient-facing guide/helper inside `My Tiki`.
- `Tiki Desk` = staff / clinic operations surface.
- `Tiki Room` = in-room treatment surface.

Display copy should use these names. Internal routes, schema fields, metadata values, file names, and component names should remain stable unless a separate migration is explicitly approved.

## Non-Negotiable Product Rules

- The product is not a generic CRM.
- The product is not a generic chatbot.
- The product is not a diagnosis product.
- AI may assist, summarize, classify, translate, and recommend.
- AI must not independently deliver unsupported diagnosis or unsafe reassurance.
- Operational usefulness beats feature breadth.
- Staff workflows should stay within about `1-3 taps` when possible.
- “Works in code” is not the same as “safe for real-world clinic use.”

## Current Product Decisions

### Tiki Paste

- Tiki Paste remains the staff-facing paste/extraction workflow.
- Memory writes are staff-auth gated and must resolve clinic context from authenticated staff context, not caller-provided clinic input.
- Do not broaden Tiki Paste into a generic document CMS without a separate decision.

### My Tiki

- `My Tiki` is the patient portal umbrella and patient link entry.
- Patient task layer is a practical “today / next action” layer, not a separate task engine.
- Current task types include arrival, forms, aftercare due, clinic review acknowledgement, and safe return.
- Broader patient task polish is later expansion, not a workflow rewrite.

### Ask / TikiBell

- `Ask TikiBell` inside `My Tiki` is not a generic patient chatbot.
- Ask is a stage-aware, visit-aware, protocol-based patient question layer.
- Ask answers are restricted to:
  - clinic procedure knowledge
  - approved FAQ / operating guidance
  - aftercare protocol
  - safe fallback rules
- Ask should prefer:
  - answer
  - safe fallback
  - escalation
- Ask should not invent, diagnose, or over-reassure.
- `TikiBell` is the patient-facing helper persona for Ask and reassurance copy inside `My Tiki`.
- High-churn Ask knobs may be clinic-configurable through `clinics.settings.tikidoc_rules`, but:
  - only approved prompt/fallback/label subsets are writable
  - classification and source restriction logic stay in code
  - this is not a prompt CMS

### Tiki Desk

- `Tiki Desk` is the staff / clinic operations surface.
- It should surface operational attention clearly:
  - arrivals
  - forms
  - room readiness
  - escalations
  - aftercare
  - scheduler degraded state
  - recent audit/history snippets
- It is not currently a full command center, alert center, audit dashboard, or admin CMS.

### Escalation

- Escalation is not message forwarding.
- Escalation is an operational triage engine.
- Escalation must produce:
  - type
  - priority
  - assignment target
  - status
  - patient-visible reassurance
  - Tiki Desk task visibility
- SLA markers are currently derived in code for staff visibility.
- External SLA notifications are intentionally not built yet.
- “Created” is not enough. It is only operationally useful if it becomes a tracked staff task.

### Room Assignment

- Room assignment is not a free-text field on a visit.
- Room assignment is room traffic control.
- Clinic rooms should come from presets.
- Tiki Desk should answer:
  - what rooms exist
  - which are free
  - which are occupied
  - who is ready next
- Assign / clear / reassign must stay symmetric and operationally obvious.
- Room-ready gate conditions may be clinic-configurable through `clinics.settings.tikidoc_rules`, but:
  - only a narrow subset is writable
  - the room traffic model stays in code
  - this is not a room workflow builder

### Tiki Room

- Tiki Room is not a generic translation tablet.
- Tiki Room is not a transcript-first chat UI.
- Tiki Room is a guided in-room communication OS.
- The control loop is:
  - patient input
  - AI intent summary
  - bounded recommended responses
  - doctor/staff selection
  - patient-facing output
- AI may summarize and recommend.
- Final patient-facing response stays under clinician/staff control.
- Browser-native voice input is allowed as an optional input aid only:
  - it fills the existing patient utterance field
  - it does not auto-answer
  - it does not bypass the doctor/staff response selection step
- Browser speech synthesis is allowed as lightweight playback:
  - exact language voice is preferred
  - same-language-family voice is acceptable with visible fallback copy
  - browser default fallback must be visible when no matching voice exists
- Do not add transcript-first storage, autonomous voice answering, or backend STT/TTS providers without a separate explicit decision.

### Aftercare

- Aftercare is not a simple reminder scheduler.
- Aftercare is not marketing automation first.
- Aftercare is a safety + retention automation layer.
- Aftercare must connect:
  - procedure-aware checkpoints
  - structured patient check-ins
  - risk-sensitive branching
  - escalation when needed
  - safe rebooking / return prompts only after safety is clear
- Concern and urgent signals must become reviewable operational items, not just stored responses.
- The aftercare plan editor is intentionally narrow. It is not a campaign system or template CMS.

## Naming And State Rules

- `stage` remains the main visit workflow term unless there is a strong reason not to.
- Do not introduce parallel terms like `operational_status` or `journey_state` for the same visit workflow without an explicit migration decision.
- Use `escalation_type` for triage category. Do not add parallel names like `issue_type` or `handoff_reason` casually.
- Use `status` for escalation lifecycle state.
- Use `response_status` for aftercare event response state.
- Do not collapse escalation and aftercare lifecycle terms into one shared field name.
- Ownership / actor tracking stays split intentionally:
  - current owner = `assigned_role` / `assigned_user_id`
  - transition actor = action-specific `*_by` fields where present
  - history actor = append-only `patient_journey_events.actor_type` / `actor_id`
- Treat urgency as a derived operational marker, not a second workflow engine:
  - escalation urgency comes from `priority`
  - escalation SLA markers are derived from priority/status/opened time
  - aftercare urgency comes from `risk_level` / `urgent_flag`
  - arrival and room readiness stay derived UI signals
- Use `room_id`, `room assignment`, `room session`, and `room clear` consistently:
  - `room assignment` = visit placed into a room
  - `room session` = live room interaction state
  - `room clear` = room and current session released

## Closure Rule

- `tests/build passing` means code runs.
- `implemented` means a code path exists and is connected.
- `pilot-ready` means the workflow is plausible for controlled clinic use with manual acceptance.
- `clinic-ready` means staff can rely on it in daily use without close engineering supervision.
- These are different states and should be tracked separately in `phase_status.md` and `phase_gap_register.md`.

## Deferred / Later

Not built yet:

- backend STT/TTS pipeline
- external SLA notifications
- full audit/history browse dashboard
- aftercare CMS / campaign builder
- Ask prompt CMS
- generic settings page
- no-code rule editor
- universal rules engine

Why:

- Hardening is stable and Batch 6 has delivered practical expansion slices.
- Remaining work is mostly pilot validation, broader rollout support, and later expansion.
- The system should not be widened into a generic admin platform before real clinic usage proves the need.

## Current State Lock

- Hardening is treated as stable.
- Batch 6A / 6B / 6C are implemented for their bounded scopes.
- Batch 6D reviewability/admin polish is implemented as a small surface, not a full admin system.
- Do not reopen stabilization work unless a real issue is found in operations.
