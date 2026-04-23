# Phase 2 Clinic Acceptance Checklist

Last updated: 2026-04-23

Scope: manual clinic acceptance only. Do not add features, redesign architecture, or change schema during this phase.

Phase 1 automated release-readiness passed with no automated blockers. Phase 2 determines whether the current product state is acceptable for a controlled clinic pilot.

## Execution Results — 2026-04-23 Post-Migration Re-Run

Tester: Codex

Environment:

- Phase 1 automated release-readiness remains closed.
- Local server smoke test on `PORT=4010`
- Local environment still has `SUPABASE_URL` and `SUPABASE_ANON_KEY` set, but no `SUPABASE_SERVICE_ROLE_KEY`.
- `APP_BASE_URL` is missing locally; deployed app should use `https://app.tikidoc.xyz`.
- Supabase SQL Editor schema reality check was re-run by the operator on the correct Supabase project after migration.
- No real logged-in staff browser session was available to Codex in this run.
- No real clinic room/tablet device was available to Codex in this run.

### Summary

| Area | Result | Evidence | Release impact |
|---|---|---|---|
| Aftercare plan editor acceptance | `NOT_TESTED` | Related contract/unit tests passed, including aftercare preview, narrow patch validation, and timing safety flags. No logged-in owner/admin browser session was available to execute real save/reload acceptance. | No code/schema blocker observed. Requires live owner/admin browser acceptance before first clinic use. |
| Tiki Room room-device acceptance | `NOT_TESTED` | Related room voice tests passed. Local unauthenticated `/api/room/current` returned `401`. No real authenticated room/tablet session was available to Codex in this run. | No code/schema blocker observed. Requires live room/tablet acceptance before first clinic use. |
| Settings -> Operations save/read behavior | `NOT_TESTED` | Clinic rule validation, audit-history normalization, and staff route guard tests passed. Local unauthenticated `/api/staff/clinic-rule-config` and `/api/staff/audit-history` returned `401`. No logged-in owner/admin browser session was available to execute save/reload acceptance. | No code/schema blocker observed. Requires live owner/admin save/read acceptance before first clinic use. |
| QR / patient link device acceptance | `ACCEPT_FOR_PILOT` | Local `/api/qr?data=...` returned `200 image/svg+xml` and SVG content. QR helper tests passed. Full staff link generation and patient phone scan were not available to Codex in this run. | Internal QR rendering is verified. Staff link generation and real phone scan remain first-use manual checks, not code blockers if DB schema recheck remains PASS. |
| Deployed DB schema reality check | `PASS` | Operator re-ran Supabase SQL Editor schema reality check on the correct project after migration; previously missing `audit_logs.event_type`, `audit_logs.status`, and `patient_links.status` now have zero missing rows. Clinic slug resolves. | Prior DB commit/push blocker is cleared. |

### Commands Executed In This Re-Run

Environment presence check:

```bash
node -e "import 'dotenv/config'; const keys=['SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','SUPABASE_ANON_KEY','APP_BASE_URL']; for (const k of keys) console.log(k+': '+(process.env[k]?'set':'missing'))"
```

Observed result:

- `SUPABASE_URL`: set
- `SUPABASE_SERVICE_ROLE_KEY`: missing
- `SUPABASE_ANON_KEY`: set
- `APP_BASE_URL`: missing

Targeted acceptance support tests:

```bash
node --test tests/aftercare-plan-editor.test.js tests/room-voice.test.js tests/clinic-rule-config-validate.test.js tests/audit-history.test.js tests/qr-code.test.js tests/route-guards.test.js
```

Observed result:

- 32 tests
- 32 pass
- 0 fail

Local route smoke:

```bash
PORT=4010 node server.js
curl -s -o /tmp/tikidoc-qr-phase2.svg -w '%{http_code} %{content_type}\n' 'http://127.0.0.1:4010/api/qr?data=https%3A%2F%2Fapp.tikidoc.xyz%2Ft%2Facceptance'
curl -s -o /tmp/tikidoc-room-phase2.json -w '%{http_code}\n' 'http://127.0.0.1:4010/api/room/current'
curl -s -o /tmp/tikidoc-config-phase2.json -w '%{http_code}\n' 'http://127.0.0.1:4010/api/staff/clinic-rule-config'
curl -s -o /tmp/tikidoc-audit-phase2.json -w '%{http_code}\n' 'http://127.0.0.1:4010/api/staff/audit-history'
```

