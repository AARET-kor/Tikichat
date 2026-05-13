# Tiki Desk Unified Journey Contract

Date: 2026-05-13

Status: design approved for implementation planning

## Goal

Make Tiki Desk a reliable operational board where every patient/visit moves through one shared journey:

`상담 -> 링크 -> 도착 -> 문진·동의 -> 대기 -> 룸 -> 사후`

The important product requirement is not only a clearer screen. The real requirement is that TikiPaste, Tiki Desk, My Tiki, Tiki Room, Aftercare, and Memory all read and write the same patient/visit state. If one surface completes a step, every other surface must recognize that step as complete after refresh, relogin, and polling.

## Product Principle

Tiki Desk is not a full CRM replacement and not a dense Vegas clone.

It should borrow the strongest part of the Vegas mental model: stage-based patient flow. It should not copy the full dense column UI.

The TikiDoc version should be:

- Default view: large, calm, readable `오늘 할 일` and `My Tiki 상태`.
- Stage rail: seven large stage cards across the top.
- Drilldown: clicking a stage card expands that stage's patient list.
- Action model: each patient card has one primary action for the current stage.
- Transition model: completing that action moves the visit to the next stage.

## Surface Responsibilities

### TikiPaste

TikiPaste captures a foreign-patient consultation and turns it into structured workflow objects only after staff confirmation.

Writes:

- `patients`
- `visits`
- `patient_links` when My Tiki link is generated
- Memory context for patient-level operating memory
- optional conversation intake linkage/history

Must guarantee:

- If a patient + visit + My Tiki link were created in TikiPaste, Tiki Desk must not show that visit as `링크 필요`.
- TikiPaste should not own ongoing workflow state after conversion. It hands off to Tiki Desk.

### Tiki Desk

Tiki Desk is the daily operational command board.

Reads:

- visits
- patient link state
- My Tiki form/consent state
- room assignment/readiness state
- aftercare state
- lightweight Memory/journey snippets when needed

Writes:

- explicit staff confirmations for stage transitions
- visit state fields such as arrival/check-in/form confirmation where already supported
- journey/audit/Memory events for operational history

Must guarantee:

- A visit appears in exactly one current journey stage.
- Every visible primary button changes durable backend state or navigates to the correct dedicated surface.
- No button should only scroll to a hidden/legacy row and appear to do nothing.

### My Tiki

My Tiki is the patient link/portal.

Writes:

- link opened/read state when available
- intake/form submission state
- consent submission state
- patient questions and confirmation requests
- aftercare responses

Must guarantee:

- Patient actions update the same state Tiki Desk uses.
- My Tiki language and TikiBell responses remain patient-facing and multilingual.

### Tiki Room

Tiki Room owns room assignment and in-room treatment operations.

Reads:

- room-ready queue from visits
- current room state
- patient prep summary

Writes:

- room assignment
- load-next/current patient
- clear/end session
- journey/audit/Memory events for room transitions

Must guarantee:

- Tiki Desk can show room stage summary without duplicating room operations.
- Room assignment and clear/load-next move the visit across `대기`, `룸`, and `사후` correctly.

### Aftercare / Patient Care

Aftercare owns post-treatment check-ins and recovery signals.

Reads:

- aftercare plans/events/responses
- visit/patient context

Writes:

- due/sent/responded/reviewed state
- concern/urgent/return-possible signals
- journey/audit/Memory events

Must guarantee:

- Aftercare status appears in `사후` stage and Patient Care.
- Urgent or concern responses are not hidden inside My Tiki only.

### Memory

Memory is patient-level operational memory, not raw CRM storage.

Writes:

- summaries
- interests
- cautions
- patient concerns
- risk/complaint signals
- correction notes and important timeline annotations

Must guarantee:

- Major stage transitions leave a lightweight trace.
- Staff edits are actor/audit tracked.
- Memory does not become a full message archive.

## Journey Stages

### 1. 상담

Meaning:

The patient is still a consultation/intake candidate.

Entry examples:

- TikiPaste conversation intake saved but not converted.
- CRM/EMR CSV row imported but not confirmed.
- Patient candidate exists without a confirmed TikiDoc patient + visit.

Completion action:

- `환자/방문 확정`

Next stage:

- `링크`

