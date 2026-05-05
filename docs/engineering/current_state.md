# Current Engineering State

Last updated: 2026-05-05

This document is the short engineering truth snapshot for TikiDoc after hardening, Batch 6A / 6B / 6C / 6D, the design-system pass, TikiPaste web-sidecar pivot, auth fixes, and Quick Visit / My Tiki link stabilization.

## Product Surface Model

- `Tiki Paste`: staff sidecar for one-off consultation capture, reply drafting, and staff-confirmed workflow handoff.
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

- Production auth direction:
  - signup creates real Supabase Auth users
  - login uses Supabase Auth
  - production mock-session fallback is disabled unless explicitly allowed for development
  - frontend Supabase config is expected to come from `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` at build time
- Staff auth gates for `/api/memory` and `/api/room/*`.
- Clinic-scoped room access for authenticated staff sessions.
- Tiki Desk room traffic visibility, load-next, clear, and current patient flow.
- My Tiki patient link flow and internal QR rendering through `/api/qr`.
- Quick Visit creation flow:
  - requires staff auth
  - creates patient, visit, and My Tiki link
  - keeps the success/link screen visible after parent refresh
  - reuses partial patient/visit creation on retry to avoid duplicate writes
  - uses deployed-safe `patient_links` columns only
  - auto-adjusts the Tiki Desk date range when a newly created visit is not in today's filter
- Clinic rule config read/write path for the narrow allowlisted keys.
- Scheduler health/degraded visibility for aftercare.
- Light audit/actor tracking for key escalation, room, and aftercare transitions.
- Tiki Desk operational visibility: urgency markers, escalation owner/latest actor line, SLA-derived markers, scheduler notice, and recent audit/history browse.
- Tiki Desk UX reset Phase 1: the first screen now emphasizes today's booked order, actual arrival order, and operational next-action order with larger staff-readable metrics and patient flow cards.
- Dashboard shell UX reset Phase 2: the staff sidebar is now a wider readable operations nav with larger icons, labels, sublabels, and clearer product/management grouping. The top bar now uses larger clinic/staff identity treatments.
- Protocol UX reset Phase 3: the staff protocol surface now reads as an operational standards board with larger Korean copy, clear response standards, prohibited phrases, approved wording, and a visible improvement checklist.
- Procedure Management UX reset Phase 4: the staff procedure surface now emphasizes AI-response readiness, missing fields, readable master-template import, and larger procedure editing controls.
- Standardized design system:
  - mocha remains the narrow signature accent
  - staff/product surfaces use larger type, stronger spacing, consistent radii, status tones, and bright/warm clinical surfaces
  - `/landing` has its own landing-only app target and refreshed structure for `tikidoc.xyz`
- TikiPaste web-sidecar:
  - the Chrome extension direction is paused
  - staff can paste conversation text or screenshot fallback into the web app
  - TikiPaste returns summary, patient intent, urgency/risk signal, recommended replies, copy actions, and handoff actions
  - TikiPaste now extracts conservative patient/visit candidates from pasted text or staff-provided screenshots
  - TikiPaste now shows existing-patient match candidates from authenticated clinic data and lets staff explicitly choose existing patient vs new patient
  - Staff-confirmed TikiPaste save can create/link patient, create visit, generate a My Tiki link, and write the conversation summary into patient Memory
  - Phase 2 conversation-intake staging is implemented: staff can save an analyzed conversation as a pending intake candidate before creating or linking a patient
  - Phase 3 conversion is implemented: staff can review pending intake, connect it to an existing patient or create a new patient, create a visit, and generate a My Tiki link after confirmation
- CRM/EMR import separation:
  - TikiPaste no longer presents CRM/EMR as a source option; it stays focused on current conversation capture
  - existing CRM/EMR patient and visit records belong in Tiki Desk CSV/manual import and settings guidance
  - CSV import now exposes a sample CRM/EMR template for supported patient, visit, and external reference columns
  - CSV import now includes lightweight export presets for Vegas, 의사랑, and Dr.Palette so common column names are recognized more reliably
  - CSV import supports manual column mapping when a CRM/EMR export uses unrecognized headers
  - CSV import preview now separates rows that will be imported, rows needing staff review, invalid rows, and same-file duplicates
  - backend import defensively excludes same-CSV duplicate visits for the same resolved patient and visit date before inserting visits
  - CSV import completion now shows a copy-back panel with My Tiki links and short summaries for pasting into the existing CRM/EMR
  - successful CSV-created patients/visits now seed patient Memory with CRM/EMR source, external identifiers, procedure interest, external memo, visit context, and generated My Tiki link
  - Tiki Desk now has an `외국인 환자 유입 큐` that combines pending TikiPaste conversation intakes and recent CSV import batches
  - CSV import batches/rows are persisted as compact operational summaries, not raw CRM file storage
  - Memory remains patient-specific context storage after identification, not raw CRM/EMR file management