Observed result:

- `/api/qr?data=...`: `200 image/svg+xml`, SVG begins with `<svg xmlns=...`
- unauthenticated `/api/room/current`: `401`
- unauthenticated `/api/staff/clinic-rule-config`: `401`
- unauthenticated `/api/staff/audit-history`: `401`

DB schema reality check:

- The earlier anon/script-based schema check was not used as the authoritative result because local service-role access is unavailable and earlier results overstated the mismatch.
- Authoritative result for this run is the operator's Supabase SQL Editor recheck on the correct project.
- Result: `PASS`, with zero missing rows for the current expected schema set after migration.

### Real Blockers Found

Commit/push blockers for controlled pilot:

- None observed in this re-run.

Still required before first real clinic use:

- Logged-in owner/admin browser acceptance for aftercare plan editor save/reload.
- Logged-in owner/admin browser acceptance for Settings -> Operations save/read.
- Real room/tablet authenticated session acceptance for Tiki Room current/load-next/clear.
- Real staff link generation and patient phone scan for QR / My Tiki link flow.

### Tiny Patch Candidates

No code patch is justified from this re-run.

Allowed only if a real manual failure is observed:

- Fix a broken aftercare editor save payload or reload display issue.
- Fix a Settings -> Operations PATCH/read-only/persistence issue.
- Fix a room current/load-next/clear button/session handling issue.
- Fix QR modal sizing or encoded URL generation if a real phone cannot scan/open the link.

Do not patch preemptively:

- new features
- architecture changes
- schema-first redesign
- backend voice pipeline
- CMS or rules engine

### Phase 2 Decision

Current release status for controlled pilot commit/push:

- `ACCEPTABLE_FOR_CONTROLLED_PILOT_COMMIT_PUSH`

Reason:

- Phase 1 remains closed.
- The prior DB schema blocker is cleared by the post-migration SQL Editor recheck.
- Targeted local tests and auth/QR smoke checks passed.
- No remaining code or schema blocker was observed.

Operating constraint:

- Do not treat this as full clinic-ready acceptance until the remaining logged-in browser/device checks are completed in the live deployment.
- The next step after Phase 2 is a live authenticated clinic acceptance session, not feature work.

## Initial Execution Results — 2026-04-23

Tester: Codex

Environment:

- Local server smoke test on `PORT=4010`
- Supabase schema check using configured `SUPABASE_URL` and available `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`: missing in local environment
- `APP_BASE_URL`: missing in local environment
- No real logged-in staff browser session was available in this run
- No real clinic room/tablet device was available in this run

### Summary

| Area | Result | Evidence | Release impact |
|---|---|---|---|
| Aftercare plan editor acceptance | `NOT_TESTED` | No logged-in owner/admin browser session; configured DB schema check failed for aftercare tables. | Blocked by DB schema reality check before controlled pilot. |
| Tiki Room room-device acceptance | `NOT_TESTED` | No real room/tablet device or logged-in staff browser session available. Local unauthenticated `/api/room/current` returned `401`. | Not a code blocker from this run, but still required before clinic use. |
| Settings -> Operations save/read behavior | `FAIL` | Configured DB reports `column clinics.settings does not exist`; authenticated UI save/read could not be safely executed. | Commit/push blocker for this configured deployment target. |
| QR / patient link device acceptance | `NOT_TESTED` with partial QR route pass | Local `/api/qr?data=...` returned `200` and SVG content. No logged-in staff link generation or patient phone scan was available; configured DB reports `patient_links` missing. | QR rendering is OK; full patient-link acceptance is blocked by DB/session reality. |
| Deployed DB schema reality check | `FAIL` | Current configured Supabase schema does not match expected operational schema. Details below. | Commit/push blocker for controlled pilot against this DB. |

### Commands Executed

Environment presence check:

```bash
node -e "import 'dotenv/config'; const keys=['SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','SUPABASE_ANON_KEY','APP_BASE_URL']; for (const k of keys) console.log(k+': '+(process.env[k]?'set':'missing'))"
```

Result:

- `SUPABASE_URL`: set
- `SUPABASE_SERVICE_ROLE_KEY`: missing
- `SUPABASE_ANON_KEY`: set
- `APP_BASE_URL`: missing

DB schema reality check:

