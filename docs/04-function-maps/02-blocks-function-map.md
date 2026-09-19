# 02-blocks-function-map.md

> **ফাইল ক্রম:** ২৭/৪৫  
> **সার্ভিস আইডি:** `SVC-BLK` (`apps.blocks`)  
> **পূর্ববর্তী ফাইল:** [04-function-maps/01-accounts-function-map.md](file:///c:/work%20pase/Railway-Project-for-SIH/docs/04-function-maps/01-accounts-function-map.md) (`SVC-AUTH` Dedicated Function Map)  
> **পরবর্তী ফাইল:** [04-function-maps/03-departments-function-map.md](file:///c:/work%20pase/Railway-Project-for-SIH/docs/04-function-maps/03-departments-function-map.md) (`SVC-DEPT` Dedicated Function Map)  
> **সংযোগ ও উদ্দেশ্য:** এই ফাইলে প্ল্যাটফর্মের কোর এআই ইঞ্জিন **`SVC-BLK` (Block Planning, Spatial Sweep & Conflict Resolution Engine)**-এর ১২টি ক্যানোনিকাল ফাংশনের ইনপুট/আউটপুট স্কিমা, ভ্যালিডেশন নিয়মাবলী, পোস্টজিআইএস স্পেশিয়াল অ্যালগরিদম, এবং এসএজিএ (SAGA) ট্রানজ্যাকশন স্টেট মেশিনের নিখুঁত বিবরণ প্রদান করা হয়েছে।

---

## 1. Function Catalog (12 Core Functions)

| Function ID | Function Name | HTTP Method | Path / Trigger | Input DTO | Output DTO | Target SLA |
|---|---|:---:|---|---|---|:---:|
| `FUNC-BLK-001` | Submit Block Proposal | `POST` | `/api/v1/blocks/proposals/` | `BlockProposalRequestDTO` | `BlockDetailDTO` | p95 < 120ms |
| `FUNC-BLK-002` | List Filtered Block Schedule | `GET` | `/api/v1/blocks/` | Query Parameters | `PaginatedBlocksResponseDTO`| p95 < 70ms |
| `FUNC-BLK-003` | Retrieve Block Detail & Conflicts | `GET` | `/api/v1/blocks/{id}/` | URL Parameter | `BlockFullAuditDTO` | p95 < 40ms |
| `FUNC-BLK-004` | Execute Spatial-Temporal Sweep | Celery | `blocks.tasks.sweep_conflicts` | `{"block_id": "uuid"}` | `ConflictSweepSummaryDTO` | p95 < 180ms |
| `FUNC-BLK-005` | AI Conflict Resolution & Re-fit | `POST` | `/api/v1/blocks/{id}/resolve/` | `ConflictResolutionRequestDTO` | `ResolutionResultDTO` | p95 < 150ms |
| `FUNC-BLK-006` | Expert System Priority Scoring | `POST` | `/api/v1/blocks/calculate-priority/`| `PriorityScoreRequestDTO` | `PriorityScoreResponseDTO` | p95 < 35ms |
| `FUNC-BLK-007` | Combined Block Window Bundling | `POST` | `/api/v1/blocks/combine-windows/` | `CombineBlockRequestDTO` | `CombinedBlockResultDTO` | p95 < 140ms |
| `FUNC-BLK-008` | Sanction Block Possession | `POST` | `/api/v1/blocks/{id}/sanction/` | `BlockSanctionRequestDTO` | `BlockDetailDTO` | p95 < 90ms |
| `FUNC-BLK-009` | Activate Possession with Token | `POST` | `/api/v1/blocks/{id}/activate/` | `BlockActivationRequestDTO` | `BlockDetailDTO` | p95 < 80ms |
| `FUNC-BLK-010` | Clear & Complete Track Block | `POST` | `/api/v1/blocks/{id}/complete/` | `BlockCompletionRequestDTO` | `BlockDetailDTO` | p95 < 80ms |
| `FUNC-BLK-011` | Split Block Window Calculation | `POST` | `/api/v1/blocks/{id}/split/` | `SplitBlockRequestDTO` | `SplitBlockResponseDTO` | p95 < 100ms |
| `FUNC-BLK-012` | Mega Block Planning Engine | `POST` | `/api/v1/blocks/mega-block-plan/` | `MegaBlockRequestDTO` | `MegaBlockPlanResponseDTO` | p95 < 200ms |

---

## 2. Detailed Function Implementation Specifications

### `FUNC-BLK-001`: Submit Block Proposal (Feature #2)
- **Controller Class:** `apps.blocks.views.BlockProposalCreateView`
- **Permissions:** `IsAuthenticated`, `IsDepartmentalEngineer` (`JE_PWAY`, `JE_SIGNAL`, `TRD_OPERATOR`, `SSE`)
- **Input Schema (`BlockProposalRequestDTO`):**
```json
{
  "corridor_code": "HWH-BWN",
  "track_line_type": "DOWN",
  "department_code": "CIVIL_ENGG",
  "work_type": "TRACK_TAMPING",
  "start_km": 45.200,
  "end_km": 48.500,
  "scheduled_start_time": "2026-09-19T02:00:00Z",
  "scheduled_end_time": "2026-09-19T05:30:00Z",
  "traction_power_cutoff_required": false,
  "estimated_gang_headcount": 12,
  "justification": "USFD internal flaw rectification on 60kg rail"
}
```
- **Validation Rules:**
  - `start_km < end_km` এবং করিডোর রেঞ্জের অন্তর্ভুক্ত (`0.000` থেকে `95.500` KM)।
  - `scheduled_start_time < scheduled_end_time` এবং ডিউরেশন অনধিক ৮ ঘণ্টা (৪৮০ মিনিট)।
  - প্রস্তাবিত সময় পিক-আওয়ারে (সকাল ০৮:০০-১০:৩০ এবং বিকাল ১৭:০০-২০:০০) পড়লে `PeakHourProtection` গার্ড (`Feature #29`) রিকোয়েস্ট ব্লক করবে।
- **Processing Logic:**
  1. PostgreSQL 15 + PostGIS 3.3 স্পেশিয়াল ফাংশন ব্যবহার করে সাব-জ্যামিতি এক্সট্র্যাক্ট:
     ```sql
     SELECT ST_LineSubstring(track_geometry, :f_start, :f_end) AS block_geom
     FROM infrastructure_corridor WHERE corridor_code = :corridor_code;
     ```
  2. অটো-জেনারেটেড ইউনিক ব্লক রেফারেন্স কোড: `BLK-YYYYMMDD-[DEPT]-[SEQ]`।
  3. `blocks_blockproposal` টেবিলে `status = 'PENDING_APPROVAL'` এবং `optimistic_version = 1` হিসেবে সংরক্ষণ।
  4. উচ্চ-অগ্রাধিকার Celery টাস্ক `blocks.tasks.sweep_conflicts.delay(block_id)` কিউতে পুশ।
  5. ফর্মাল ভেরিফিকেশন Celery টাস্ক `ontology.tasks.run_reasoning_job.delay(block_id)` কিউতে পুশ।
  6. ব্রাউজার ফ্রন্টএন্ডে WebSocket ক্যাশ ইনভ্যালিডেশন ইভেন্ট ব্রডকাস্ট।
- **Output (HTTP 201 Created):** সম্পূর্ণ `BlockDetailDTO`।

---

### `FUNC-BLK-002`: List Filtered Block Schedule (Feature #3)
- **Controller Class:** `apps.blocks.views.BlockScheduleListView`
- **Permissions:** `IsAuthenticated`
- **Query Parameters:** `?corridor=HWH-BWN&status=SANCTIONED&date=2026-09-19&dept=CIVIL_ENGG`
- **Processing Logic:** B-tree কম্পোজিট ইনডেক্স ও PostGIS বাউন্ডিং বক্স ফিল্টারিং ব্যবহার করে দ্রুত ব্লকের সময়সূচি ও স্ট্যাটাস তালিকা রিটার্ন।
- **Output (HTTP 200):** স্ট্যান্ডার্ড পেজিনেটেড ব্লক লিস্ট এনভেলপ।

---

### `FUNC-BLK-003`: Retrieve Block Detail & Conflict Map (Feature #13)
- **Controller Class:** `apps.blocks.views.BlockDetailView`
- **Permissions:** `IsAuthenticated`
- **Processing Logic:**
  1. `blocks_blockproposal` রেকর্ড ফেচ।
  2. সম্পর্কিত সকল ট্রেনের সংঘাত (`blocks_blockconflict`), ডিপার্টমেন্টাল ওয়ার্ক অর্ডার এবং ওএইচই রিকোয়ারমেন্টের ফুল অডিট ট্রেইল একত্রিত করে রিটার্ন।
- **Output (HTTP 200):** `BlockFullAuditDTO`।

---

### `FUNC-BLK-004`: Execute Spatial-Temporal Conflict Sweep (Feature #31)
- **Task Signature:** `apps.blocks.tasks.sweep_conflicts(block_id: str) -> dict`
- **Execution Worker:** Celery Worker on Queue `high`
- **Processing Logic:**
  1. ব্লক রেকর্ড ও PostGIS জ্যামিতি ডেটাবেস থেকে লোড।
  2. **ট্রেনের টাইমটেবিল সংঘাত কোয়ারি (PostGIS + Timetable Master #114):**
     ```sql
     SELECT ts.id, ts.train_id, ts.scheduled_arrival_time, ts.scheduled_departure_time, t.train_number, t.train_type
     FROM trains_trainschedule ts
     JOIN trains_train t ON ts.train_id = t.id
     WHERE ts.km_milestone BETWEEN :start_km AND :end_km
       AND ts.scheduled_departure_time >= :scheduled_start_time
       AND ts.scheduled_arrival_time <= :scheduled_end_time;
     ```
  3. **সমান্তরাল বা পূর্বনির্ধারিত অন্য ব্লকের সংঘাত কোয়ারি:**
     ```sql
     SELECT id, block_code, department_code, work_type
     FROM blocks_blockproposal
     WHERE corridor_code = :corridor_code
       AND track_line_type = :track_line_type
       AND id != :block_id
       AND status IN ('PENDING_APPROVAL', 'COORDINATED', 'SANCTIONED', 'ACTIVE')
       AND scheduled_start_time < :scheduled_end_time
       AND scheduled_end_time > :scheduled_start_time
       AND ST_Intersects(spatial_extent, :block_geom);
     ```
  4. প্রতিটি কনফ্লিক্টের জন্য `PriorityScorer.score_train(train_type)` বনাম `PriorityScorer.score_block(block)` মূল্যায়ন।
  5. সকল চিহ্নিত সংঘাত `blocks_blockconflict` টেবিলে ইনসার্ট/আপডেট এবং Redis ইভেন্ট `blocks.conflict.detected` এমিট।

---

### `FUNC-BLK-005`: AI Conflict Resolution Engine (Feature #32)
- **Controller Class:** `apps.blocks.views.BlockConflictResolveView`
- **Permissions:** `IsAuthenticated`, `IsSectionControllerOrHigher`
- **Processing Logic (`ResolutionEngine`):**
  1. সংঘাতের ধরন বিশ্লেষণ: ট্রেন ট্রাফিক সংঘাত বনাম ইন্টার-ডিপার্টমেন্টাল ব্লক সংঘাত।
  2. ইন্টার-ডিপার্টমেন্টাল ওভারল্যাপ হলে `CoPossessionStrategy` প্রয়োগ করে শেডো ব্লকে রূপান্তর (`Feature #98`)।
  3. ট্রেন কনফ্লিক্ট হলে ট্রেনের প্রায়োরিটি চেক:
     - মালগাড়ির সাথে কনফ্লিক্ট হলে মালগাড়ির জন্য রাতের ডেডিকেটেড স্লট রিস্কেজিউলিং প্রস্তাব (`Feature #28`)।
     - প্রিমিয়াম যাত্রীবাহী ট্রেন (রাজধানী/বন্দে ভারত) হলে ব্লকের সময় পরিবর্তন বা স্প্লিট উইন্ডো কৌশল (`Feature #6`) প্রস্তাব।
  4. রেজোলিউশন প্ল্যান ও আত্মবিশ্বাস স্কোরসহ রিকমেন্ডেশন রিটার্ন।
- **Output (HTTP 200):** `ResolutionResultDTO`।

---

### `FUNC-BLK-006`: Expert System Priority Scoring (Feature #34, #94)
- **Controller Class:** `apps.blocks.views.BlockPriorityScoreView`
- **Processing Logic (`PriorityScorer`):**
  1. পিওর পাইথন অ্যালগরিদম যা ৬টি প্যারামিটারের ওজনযুক্ত যোগফল নির্ণয় করে:
     $$\text{Score} = w_1 \cdot \text{CoF} \times \text{LoF} + w_2 \cdot \text{Aging} + w_3 \cdot \text{CorridorCriticality} + w_4 \cdot \text{BundlingBonus} - w_5 \cdot \text{PaxImpact}$$
  2. বিচারক বা কন্ট্রোলারের জন্য স্বচ্ছ ব্যাখ্যাকর্ড তৈরি করে: **"Why #1? Explanation Card" (`Feature #94`)**।
- **Output (HTTP 200):** `PriorityScoreResponseDTO` যাতে থাকে স্কোর (০-১০০) এবং স্কোরিং কারণের ব্রেকডাউন।

---

### `FUNC-BLK-007`: Combined Block Window Bundling (Feature #98 - Platform USP)
- **Controller Class:** `apps.blocks.views.CombineBlockWindowsView`
- **Permissions:** `IsChiefController`
- **Input Schema:** `{"primary_block_id": "uuid", "shadow_block_ids": ["uuid1", "uuid2"]}`
- **Processing Logic:**
  1. একই ট্র্যাক সেকশন ও সময়ে সিভিল ইঞ্জিনিয়ারিং, সিগন্যালিং এবং টিআরডি কাজের ভৌগোলিক সহ-অবস্থান নিশ্চিতকরণ।
  2. প্রাইমারি ব্লকের অধীনে শ্যাডো ব্লক যুক্ত করে ট্রানজ্যাকশন সম্পন্ন করা।
  3. সময় ও করিডোর ট্রাফিক সাশ্রয় হিসাব করা এবং `analytics_corridor_daily_kpi`-তে `hours_saved_by_bundling` আপডেট।
- **Output (HTTP 200):** `CombinedBlockResultDTO`।

---

### `FUNC-BLK-008`: Sanction Block Possession (Feature #11)
- **Controller Class:** `apps.blocks.views.BlockSanctionView`
- **Permissions:** `IsAuthenticated`, `IsChiefController`
- **Validation Rules:** ব্লকে কোনো অমীমাংসিত `CRITICAL` সংঘাত থাকা চলবে না (থাকলে এরর `BLK-003`, HTTP 409)।
- **Processing Logic:**
  1. অপটিমিস্টিক লকিং নিশ্চিতকরণ (`WHERE id = :id AND optimistic_version = :version`)।
  2. `status = 'SANCTIONED'`, `sanctioned_by_user_id = request.user.id` আপডেট।
  3. সেকশন কন্ট্রোলার ও গ্যাং লিডারের জন্য ডিজিটাল কশন অর্ডার ও টোকেন প্রি-জেনারেট করা।
  4. Redis পাবলিশ: `blocks.possession.sanctioned`।
- **Output (HTTP 200):** `BlockDetailDTO`।

---

### `FUNC-BLK-009`: Activate Track Possession with Digital Token (Feature #71)
- **Controller Class:** `apps.blocks.views.BlockActivateView`
- **Permissions:** `IsSectionController`, `IsGangLeader`
- **Validation Rules:**
  - ক্রু হেডকাউন্ট নিশ্চিত থাকতে হবে (`Feature #72`)।
  - ওএইচই লাইনের কাজ থাকলে টিআরডি পাওয়ার আইসোলেশন সাইন-অফ থাকতে হবে (`Feature #73`)।
- **Processing Logic:**
  1. ডিজিটাল টোকেন আদান-প্রদান নিশ্চিত করে `status = 'ACTIVE'` এবং `possession_start_time = CURRENT_TIMESTAMP`।
  2. ইন্টারলকিং সিস্টেমে সেকশন ব্লক ফ্ল্যাগ সেট করা।
- **Output (HTTP 200):** সক্রিয় ব্লকের স্থিতি ও লাইভ কাউন্টডাউন।

---

### `FUNC-BLK-010`: Clear & Complete Track Block (Feature #80)
- **Controller Class:** `apps.blocks.views.BlockCompleteView`
- **Permissions:** `IsGangLeader`, `IsJuniorEngineer` (ডুয়াল সাইন-অফ)
- **Validation Rules:**
  - টুল ও মেটেরিয়াল রিটার্ন কাউন্ট যাচাই (`Feature #81`)।
  - সাইটের জিও-ট্যাগযুক্ত কাজের সমাপ্তি ছবি আপলোড (`Feature #82`)।
- **Processing Logic:**
  1. ডুয়াল সাইন-অফ সম্পন্ন হলে ডিজিটাল টোকেন রিলিজ ও `status = 'COMPLETED'`।
  2. এআই অ্যানালিটিক্স ইঞ্জিনে (`SVC-ANL`) ইভেন্ট প্রেরণ: `blocks.possession.completed`।
- **Output (HTTP 200):** সেকশন ক্লিয়ারেন্স কনফার্মেশন।

---

### `FUNC-BLK-011`: Split Block Window Engine (Feature #6)
- **Controller Class:** `apps.blocks.views.BlockSplitView`
- **Permissions:** `IsSectionControllerOrHigher`
- **Processing Logic:**
  1. একটি দীর্ঘ ৪ ঘণ্টার মেইনটেন্যান্স ব্লকের মাঝে জরুরি ট্রেনের চলাচলের জন্য উইন্ডোকে দুটি নিরাপদ ভাগে ভাগ করে:
     - পর্ব ১: ০২:০০ থেকে ০৩:৩০ (৯০ মিনিট)
     - বাফার প্যাসেজ: ০৩:৩০ থেকে ০৩:৫০ (ট্রেন পাসিং)
     - পর্ব ২: ০৩:৫০ থেকে ০৫:০০ (৭০ মিনিট)
  2. উভয় খণ্ড ব্লকের জন্য পৃথক ডিজিটাল পারমিট ইস্যু।
- **Output (HTTP 200):** `SplitBlockResponseDTO`।

---

### `FUNC-BLK-012`: Weekly Mega Block Planner (Feature #102)
- **Controller Class:** `apps.blocks.views.MegaBlockPlanView`
- **Permissions:** `IsChiefControllerOrDRM`
- **Processing Logic:**
  1. রবিবার বা ছুটির দিনের দীর্ঘ (৬-৮ ঘণ্টার) করিডোর মেগা ব্লকের জন্য তিনটি ডিপার্টমেন্টের মেগা কাজের সমন্বয় শিডিউল।
  2. প্যাসেঞ্জার ট্রেনের দীর্ঘ রুট ডাইভারশন ও বিকল্প বাস/ট্রেন সংযোগ নোটিশ তৈরি।
- **Output (HTTP 200):** `MegaBlockPlanResponseDTO`।

---

## 3. Next File Dependency Note

> **পরবর্তী ফাইল:** [04-function-maps/03-departments-function-map.md](file:///c:/work%20pase/Railway-Project-for-SIH/docs/04-function-maps/03-departments-function-map.md)

`02-blocks-function-map.md` সফলভাবে সম্পূর্ণ হয়েছে। পরবর্তী ফাইল `03-departments-function-map.md`-এ **`SVC-DEPT` (`apps.departments`)**-এর ৮টি রিসোর্স শিডিউলিং, গ্যাং রাউটিং (#100), মেটেরিয়াল ডেলিভারি স্লট (#101) এবং টুলবক্স টক (#83) ফাংশনের কার্যপ্রণালী সংজ্ঞায়িত করা হবে।
