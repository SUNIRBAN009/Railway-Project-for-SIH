# 03-departments-function-map.md

> **ফাইল ক্রম:** ২৮/৪৫  
> **সার্ভিস আইডি:** `SVC-DEPT` (`apps.departments`)  
> **পূর্ববর্তী ফাইল:** [04-function-maps/02-blocks-function-map.md](file:///c:/work%20pase/Railway-Project-for-SIH/docs/04-function-maps/02-blocks-function-map.md) (`SVC-BLK` Dedicated Function Map)  
> **পরবর্তী ফাইল:** [04-function-maps/04-ontology-function-map.md](file:///c:/work%20pase/Railway-Project-for-SIH/docs/04-function-maps/04-ontology-function-map.md) (`SVC-ONTO` Dedicated Function Map)  
> **সংযোগ ও উদ্দেশ্য:** এই ফাইলে রেলওয়ের তিন প্রধান রক্ষণাবেক্ষণ ডিপার্টমেন্টের (ইঞ্জিনিয়ারিং, এসঅ্যান্ডটি ও টিআরডি) ফিল্ড রিসোর্স ও ক্রু কোঅর্ডিনেশন সার্ভিস **`SVC-DEPT` (Departmental Resources & Field Coordination Service)**-এর আটটি ক্যানোনিকাল ফাংশনের ইনপুট/আউটপুট স্কিমা, গ্যাং হোম-বেস রাউটিং (#100), মেটেরিয়াল ডেলিভারি স্লট (#101), ডিজিটাল টুলবক্স টক (#83), এবং ডুয়াল সেফটি সাইন-অফের বিশদ বিবরণ প্রদান করা হয়েছে।

---

## 1. Function Catalog (8 Core Functions)

| Function ID | Function Name | HTTP Method | Path / Trigger | Input DTO | Output DTO | Target SLA |
|---|---|:---:|---|---|---|:---:|
| `FUNC-DEPT-001` | Query Gang Rosters & Availability | `GET` | `/api/v1/departments/gangs/` | Query Parameters | `PaginatedGangsResponseDTO` | p95 < 55ms |
| `FUNC-DEPT-002` | Register Maintenance Gang Unit | `POST` | `/api/v1/departments/gangs/` | `GangCreateRequestDTO` | `GangDetailDTO` | p95 < 75ms |
| `FUNC-DEPT-003` | Heavy Equipment Fleet Readiness | `GET` | `/api/v1/departments/equipment/` | Query Parameters | `PaginatedEquipmentDTO` | p95 < 45ms |
| `FUNC-DEPT-004` | Issue Departmental Work Order | `POST` | `/api/v1/departments/work-orders/` | `WorkOrderCreateRequestDTO` | `WorkOrderDetailDTO` | p95 < 85ms |
| `FUNC-DEPT-005` | Track Safety Clearance Sign-off | `PATCH` | `/api/v1/departments/work-orders/{id}/clearance/`| `SafetyClearanceRequestDTO` | `WorkOrderDetailDTO` | p95 < 60ms |
| `FUNC-DEPT-006` | Gang Home-Base Smart Routing | `POST` | `/api/v1/departments/gangs/route-optimizer/` | `GangRouteRequestDTO` | `GangRouteResponseDTO` | p95 < 95ms |
| `FUNC-DEPT-007` | Material Delivery Train Slot Booking | `POST` | `/api/v1/departments/materials/book-slot/` | `MaterialSlotBookingDTO` | `MaterialSlotResultDTO` | p95 < 80ms |
| `FUNC-DEPT-008` | Digital Toolbox Talk (TBT) Briefing | `POST` | `/api/v1/departments/safety/tbt-log/` | `TBTBriefingLogDTO` | `TBTLogDetailDTO` | p95 < 50ms |

---

## 2. Detailed Function Implementation Specifications

### `FUNC-DEPT-001`: Query Gang Rosters & Availability (Feature #37)
- **Controller Class:** `apps.departments.views.GangListView`
- **Permissions:** `IsAuthenticated`
- **Query Parameters:** `?department=CIVIL_ENGG&station=BWN&available_on=2026-09-19T02:00:00Z`
- **Processing Logic:**
  1. `departments_gang` টেবিল থেকে সক্রিয় গ্যাংদের তালিকা ফিল্টার।
  2. সাব-কুয়েরির মাধ্যমে পরীক্ষা করা যে নির্বাচিত সময় উইন্ডোতে গ্যাংটির কোনো অ্যাক্টিভ ওয়ার্ক অর্ডার আছে কিনা।
  3. গ্যাংয়ের হোম স্টেশন এবং সেকশন চেইনেজ রেঞ্জসহ প্রাপ্যতা স্ট্যাটাস রিটার্ন।
- **Output (HTTP 200):** `PaginatedGangsResponseDTO`।

---

### `FUNC-DEPT-002`: Register Maintenance Gang Unit
- **Controller Class:** `apps.departments.views.GangCreateView`
- **Permissions:** `IsAuthenticated`, `IsSeniorSectionEngineer`
- **Input Schema (`GangCreateRequestDTO`):**
```json
{
  "gang_code": "GANG-HWH-ENG-04",
  "department_code": "CIVIL_ENGG",
  "home_base_station": "BDC",
  "gang_leader_name": "Ramesh Kumar",
  "leader_phone": "+91-9876543210",
  "authorized_crew_headcount": 12,
  "skills_specialization": ["USFD_RECTIFICATION", "HEAVY_TAMPING", "WELD_REPAIR"],
  "assigned_section_start_km": 20.000,
  "assigned_section_end_km": 50.000
}
```
- **Validation Rules:**
  - `gang_code` অনন্য হতে হবে।
  - `authorized_crew_headcount` সর্বনিম্ন ৪ এবং সর্বোচ্চ ৩০।
- **Processing Logic:**
  1. PostgreSQL ট্রানজ্যাকশনে `departments_gang` টেবিলে রো ইনসার্ট।
  2. গ্যাং লিডারের মোবাইল নম্বরে প্রাথমিক কনফার্মেশন এসএমএস ট্রিগার (`SVC-NOTIF`)।
- **Output (HTTP 201 Created):** সম্পূর্ণ `GangDetailDTO`।

---

### `FUNC-DEPT-003`: Heavy Equipment Fleet Readiness
- **Controller Class:** `apps.departments.views.EquipmentListView`
- **Permissions:** `IsAuthenticated`
- **Query Parameters:** `?category=TRACK_MACHINE&corridor=HWH-BWN&status=AVAILABLE`
- **Processing Logic:**
  1. ট্র্যাক ট্যাম্পার (CSM/DUOMATIC), ব্যালাস্ট ক্লিনার (BCM), এবং ওএইচই টাওয়ার ওয়াগনের অপারেশনাল স্ট্যাটাস ও ফিটনেস সার্টিফিকেট এক্সপায়ারি ডেট যাচাই।
  2. `operational_status = 'AVAILABLE'` এবং `fitness_expiry_date >= CURRENT_DATE` শর্ত পূরণকারী মেশিন তালিকাভুক্ত করা।
- **Output (HTTP 200):** `PaginatedEquipmentDTO`।

---

### `FUNC-DEPT-004`: Issue Departmental Work Order
- **Controller Class:** `apps.departments.views.WorkOrderCreateView`
- **Permissions:** `IsAuthenticated`, `IsJuniorEngineerOrHigher`
- **Input Schema (`WorkOrderCreateRequestDTO`):**
```json
{
  "block_id": "a9102847-02bb-481a-9911-c01928374612",
  "gang_id": "c80918fa-01aa-472b-a19f-b9816e26027a",
  "equipment_id": "d7102948-03cc-492b-aa22-d02938475823",
  "planned_work_scope": "Continuous tamping of PSC sleeper track from KM 45.200 to KM 47.500 using CSM 09-32 Tamper.",
  "target_metric_units": 2300.00,
  "unit_of_measure": "METERS_TRACK_TAMPED"
}
```
- **Validation Rules:**
  - `block_id` অবশ্যই `SANCTIONED` ব্লকের হতে হবে।
  - গ্যাং লিডারের হেডকাউন্ট ও প্রয়োজনীয় টুলের প্রাপ্যতা থাকতে হবে।
- **Processing Logic:**
  1. Redis ডিস্ট্রিবিউটেড লক দ্বারা গ্যাং ও ইকুইপমেন্ট কনকারেন্টলি বুকিং (`lock:resource:gang:{id}`).
  2. অটো-জেনারেটেড অর্ডার কোড: `WO-YYYYMMDD-[DEPT]-[SEQ]`।
  3. `departments_workorder` টেবিলে `status = 'ISSUED'` হিসেবে সেভ।
  4. ইভেন্ট `departments.work_order.created` পাবলিশ।
- **Output (HTTP 201 Created):** `WorkOrderDetailDTO`।

---

### `FUNC-DEPT-005`: Track Safety Clearance Sign-off (Feature #80)
- **Controller Class:** `apps.departments.views.WorkOrderSafetyClearanceView`
- **Permissions:** `IsAuthenticated`, `IsSiteSupervisor` (`GANG_LEADER` / `JE`)
- **Input Schema (`SafetyClearanceRequestDTO`):**
```json
{
  "safety_certified": true,
  "actual_metric_units": 2250.00,
  "ballast_profile_verified": true,
  "track_gauge_checked": true,
  "tools_retrieved_count": 18,
  "tools_taken_count": 18,
  "completion_photo_url": "https://storage.railnet.gov.in/proofs/2026/09/proof_bwn_45km.jpg",
  "remarks": "Track packed and aligned. Safe for normal line speed 110 km/h."
}
```
- **Validation Rules:**
  - `tools_retrieved_count == tools_taken_count` হতে হবে (`Feature #81: Tool Return Count`)। কোনো টুল মিসিং থাকলে লাইন ক্লিয়ারেন্স ব্লক হবে।
  - সমাপ্তি ছবি আপলোড বাধ্যতামূলক (`Feature #82`)।
- **Processing Logic:**
  1. `work_orders.status = 'SAFETY_CLEARANCE_SIGNED'`, `safety_clearance_timestamp = CURRENT_TIMESTAMP`।
  2. ইকুইপমেন্ট রিলিজ ও স্ট্যাটাস `AVAILABLE` আপডেট।
  3. যদি প্যারেন্ট ব্লকের সাথে যুক্ত সকল ডিপার্টমেন্টাল ওয়ার্ক অর্ডারের সাইন-অফ সম্পন্ন হয়, তবে `departments.all_work_orders_cleared` ইভেন্ট ট্রিগার করা যা `SVC-BLK`-কে টোকেন রিলিজের অনুমতি দেয়।
- **Output (HTTP 200):** আপডেটেড `WorkOrderDetailDTO`।

---

### `FUNC-DEPT-006`: Gang Home-Base Smart Routing Engine (Feature #100)
- **Controller Class:** `apps.departments.views.GangRouteOptimizerView`
- **Permissions:** `IsSectionControllerOrHigher`
- **Input Schema (`GangRouteRequestDTO`):**
```json
{
  "work_location_km": 46.500,
  "corridor_code": "HWH-BWN",
  "required_crew_count": 10,
  "scheduled_start_time": "2026-09-19T02:00:00Z"
}
```
- **Processing Logic (`GangHomeBaseRouting`):**
  1. করিডোরের নিকটবর্তী স্টেশনগুলোতে অবস্থানরত হোম-বেস গ্যাংদের দূরত্ব ও ভ্রমণ সময় হিসাব:
     $$\text{Transit Time (min)} = \frac{|\text{Work KM} - \text{Base KM}|}{\text{Trolley Speed (25 km/h)}} \times 60 + \text{Mobilization Buffer (20m)}$$
  2. সর্বনিম্ন যাতায়াত সময় এবং পর্যাপ্ত কর্মীবিশিষ্ট গ্যাংকে স্বয়ংক্রিয়ভাবে রিকমেন্ড করা, যাতে গ্যাং ক্লান্তি না হয়।
- **Output (HTTP 200):** `GangRouteResponseDTO` রিকমেন্ডেড গ্যাং কোড এবং ট্রাভেল টাইম ব্রেকডাউনসহ।

---

### `FUNC-DEPT-007`: Material Delivery Train Slot Booking (Feature #101)
- **Controller Class:** `apps.departments.views.MaterialSlotBookingView`
- **Permissions:** `IsSeniorSectionEngineer`
- **Input Schema (`MaterialSlotBookingDTO`):**
```json
{
  "material_type": "BALLAST_HOPPER_RAKE",
  "quantity_metric_tons": 1200.0,
  "origin_depot": "BWN_YARD",
  "unloading_target_km_start": 44.000,
  "unloading_target_km_end": 46.000,
  "required_on_site_time": "2026-09-19T01:30:00Z"
}
```
- **Processing Logic:**
  1. মেটেরিয়াল রেইকের জন্য উপযুক্ত পাথ ও আনলোডিং উইন্ডো যাচাই।
  2. `SVC-TRN`-এর টাইমটেবিল মাস্টারের সাথে সমন্বয় করে ফ্রেইট স্লট কনফার্মেশন।
  3. `departments_material_delivery` টেবিলে বুকিং সেভ ও ট্র্যাকিং আইডি প্রদান।
- **Output (HTTP 201 Created):** `MaterialSlotResultDTO`।

---

### `FUNC-DEPT-008`: Digital Toolbox Talk (TBT) & Briefing Log (Feature #83)
- **Controller Class:** `apps.departments.views.TBTBriefingLogView`
- **Permissions:** `IsGangLeader`, `IsJuniorEngineer`
- **Input Schema (`TBTBriefingLogDTO`):**
```json
{
  "work_order_id": "b8102938-03bb-491a-9922-d01928374920",
  "briefing_conductor_name": "Ramesh Kumar (Gang Leader)",
  "safety_topics_covered": ["OHE_25KV_ELECTROCUTION_RISK", "LOOKOUT_MAN_PLACEMENT", "HEAVY_TOOL_HANDLING"],
  "attendee_count": 12,
  "briefing_timestamp": "2026-09-19T01:45:00Z",
  "digital_signature_hash": "a8fbc7190...26027"
}
```
- **Processing Logic:**
  1. কাজ শুরু করার ১৫ মিনিট পূর্বে সাইটে অনুষ্ঠিত সেফটি ব্রিফিং রেকর্ড `departments_tbt_log` টেবিলে সংরক্ষণ।
  2. টিবিটি সম্পন্ন না হলে সাইটে ডিজিটাল টোকেন অ্যাক্টিভেশন (`Feature #71`) ব্লক রাখা।
- **Output (HTTP 201 Created):** `TBTLogDetailDTO`।

---

## 3. Next File Dependency Note

> **পরবর্তী ফাইল:** [04-function-maps/04-ontology-function-map.md](file:///c:/work%20pase/Railway-Project-for-SIH/docs/04-function-maps/04-ontology-function-map.md)

`03-departments-function-map.md` সফলভাবে সম্পূর্ণ হয়েছে। পরবর্তী ফাইল `04-ontology-function-map.md`-এ **`SVC-ONTO` (`apps.ontology`)**-এর ৬টি HermiT রিজনার, সেম্যান্টিক ভায়োলেশন কোয়ারি, SPARQL 1.1, এবং ইন্টারলকিং প্রুফ ফাংশনের নিখুঁত ম্যাপিং সংজ্ঞায়িত করা হবে।