```bash
node --input-type=module <<'NODE'
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const sb = createClient(url, key);
const checks = [
  ['clinics', 'id,settings'],
  ['patients', 'id'],
  ['visits', 'id,clinic_id,patient_id,room_id,stage,checked_in_at,patient_arrived_at,intake_done,consent_done'],
  ['patient_links', 'id,clinic_id,patient_id,visit_id,token_hash,status,expires_at'],
  ['patient_journey_events', 'id,clinic_id,patient_id,visit_id,event_type,actor_type,actor_id,payload,created_at'],
  ['audit_logs', 'id,event_type,clinic_id,patient_id,channel,direction,query_type,status,error_message,created_at'],
  ['escalation_requests', 'id,clinic_id,assigned_role,assigned_user_id,status,priority,opened_at,acknowledged_by,responded_by,resolved_by,closed_by'],
  ['rooms', 'id,clinic_id,name,is_active,current_visit_id'],
  ['aftercare_plans', 'id,clinic_id,procedure_id,name,is_active'],
  ['aftercare_steps', 'id,plan_id,step_key,trigger_offset_hours,message_template_key,next_action_type,sort_order,content_template,updated_at'],
  ['patient_aftercare_events', 'id,clinic_id,patient_id,visit_id,response_status,risk_level,urgent_flag,sent_at,responded_at'],
];

for (const [table, columns] of checks) {
  const { error } = await sb.from(table).select(columns).limit(0);
  console.log(table, error ? `FAIL ${error.code}: ${error.message}` : 'PASS');
}
NODE
```

Observed result:

- `clinics`: `FAIL 42703`, `column clinics.settings does not exist`
- `patients`: `PASS`
- `visits`: `FAIL PGRST205`, table not found in schema cache
- `patient_links`: `FAIL PGRST205`, table not found in schema cache
- `patient_journey_events`: `FAIL PGRST205`, table not found in schema cache
- `audit_logs`: `FAIL 42703`, `column audit_logs.event_type does not exist`
- `escalation_requests`: `FAIL PGRST205`, table not found in schema cache
- `rooms`: `FAIL PGRST205`, table not found in schema cache
- `aftercare_plans`: `FAIL PGRST205`, table not found in schema cache
- `aftercare_steps`: `FAIL PGRST205`, table not found in schema cache
- `patient_aftercare_events`: `FAIL PGRST205`, table not found in schema cache

Local route smoke:

```bash
PORT=4010 node server.js
curl -s -o /tmp/tikidoc-qr.svg -w '%{http_code}\n' 'http://127.0.0.1:4010/api/qr?data=https%3A%2F%2Fapp.tikidoc.xyz%2Ft%2Facceptance'
curl -s -o /tmp/tikidoc-room.json -w '%{http_code}\n' 'http://127.0.0.1:4010/api/room/current'
curl -s -o /tmp/tikidoc-config.json -w '%{http_code}\n' 'http://127.0.0.1:4010/api/staff/clinic-rule-config'
curl -s -o /tmp/tikidoc-audit.json -w '%{http_code}\n' 'http://127.0.0.1:4010/api/staff/audit-history'
```

Observed result:

- `/api/qr?data=...`: `200`, SVG begins with `<svg xmlns=...`
- unauthenticated `/api/room/current`: `401`
- unauthenticated `/api/staff/clinic-rule-config`: `401`
- unauthenticated `/api/staff/audit-history`: `401`

### Real Blockers Found

Commit/push blocker for controlled pilot:

- The configured Supabase schema does not match the current product code expectations.
- Missing or mismatched items include:
  - `clinics.settings`
  - `visits`
  - `patient_links`
  - `patient_journey_events`
  - `audit_logs.event_type`
  - `escalation_requests`
  - `rooms`
  - `aftercare_plans`
  - `aftercare_steps`
  - `patient_aftercare_events`

This may mean either:

- local `.env` points at an old/wrong Supabase project, or
- the target deployment DB has not had the required migrations applied.

Do not call Phase 2 accepted until the target deployment DB is verified or corrected.

### Tiny Patch Candidates

No code patch is justified yet from observed failures.

Reason:

- The observed blocker is deployment/schema reality, not a small app bug.
- If the wrong Supabase project is configured, fix environment configuration outside code.
- If the correct project is missing migrations, apply/verify migrations rather than patching app logic around missing core tables.

Allowed tiny patch only after DB target is corrected:

- defensive optional-field handling if one deployed column name is already intentionally optional
- UI error copy improvement for auth/session expiry
- QR image sizing if real phone scan fails

Do not patch:

- schema-first redesign
- table renaming
- app logic to support the old DB as a parallel product
- broad fallback around missing core operational tables

### Phase 2 Decision

Current release status for controlled pilot:

- `NOT ACCEPTED`

Reason:

- DB schema reality check failed against the configured Supabase target.
- Full logged-in staff/admin/device acceptance could not be completed in this environment.

Next required action:

1. Confirm the correct Supabase/Railway environment target.
2. Apply or verify required migrations on the target DB.
3. Re-run Area 5 DB schema reality check.
4. Then run logged-in browser/device acceptance for Areas 1-4.

## Recording Format

Use this status for each checklist item:

- `PASS`: verified in the intended live/logged-in context
- `FAIL`: real blocking issue found
- `ACCEPT_FOR_PILOT`: non-blocking limitation accepted for controlled pilot
- `NOT_TESTED`: not yet verified

Record each result as:

```text
Area:
Tester:
Date/time:
Environment:
Browser/device:
Account/role:
Result: PASS | FAIL | ACCEPT_FOR_PILOT | NOT_TESTED
Evidence:
Notes:
Tiny patch needed:
```

## Area 1: Aftercare Plan Editor Acceptance

### Goal

Verify that an owner/admin can safely edit a narrow aftercare plan step and understand the patient-facing impact.

### Exact Manual Steps

1. Log in to the app as `owner` or `admin`.
2. Open `Tiki Desk`.
3. Open the `Aftercare` section.
4. Open the aftercare plan editor.
5. Select a real active procedure.
6. If no plan exists, create/ensure the default plan.
7. Pick one step.
8. Change only the content template.
9. Confirm the patient preview updates.
10. Save the step.
11. Reload the page.
12. Confirm the saved content persists.
13. Change the trigger timing by a small amount.
14. Confirm the timing warning/confirmation appears before save.
15. Cancel once and verify no save happens.
16. Save once intentionally.
17. Open Settings -> Operations or audit/history.
18. Confirm a recent aftercare plan edit/audit record is visible if the deployed DB supports it.
19. Log in as non-admin staff if possible.
20. Confirm non-admin staff can view but cannot save edits.

### Pass Criteria

- Admin can load plans for a real procedure.
- Admin can edit allowed fields only.
- Patient preview is visible before saving.
- Timing change requires explicit confirmation.
- Cancel prevents unintended timing save.
- Save persists after reload.
- Non-admin staff cannot save.
- Unknown/unallowed fields are not exposed in UI.

### Fail Criteria

- Editor cannot load for real clinic data.
- Save fails for valid narrow edits.
- Save silently changes timing without confirmation.
- Preview is absent or misleading.
- Non-admin staff can save.
- Saved template does not persist after reload.
- Editing causes existing aftercare due/response flow to break.

### Blocks Commit/Push

- Non-admin can write.
- Valid admin save fails.
- Timing changes save silently.
- Patient preview shows different content than what is saved.
- Editor crashes Tiki Desk.

### Acceptable For Controlled Pilot

- Copy still needs refinement.
- UI feels slightly cramped.
- Audit record is present but not richly formatted.
- Only owner/admin can edit.
- Some procedures require default plan creation first.

### Tiny Patch Allowed Only If Real Failure Is Found

- Fix a broken save payload shape.
- Fix a missing auth/role guard in UI behavior.
- Fix timing confirmation not firing.
- Fix preview not reflecting the textarea value.
- Fix reload persistence display bug.

Do not build:

- CMS
- campaign system
- no-code editor
- broad template library
- schema redesign

## Area 2: Tiki Room Room-Device Acceptance

### Goal

Verify the intended room/tablet/browser can run the existing Tiki Room flow safely.

### Exact Manual Steps

1. Use the actual device/browser intended for room use.
2. Log in as authenticated staff.
3. Open `Tiki Room`.
4. Select the intended room.
5. Verify current patient loads when a room has an assigned/current visit.
6. Use `load-next`.
7. Confirm the expected next ready patient loads.
8. Use text input for a patient utterance.
9. Run analysis.
10. Confirm AI output remains a recommendation/summary, not auto-sent.
11. Select a staff/doctor-controlled response.
12. Confirm patient-facing output appears.
13. Test browser-native mic button if supported.
14. Grant microphone permission.
15. Start listening, speak a short test phrase, stop listening.
16. Confirm transcript fills the existing input field.
17. Confirm no auto-answer occurs.
18. Test unsupported/error path if the browser does not support speech recognition.
19. Test TTS/playback.
20. Confirm language fallback status is visible if exact voice is unavailable.
21. Use `clear`.
22. Confirm room/current patient clears correctly.
23. Expire/logout the session or use an unauthenticated browser.
24. Confirm room API access fails safely.

