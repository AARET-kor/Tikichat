# TikiDoc Product Decisions

Last updated: 2026-04-22

## Non-negotiable product rules

- Visible surfaces stay limited to `Tiki Paste`, `My Tiki`, `Tiki Room`.
- The product is not a generic CRM.
- The product is not a generic chatbot.
- The product is not a diagnosis product.
- AI may assist, summarize, classify, translate, and recommend.
- AI must not independently deliver unsupported diagnosis or unsafe reassurance.
- Operational usefulness beats feature breadth.
- Staff workflows should stay within about `1-3 taps` when possible.

## Current product decisions

### Ask

- `My Tiki Ask` is not a generic patient chatbot.
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

### Escalation

- Escalation is not message forwarding.
- Escalation is an operational triage engine.
- Escalation must produce:
  - type
  - priority
  - assignment target
  - status
  - patient-visible reassurance
  - Ops Board task visibility
- “created” is not enough. It is only operationally useful if it becomes a tracked staff task.

### Room assignment

- Room assignment is not a free-text field on a visit.
- Room assignment is room traffic control.
- Clinic rooms should come from presets.
- Ops Board should answer:
  - what rooms exist
  - which are free
  - which are occupied
  - who is ready next
- Assign / clear / reassign must stay symmetric and operationally obvious.

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

## Naming rules to keep stable

- `stage` remains the main visit workflow term unless there is a strong reason not to.
- Do not introduce parallel terms like `operational_status` or `journey_state` for the same visit workflow without an explicit migration decision.
- Use `escalation_type` for triage category. Do not add parallel names like `issue_type` or `handoff_reason` casually.
- Use `room_id`, `room assignment`, `room session`, and `room clear` consistently:
  - `room assignment` = visit placed into a room
  - `room session` = live room interaction state
  - `room clear` = room and current session released

## Closure rule

- `tests/build passing` means code runs.
- `phase operationally closed` means the workflow is usable in real clinic operations.
- These are different states and should be tracked separately in `phase_status.md`.
