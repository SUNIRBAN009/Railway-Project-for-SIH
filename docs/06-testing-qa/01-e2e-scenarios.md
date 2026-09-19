# 01-e2e-scenarios.md

> **File Sequence:** 40/45  
> **Previous Document:** [06-testing-qa/00-test-plan.md](00-test-plan.md)  
> **Next Document:** [06-testing-qa/02-load-test-strategy.md](02-load-test-strategy.md)  
> **Context:** Specification of 5 mission-critical End-to-End operational user journeys executed across React UI, Django REST API, Celery Workers, and Daphne WebSockets.

---

# Critical Operational E2E Test Scenarios

---

## Scenario 1: Routine Track Maintenance Block Lifecycle

```
[DEPT_ENGINEER]           [PLATFORM BACKEND]           [SECTION_CONTROLLER]         [SITE_SUPERVISOR]
       |                          |                             |                           |
       |-- 1. Submit Proposal --->|                             |                           |
       |   (KM 142.5-146.2, 4hrs) |                             |                           |
       |                          |-- 2. Sweep Conflicts ------>|                           |
       |                          |   (0 Critical Conflicts)    |                           |
       |                          |                             |-- 3. Review & Sanction -->|
       |                          |                             |   (Issues Caution Order)  |
       |                          |<-- 4. Emit Sanctioned Event-|                           |
       |                          |                             |                           |
       |                          |-- 5. Issue Work Order --------------------------------->|
       |                          |                                                         |
       |                          |<-- 6. Sign Safety Clearance ----------------------------|
       |                          |   (Track Fit 30 km/h)                                   |
       |                          |                                                         |
       |<-- 7. Block Completed ---|---------------------------->|                           |
```

### Verification Criteria
1. Initial block record created in MySQL with `status = 'PENDING_APPROVAL'`.
2. Celery `sweep_conflicts` completes within 200ms with zero unresolved critical conflicts.
3. Controller sanctions proposal; status updates to `'SANCTIONED'`.
4. WebSocket push-to-invalidate frame received by connected clients; corridor timeline UI updates within 100ms.
5. Supervisor submits track safety certification; block transitions to `'COMPLETED'`.

---

## Scenario 2: Multi-Department Co-Possession Coordination

- **Actors:** P-Way Assistant Engineer (ENG), Traction Distribution Engineer (TRD), Chief Controller (COA).
- **Trigger:** ENG submits 4-hour tamping request on DOWN line KM 142.500 to 146.200. TRD independently submits OHE catenary replacement request for overlapping KM and overlapping time window.
- **Workflow:**
  1. Backend conflict engine detects parallel requests on identical line and tags them as `CO_POSSESSION_OPPORTUNITY`.
  2. The UI renders a unified Co-Possession recommendation card showing **"Potential 3.5 Hours Track Time Saved"**.
  3. Chief Controller merges both requests into a single coordinated block.
  4. Backend generates paired work orders (`WO-ENG-01` and `WO-TRD-01`) linked to the single block record.
  5. Block cannot be cleared until **both** ENG and TRD supervisors submit digital safety clearance sign-offs.

---

## Scenario 3: Emergency USFD Rail Flaw Defect & Automated Caution Order

- **Actors:** USFD Testing Crew, Section Controller.
- **Trigger:** Automated ultrasonic testing trolley detects a 18mm internal rail fracture at KM 144.200.
- **Workflow:**
  1. USFD crew submits defect via `POST /api/v1/assets/defects/` with `severity: CRITICAL_IMMEDIATE_STOP`.
  2. Platform automatically generates an **Emergency Block Proposal** (`BLK-EMERGENCY-...`).
  3. `SVC-TRN` delay simulation engine calculates delay impact on upcoming Train 12424 (Rajdhani) and suggests immediate diversion to Loop Line 2.
  4. P1 emergency alarm broadcasts over WebSockets to Chief Controller and dispatches SMS alert to Station Master.
  5. Section Controller approves emergency sanction with a single click.

---

## Scenario 4: Semantic Hazard Detection & Rejection (Stranded Electric Train)

- **Actors:** Departmental Engineer, HermiT Reasoner, Chief Controller.
- **Trigger:** TRD Engineer proposes de-energizing OHE Sub-Sector 14 without noticing an incoming electric freight rake scheduled on an adjacent crossover line.
- **Workflow:**
  1. Celery `worker-ontology` instantiates block individuals in the OWL graph and runs HermiT.
  2. Reasoner classifies the state under `onto.StrandedElectricTrainHazard`.
  3. System flags the block with `ONTO-001` (Critical Safety Hazard) and prevents Controller sanction button from activating.
  4. The UI displays an explainable narrative proof: *"De-energizing OHE sector 14 isolates crossover points where Train 24102 requires electric traction."*

---

## Scenario 5: Concurrent Modification Race Condition (Optimistic Lock)

- **Actors:** Controller A and Controller B.
- **Trigger:** Both controllers view Block `BLK-100` at version 1 and simultaneously click "Sanction" and "Amend Timings".
- **Workflow:**
  1. Controller A's request reaches MySQL first; executes `UPDATE ... WHERE version = 1`; increments version to 2.
  2. Controller B's request executes `UPDATE ... WHERE version = 1`; 0 rows affected.
  3. Backend returns HTTP 409 Conflict with error code `BLK-006`.
  4. Controller B's browser UI displays toast: *"Record was modified by Controller A. Refreshing current state..."* and updates automatically without data loss.