### Pass Criteria

- Current/load-next/clear work on the real device.
- Text input path works even if voice does not.
- Voice input, when supported, fills input only.
- No auto-answer.
- TTS fallback status is visible.
- Session expiry blocks access safely.
- Room selection persists or can be reselected without confusion.

### Fail Criteria

- Device cannot load Tiki Room.
- Current/load-next/clear fails.
- Wrong patient appears.
- Voice auto-submits or auto-answers.
- Staff cannot recover when mic permission is denied.
- Expired session still accesses room data.
- Clear does not clear the room state.

### Blocks Commit/Push

- Wrong patient/room shown.
- Unauthenticated or expired session can access room data.
- Load-next/clear broken on real device.
- Auto-answer bypasses staff/doctor control.

### Acceptable For Controlled Pilot

- Browser voice unsupported as long as text input works.
- TTS uses browser default fallback as long as it is visibly disclosed.
- Staff must reselect room after browser storage reset.
- Mic accuracy is imperfect but does not replace staff review.

### Tiny Patch Allowed Only If Real Failure Is Found

- Fix session-expired handling message.
- Fix disabled/loading state for mic controls.
- Fix room selector persistence/read issue.
- Fix clear/load-next button state bug.
- Fix TTS fallback label display.

Do not build:

- backend STT/TTS
- transcript storage
- autonomous voice answering
- room-device auth redesign
- new room workflow engine

## Area 3: Settings -> Operations Save/Read Behavior

### Goal

Verify the small admin config surface reads existing config, saves only allowed knobs, rejects unauthorized writes, and shows recent history.

### Exact Manual Steps

1. Log in as `owner` or `admin`.
2. Open Settings.
3. Open `Operations`.
4. Confirm recent audit/history list loads.
5. Confirm clinic rule config loads.
6. Toggle one room-ready boolean.
7. Save.
8. Reload Settings -> Operations.
9. Confirm the toggle persists.
10. Revert the toggle to its original value.
11. Save again.
12. Toggle one patient task boolean.
13. Save and reload.
14. Confirm persistence.
15. Revert to original value.
16. Log in as non-admin staff.
17. Confirm config controls are read-only or disabled.
18. Attempt direct PATCH as non-admin if practical.
19. Confirm server rejects it.
20. Confirm audit/history shows config update records where supported.

### Pass Criteria

- Config loads with safe defaults when no override exists.
- Admin save persists after reload.
- Non-admin cannot patch.
- Unknown config keys are not accepted by server.
- Recent audit/history list loads or fails with a clear error.

### Fail Criteria

- Settings page crashes.
- Admin cannot save valid allowed config.
- Non-admin can save.
- Save sends full replace or unknown keys.
- Defaults do not apply when config is missing.
- Config save breaks Tiki Desk room-ready behavior.

### Blocks Commit/Push

- Non-admin patch succeeds.
- Valid admin patch fails.
- Unknown keys accepted.
- Defaults fallback broken.
- Operations page crashes for normal staff/admin.

### Acceptable For Controlled Pilot

- The UI is basic.
- Only a subset of config is editable.
- Audit/history is compact.
- Some copy labels need polish.

### Tiny Patch Allowed Only If Real Failure Is Found

- Fix incorrect PATCH payload.
- Fix read-only UI for non-admin.
- Fix a missing error message.
- Fix reload state not reflecting server response.

Do not build:

- generic settings page
- arbitrary JSON editor
- rules engine
- CMS
- schema redesign

## Area 4: QR / Patient Link Device Acceptance

### Goal

Verify staff can generate a patient link, display internal QR, and open it from a real patient device.

### Exact Manual Steps

1. Log in as staff.
2. Open `Tiki Desk`.
3. Select or create a real/acceptance-test visit.
4. Generate a `My Tiki` link.
5. Confirm the link modal displays a QR image.
6. Inspect or open the QR image URL if practical.
7. Confirm QR uses `/api/qr?data=...`, not an external QR provider.
8. Scan QR with a patient phone.
9. Confirm it opens `My Tiki`.
10. Confirm patient portal loads correct patient/visit context.
11. Confirm expired/revoked link behavior if practical.
12. Confirm link copy still works if QR scan fails.

