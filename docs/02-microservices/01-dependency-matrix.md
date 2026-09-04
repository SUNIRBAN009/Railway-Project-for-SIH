# 01-dependency-matrix.md

> **ফাইল ক্রম:** ১৫/৪৫  
> **পূর্ববর্তী ফাইল:** `02-microservices/00-service-index.md` (সার্ভিস ক্যাটালগ ও রেসপনসিবিলিটি)  
> **পরবর্তী ফাইল:** `03-service-blueprints/00-service-template.md`  
> **সংযোগ:** এই ফাইলে নির্ধারিত ইন্টার-সার্ভিস ডিপেনডেন্সি গ্রাফ এবং ডাটাবেজ মাইগ্রেশন/বুট অর্ডার পরবর্তী ফোল্ডার `03-service-blueprints/`-এ প্রতিটি সার্ভিসের জন্য প্রস্তুতকৃত স্ট্যান্ডার্ড আর্কিটেকচার ব্লুপ্রিন্ট ও এপিআই কন্ট্রাক্ট ডিজাইনে সরাসরি প্রযোজ্য হবে।

---

## 1. Inter-Service Dependency Matrix

নিচের টেবিলে প্রতিটি সার্ভিসের (Row) সাথে অন্যান্য সার্ভিসের (Column) নির্ভরশীলতা ও যোগাযোগের ধরন চিহ্নিত করা হয়েছে:
- **`—`**: No direct dependency (সম্পূর্ণ স্বাধীন)
- **`SYNC`**: In-process synchronous Python call / Django ORM query (same process, read-only)
- **`EVENT`**: Asynchronous event via Redis Pub/Sub / Django Signal
- **`TASK`**: Asynchronous background job via Celery Queue

| Calling Service (↓) \ Target Service (→) | SVC-AUTH | SVC-DEPT | SVC-TRN | SVC-AST | SVC-BLK | SVC-ONTO | SVC-NOTIF | SVC-ANA | SVC-GATEWAY |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **SVC-AUTH** (accounts) | — | SYNC (FK) | — | — | — | — | — | EVENT (Audit) | — |
| **SVC-DEPT** (departments) | SYNC | — | — | — | — | — | — | EVENT (Audit) | — |
| **SVC-TRN** (trains) | SYNC | — | — | — | — | — | EVENT (Delay) | EVENT (Audit) | EVENT (WS) |
| **SVC-AST** (assets) | SYNC | — | SYNC (FK) | — | — | EVENT (Sync) | — | EVENT (Audit) | — |
| **SVC-BLK** (blocks) | SYNC | SYNC (Gang) | SYNC (Sec) | SYNC (Ast) | — | TASK (Sync) | TASK (SMS) | EVENT (Audit) | EVENT (WS) |
| **SVC-ONTO** (ontology) | — | — | SYNC (Route)| SYNC (Asset)| SYNC (Block)| — | — | EVENT (Done) | EVENT (WS) |
| **SVC-NOTIF** (notifications) | SYNC (Phone)| — | — | — | SYNC (Block)| — | — | EVENT (Audit) | EVENT (WS) |
| **SVC-ANA** (analytics) | SYNC (Read) | SYNC (Read) | SYNC (Read) | SYNC (Read) | SYNC (Read) | SYNC (Read) | SYNC (Read) | — | — |
| **SVC-GATEWAY** (frontend/Nginx)| SYNC (REST) | SYNC (REST) | SYNC (REST) | SYNC (REST) | SYNC (REST) | SYNC (REST) | SYNC (REST) | SYNC (REST) | — |

---

## 2. Service Boot & Initialization Order

Modular Monolith এবং কনটেইনার স্টার্টআপের সময় রেস কন্ডিশন এড়াতে একটি কঠোর **ফেজ-ভিত্তিক বুট অর্ডার** অনুসরণ করা হয়:

```
[Phase 0: Infrastructure Layer]
  │  1. MySQL 8.0 Engine (Port 3306) ──► Waits for healthy ping
  │  2. Redis 7 Broker (Port 6379)    ──► Waits for PING response
  ▼
[Phase 1: Foundation Services]
  │  3. SVC-DEPT (departments app)    ──► Base railway departments (ENG, TRD, SNT, COA)
  │  4. SVC-AUTH (accounts app)       ──► User table & RBAC superadmin creation
  ▼
[Phase 2: Topology & Physical Assets]
  │  5. SVC-TRN (trains app)          ──► Corridor sections, stations, train timetables
  │  6. SVC-AST (assets app)          ──► Track segments, signals, OHE power inventory
  ▼
[Phase 3: Core Domain Services]
  │  7. SVC-BLK (blocks app)          ──► Conflict engine, block proposals
  │  8. SVC-ONTO (ontology app)       ──► OWL 2 Digital Twin load & HermiT Reasoner init
  ▼
[Phase 4: Asynchronous Dispatchers]
  │  9. SVC-NOTIF (notifications app) ──► Twilio client & SMS queue workers
  │ 10. SVC-ANA (analytics app)       ──► Audit tables & KPI aggregators
  ▼
[Phase 5: Client Gateway & Presentation]
  │ 11. Daphne ASGI Server (Port 8001)──► WebSocket channel layer open
  │ 12. Gunicorn WSGI (Port 8000)     ──► REST API endpoints open
  │ 13. SVC-GATEWAY (Nginx Port 80)   ──► Reverse proxy & React UI active
```

