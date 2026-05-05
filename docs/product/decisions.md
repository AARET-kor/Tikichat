# TikiDoc Product Decisions

Last updated: 2026-05-05

## Product Surface Naming

- `Tiki Paste` = staff sidecar for one-off consultation capture, reply drafting, and staff-confirmed workflow handoff.
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
- The Chrome extension direction is paused for now.
- The current product direction is a web-only sidecar workspace that staff keep open next to KakaoTalk, WhatsApp, Instagram DM, or another chat tool.
- Tiki Paste may support:
  - pasted conversation text
  - pasted selected chat text
  - screenshot upload/drop as fallback
  - summary
  - last-message intent
  - urgency/risk signal
  - recommended replies
  - copy actions
  - Quick Visit / My Tiki link / Tiki Desk handoff actions
- Tiki Paste may produce conservative patient and visit candidates from pasted text or staff-provided screenshots.
- Existing-patient matching must be clinic-scoped and staff-authenticated.
- Matching suggestions are allowed, but staff must explicitly choose:
  - existing patient
  - new patient
  - or pending intake review
- After staff confirmation, Tiki Paste may create/link patient, create visit, generate My Tiki link, and write patient-specific Memory.
- Memory writes are staff-auth gated and must resolve clinic context from authenticated staff context, not caller-provided clinic input.
- Existing CRM/EMR patient and visit data should be handled through Tiki Desk import/settings surfaces, not inside Tiki Paste.
- Tiki Memory is for patient-specific remembered context after a patient is identified, not for CSV/import management.
- Do not broaden Tiki Paste into a generic document CMS without a separate decision.
- Do not build extension-only behavior, desktop overlays, automatic arbitrary browser DOM reading, or a large OCR platform without a separate decision.
- Do not silently auto-match or auto-create patients from copied conversation text without staff confirmation.

### CRM/EMR Import vs Tiki Paste vs Memory

- CRM/EMR import belongs in Tiki Desk operations/settings and CSV/manual import flows.
- CRM/EMR CSV import should expose a small downloadable sample template so clinics can map exports without guessing supported columns.
- CRM/EMR CSV import may provide lightweight export presets for common systems such as Vegas, 의사랑, and Dr.Palette, but these are column-alias helpers only.
- CRM/EMR CSV import should allow staff to manually map required columns when automatic header detection fails.
- CRM/EMR CSV import should never silently create duplicate visits from duplicate rows in the same file; preview should show review warnings before staff imports.
- After import, TikiDoc should provide copy-back text containing My Tiki links and concise summaries so staff can paste results into the existing CRM/EMR.
- Tiki Desk should own the lightweight foreign-patient intake queue, combining pending TikiPaste conversation intakes and recent CRM/EMR CSV import outcomes.
- CSV import result persistence should store operational summaries and row outcomes only; do not store raw CRM/EMR files as Memory.
- Successful CSV-created patients/visits may seed patient Memory with compact context: source CRM/EMR, external reference values, procedure interest, external memo, visit context, and generated My Tiki link.
- Tiki Paste handles a single current consultation conversation and can stage it as a pending intake.
- Tiki Memory stores patient-specific context after identification, such as summaries, risks, interests, and notes.
- Tiki Memory may be directly edited by owner/admin staff for patient operating context only: summary, procedure interests, patient concerns, risk flags, precautions, and staff notes.
- Direct Memory edits must be authenticated, clinic-scoped, actor-stamped, and audit-backed.
- Do not make Tiki Paste the owner of bulk CRM/EMR files.
- Do not make Memory the owner of raw CRM/EMR import files.
- Do not use Memory as raw CRM/EMR file storage or full conversation transcript storage.
- Do not turn TikiPaste matching into a CRM replacement, inbox, or automatic channel sync.
- Do not treat CSV presets as full vendor integrations, message sync, or write-back APIs.

### My Tiki

- `My Tiki` is the patient portal umbrella and patient link entry.
- Patient task layer is a practical “today / next action” layer, not a separate task engine.
- Current task types include arrival, forms, aftercare due, clinic review acknowledgement, and safe return.
- Broader patient task polish is later expansion, not a workflow rewrite.
- Patient links use `/t/:token`.
- Raw patient link tokens are not stored in the DB; only `token_hash` is stored.
- Generated patient-link URLs should encode the raw token before returning it to staff.
- Patient-token auth should depend on the smallest required `patient_links` fields, because deployed clinic schemas may not all have optional tracking columns.

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
- Tiki Desk should feel like an operational command board, not a generic dashboard.
- The first screen should prioritize:
  - booked order
  - actual arrival order
  - operational next-action order