### Pass Criteria

- Link generation succeeds.
- QR image renders.
- QR opens the correct `My Tiki` URL.
- No external QR provider is required.
- Patient context is correct.
- Link copy fallback works.

### Fail Criteria

- QR image does not render.
- QR opens wrong domain or wrong patient.
- QR depends on external provider.
- Patient token/link fails immediately.
- Revoked/expired link still works when it should not.

### Blocks Commit/Push

- Wrong patient opens.
- QR route broken.
- Patient link generation broken.
- Internal QR still uses external provider.

### Acceptable For Controlled Pilot

- QR styling is plain.
- Some older phone cameras require brighter display or link copy fallback.
- QR scan is slower on a specific device but still works.

### Tiny Patch Allowed Only If Real Failure Is Found

- Fix `/api/qr` response header/content issue.
- Fix encoded URL generation.
- Fix modal image sizing if QR is unreadable.
- Fix copy fallback label.

Do not build:

- separate kiosk system
- tracking analytics
- new patient link architecture
- schema changes

## Area 5: Deployed DB Schema Reality Check

### Goal

Verify the deployed database has the columns/tables assumed by current code before calling the release deployable.

### Exact Manual Steps

1. Open Supabase SQL editor or trusted DB inspection tool for the deployment environment.
2. Confirm these tables exist:
   - `clinics`
   - `patients`
   - `visits`
   - `patient_links`
   - `patient_journey_events`
   - `audit_logs`
   - `escalation_requests`
   - `rooms`
   - `aftercare_plans`
   - `aftercare_steps`
   - `patient_aftercare_events`
3. Confirm `clinics.settings` exists and can store JSON.
4. Confirm `patient_journey_events` has:
   - `clinic_id`
   - `patient_id`
   - `visit_id`
   - `event_type`
   - `actor_type`
   - `actor_id`
   - `payload`
   - `created_at`
5. Confirm `audit_logs` has fields used by the code:
   - `event_type`
   - `clinic_id`
   - `patient_id`
   - `channel`
   - `direction`
   - `query_type`
   - `status`
   - `error_message`
   - `created_at`
6. Confirm `escalation_requests` has actor/status fields:
   - `assigned_role`
   - `assigned_user_id`
   - `status`
   - `priority`
   - `opened_at`
   - `acknowledged_by`
   - `responded_by`
   - `resolved_by`
   - `closed_by`
7. Confirm room fields used by room traffic and Tiki Room exist.
8. Confirm aftercare plan/event fields used by editor and scheduler exist.
9. If possible, run a read-only query for recent rows in each operational table.

### Pass Criteria

- All assumed tables and columns exist.
- JSON settings can store `tikidoc_rules`.
- Staff API routes do not fail from missing columns.
- Audit/history route can read both `audit_logs` and `patient_journey_events`.

### Fail Criteria

- Missing table.
- Missing column used by current code.
- `clinics.settings` cannot store config.
- Audit/history route fails because deployed schema differs.
- Aftercare editor route fails because plans/steps schema differs.

### Blocks Commit/Push

- Missing required deployed table/column.
- Config cannot persist.
- Audit/history route cannot run in deployment.
- Aftercare editor cannot read deployed plans/steps.

### Acceptable For Controlled Pilot

- Some tables are empty.
- Audit history has sparse rows.
- Existing clinics have no overrides yet and use defaults.
- Some procedures need default aftercare plan creation.

### Tiny Patch Allowed Only If Real Failure Is Found

- Fix a selected column list if the deployed schema uses an already-supported existing column.
- Add defensive optional field handling in response normalization.
- Add a missing migration only if the code already requires the field and deployment lacks it.

Do not do:

- schema-first redesign
- table renaming
- broad migration cleanup
- new workflow model

## Phase 2 Overall Pass Criteria

Phase 2 can be marked `pilot accepted` only if:

- Area 1 has no blocking failure.
- Area 2 has no blocking failure.
- Area 3 has no blocking failure.
- Area 4 has no blocking failure.
- Area 5 has no blocking failure.

If one area is `ACCEPT_FOR_PILOT`, document why it is safe and what operating constraint applies.

## Phase 2 Allowed Work

Allowed:

- tiny bugfix only after a real manual failure is observed
- documentation updates to record pass/fail
- release note clarification

Not allowed:

- new features
- architecture changes
- external notifications
- backend voice pipeline
- CMS
- rules engine
- schema redesign