Backend expectation:

- Create or link `patient`.
- Create or link `visit`.
- Seed Memory context if source context exists.
- Mark intake as converted/linked.

### 2. 링크

Meaning:

The visit exists and My Tiki link work is pending or needs handoff confirmation.

Entry examples:

- Visit exists with no active patient link.
- Link was generated but staff still needs to copy/share/confirm delivery.

Completion actions:

- `My Tiki 발급`
- `링크 전달 확인`

Next stage:

- `도착`

Backend expectation:

- `patient_links.status in ('active', 'sent', 'opened')` means link exists.
- If raw URL is unavailable after reload, the visit still counts as link issued.
- Staff delivery acknowledgement should be durable if introduced, but raw token storage should remain avoided unless explicitly approved.

### 3. 도착

Meaning:

The patient is expected or has the link, but arrival/check-in has not been confirmed.

Entry examples:

- Today visit with active/sent/opened My Tiki link.
- Staff has confirmed link delivery.

Completion action:

- `방문 확인`

Next stage:

- `문진·동의`

Backend expectation:

- Set `patient_arrived_at` or existing check-in field.
- Write journey/audit event.
- Refresh Tiki Desk and My Tiki status.

### 4. 문진·동의

Meaning:

The patient is present or expected, but forms/consent are incomplete or need staff verification.

Entry examples:

- Arrival confirmed but `intake_done` or `consent_done` is false.
- My Tiki form/consent submitted but staff review is pending.

Completion action:

- `서류 확인 완료`

Next stage:

- `대기`

Backend expectation:

- Mark intake and consent completion/verification using existing fields where possible.
- Do not create a separate document workflow engine.
- Write journey/audit event.

### 5. 대기

Meaning:

The patient is ready for room assignment.

Entry examples:

- Arrival confirmed.
- Intake and consent complete.
- Not currently assigned to a room.

Completion action:

- `룸 이동`

Next stage:

- `룸`

Backend expectation:

- Prefer navigating to Tiki Room assignment UI or calling existing assign-room route.
- Do not duplicate full room operations inside Tiki Desk.

### 6. 룸

Meaning:

The patient is assigned to a room or current room session.

Entry examples:

- `room_id` is set.
- room current visit references the visit.

Completion action:

- `룸 완료`

Next stage:

- `사후`

Backend expectation:

- Tiki Room clear/end/load-next updates visit/room state durably.
- Tiki Desk reflects the room change after refresh.
- Write journey/audit/Memory event.

### 7. 사후

Meaning:

The visit is past treatment and aftercare/recovery follow-up is active or due.

Entry examples:

- Visit stage is post-care.
- Aftercare event due/sent/responded/reviewed exists.

Completion actions:

- `사후관리 확인`
- `검토 완료`
- `재방문 안내`

Next stage:

- Closed from operational daily view when no further action remains.

Backend expectation:

- Aftercare status remains visible in Patient Care.
- Memory keeps summary/concern/risk signal.

## Tiki Desk Default UI

The default screen should show only:

1. Seven-stage rail.
2. `오늘 할 일`.
3. `My Tiki 상태`.

The old broad dashboard sections should remain in dedicated surfaces:

- Room detail operations: Tiki Room.
- Confirmation requests and aftercare: Patient Care.
- Protocol content: Protocol.
- Procedure/pricing: Procedure Management.
- Patient operating memory: Memory.
- Analytics: Statistics.

## Stage Rail Behavior

Each stage card should show:

- stage number
- Korean stage label
- count
- visual urgency if count includes overdue/attention-needed items

Clicking a stage card should:

- set an active stage filter
- expand a patient list for that stage
- not navigate away
- not mutate state

The selected stage list should show:

- patient display name
- language/flag
- visit time or `시간 미정`
- procedure interest when known
- current stage helper
- one primary action

## Primary Action Rules

Every card should expose at most one primary action for the current stage.

Allowed actions:

- `환자/방문 확정`
- `My Tiki 발급`
- `링크 전달 확인`
- `방문 확인`
- `서류 확인 완료`
- `룸 이동`
- `룸 완료`
- `사후관리 확인`

Every action must either:

- call a backend route that durably changes state, or
- navigate to the dedicated surface that owns the action.

Forbidden behavior:

- Scroll-only actions that appear to do nothing.
- Local-only state changes that disappear on refresh.
- Reasking for My Tiki link generation when an active/sent/opened link already exists.
- Showing patients without names when `patients.name` or a normalized fallback exists.

## Data Contract

Tiki Desk should derive its state from a normalized visit object. The normalized object should include:

- `visit_id`
- `patient_id`
- `patient_name`
- `patient_language`
- `patient_flag`
- `visit_date`
- `procedure_name`
- `link_status`
- `link_exists`
- `link_url_available`
- `patient_arrived_at`
- `checked_in_at`
- `intake_done`
- `consent_done`
- `room_id`
- `room_ready`
- `room_assigned_at`
- `aftercare_status`
- `current_journey_stage`
- `next_action`

If a value is missing, the system should degrade explicitly:

- show `시간 미정` instead of hiding the patient
- show `시술 미지정` instead of empty procedure
- show a recoverable warning if a transition cannot run

## Stage Calculation Priority

The same stage calculation should be used for counts, lists, and primary CTA.

Recommended priority:

1. If source intake is not converted: `상담`
2. Else if no active/sent/opened link and link is required: `링크`
3. Else if arrival/check-in is missing: `도착`
4. Else if intake/consent incomplete or unverified: `문진·동의`
5. Else if room-ready and no room assigned: `대기`
6. Else if room assigned/current: `룸`
7. Else if aftercare active/due/responded: `사후`
8. Else hide from active daily board or show as complete history only

Implementation may need careful ordering because aftercare can overlap with room completion. The rule should prefer current active operational work over historical flags.

## Known Current Risks

From recent fixes and user observations:

- TikiPaste can create valid patient/visit/link data, but Tiki Desk has previously misread link state because of optional `patient_links` column assumptions.
- Tiki Desk actions previously targeted legacy rows or scroll targets, causing buttons to appear inert.
- My Tiki raw URL is intentionally not stored, so after reload only `link issued` can be reconstructed, not necessarily `copyable URL`.
- Visits with `visit_date = null` must remain visible if they are active operational visits.
- Patient names must be normalized from both nested joins and flattened API payloads.

## Implementation Batches

### Batch 1: Shared Journey Helper

Goal:

Create a single journey-stage helper for Tiki Desk counts, lists, and CTAs.

Smallest real implementation:

- Extend existing `client/src/lib/tikiDeskFlow.js` or add a focused helper beside it.
- Add tests for all seven stages.
- Keep backend schema unchanged.

Do not build:

- Generic workflow engine.
- New status taxonomy table.
- Drag-and-drop kanban.

### Batch 2: Tiki Desk UI Restructure

Goal:

Make the first screen show only stage rail, today tasks, and My Tiki status.

Smallest real implementation:

- Update `MyTikiTab.jsx` Tiki Desk section.
- Add active stage filter/drilldown.
- Increase Tiki Desk type scale by approximately 1pt.
- Use wider content spacing.

Do not build:

- Full Vegas clone.
- Always-visible seven-column board.

### Batch 3: Durable Stage Actions

Goal:

Ensure every primary action calls a real backend transition or dedicated owner surface.

Smallest real implementation:

- Wire existing routes first.
- Add tiny routes only if a required transition has no backend path.
- Refresh ops-board after success.
- Surface error messages if transition fails.

Do not build:

- New task engine.
- Large workflow audit UI.

### Batch 4: Cross-Surface Verification

Goal:

Verify TikiPaste, Tiki Desk, My Tiki, Tiki Room, Aftercare, and Memory stay linked.

Manual checks:

- TikiPaste creates patient + visit + My Tiki link.
- Tiki Desk recognizes patient name and link issued state.
- Stage action advances the card.
- My Tiki form/consent changes Tiki Desk state.
- Tiki Room assign/clear changes Tiki Desk state.
- Aftercare response appears in Patient Care and Memory.

## Out Of Scope

Do not build yet:

- Full omnichannel inbox.
- CRM replacement.
- Full Vegas clone.
- Drag/drop patient board.
- New schema-first workflow system.
- Raw My Tiki token storage.
- Large audit dashboard.
- Backend voice pipeline.

## Approval Gate

This document defines the design contract only. Implementation should start only after the implementation plan is approved.