- It should surface operational attention clearly:
  - arrivals
  - forms
  - room readiness
  - escalations
  - aftercare
  - scheduler degraded state
  - recent audit/history snippets
- It is not currently a full command center, alert center, audit dashboard, or admin CMS.
- Phase 1 UX reset is implemented for the Tiki Desk first screen: larger metrics, larger patient rows, and a clearer booked / arrived / next-action board.
- Phase 2 dashboard shell reset is implemented for the staff sidebar and top bar: wider navigation, larger icons, larger labels, clearer product/management grouping, and stronger clinic/staff identity.
- Phase 3 Protocol UX reset is implemented as a read/scan-oriented standards board with clearer Korean copy, response standards, prohibited phrases, approved wording, and an improvement checklist.
- Phase 4 Procedure Management UX reset is implemented around operational readiness: registered procedure count, AI-response readiness, missing-field visibility, larger master-template import, and larger editing controls.
- My Tiki preview surfacing remains separate follow-up work.
- Tiki Desk must remain scrollable at normal browser zoom after visual enlargement.
- If a newly created Quick Visit is outside the current date filter, the UI should move staff to the relevant date range instead of silently hiding the new visit.
- Do not treat “created but hidden by filter” as acceptable staff UX.

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

### Auth And Deployment

- Production login must use real Supabase Auth.
- Signup and login must use the same auth system.
- Production must not silently fall back to mock staff sessions.
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are frontend build-time values. Updating Railway variables is not enough unless the frontend bundle is rebuilt/redeployed.
- Server-side Supabase variables must point at the same project as the frontend bundle:
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- If login shows `Failed to fetch`, first check the browser Network request hostname before changing auth code.

### Design System

- The visual direction is warm clinical minimalism:
  - calm
  - premium
  - bright
  - not flashy
  - not generic SaaS
- Mocha remains the signature identity color, but it should be used narrowly:
  - main buttons
  - active states
  - important badges
  - key icons
  - CTA accents
  - section accent lines
- Large product card backgrounds should generally stay light.
- Staff surfaces should prioritize:
  - larger typography
  - stronger hierarchy
  - readable Korean copy
  - obvious operational purpose
  - scrollable layouts at normal zoom
- Landing and app are split:
  - `tikidoc.xyz` = landing / marketing
  - `app.tikidoc.xyz` = product app
- The landing app is separate from the Railway product app. Do not move the product app to Vercel as part of landing work.

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
- Chrome extension / native overlay version of TikiPaste
- automatic arbitrary browser DOM reader
- backend OCR platform
- broad patient task engine
- full admin CMS for protocol/procedure/aftercare/settings
- full omnichannel inbox or message sync
- channel-specific CRM/EMR API integration before manual intake proves the workflow
- automatic patient/visit creation from conversation intake without staff confirmation
- automatic CRM/EMR patient matching beyond explicit staff-selected search results

Why:

- Hardening is stable and Batch 6 has delivered practical expansion slices.
- Remaining work is mostly pilot validation, broader rollout support, and later expansion.
- The system should not be widened into a generic admin platform before real clinic usage proves the need.
- TikiDoc should remain a lightweight foreign-patient intake and journey layer that can sit beside existing CRM/EMR systems rather than replacing them.
- Conversation intake conversion is allowed only as a staff-confirmed workflow action: pending intake can become a patient, visit, and My Tiki link, but TikiDoc must not silently auto-create clinical workflow objects from copied chat text.

## Current State Lock

- Hardening is treated as stable.
- Batch 6A / 6B / 6C are implemented for their bounded scopes.
- Batch 6D reviewability/admin polish is implemented as a small surface, not a full admin system.
- Design-system and staff UX reset are implemented in code, but still require real device/manual visual QA.
- Quick Visit and My Tiki link hotfixes are implemented and pushed; final operational closure depends on one deployed smoke test after Railway deploy completes.
- Do not reopen stabilization work unless a real issue is found in operations.
