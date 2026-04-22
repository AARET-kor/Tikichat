# TikiDoc Phase Status

Last updated: 2026-04-22

Status meanings:

- `planned`: not implemented yet
- `in progress`: active build / partial slice only
- `implemented`: coded and connected, but operational gaps remain
- `operationally closed`: coded and considered operationally usable for current scope

## Phase list

| Phase | Name | Status | Notes / Remaining gaps |
|---|---|---|---|
| 1 | v2 schema + core entities | operationally closed | Core clinic / patient / visit / link / form / journey structure is in place. |
| 2 | Tiki Paste -> Tiki Memory write loop | implemented | Real write loop exists; still depends on broader prompt / knowledge hygiene. |
| 3 | My Tiki portal core | implemented | Journey / forms / portal shell exists; ongoing UX cleanup remains. |
| 4 | Activation wedge: intake parser + quick visit + link + Ops Board | implemented | Wedge works; still worth operational hardening and clearer documentation of assumptions. |
| 5 | Arrival Mode | implemented | Core self-arrival and staff check-in flow exists. Literal QR rendering and broader live verification still need operational confirmation. |
| 6 | My Tiki Ask | implemented | Safe, source-limited Ask exists. Still relies on hardcoded policy logic and no dedicated FAQ admin surface yet. |
| 7 | Escalation | implemented | Triage, assignment, status, and Ops Board tasking exist. SLA/notifications and richer staff workflow are still deferred. |
| 8 | Rooms Lite | implemented | Room presets, occupancy, queue, assign/clear exist. Room-ready rule is still hardcoded and should stay documented. |
| 9 | Tiki Room full mode | implemented | Doctor-first prep + guided response loop exists. Voice capture is still text-input placeholder; playback is browser speech for now. |
| 10 | Aftercare / follow-up automation | implemented | Timed checkpoints, structured check-ins, risk branching, escalation hook, and minimal Ops visibility exist. Background delivery and template/admin hardening still remain. |

## Practical interpretation

- Current project state is beyond ideation and beyond mock-only.
- Phases `6-9` are now real product slices, but not all are operationally closed.
- Before marking any phase closed, confirm:
  - actual UI + route + state connection exists
  - state transitions are symmetric
  - real operational friction has been checked
