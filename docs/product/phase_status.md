# TikiDoc Phase Status

Last updated: 2026-05-01

Status meanings:

- `planned`: not implemented yet
- `in progress`: active build / partial slice only
- `implemented`: coded and connected, but operational gaps remain
- `pilot-ready`: plausible for controlled clinic use after manual acceptance
- `clinic-ready`: staff can rely on it in daily clinic use
- `operationally closed`: coded and considered operationally usable for the current bounded scope

## Phase List

| Phase | Name | Status | Notes / Remaining gaps |
|---|---|---|---|
| 1 | v2 schema + core entities | operationally closed | Core clinic / patient / visit / link / form / journey structure is in place. |
| 2 | Tiki Paste -> Tiki Memory write loop | implemented | Real write loop exists and staff auth is tightened. Broader knowledge hygiene remains later. |
| 3 | My Tiki portal core | pilot-ready | Journey / forms / patient link / Today task layer exist. Latest hotfix reduces token-auth schema assumptions and encodes generated link URLs. Broader UX polish and multilingual device QA remain later. |
| 4 | Activation wedge: intake parser + quick visit + link + Tiki Desk | operationally closed after latest deploy smoke test | Quick Visit and CSV procedure mapping are conservative. Ambiguous procedure values are not silently assigned. Quick Visit now preserves success/link display, avoids duplicate retry writes, and moves Tiki Desk to the right date range after creation. |
| 5 | Arrival Mode | operationally closed | Self-arrival, staff check-in, Ops Board refresh, literal QR availability, and patient Today layer exist. |
| 6 | My Tiki / Ask TikiBell | pilot-ready | Safe, source-limited Ask exists. Narrow config knobs exist. No prompt CMS or rules engine. |
| 7 | Escalation | pilot-ready | Triage, assignment, actors, status, SLA-derived markers, and Tiki Desk visibility exist. External notifications remain deferred. |
| 8 | Rooms Lite | pilot-ready | Room presets, occupancy, queue, assign/clear, room-ready config, and audit coverage exist. |
| 9 | Tiki Room full mode | pilot-ready | Doctor-first prep + guided response loop exists. Browser voice/TTS exists as optional aid. Live current/load-next/clear verification passed. Dedicated clinical STT/TTS remains deferred. |
| 10 | Aftercare / follow-up automation | implemented | Timed checkpoints, outbound delivery path, structured check-ins, risk branching, scheduler health, and narrow plan editor exist. Plan editor still needs clinic admin acceptance before daily reliance. |

## Recent Runtime / UX Fix Status

| Area | Status | Practical interpretation |
|---|---|---|
| Production Supabase auth | stable after deploy | Signup/login now use real Supabase Auth. Frontend bundle must be built with current `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. |
| Quick Visit creation | stable after deploy | Patient + visit + link creation no longer silently disappears after success. Retry reuses partial writes instead of duplicating patient/visit rows. |
| My Tiki link validity | stable after deploy smoke test | Generated links now use encoded tokens and patient-token auth requires only required `patient_links` fields. Must be retested with a newly generated link after deploy. |
| Tiki Desk scroll | stable after deploy smoke test | Global document scroll and Tiki Desk internal scrolling are restored. Must be checked on actual staff screen sizes. |
| New visit visibility | stable after deploy smoke test | New visits are inserted optimistically and date filters move to `today`, `tomorrow`, `week`, or `all` based on visit date. |
| TikiPaste web-sidecar | usable / pilot-ready | Web-only paste/screenshot/reply/handoff workspace is implemented for one-off consultation capture. Chrome extension, DOM-reading behavior, and CRM/EMR bulk import ownership are paused/excluded. |
| Design-system pass | implemented / validating | Landing, staff shell, Tiki Desk, Protocol, Procedure Management, and My Tiki UI kit direction are standardized. More manual visual QA remains. |

## Batch Status

| Batch | Status | Practical interpretation |
|---|---|---|
| Hardening / Batch 1-5 | stable | Auth, room scope, procedure mapping, aftercare outbound, audit/actor tracking, scheduler health, config layer, and live Tiki Room verification are complete for current scope. |
| Batch 6A | usable | Aftercare plan editor and patient/clinic config expansion exist. Not a full CMS. |
| Batch 6B | usable / controlled-pilot | Browser-native Tiki Room voice input and multilingual browser TTS fallback exist. Not provider-grade STT/TTS. |
| Batch 6C | stable | Escalation SLA markers, stronger staff summary surfacing, and internal QR generation exist. No external notification system. |
| Batch 6D | usable polish | Recent audit/history browse and small internal config editing polish exist. Not a dashboard or admin CMS. |
| Design-system / staff UX reset | implemented / validating | Warm clinical minimalism tokens and larger staff surfaces are applied. Tiki Desk, sidebar, Protocol, Procedure Management, landing, and My Tiki kit are improved. |
| Auth / Quick Visit hotfixes | stable after deploy smoke test | Real Supabase auth, Quick Visit creation, patient links, and dashboard scroll have been patched. Verify once in deployed browser. |

## Readiness Truth

| Area | Classification | Notes |
|---|---|---|
| Aftercare plan editor | usable | Works for narrow admin edits and previews. Needs real clinic admin validation before daily use. |
| My Tiki patient task layer | stable / pilot-ready | Connected to arrival, forms, aftercare due, acknowledgement, and safe return. |
| Tiki Room browser voice | usable | Optional browser feature. Not reliable enough to be the only clinical input path. |
| Tiki Room real clinic usability | pilot-ready | Core room session flow verified. Real room devices still need acceptance testing. |
| Tiki Desk operational visibility | stable / pilot-ready | Urgency, SLA, owner/latest actor, room traffic, scheduler health, and audit/history browse are surfaced. |
| QR generation / patient link flow | stable / pilot-ready | Internal QR rendering via `/api/qr`; no external QR dependency remains. |
| TikiPaste web-sidecar | usable / pilot-ready | Useful as a staff sidecar workspace. It is not an extension, overlay, automatic chat-reader, or CRM/EMR import manager. |
| Signup/login | stable | Real Auth path is restored when deployed env/build values match Supabase. |
| Quick Visit + patient link generation | stable after smoke test | Works in code and tests. Needs one deployed link-open smoke test after latest deploy. |

## Practical Interpretation

- The project is beyond mock-only and has real connected product slices.
- Several areas are pilot-ready, but not all are clinic-ready.
- Latest hotfixes should not be called fully closed until one deployed smoke test confirms:
  - a new My Tiki link opens
  - Tiki Desk scrolls
  - the new visit appears in the expected date range
- Before calling any area clinic-ready, confirm:
  - actual UI + route + state connection exists
  - state transitions are symmetric
  - route auth and clinic scope are correct
  - staff can complete the flow without engineering supervision
  - real device/browser/session behavior is accepted in clinic
