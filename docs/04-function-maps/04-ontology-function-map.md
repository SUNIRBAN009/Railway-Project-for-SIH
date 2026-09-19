# 04-ontology-function-map.md

> **ফাইল ক্রম:** ২৯/৪৫  
> **সার্ভিস আইডি:** `SVC-ONTO` (`apps.ontology`)  
> **পূর্ববর্তী ফাইল:** [04-function-maps/03-departments-function-map.md](file:///c:/work%20pase/Railway-Project-for-SIH/docs/04-function-maps/03-departments-function-map.md) (`SVC-DEPT` Dedicated Function Map)  
> **পরবর্তী ফাইল:** [04-function-maps/05-trains-function-map.md](file:///c:/work%20pase/Railway-Project-for-SIH/docs/04-function-maps/05-trains-function-map.md) (`SVC-TRN` Dedicated Function Map)  
> **সংযোগ ও উদ্দেশ্য:** এই ফাইলে প্ল্যাটফর্মের সিম্বলিক এআই ও ফর্মাল সেফটি ভেরিফিকেশন ইঞ্জিন **`SVC-ONTO` (Semantic Digital Twin & Symbolic AI Reasoning Service)**-এর ছয়টি ক্যানোনিকাল ফাংশনের ইনপুট/আউটপুট স্কিমা, HermiT Tableau Reasoner (Java 17 OpenJDK JVM), ডেসক্রিপশন লজিক ($\mathcal{SROIQ}(D)$) এক্সিওমস, SPARQL 1.1 কুয়েরি, এবং জিরো-হ্যালুসিনেশন সেফটি প্রুফ জেনারেশনের পুঙ্খানুপুঙ্খ বিবরণ প্রদান করা হয়েছে।

---

## 1. Function Catalog (6 Core Functions)

| Function ID | Function Name | HTTP Method | Path / Trigger | Input DTO | Output DTO | Target SLA |
|---|---|:---:|---|---|---|:---:|
| `FUNC-ONTO-001` | Trigger HermiT DL Inference Job | `POST` | `/api/v1/ontology/reason/` | `ReasoningTriggerDTO` | `AsyncJobResponseDTO` | p95 < 60ms |
| `FUNC-ONTO-002` | Fetch Reasoning Job Status | `GET` | `/api/v1/ontology/jobs/{job_id}/` | URL Parameter | `JobStatusDetailDTO` | p95 < 30ms |
| `FUNC-ONTO-003` | Query Semantic Safety Violations | `GET` | `/api/v1/ontology/violations/` | Query Parameters | `ViolationsCollectionDTO` | p95 < 50ms |
| `FUNC-ONTO-004` | Active Twin Knowledge Graph Topology | `GET` | `/api/v1/ontology/graph/summary/` | None | `GraphMetricsDTO` | p95 < 40ms |
| `FUNC-ONTO-005` | Custom SPARQL 1.1 Semantic Query | `POST` | `/api/v1/ontology/sparql/` | `SparqlQueryRequestDTO` | `SparqlResultSetDTO` | p95 < 120ms |
| `FUNC-ONTO-006` | Interlocking & Axiom Proof Explainer | `POST` | `/api/v1/ontology/explain/` | `ProofExplainRequestDTO` | `FormalProofDetailDTO` | p95 < 80ms |

---

## 2. Detailed Function Implementation Specifications

### `FUNC-ONTO-001`: Trigger HermiT DL Inference Job
- **Controller Class:** `apps.ontology.views.OntologyReasoningTriggerView`
- **Permissions:** `IsAuthenticated`
- **Input Schema (`ReasoningTriggerDTO`):**
```json
{
  "block_id": "a9102847-02bb-481a-9911-c01928374612",
  "check_ohe_feeder_isolation": true,
  "check_crossover_deadlock": true,
  "check_stranded_electric_train": true
}
```
- **Validation Rules:**
  - `block_id` অবশ্যই PostgreSQL `blocks_blockproposal` টেবিলে বিদ্যমান থাকতে হবে।
- **Processing Logic:**
  1. ইউনিক `job_id = uuid4()` তৈরি।
  2. Redis ক্যাশে ট্র্যাকিং স্ট্যাটাস ইনিশিয়ালাইজ:
     `SET ontology:job:{job_id} {"status": "QUEUED", "progress_pct": 0}` (TTL 3600s)।
  3. ডেডিকেটেড JVM-সমর্থিত Celery কিউতে ব্যাকগ্রাউন্ড টাস্ক প্রেরণ:
     `apps.ontology.tasks.run_hermit_reasoner.apply_async(args=[job_id, block_id], queue='celery-ontology')`।
  4. ক্লায়েন্টে HTTP 202 Accepted রেসপন্স রিটার্ন।
- **Output (HTTP 202 Accepted):** `AsyncJobResponseDTO` পোলিং ইউআরএলসহ।

---

### `apps.ontology.tasks.run_hermit_reasoner` (Celery Dedicated Execution)
- **রানিং এনভায়রনমেন্ট:** Java 17 OpenJDK (`JAVA_HOME=/usr/lib/jvm/java-17-openjdk`), মেমরি ক্যাপ ৩.৫ জিবি JVM হিপ।
- **এক্সিকিউশন স্টেপস:**
  1. `owlready2.get_ontology("digital_twin/railway_ontology.owl").load()` দিয়ে অথরিটেটিভ OWL 2 DL গ্রাফ লোড।
  2. প্রস্তাবিত ব্লকের তথ্য অনুযায়ী ওডব্লিউএল গ্রাফে ডায়নামিক ইন্ডিভিজুয়াল ইনজেকশন:
     ```python
     with onto:
         block_ind = onto.BlockPossession(f"Block_{block.id}")
         block_ind.cutsPowerTo = [onto.OHEZone(z) for z in impacted_feeder_zones]
         block_ind.reservesTrack = [onto.TrackSegment(s) for s in occupied_segments]
     ```
  3. HermiT 1.4.3 Tableau Reasoner এক্সিকিউশন:
     ```python
     with onto:
         sync_reasoner_hermit(infer_property_values=True, debug=0)
     ```
  4. ইনফারেন্স রুলস বিশ্লেষণ ও লঙ্ঘন চিহ্নিতকরণ:
     - **Stranded Electric Train Inference (`STRANDED_ELECTRIC_TRAIN`):** ওএইচই ২৫কেভি পাওয়ার কাট করলে সংলগ্ন ট্র্যাকে কোনো বৈদ্যুতিক যাত্রীবাহী ট্রেন (রাজধানী বা বন্দে ভারত) আটকে পড়ছে কিনা।
     - **Crossover Points Deadlock (`CROSSOVER_POINTS_DEADLOCK`):** পয়েন্ট মেশিন ব্লক থাকায় বিপরীতমুখী ট্রেনের ক্রসিংয়ে ডেডলক হচ্ছে কিনা।
     - **Signal Overlap Invasion (`SIGNAL_OVERLAP_INVASION`):** সিগন্যালের সেফটি ওভারল্যাপ জোনে ওয়ার্ক জোন প্রবেশ করছে কিনা।
  5. চিহ্নিত ভায়োলেশনগুলো PostgreSQL `ontology_semantic_violation` টেবিলে সেভ।
  6. Redis-এ জবের স্ট্যাটাস আপডেট: `{"status": "COMPLETED", "violations_count": N}`।
  7. Redis চ্যানেল `events:ontology`-তে ইভেন্ট `ontology.reasoning.completed` পাবলিশ।

---

### `FUNC-ONTO-002`: Fetch Reasoning Job Status
- **Controller Class:** `apps.ontology.views.OntologyJobStatusView`
- **Permissions:** `IsAuthenticated`
- **Processing Logic:**
  1. Redis থেকে `ontology:job:{job_id}` স্ট্যাটাস ফেচ।
  2. জব চলমান থাকলে প্রগ্রেস শতাংশ এবং জব সমাপ্ত হলে চিহ্নিত ভায়োলেশনের সারাংশ রিটার্ন।
- **Output (HTTP 200):** `JobStatusDetailDTO`।

---

### `FUNC-ONTO-003`: Query Semantic Safety Violations
- **Controller Class:** `apps.ontology.views.OntologyViolationsListView`
- **Permissions:** `IsAuthenticated`
- **Query Parameters:** `?block_id=uuid&severity=FATAL_SAFETY_HAZARD`
- **Processing Logic:**
  1. PostgreSQL টেবিল `ontology_semantic_violation` থেকে ফিল্টার্ড তালিকা ফেচ।
  2. প্রতিটি লঙ্ঘনের সাথে ডেসক্রিপশন লজিক এক্সিওম এবং গাণিতিক প্রুফ চেইন সংযুক্ত করে রিটার্ন।
- **Output (HTTP 200):** `ViolationsCollectionDTO`।

---

### `FUNC-ONTO-004`: Active Twin Knowledge Graph Topology
- **Controller Class:** `apps.ontology.views.OntologyGraphSummaryView`
- **Permissions:** `IsAuthenticated`
- **Processing Logic:**
  1. মেমরিতে লোড থাকা নলেজ গ্রাফের পরিসংখ্যান ফেচ: টোটাল ক্লাসেস (Classes = 142), অবজেক্ট প্রপার্টিজ (Object Properties = 68), ডেটা প্রপার্টিজ (Data Properties = 94), এবং অ্যাক্টিভ ট্র্যাক ইন্ডিভিজুয়ালস (Individuals = 18,450)।
  2. ডিজিটাল টুইনের সামগ্রিক স্বাস্থ্য ও কনসিস্টেন্সি স্ট্যাটাস রিটার্ন।
- **Output (HTTP 200):** `GraphMetricsDTO`।

---

### `FUNC-ONTO-005`: Custom SPARQL 1.1 Semantic Query Engine
- **Controller Class:** `apps.ontology.views.OntologySparqlView`
- **Permissions:** `IsAuthenticated`, `IsAdminOrArchitect`
- **Input Schema (`SparqlQueryRequestDTO`):**
```json
{
  "sparql_query": "PREFIX r: <http://railnet.gov.in/onto/core#> SELECT ?train ?ohe WHERE { ?train a r:ElectricTrain . ?train r:occupiesSection ?sec . ?sec r:poweredBy ?ohe . ?ohe r:hasStatus 'ISOLATED' }"
}
```
- **Processing Logic:**
  1. SPARQL কোয়ারি স্যানিটাইজেশন এবং রিড-অনলি ভ্যালিডেশন (কোনো SPARQL UPDATE নিষিদ্ধ)।
  2. SQLite কোয়াডস্টোরের ওপর কুয়েরি এক্সিকিউট করে দ্রুত ফলাফল জেনারেশন।
- **Output (HTTP 200):** W3C SPARQL JSON রেজাল্ট সেট `SparqlResultSetDTO`।

---

### `FUNC-ONTO-006`: Interlocking & Axiom Proof Explainer
- **Controller Class:** `apps.ontology.views.OntologyProofExplainView`
- **Permissions:** `IsAuthenticated`
- **Input Schema (`ProofExplainRequestDTO`):**
```json
{
  "violation_id": "e9102837-04aa-481a-9911-f01928374920"
}
```
- **Processing Logic:**
  1. নির্দিষ্ট লঙ্ঘনের জন্য HermiT রিজনারের টেব্লো ডেরিভেশন ট্রির গাণিতিক প্রুফ এক্সট্র্যাক্ট।
  2. চিফ কন্ট্রোলার বা রেলওয়ে সেফটি অডিটরদের বোধগম্য ভাষায় জিরো-হ্যালুসিনেশন ব্যাখ্যা তৈরি:
     *"Line possession at KM 45.200 isolates 25kV Feeder F-04. Train 12301 (Electric Locomotive WAP-7) is scheduled to enter Section S-12 at 03:15, which depends on Feeder F-04. Hence, Train 12301 will be stranded without traction power."*
- **Output (HTTP 200):** `FormalProofDetailDTO`।

---

## 3. Next File Dependency Note

> **পরবর্তী ফাইল:** [04-function-maps/05-trains-function-map.md](file:///c:/work%20pase/Railway-Project-for-SIH/docs/04-function-maps/05-trains-function-map.md)

`04-ontology-function-map.md` সফলভাবে সম্পূর্ণ হয়েছে। পরবর্তী ফাইল `05-trains-function-map.md`-এ **`SVC-TRN` (`apps.trains`)**-এর ৯টি মাস্টার টাইমটেবিল (#114), শিডিউল ডেভিয়েশন ডিটেক্টর (#116), ডিলে ক্যাসকেড রিক্যালকুলেটর (#115), এবং প্যাসেঞ্জার ইমপ্যাক্ট (#27) ফাংশনের নিখুঁত ম্যাপিং সংজ্ঞায়িত করা হবে।
