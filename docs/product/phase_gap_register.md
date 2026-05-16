# TikiDoc Phase Gap Register

Last updated: 2026-05-16

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
- May 1 runtime note:
  - production auth, Quick Visit, My Tiki links, and Tiki Desk scroll received real bug fixes
  - these fixes are coded, tested, committed, and pushed
  - final closure requires one deployed smoke test after Railway finishes deploying the latest commit

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
- Web-sidecar TikiPaste workspace for pasted conversations, selected chat text, screenshot fallback, summaries, intent, urgency/risk signal, recommended replies, copy actions, and handoff actions.
- Conversation Intake Phase 2: TikiPaste can save analyzed pasted/screenshot conversation context as a pending intake candidate, scoped to the authenticated clinic.
- Conversation Intake Phase 2B: TikiPaste now extracts patient/visit candidates, missing fields, and next suggested action from pasted text or staff-provided screenshots.
- Conversation Intake Phase 2B: TikiPaste now shows conservative existing-patient match candidates using authenticated, clinic-scoped patient data.
- Conversation Intake Phase 2B: staff can explicitly choose existing patient or new patient; confirmed save creates/links patient, creates visit, generates My Tiki link, and writes patient-specific Memory.
- Conversation Intake Phase 3: pending intake can be staff-confirmed into an existing patient or new patient, with visit creation and My Tiki link generation.
- CRM/EMR import ownership clarified: bulk patient/visit import belongs to Tiki Desk CSV/manual import and settings guidance, while TikiPaste remains single-conversation capture.
- CRM/EMR CSV import now provides a sample template for patient, visit, and external reference fields.
- CRM/EMR CSV import now includes lightweight export presets for Vegas, 의사랑, and Dr.Palette column aliases.
- CRM/EMR CSV import supports manual column mapping when automatic header detection cannot identify required fields.
- CRM/EMR CSV import preview now identifies staff-review warnings, invalid rows, and same-file duplicates; backend import also excludes same-file duplicate visits defensively.
- CRM/EMR CSV import completion now includes copy-back text for My Tiki links and summaries that staff can paste into the existing CRM/EMR.
- CRM/EMR CSV import now seeds patient Memory for successful created/visit-created rows with source system, external identifiers, visit/procedure context, external memo, and generated My Tiki link.
- Tiki Memory detail now supports direct owner/admin editing of patient operating context: summary, procedure interests, concerns, risk level/flags, staff precautions, and staff notes.
- Direct Memory edits are clinic-scoped and actor/audit-backed through `last_edited_by`, `last_edited_at`, journey `note_added`, and audit log writes.
- Tiki Desk now includes a lightweight secondary `신규 환자 후보 확인` area combining pending TikiPaste intakes and recent CSV import batch outcomes.
- CSV import results are persisted as compact batch/row outcome records for staff visibility.

Partial:

- Knowledge hygiene and content review remain broader product concerns.
- TikiPaste does not automatically read arbitrary browser DOM and does not provide extension overlay behavior. The former Chrome extension app has been removed.
- Patient matching is now assisted by conservative candidate ranking, but still requires explicit staff confirmation. No automatic CRM/EMR matching or inbox-style queue management exists.
- CRM/EMR import UI is stronger than the first lightweight pass, but still has no saved column-mapping preset or API connector.
- CRM/EMR presets are static alias helpers and may still need field tuning from real exports.
- The Tiki Desk intake queue is an operational visibility queue, not a full inbox. It does not sync channel messages, send replies, or perform automatic patient matching.
- Tiki Memory editing is narrow field editing, not a full revision browser or CRM data editor.

Deferred:

- Generic knowledge CMS.
- Chrome extension direction. This is no longer paused code; the `extension/` app has been intentionally deleted and should only return after a new explicit product decision.
- Desktop/native overlay.
- Large OCR platform.
- Full omnichannel inbox, channel sync, and automatic channel sending.
- Channel-specific CRM/EMR API integrations.

Patch before closure:

- Validate the pending intake conversion flow against the deployed Supabase schema after migration `026` is applied.

### Phase 3 — My Tiki Portal

Implemented:

- Patient portal shell.
- Journey/forms/Ask/aftercare access.
- Patient Today / next-actions layer.
- Aftercare due, clinic review acknowledgement, and safe return items.
- Patient-link route `/t/:token`.
- Latest link hardening:
  - generated URLs encode the raw token
  - token auth selects only required `patient_links` fields
  - optional schema fields no longer block link validity
- Tiki Desk now treats My Tiki link state as journey infrastructure:
  - link-needed patients can issue a link
  - issued/opened patients can copy a recoverable link URL or reissue when the raw URL is unavailable
  - 문진 미완료 and 동의 미완료 patients route to the existing staff forms-confirm transition
  - arrival-confirmed patients route to the existing check-in transition when not already checked in
  - expired/cancelled links show reissue as the safe action
- `My Tiki 상태 상세` now uses these status-specific actions directly instead of showing only passive `상태 확인` buttons.
- Unsupported states now show disabled operational copy rather than pretending a stage transition happened.

Partial:

- Broader patient task UX polish.
- Multilingual patient UI needs real device QA after the latest design-system pass.
- 문진 and 동의 are still confirmed together by the current backend route; separate confirmation controls are intentionally not added without a clearer schema/contract decision.
- Raw link URLs may be unavailable after reload because raw tokens are not stored. Reissue is the conservative staff action in that case.

Deferred:

- Separate task engine.

Patch before clinic-ready:

- Run real patient-link walkthrough for each target language and visit state.
- Run one deployed smoke test with a newly generated link after the latest deploy.

### Phase 4 — Activation Wedge

Implemented:

- Quick Visit.
- CSV import.
- Conservative procedure resolution.
- Patient link generation.
- Latest Quick Visit stabilization:
  - staff-auth session check before parse/create
  - visible step labels
  - timeout messaging
  - partial retry reuses existing patient/visit IDs
  - success screen remains visible
  - new visit is inserted into Tiki Desk immediately
  - date filter shifts if the new visit is outside today's range

Partial:

- Operational speed should be observed in live desk usage, especially unmatched/ambiguous procedure cases.
- Deployment smoke test is still needed after the latest commit to confirm the generated link opens and the visit is visible.

Deferred:

- Aggressive fuzzy/ambiguous auto-mapping.

Patch before closure:

- None currently. Ambiguous/unmatched procedure values are intentionally not auto-assigned.

### Phase 5 — Arrival Mode

Implemented:

- Patient self-arrival.
- Staff check-in.
- Tiki Desk 도착 확인 buttons use the real staff check-in transition instead of a cosmetic stage move.
- Ops Board lightweight refresh.
- Staff-visible QR flow.
- Tiki Desk document and internal scroll restoration after the design-system enlargement.

Partial:

- External QR dependency has been removed; current remaining risk is only real device/browser display acceptance.
- Staff dashboard scroll must still be manually verified on actual clinic staff devices after deploy.

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
- Patient-facing copy has TikiBell naming direction, but multilingual copy polish remains ongoing.

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
- Verify scroll and card density in Tiki Desk when rooms, escalations, and aftercare sections all contain real data.

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
- Admin editing flow needs real clinic validation with a real procedure and future patient-facing message.

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

### Production Auth / Environment Alignment

- Phase number: cross-phase
- Gap name: Supabase env/build alignment
- Status: `stable after deploy`
- Why it is not fully closed:
  - code now expects real Supabase Auth, but deployed frontend bundles bake `VITE_*` values at build time.
  - a stale bundle can still point at an old Supabase project.
- When it should be done:
  - before every controlled pilot deploy.
- Priority: high.
- Where it exists:
  - `client/src/lib/supabase.js`
  - `client/src/pages/Login.jsx`
  - Railway variables
  - Supabase Auth dashboard
- Smallest next check:
  - login network request must target the current Supabase project hostname.

### Quick Visit / My Tiki Link Smoke Test

- Phase number: 3 / 4
- Gap name: deployed link-open verification
- Status: `verify`
- Why it is not fully closed:
  - code and tests pass, but the latest link-token and schema-safety patch must be verified against the deployed Railway service and live Supabase project.
- When it should be done:
  - immediately after the latest deploy finishes.