---

## 3. Database Migration Order (MySQL 8.0)

MySQL-এ Foreign Key কন্সট্রেইন্ট এরর এড়াতে Django মাইগ্রেশন অবশ্যই নিচের ক্রমানুসারে এক্সিকিউট হতে হবে:

```bash
# Automated Migration Execution Sequence:
python manage.py migrate departments   # 1. Creates `departments` table
python manage.py migrate accounts      # 2. Creates `users` table (FK -> departments)
python manage.py migrate trains        # 3. Creates `sections` and `trains`
python manage.py migrate departments   # 4. Creates `crews` & `materials` (FK -> departments, sections)
python manage.py migrate assets        # 5. Creates `assets` (FK -> sections)
python manage.py migrate blocks        # 6. Creates `block_requests` (FK -> dept, sec, users)
python manage.py migrate notifications # 7. Creates `notifications` (FK -> users, blocks)
python manage.py migrate analytics     # 8. Creates `audit_logs`
python manage.py migrate ontology      # 9. Creates `ontology_sync`
```

---

## 4. Circular Dependency Prevention Rules

মডুলার আর্কিটেকচারে কোডের জটিলতা এবং ডেডলক প্রতিরোধে ৪টি অলঙ্ঘনীয় নিয়ম প্রয়োগ করা হয়েছে:

1. **ডাউনস্ট্রিম সার্ভিস কখনো আপস্ট্রিম সার্ভিসকে সিঙ্ক্রোনাসলি কল করবে না:**
   - `SVC-BLK` (আপস্ট্রিম) থেকে `SVC-NOTIF` বা `SVC-ONTO` (ডাউনস্ট্রিম)-এ কল সবসময় **Celery Asynchronous Task** (`.delay()`) অথবা **Django Signal**-এর মাধ্যমে হবে।
   - কোনো অবস্থাতেই `notifications` বা `ontology` অ্যাপ সরাসরি `blocks.views` বা মিউটেটিং মেথড কল করতে পারবে না।

2. **নো বাই-ডিরেকশনাল মডেল ইমপোর্ট (No Circular Python Imports):**
   - ফাইল লেভেলে পারস্পরিক ইমপোর্ট (যেমন `from blocks.models import BlockRequest` এবং `from accounts.models import User`) নিষিদ্ধ।
   - প্রয়োজন হলে মেথডের ভেতরে লোকাল ইমপোর্ট অথবা Django-র জেনেরিক `apps.get_model('app_label', 'ModelName')` মেথড ব্যবহার করতে হবে।

3. **সিঙ্গেল রাইট ওনারশিপ (Single Write Authority):**
   - কোনো সার্ভিস অন্য সার্ভিসের টেবিলে সরাসরি `INSERT`, `UPDATE` বা `DELETE` করতে পারবে না।
   - উদাহরণ: `trains` অ্যাপ সরাসরি `block_requests` আপডেট করতে পারবে না; তাকে অবশ্যই `SVC-BLK`-এর অনুমোদিত এপিআই বা ইন্টারনাল সার্ভিস মেথড কল করতে হবে।

4. **অডিট ট্রেইল ডিকাপলিং (Audit Decoupling via Events):**
   - প্রতিটি অ্যাপ ট্রানজ্যাকশন শেষে একটি নন-ব্লকিং `audit.record_created` ইভেন্ট পাবলিশ করে। `SVC-ANA` এই ইভেন্ট কনজিউম করে MySQL `audit_logs` টেবিলে ডাটা জমা করে।

---

## 5. Failure Cascade Analysis & Blast Radius Containment

