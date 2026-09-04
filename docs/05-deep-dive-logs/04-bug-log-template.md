# 04-bug-log-template.md

> **File Sequence:** 38/45  
> **Previous Document:** [05-deep-dive-logs/03-state-management.md](03-state-management.md)  
> **Next Document:** [05-deep-dive-logs/contracts/01-blocks-contracts.md](contracts/01-blocks-contracts.md)  
> **Context:** Production Incident Report, Root Cause Analysis (RCA), and Corrective & Preventive Action (CAPA) runbook template for the Indian Railways Block Planning Platform.

---

# Production Incident Post-Mortem & RCA Runbook

## 1. Incident Severity Classification Matrix

| Severity Level | Definition & Operational Impact | Target Response (MTTA) | Target Resolution (MTTR) | Escalation Path |
|---|---|:---:|:---:|---|
| **SEV-1 (Critical)** | Block conflict detection engine offline; live collision risk; data corruption in track possession records. | < 5 Minutes | < 30 Minutes | CTO, Lead Architect, Chief Controller |
| **SEV-2 (Major)** | Live train running timetable ingestion delayed > 15 minutes; WebSocket disconnects affecting all dispatchers. | < 15 Minutes | < 2 Hours | Engineering Lead, DevOps On-Call |
| **SEV-3 (Moderate)** | SMS gateway fallback failure; non-critical analytics dashboard aggregation delayed; single gang allocation error. | < 1 Hour | < 8 Hours | Primary Service Owner |
| **SEV-4 (Minor)** | Minor UI styling glitch; non-blocking export formatting irregularity. | < 4 Hours | Next Sprint | Frontend Team |

---

## 2. Standard Incident Post-Mortem Report Template

```markdown
# Incident Post-Mortem: [INCIDENT_NUMBER] - [Brief Descriptive Title]

## Incident Metadata
- **Incident ID:** INC-20260904-001
- **Severity Level:** SEV-[1/2/3/4]
- **Incident Commander:** [Name, Title]
- **Primary Service Affected:** SVC-[BLK / ONTO / TRN / AUTH / NOTIF]
- **Time Detected:** 2026-09-04 14:10:00 UTC
- **Time Resolved:** 2026-09-04 14:32:00 UTC
- **Total Operational Downtime:** 22 Minutes

---

## 1. Executive Summary
[Concise 2-paragraph non-technical narrative explaining what broke, how train operations and track maintenance blocks were affected, and how the platform was restored.]

---

## 2. Operational & Safety Impact
- **Track Possessions Affected:** [e.g. 4 blocks delayed, 0 safety violations incurred]
- **Passenger Trains Impacted:** [e.g. Train 12424 delayed by 6 minutes at Aligarh Jn]
- **Freight Movement Bottlenecks:** [e.g. 2 coal rakes held at loop line]
- **Data Loss / State Corruption:** [Zero state corruption; all MySQL ACID transactions rolled back safely]

---

## 3. Chronological Incident Timeline (UTC)
| Timestamp | Event / Observation / Intervention | Responder |
|---|---|---|
| 14:10:00 | Prometheus alert fired: `ConflictSweepWorkerHighMemoryUsage > 90%` | Alertmanager |
| 14:12:15 | Celery worker-ontology crashed with Out-Of-Memory (OOMKilled) | DevOps On-Call |
| 14:15:30 | Incident Commander declared SEV-1 incident; conference bridge opened | Incident Commander |
| 14:18:00 | Diagnosed memory leak in HermiT reasoner individual instantiation loop | Lead Ontologist |
| 14:22:00 | Restarted worker with increased memory ceiling (8GB) and cleared stale JVM heap | DevOps Engineer |
| 14:28:00 | Verified successful completion of all backlog reasoning sweeps | Lead Architect |
| 14:32:00 | All system telemetry normalized; incident formally resolved | Incident Commander |

---

## 4. Root Cause Analysis (5-Whys Methodology)
1. **Why did the conflict sweep worker crash?**  
   The worker process exceeded its 4GB memory limit and was terminated by the Linux OOM-killer.
2. **Why did memory consumption spike?**  
   The HermiT reasoner instantiated 12,000 temporary RDF individuals instead of reusing cached ontology classes.
3. **Why were duplicate individuals created?**  
   The Celery worker did not clear the `owlready2.default_world` graph between successive reasoning tasks.
4. **Why was the graph not cleared?**  
   The task handler lacked a `finally: default_world.close()` teardown block.
5. **Why was this not caught in staging?**  
   The load test suite only tested single-job invocations rather than continuous 500-job batch runs.

---

## 5. Corrective & Preventive Actions (CAPA)

| Action Item ID | Task Description | Assignee | Priority | Target Due Date | Status |
|---|---|---|:---:|---|:---:|
| CAPA-001 | Add explicit `default_world.close()` in Celery ontology task teardown. | Ontologist | High | 2026-09-05 | Done |
| CAPA-002 | Configure Celery `--max-memory-per-child=2000000` to auto-recycle workers. | DevOps | High | 2026-09-05 | In Review |
| CAPA-003 | Expand k6 load test suite to simulate continuous 1,000 block conflict requests. | QA Lead | Medium | 2026-09-08 | Open |
```
