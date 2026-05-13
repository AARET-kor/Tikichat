# Current Engineering State

Last updated: 2026-05-11

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
- Patient Care operational screen:
  - confirmation-request action buttons now persist state transitions instead of behaving like passive UI
  - the default request list shows actionable active requests, not already resolved/closed history
  - top summary cards act as operational filters for confirmation-needed, urgent, delayed, aftercare response, and return-ready patients
  - confirmation/aftercare patient cards can jump directly into that patient's Tiki Memory context
- Tiki Desk UX reset Phase 1: the first screen now emphasizes today's booked order, actual arrival order, and operational next-action order with larger staff-readable metrics and patient flow cards.
- Dashboard shell UX reset Phase 2: the staff sidebar is now a wider readable operations nav with larger icons, labels, sublabels, and clearer product/management grouping. The top bar now uses larger clinic/staff identity treatments.
- Protocol UX reset Phase 3: the staff protocol surface now reads as an operational standards board with larger Korean copy, clear response standards, prohibited phrases, approved wording, and a visible improvement checklist.
- Procedure Management UX reset Phase 4: the staff procedure surface now emphasizes AI-response readiness, missing fields, readable master-template import, and larger procedure editing controls.
- Standardized design system:
  - mocha remains the narrow signature accent
  - staff/product surfaces use larger type, stronger spacing, consistent radii, status tones, and bright/warm clinical surfaces
  - `/landing` has its own landing-only app target and refreshed structure for `tikidoc.xyz`
  - landing hero/problem/journey sections now avoid decorative clutter and use cleaner scroll-reveal storytelling for the problem and patient journey narrative
  - landing product-surface cards now remove abstract placeholder tiles and show compact animated workflow examples for Tiki Paste, My Tiki + TikiBell, and Tiki Room
  - landing operational-value section now uses a sequential scroll-reveal flow instead of a static 2x2 value-card grid
- TikiPaste web-sidecar:
  - the Chrome extension project has been dropped and removed from the repository
  - staff can paste conversation text or screenshot fallback into the web app
  - TikiPaste returns summary, patient intent, urgency/risk signal, recommended replies, copy actions, and handoff actions
  - patient-facing TikiPaste replies are now server-guarded to stay in the detected patient language; Korean is kept only as staff reference translation
  - foreign patient candidate names are normalized as original display name plus Korean reading when available, for example `黃玉琳 (황옥림)`
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
  - Tiki Desk now keeps pending TikiPaste conversation intakes and recent CSV import batches in a secondary `신규 환자 후보 확인` area, rather than treating them as the primary daily operations board
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
- Chrome extension / desktop overlay version of TikiPaste. The repository-level `extension/` app has been removed; do not restart it without a new explicit product decision.
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
- Chrome extension or native overlay re-entry is not part of the active roadmap. Reintroduce only with an explicit new product decision.
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

Recent work has touched product files, docs, tests, and build artifacts. The former Chrome extension project has now been intentionally removed, so there is no longer an extension dirty-file exception to preserve.

Continue to inspect `git status --short` before commits and avoid reverting unrelated user work.

## Safest Next Step

The single safest next step is a logged-in deployed smoke test after the latest Railway deploy:

- create one new patient + visit from Tiki Desk
- confirm the success screen stays visible
- open the generated My Tiki link in a new tab
- confirm the patient page loads
- return to Tiki Desk and confirm the visit appears in the expected date range
- confirm Tiki Desk scrolls at normal zoom

After that, continue to My Tiki preview surfacing and staff/admin polish only if the smoke test passes.

## 2026-05-12 Tikibell Mascot Integration

Implemented in this pass:

- Tikibell mascot assets are now stored as app and landing public assets.
- My Tiki now shows Tikibell as a patient-facing guide in the patient journey.
- My Tiki shows stage-specific Tikibell illustrations for default guidance, paperwork/consent, numbing-cream waiting, and aftercare.
- Patient actions such as arrival confirmation, opening/submitting forms, Ask TikiBell messages, and aftercare responses now trigger a short sparkle Tikibell animation.
- Ask TikiBell now uses the mascot image in the helper card and can show the Tikibell hero video once per browser session when the patient first opens the Ask TikiBell tab.
- The landing My Tiki + TikiBell demo card now includes a subtle faded Tikibell mascot layer.

Intentionally unchanged:

- No schema changes.
- No new patient workflow states.
- No route, API, or auth changes.
- No backend animation/state tracking.
- No campaign/editor/admin surface for Tikibell assets.

Remaining later polish:

- Validate mascot/video scale on real patient phones.
- Consider lower-size optimized image/video derivatives if first-load performance is affected.
- Add richer localized Tikibell microcopy only after patient testing.

## 2026-05-12 Ask TikiBell Patient Flow Polish

Implemented in this pass:

- Ask TikiBell now places the free-text chat input directly below the quick questions instead of leaving it near the bottom of the screen.
- Recent messages now sit below the chat input so patients can ask first and then review the response.
- Staff/nurse/doctor confirmation requests are moved to the bottom of the Ask TikiBell flow.
- Human-help requests now require a second confirmation step before the clinic-facing escalation request is sent.

Intentionally unchanged:

- No new escalation schema or backend route.
- No automatic staff-call behavior from quick prompts.
- No push notification or external alert channel changes.

Remaining later polish:

- Validate on real patient phone height that the Ask TikiBell order feels natural in Chinese, Japanese, English, and Korean.
- Consider adding clearer patient-facing acknowledgement states only after real usage shows confusion.

## 2026-05-12 TikiPaste → Tiki Desk Linkage Stabilization

Implemented in this pass:

- Tiki Desk now keeps active undated operational visits visible in today/week views, so TikiPaste-created “time unknown” visits do not disappear after refresh or relogin.
- Tiki Desk visit normalization now accepts both nested API joins and flattened visit payloads for patient name, patient language, flag, and procedure name.
- My Tiki link generation now keeps the returned share URL in local state immediately after generation.
- Tiki Desk now treats active/sent/opened patient links as already issued even when the raw token URL cannot be reconstructed from DB after refresh.

Root cause:

- TikiPaste could create a valid patient, visit, Memory context, and My Tiki link, but Tiki Desk’s default today filter excluded visits with `visit_date = null`.
- Patient links are intentionally stored as token hashes, so after reload the app can verify “link issued” but cannot recreate the original raw share URL.
- Some UI paths assumed one API payload shape for patient/procedure joins, which made patient names fragile when data came from a different conversion/import path.

Intentionally unchanged:

- No schema changes.
- No raw My Tiki token storage added.
- No automatic CRM/EMR sync or omnichannel inbox behavior.
- No changes to the staff-confirmed TikiPaste conversion rule.

Remaining risk:

- After a full reload, an already-issued link can be recognized as issued, but the original raw URL cannot be copied again unless it is reissued or a future safe delivery-log design is approved.

## 2026-05-12 Tiki Desk Link-State Follow-Up Fix

Implemented in this pass:

- Tiki Desk ops-board link lookup now uses only stable `patient_links` columns: `visit_id`, `id`, `status`, `expires_at`, and `created_at`.
- Tiki Desk now throws and surfaces link lookup errors instead of silently treating failed link reads as “link needed”.
- My Tiki link URLs returned immediately after generation are cached in the current browser session, so the 20-second ops-board refresh does not erase the copyable URL.
- “방문 확인” fallback behavior no longer depends on a removed/hidden visit row. If the row cannot be found, Tiki Desk opens the My Tiki status detail for that patient instead.

Root cause:

- The deployed DB can legitimately lack optional patient-link extension columns such as `first_opened_at` and `last_accessed_at`.
- Tiki Desk selected those optional columns inside the ops-board link lookup and ignored the query error. That made valid issued links look like missing links after refresh or polling.
- Some desk actions still tried to scroll to legacy visit rows that are no longer the primary Tiki Desk surface, so button clicks appeared to do nothing.

Intentionally unchanged:

- No schema changes.
- No raw token persistence.
- No new link delivery table.
- No new Tiki Desk architecture or patient task engine.

Remaining risk:

- After a full browser reload, an issued link can still be shown as issued, but the original raw URL cannot be copied again because raw tokens are intentionally not stored. Reissue remains the safe current workaround.

## 2026-05-13 Tiki Desk Unified Journey Design

Implemented in this pass:

- No product code was changed in this pass.
- Created the design contract at `docs/superpowers/specs/2026-05-13-tiki-desk-unified-journey-contract.md`.
- Locked the intended Tiki Desk direction as a unified patient journey board:
  - `상담 -> 링크 -> 도착 -> 문진·동의 -> 대기 -> 룸 -> 사후`
  - default screen shows only the seven-stage rail, `오늘 할 일`, and `My Tiki 상태`
  - clicking a stage expands that stage's patient list
  - completing a primary action moves the patient/visit to the next stage

Why this matters:

- Recent real-use issues showed that TikiPaste, Tiki Desk, My Tiki, Tiki Room, Aftercare, and Memory can feel disconnected if each surface interprets state separately.
- Tiki Desk must become a stage-driven operating board, not a generic dashboard and not a full Vegas/CRM clone.

Intentionally deferred:

- No implementation of the new stage rail yet.
- No new schema, no workflow engine, no drag/drop kanban, and no CRM replacement behavior.
- No raw My Tiki token storage.

Next:

- Convert the design contract into an implementation plan.
- First implementation batch should create a shared journey-stage helper and tests before changing the main Tiki Desk UI.

## 2026-05-13 Tiki Desk Unified Journey Implementation

Implemented in this pass:

- Added a shared Tiki Desk journey-stage helper for the seven operational stages:
  - `상담`
  - `링크`
  - `도착`
  - `문진·동의`
  - `대기`
  - `룸`
  - `사후`
- Tiki Desk now receives a stage rail from the same helper that builds today's operational task list.
- The Tiki Desk main surface now shows a clickable seven-stage rail above the focused operating view.
- Clicking a stage expands the patients in that stage without mutating backend state.
- Stage drilldown patient cards now expose the same primary action buttons as `오늘 할 일`, so a stage card can be used to continue work instead of only reading state.
- Tiki Desk primary CTA selection now prioritizes the current transition over an already-issued My Tiki link. This prevents active links from hiding actions such as `도착 확인`, `서류 확인`, and `빈 룸 배정`.
- Ops-board link status now reads stable `patient_links.status` values, including `opened`, instead of relying on optional link telemetry fields.

Backend behavior now connected:

- `도착 확인` uses the existing staff-auth check-in route.
- `서류 확인` uses the existing staff-auth forms-confirm route.
- `빈 룸 배정` uses the existing room assignment path.
- `룸` work remains owned by Tiki Room for clear/load-next behavior.
- `사후` work navigates to Patient Care rather than trying to handle aftercare inside Tiki Desk.

Verified:

- `node --test tests/tiki-desk-flow.test.js`
- `npm test`
- `npm run build`

Intentionally unchanged:

- No schema changes.
- No raw My Tiki token storage.
- No drag/drop kanban or workflow engine.
- No CRM/EMR replacement behavior.
- No new backend voice, notification, or inbox system.

Remaining risk:

- After a full browser reload, an already-issued My Tiki link can be recognized as issued, but the original raw URL still cannot be reconstructed because raw tokens are intentionally not stored.
- Deployed clinic smoke testing should still verify the full chain: TikiPaste conversion -> Tiki Desk stage rail -> My Tiki link state -> Tiki Room assignment/clear -> Patient Care aftercare signal.