যদি কোনো নির্দিষ্ট সার্ভিস ব্যর্থ হয়, তবে তা সমগ্র সিস্টেমকে যেন ডাউন না করে, সেজন্য নির্ধারিত সার্কিট ব্রেকার ও ডিগ্রেডেড মোড:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          FAILURE CONTAINMENT MATRIX                         │
├──────────────┬──────────────────┬─────────────────┬─────────────────────────┤
│ Failed Unit  │ Impacted Feature │ Blast Radius    │ Fallback / Degradation  │
├──────────────┼──────────────────┼─────────────────┼─────────────────────────┤
│ **SVC-ONTO** │ Digital Twin     │ LOW             │ Blocks can still be     │
│ (Reasoner    │ Reasoning        │ (Local to       │ approved via classical  │
│  Crash)      │ & Impact Query   │  smart queries) │ rule-engine. Reasoning  │
│              │                  │                 │ queued in Celery.       │
├──────────────┼──────────────────┼─────────────────┼─────────────────────────┤
│ **SVC-NOTIF**│ SMS delivery to  │ LOW             │ Web UI WebSocket alert  │
│ (Twilio API  │ field crews      │ (External SMS   │ remains active; failed  │
│  Failure)    │                  │  only)          │ SMS sent to Redis DLQ   │
│              │                  │                 │ for automated retry.    │
├──────────────┼──────────────────┼─────────────────┼─────────────────────────┤
│ **Gemini API**│ Bengali/Hindi   │ LOW             │ Circuit breaker opens   │
│ (Quota/500   │ explanations &   │ (AI text        │ in 60s; system outputs  │
│  Error)      │ summaries        │  generation)    │ standardized rule-based │
│              │                  │                 │ English explanations.   │
├──────────────┼──────────────────┼─────────────────┼─────────────────────────┤
│ **SVC-TRN**  │ Live simulated   │ MEDIUM          │ Block planning relies on│
│ (Feed Stop)  │ GPS updates      │ (Map movement)  │ static master schedule; │
│              │                  │                 │ cached section status.  │
├──────────────┼──────────────────┼─────────────────┼─────────────────────────┤
│ **SVC-BLK**  │ Block proposal   │ CRITICAL        │ Read-only mode active;  │
│ (Engine Fail)│ & approval       │ (Core workflow) │ Emergency block hotline │
│              │                  │                 │ directly alerts COA.    │
└──────────────┴──────────────────┴─────────────────┴─────────────────────────┘
```

---

## 6. Multi-Service Transaction Boundaries (SAGA)

যেসব অপারেশনে একাধিক বাউন্ডেড কনটেক্সটের সমন্বয় প্রয়োজন, সেগুলোতে **SAGA Orchestrator** ব্যবহার করা হয়:

### Block Approval SAGA:
```
[Client: COA approves Block #89]
  │
  ├──► 1. SVC-BLK (Local MySQL Transaction):
  │       UPDATE block_requests SET status = 'APPROVED'
  │       UPDATE sections SET current_status = 'BLOCKED'
  │       [ACID Commit in MySQL]
  │
  ├──► 2. Trigger Async SAGA Step via Celery:
  │       ├─► [Task] SVC-ONTO: Sync triples to Owlready2 graph
  │       ├─► [Task] SVC-NOTIF: Render template & dispatch Twilio SMS
  │       ├─► [Task] SVC-ANA: Append record to immutable audit log
  │       └─► [Task] SVC-GATEWAY: Broadcast WebSocket block update
  │
  └──► Compensating Logic (If Steps 2-5 fail):
          • External side-effects do NOT rollback MySQL Block approval.
          • Failures are flagged in Redis DLQ and highlighted on COA dashboard.
```

---

## 7. Next Folder Dependency Note

> পরবর্তী ফোল্ডার: `03-service-blueprints/`  
> পরবর্তী ফাইল: `03-service-blueprints/00-service-template.md`

`02-microservices/` ফোল্ডারের উভয় ফাইল সম্পন্ন হয়েছে:
1. `00-service-index.md` — ৯টি বাউন্ডেড কনটেক্সট সার্ভিসের মাস্টার ক্যাটালগ, রেসপনসিবিলিটি ও কোটা।
2. `01-dependency-matrix.md` — ইন্টার-সার্ভিস ডিপেনডেন্সি ম্যাট্রিক্স, বুট অর্ডার, মাইগ্রেশন অর্ডার এবং ব্লাস্ট রেডিয়াস অ্যানালাইসিস।

পরবর্তী ফোল্ডার `03-service-blueprints/`-এ প্রতিটি সার্ভিসের জন্য আলাদা ব্লুপ্রিন্ট ফাইল তৈরি করা হবে:
- `00-service-template.md` (সার্ভিস ব্লুপ্রিন্ট টেমপ্লেট)
- `01-accounts.md` (`SVC-AUTH`)
- `02-blocks.md` (`SVC-BLK`)
- `03-departments.md` (`SVC-DEPT`)
- `04-ontology.md` (`SVC-ONTO`)
- `05-trains.md` (`SVC-TRN`)
- `06-assets.md` (`SVC-AST`)
- `07-analytics.md` (`SVC-ANA`)
- `08-notifications.md` (`SVC-NOTIF`)