- Priority: high.
- Where it exists:
  - `server.js`
  - `src/middleware/auth.js`
  - `client/src/components/mytiki/QuickVisitCreate.jsx`
  - `client/src/components/mytiki/MyTikiTab.jsx`
- Pass condition:
  - create a patient + visit, copy the generated `/t/:token`, open it, and see the My Tiki patient portal instead of invalid-link state.

### Staff Dashboard Scroll / Screen Fit

- Phase number: 5 / cross-phase UX
- Gap name: Tiki Desk scroll and viewport acceptance
- Status: `verify`
- Why it is not fully closed:
  - code now restores document scroll and Tiki Desk internal scroll, but the earlier issue was observed in a real browser viewport after design enlargement.
- When it should be done:
  - immediately after latest deploy, before daily staff use.
- Priority: high.
- Where it exists:
  - `client/src/index.css`
  - `client/src/pages/Dashboard.jsx`
  - `client/src/components/mytiki/MyTikiTab.jsx`
- Pass condition:
  - at 100% zoom, staff can scroll Tiki Desk vertically and reach lower room/escalation/aftercare sections on desktop and mobile/tablet.

### New Visit Visibility

- Phase number: 4 / 5
- Gap name: newly created visit appears in the operational board
- Status: `stable after deploy smoke test`
- Why it is not fully closed:
  - code now inserts the created visit optimistically and moves date range, but deployed behavior should be confirmed with real clinic timezone/date input.
- When it should be done:
  - with the Quick Visit smoke test.
- Priority: high.
- Where it exists:
  - `client/src/components/mytiki/MyTikiTab.jsx`
  - `server.js` `/api/staff/ops-board`
  - `server.js` `/api/my-tiki/visits`
- Pass condition:
  - new visit is visible in `오늘`, `내일`, `이번주`, or `전체` according to its visit date without staff needing to guess.

### TikiPaste Web-Sidecar Validation

- Phase number: 2 / Batch 6 expansion
- Gap name: real staff sidecar workflow validation
- Status: `usable`
- Why it is not fully closed:
  - the sidecar works as a normal web app, but staff must validate copy/paste flow next to the actual chat tools they use.
- When it should be done:
  - during controlled pilot workflow rehearsal.
- Priority: medium.
- Where it exists:
  - `client/src/components/magic/TikiPasteTab.jsx`
  - `/api/tiki-paste`
- Explicitly not built:
  - Chrome extension
  - desktop overlay
  - automatic DOM reading
  - large OCR platform

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

- Status: `stable / pilot-ready`, with UX reset Phase 1 implemented
- Why not fully clinic-ready:
  - no external notification workflow and no alert center.
  - sidebar scale, Protocol UX, Procedure Management UX, and My Tiki preview visibility still need separate UX passes.
- What changed on 2026-04-24:
  - Tiki Desk first screen now emphasizes booked order, actual arrival order, and operational next-action order.
  - Staff-facing metrics and patient list rows were enlarged for front-desk readability.
  - Staff dashboard shell now uses a wider readable sidebar, larger icons/labels, clearer product vs management grouping, and a larger clinic/staff top bar.
  - Protocol surface now uses a clearer operational standards-board layout with response standards, prohibited phrases, approved wording, and a visible improvement checklist.
  - Procedure Management now surfaces registered procedure count, AI-response readiness, missing fields, larger template import, and larger editing controls.
  - The first-screen goal is operational recognition: who is booked, who arrived, who is blocked, who is room-ready, and what to do next.
- When to do:
  - before broader rollout that requires proactive SLA notification.
  - before calling the staff dashboard fully clinic-ready, complete the remaining visual and management-surface UX passes.
- Priority: medium.
- Code areas:
  - `server.js`
  - `src/lib/escalation-service.js`
  - `client/src/lib/tikiDeskFlow.js`
  - `src/lib/audit-history.js`
  - `client/src/components/layout/Sidebar.jsx`
  - `client/src/pages/Dashboard.jsx`
  - `client/src/components/protocol/ProtocolTab.jsx`
  - `client/src/components/procedures/ProceduresTab.jsx`
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