- Tiki Memory direct editing:
  - owner/admin staff can open a patient Memory detail and edit summary, procedure interests, patient concerns, risk level/flags, staff precautions, and staff notes
  - Memory direct edits are clinic-scoped and staff-authenticated
  - edits stamp `last_edited_by` / `last_edited_at`, write a `note_added` patient journey event with actor, and emit a non-blocking audit log
  - this is still patient operating context only; it is not raw CRM/EMR file storage or full transcript storage
- Staff dashboard scroll behavior:
  - app-level document scroll is no longer globally locked
  - Tiki Desk content has a touch-friendly vertical scroll container

Usable but not fully clinic-ready:

- Aftercare plan editor. It can edit narrow step fields and preview patient-facing content, but it still needs real clinic admin workflow validation before daily reliance.
- Tiki Room browser-native voice input and browser TTS fallback. They are useful optional aids, but quality depends on browser, device, microphone permission, room noise, and installed voices.
- Tiki Room live communication loop. Current/load-next/clear manual verification passed, but clinic deployment still needs device/browser acceptance testing per room.
- TikiPaste web-sidecar. It is now a realistic staff workspace without extension dependency, but it still depends on staff-pasted text/screenshot input and is not an automatic browser DOM reader.
- Conversation-intake conversion. Pending intake records can now be converted after staff confirmation and are visible in Tiki Desk intake queue. TikiPaste has conservative match suggestions, but this is still staff-confirmed and not an automatic CRM/EMR sync.
- Staff dashboard UX. It is much clearer than the earlier cramped dashboard, but real front-desk usage should still validate screen size, scroll behavior, and Korean copy under daily workload.

Prototype-level or intentionally bounded:

- Settings / operations polish is intentionally small. It is not a full admin CMS, rule builder, audit dashboard, or forensic explorer.
- Ask and room-ready config are narrow knobs layered over code-owned workflow logic.
- Browser voice is not a backend STT/TTS pipeline and does not store transcripts.
- Patient screenshot/OCR fallback in TikiPaste remains bounded. It is not a giant OCR platform or cross-browser overlay.
- Conversation intake is not an omnichannel inbox. It has no unread state, channel sync, channel reply sending, or automated CRM/EMR integration.
- CRM/EMR presets are practical alias helpers, not certified vendor integrations.
- My Tiki patient UI kit is improved and reusable, but not every multilingual patient route has been manually device-tested after the latest visual pass.

Intentionally deferred:

- Backend voice/STT/TTS providers.
- Broad notification orchestration.
- Full audit/history explorer.
- Full CMS/no-code editor for aftercare or Ask.
- Generic rules engine.
- Schema-first redesign of workflow state.
- Chrome extension / desktop overlay version of TikiPaste.
- Automatic arbitrary browser DOM reading.
- Backend OCR platform.
- Full omnichannel inbox or message sync.
- Fully automatic patient matching from pending conversation intake without staff confirmation.
- Channel-specific CRM/EMR API integrations.

## May 1, 2026 Runtime Fixes And Product Changes

Implemented:

- Rebuilt the deployed frontend with the correct `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` so the login bundle no longer points at the old Supabase project.
- Removed production mock-auth fallback from the real login path.
- Fixed signup/login mismatch so clinic signup provisions a real Supabase Auth user and the login page uses the same auth system.
- Fixed staff Quick Visit auth propagation and clinic scoping.
- Hardened Quick Visit and patient-link creation against deployed schema drift:
  - removed optional `patient_links` fields from the critical create/list/token-auth path
  - removed optional visit assignment columns from Quick Visit insert
  - reduced patient-token auth to required link fields only
- Fixed Quick Visit UX:
  - no silent modal close after success
  - visible creating step labels
  - request timeout messaging
  - partial retry without duplicate patient/visit writes
- Fixed My Tiki link URL generation by encoding raw tokens in generated URLs.
- Fixed Tiki Desk visibility after Quick Visit:
  - new visit is inserted optimistically in the list
  - date-range filter moves to the correct range when the visit is not today
- Fixed dashboard scroll behavior:
  - global document scroll is restored
  - Tiki Desk uses an internal vertical scroll container
- Pivoted TikiPaste away from extension-first behavior into a web-only sidecar workspace.

Current deployed expectation:

- After Railway deploys the latest `main`, a staff user should be able to:
  - log in with real Supabase Auth
  - create a new patient + visit
  - see the success screen with a My Tiki link
  - open the generated `/t/:token` link
  - scroll Tiki Desk at normal browser zoom
  - find the new visit in the appropriate date filter

Remaining validation needed:

- Retest a newly generated My Tiki link after the latest deploy, not an old link captured before this patch.
- Confirm the deployed DB `patient_links` rows include `token_hash`, `status`, and `expires_at` and that the Railway service role key points at the same Supabase project as the frontend.
- Confirm staff dashboard scroll on:
  - laptop Chrome
  - mobile/tablet browser
  - actual front-desk screen resolution

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

Design-system / UX pass status:

- Status: implemented and in active validation.
- Implemented:
  - landing-only Vercel-ready app structure
  - warmer, brighter landing page using controlled mocha accents
  - standardized staff/product tokens
  - wider staff sidebar and top shell
  - Tiki Desk command-board direction
  - Protocol and Procedure Management practical UX reset
  - My Tiki patient UI kit direction
- Still needs:
  - real manual QA across common staff screen sizes
  - multilingual My Tiki patient device QA
  - further copy cleanup only where real staff confusion remains

## Readiness Truth

| Area | Classification | Truth |
|---|---|---|
| Aftercare plan editor | usable | Works in code for narrow edits, preview, and admin-only save. Not yet proven safe for unsupervised daily clinic admin use. |
| My Tiki patient task layer | stable / pilot-ready | Today / next actions include arrival, forms, aftercare due, clinic review ack, and safe return. Broader UX polish remains later. |
| Tiki Room browser voice | usable | Optional browser-native input aid. Not clinic-ready as a primary voice system. |
| Tiki Room real clinic usability | pilot-ready | Current/load-next/clear live authenticated verification passed. Needs room-device acceptance in each real deployment. |
| Tiki Desk operational visibility | stable / pilot-ready | Urgency, SLA, owner/latest actor, room traffic, scheduler health, and audit/history browse are visible. No notification center. |
| QR generation / patient link flow | stable / pilot-ready | Staff-visible QR now renders internally via `/api/qr`; patient links continue to target app routes. |
| TikiPaste web-sidecar | usable / pilot-ready | Practical paste/screenshot/reply workflow exists without extension dependency. It is not automatic DOM reading. |
| Signup/login auth | stable after deploy | Real Supabase Auth flow is restored. Requires correct Railway `VITE_*` env values and rebuild. |
| Quick Visit + My Tiki link generation | stable after latest hotfix | Patient, visit, and link creation now surface success and should route to a valid My Tiki page after deploy. |
| Staff dashboard scroll | stable after latest hotfix | Tiki Desk and app document scrolling are restored; real device QA still required. |

## Remaining Blockers

Blocks confident daily clinic use:

- Real clinic acceptance pass for aftercare plan editor with an admin/owner editing actual procedures and verifying generated future patient messaging.
- Tiki Room device-level QA in the clinic rooms that will actually run it, especially microphone permission, browser speech recognition, TTS voice availability, and tablet session persistence.
- Confirmation that deployed DB has the expected `audit_logs`, `patient_journey_events`, `clinics.settings`, room, escalation, and aftercare tables/columns.
- Confirmation that latest deploy resolves:
  - My Tiki link token verification
  - staff dashboard scroll at normal zoom
  - newly created visit visibility in Tiki Desk

Blocks broader rollout:

- External notifications / SLA notification policy.
- Provider-grade STT/TTS decision if browser-native quality is insufficient.
- Fuller audit/history browse and export needs.
- More polished staff/admin editing UX for non-technical operators.
- Further staff dashboard UX refinement beyond Phase 1-4, especially My Tiki preview surfacing.
- Multi-clinic operational configuration review beyond the current narrow knobs.
- TikiPaste real-world desk workflow validation across KakaoTalk, WhatsApp, Instagram DM, and screenshot fallbacks.

Later expansion only:

- CMS-like aftercare trigger/template builder.
- No-code Ask prompt editor.
- Assignment rules engine.
- Analytics/reporting dashboards.
- Dedicated incident management or job dashboard.
- Chrome extension or native overlay re-entry, only if the web-sidecar workflow proves insufficient.
- Backend STT/TTS pipeline.
- Backend OCR platform.

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

The single safest next step is a logged-in deployed smoke test after the latest Railway deploy:

- create one new patient + visit from Tiki Desk
- confirm the success screen stays visible
- open the generated My Tiki link in a new tab
- confirm the patient page loads
- return to Tiki Desk and confirm the visit appears in the expected date range
- confirm Tiki Desk scrolls at normal zoom

After that, continue to My Tiki preview surfacing and staff/admin polish only if the smoke test passes.
