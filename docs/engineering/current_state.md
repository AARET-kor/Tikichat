# Current Engineering State

Last updated: 2026-04-22

## Latest migrations

- `027_patient_ask.sql`
- `028_escalation_triage.sql`
- `029_rooms_lite.sql`
- `030_tiki_room.sql`
- `031_aftercare_engine.sql`

## Recently changed files

Primary product files:

- `/Users/a0000/Desktop/LCAUDE/clinic-chatbot/server.js`
- `/Users/a0000/Desktop/LCAUDE/clinic-chatbot/client/src/components/mytiki/MyTikiTab.jsx`
- `/Users/a0000/Desktop/LCAUDE/clinic-chatbot/client/src/pages/MyTikiPortal.jsx`
- `/Users/a0000/Desktop/LCAUDE/clinic-chatbot/client/src/pages/TikiRoomPage.jsx`
- `/Users/a0000/Desktop/LCAUDE/clinic-chatbot/src/lib/aftercare-engine.js`
- `/Users/a0000/Desktop/LCAUDE/clinic-chatbot/src/lib/aftercare-service.js`
- `/Users/a0000/Desktop/LCAUDE/clinic-chatbot/src/lib/patient-ask-policy.js`
- `/Users/a0000/Desktop/LCAUDE/clinic-chatbot/src/lib/patient-ask-service.js`
- `/Users/a0000/Desktop/LCAUDE/clinic-chatbot/src/lib/escalation-triage.js`
- `/Users/a0000/Desktop/LCAUDE/clinic-chatbot/src/lib/escalation-service.js`
- `/Users/a0000/Desktop/LCAUDE/clinic-chatbot/src/lib/room-traffic.js`
- `/Users/a0000/Desktop/LCAUDE/clinic-chatbot/src/lib/tiki-room.js`

Dirty but not automatically dangerous:

- build artifacts in `/Users/a0000/Desktop/LCAUDE/clinic-chatbot/public/assets/`
- unrelated existing edits such as `/Users/a0000/Desktop/LCAUDE/clinic-chatbot/extension/src/SidePanel.jsx`

## Known hardcoded assumptions

- Ask source policy is code-driven, not admin-configured yet.
- Ask fallback behavior is implemented in code rules, not a separate policy config.
- Escalation routing is hardcoded by type:
  - logistics -> front_desk / coordinator
  - billing -> coordinator
  - symptom / aftercare -> nurse
  - urgent -> nurse
  - doctor_required -> doctor
- Room-ready rule is hardcoded as:
  - checked in
  - intake done
  - consent done
  - active room-supporting stage
- Tiki Room currently uses text input as the live utterance placeholder.
- Tiki Room playback currently uses browser speech synthesis.
- Room tablet identity currently depends on local room selection storage in the browser.
- `/api/room/*` is currently lightweight and not staff-auth gated.
- Aftercare plan creation is code-driven per procedure, not admin-configured yet.
- Aftercare step templates are seeded from code, not a clinic editing UI.
- Aftercare risk classification is rule-based from structured payload:
  - severe pain / severe swelling / bleeding -> urgent
  - moderate swelling / worsening / medium-high anxiety -> concern
  - low-risk + good satisfaction -> safe_for_return
- Background aftercare due marking currently depends on the hourly BullMQ scheduler when Redis exists, and otherwise falls back to lazy due marking on reads.

## Current risks

- Some product rules still live mainly in helper files, not in configurable policy.
- `stage` is the main visit workflow term, but future additions could drift into duplicate naming if not watched.
- There is still a risk of confusing `implemented` with `operationally closed`.
- Tiki Room is operationally shaped correctly, but hardware/voice assumptions are still placeholder-level.
- Aftercare delivery is structurally real, but outbound channel delivery is still more “surface in portal / queue-ready” than full cross-channel automation.
- Recent work has multiple dirty files; the key review question is design dirtiness, not just git dirtiness.

## Next recommended task

- Next recommended task is a Phase 10 hardening pass:
  - document approved aftercare templates and risk rules
  - verify escalation handoff from aftercare in real clinic scenarios
  - decide the minimal outbound delivery channel beyond portal surfacing
  - then review whether Phases 5-10 are ready for operational closure, not just implementation
