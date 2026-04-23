# Engineering Runbooks

Last updated: 2026-04-22

## Reusable implementation prompt

Use when starting a new phase or patch:

1. summarize current state
2. restate the product rule for this phase
3. define what is real vs not in scope
4. write the smallest failing test first
5. implement the smallest real vertical slice
6. verify route + UI + state wiring, not just code existence
7. report what remains placeholder

## Reusable review prompt

Review in this order:

1. does this match the product philosophy for the phase
2. is the workflow operational or only technically present
3. are there duplicated concepts or names
4. are rules hardcoded in multiple files
5. are state transitions symmetric
6. is there any route without real UI/state connection

## Reusable closure prompt

Before calling a phase “closed”, confirm:

1. build/test passes
2. primary workflow works end to end
3. operational next action is obvious
4. known hardcoded assumptions are documented
5. remaining gaps are explicitly listed

## Pre-commit verification checklist

- `node --check server.js`
- `npm test`
- `npm run build` in `client/`
- if schema changed:
  - migration file exists
  - deployment doc updated
  - compatibility / transition impact considered
- if workflow changed:
  - route exists
  - UI exists
  - local state updates correctly
  - clear / reassign / resolve paths are not one-way only

## Schema review checklist

- does this add a genuinely new concept
- can this reuse an existing table/field first
- are we introducing duplicate names for the same thing
- are enums and state names aligned with product language
- is the state transition model explicit
- if adding a nullable field, is its lifecycle clear
- if adding a table, is it actually connected to routes and UI now

## Operational closure checklist

- rules are documented outside code
- phase status is updated
- current hardcoded assumptions are listed in `current_state.md`
- “implemented” is not mislabeled as “operationally closed”
- dangerous dirty is called out:
  - duplicate fields
  - unused tables/columns
  - route-only work
  - scattered hardcoded rules
  - asymmetric state transitions

## Tiki Room voice / TTS QA checklist

Use this after Batch 6B browser-native voice changes and before claiming a room deployment is voice-stable.

1. Open `Tiki Room` in a real authenticated staff browser session.
2. Confirm `current / load-next / clear` still work before testing voice.
3. Test voice input in at least one Chromium-based browser:
   - choose a live room with a current patient
   - click `Start voice input`
   - speak one short patient utterance in the patient language
   - confirm the text box is filled
   - click `Intent 정리`
   - confirm AI analysis and recommended responses still require doctor/staff selection
4. Test unsupported or denied mic permission:
   - deny microphone permission or use a browser without SpeechRecognition
   - confirm text input fallback remains usable
   - confirm the UI does not imply voice is required
5. Test TTS playback:
   - select a doctor response
   - click `Speak selected`
   - confirm playback starts or a clear unsupported/fallback message appears
   - click `Stop audio`
   - click `Replay`
6. Test multilingual fallback:
   - Korean, English, Japanese, Chinese, and Arabic patient languages should map to their browser speech locales
   - if an exact voice is unavailable, the UI should state that a closest voice or browser default is being used

Pass criteria:

- voice input is optional and never bypasses doctor/staff response selection
- browser TTS fallback is visible when exact language voice is unavailable
- text input and patient display remain usable if voice APIs are unavailable
- no transcript storage, autonomous voice response, or backend STT/TTS path is introduced
