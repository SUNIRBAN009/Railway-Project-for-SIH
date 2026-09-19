# 00-function-id-registry.md

> **ফাইল ক্রম:** ২৫/৪৫  
> **পূর্ববর্তী ফাইল:** [03-service-blueprints/08-notifications.md](file:///c:/work%20pase/Railway-Project-for-SIH/docs/03-service-blueprints/08-notifications.md) (`SVC-NOTIF`: Critical Safety Broadcast, SOS Emergency & Multi-Channel Alert Service)  
> **পরবর্তী ফাইল:** [04-function-maps/01-accounts-function-map.md](file:///c:/work%20pase/Railway-Project-for-SIH/docs/04-function-maps/01-accounts-function-map.md) (`SVC-AUTH` Dedicated Function Map)  
> **সংযোগ ও উদ্দেশ্য:** এই ফাইলে ভারতীয় রেলওয়ের স্বয়ংক্রিয় এআই ব্লক প্ল্যানিং প্ল্যাটফর্মের (SIH PS26027) সকল ৮টি মাইক্রোসার্ভিসের পূর্ণাঙ্গ ক্যানোনিকাল ফাংশন আইডি রেজিস্ট্রি সংজ্ঞায়িত করা হয়েছে। প্রতিটি সিঙ্ক্রোনাস REST কন্ট্রোলার, অ্যাসিনক্রোনাস Celery টাস্ক, এবং WebSocket ডিসপ্যাচারকে একটি অপরিবর্তনীয় গ্লোবাল ফাংশন আইডি (`FUNC-[SERVICE]-[INDEX]`) প্রদান করা হয়েছে, যা মাস্টার প্ল্যান এক্সেল শিটের সকল ফিচারের সরাসরি বাস্তবায়ন নিশ্চিত করে।

---

# Enterprise Function ID Master Registry (SIH PS26027)

## 1. Registry Architecture & Global Naming Convention

প্ল্যাটফর্মের সকল অভ্যন্তরীণ ও বহিঃস্থ ইন্টারফেস, অডিট ট্রেইল, এবং পারফরম্যান্স টেলিমেট্রি এই একক প্রমিত ফর্ম্যাট অনুসরণ করবে:

$$\mathbf{FUNC\text{-}[SERVICE\_CODE]\text{-}[001\dots 999]}$$

| সার্ভিস কোড | বাউন্ডেড কনটেক্সট সার্ভিস | জ্যাঙ্গো অ্যাপ ডোমেন | ফাংশন রেঞ্জ | মূল অপারেশনাল পরিধি |
|---|---|---|:---:|---|
| **`AUTH`** | Identity, Access & RBAC | `apps.accounts` | 001 – 049 | ইউজার প্রমাণীকরণ, রিফ্রেশ টোকেন, আরব্যাক রোল ম্যাট্রিক্স |
| **`BLK`** | Block Planning & Conflict Engine | `apps.blocks` | 001 – 099 | পোস্টজিআইএস স্পেশিয়াল ডিটেকশন, প্রায়োরিটি স্কোরার, কম্বাইন্ড ব্লক (#98) |
| **`DEPT`** | Departmental Gangs & Resources | `apps.departments` | 001 – 049 | গ্যাং রাউটিং (#100), মেটেরিয়াল ডেলিভারি (#101), টুলবক্স টক (#83) |
| **`ONTO`** | Semantic Digital Twin Reasoner | `apps.ontology` | 001 – 049 | HermiT Tableau Reasoner, ইন্টারলকিং ও ২৫কেভি পাওয়ার কাট প্রুফ |
| **`TRN`** | Train Operations & Timetable Master | `apps.trains` | 001 – 049 | টাইমটেবিল মাস্টার (#114), ডেভিয়েশন (#116), ডিলে ক্যাসকেড (#115) |
| **`AST`** | Infrastructure Asset Health | `apps.assets` | 001 – 049 | TMS/SMMS/TDMS ইনজেশন (#45-47), চেইনেজ (#87), CoF×LoF (#92) |
| **`ANL`** | Operations Analytics & Reporting | `apps.analytics` | 001 – 049 | অ্যাসেট প্রাপ্যতা স্কোর (#50), ভ্যারিয়েন্স বিশ্লেষণ (#109), স্যাংশন অর্ডার (#107) |
| **`NOTIF`** | Safety Alerts & Real-Time Fanout | `apps.notifications` | 001 – 049 | ট্রেন অ্যাপ্রোচ ওয়ার্নিং (#76), এসওএস সাইরেন (#79), লোন ওয়ার্কার (#78) |

---

## 2. Complete Cross-Service Master Function Index (66 Core Functions)

### 2.1 Identity, Access & Governance (`SVC-AUTH` / `apps.accounts`)
| Function ID | নাম ও কর্মপরিধি | মেথড / ট্রিগার | পাথ / কিউ | টার্গেট টেবিল (PostgreSQL 15) | পারমিশন / রোল |
|---|---|:---:|---|---|---|
| `FUNC-AUTH-001` | ইউজার লগইন ও আরএস২৫৬ টোকেন ইস্যু | `POST` | `/api/v1/auth/login/` | `accounts_user`, Redis | পাবলিক / Anonymous |
| `FUNC-AUTH-002` | রিফ্রেশ টোকেন রোটেশন | `POST` | `/api/v1/auth/refresh/` | Redis Whitelist | Authenticated |
| `FUNC-AUTH-003` | ইউজারের অথেনটিকেশন কনটেক্সট ফেচ | `GET` | `/api/v1/auth/me/` | `accounts_user` | Authenticated |
| `FUNC-AUTH-004` | সেশন সমাপ্তিকরণ ও লগআউট | `POST` | `/api/v1/auth/logout/` | Redis Blacklist | Authenticated |
| `FUNC-AUTH-005` | প্রশাসনিক নতুন ইউজার রেজিস্ট্রেশন | `POST` | `/api/v1/users/` | `accounts_user` | Admin / DRM |
| `FUNC-AUTH-006` | ডিপার্টমেন্টাল ইউজার তালিকা | `GET` | `/api/v1/users/` | `accounts_user` | Section Controller+ |
| `FUNC-AUTH-007` | ইউজারের প্রোফাইল ও প্রেফারেন্স আপডেট | `PATCH` | `/api/v1/users/{id}/` | `accounts_user` | Self / Admin |
| `FUNC-AUTH-008` | আরব্যাক পারমিশন ম্যাট্রিক্স ভ্যালিডেশন | `POST` | `/api/v1/auth/check-permission/` | `accounts_role_permission` | Internal / Middleware |

---

### 2.2 Core Block Planning & Optimization (`SVC-BLK` / `apps.blocks`)
| Function ID | নাম ও কর্মপরিধি | মেথড / ট্রিগার | পাথ / কিউ | টার্গেট টেবিল (PostgreSQL 15) | এক্সেল ফিচার রেফারেন্স |
|---|---|:---:|---|---|---|
| `FUNC-BLK-001` | নতুন মেইনটেন্যান্স ব্লকের আবেদন | `POST` | `/api/v1/blocks/proposals/` | `blocks_blockproposal` | Feature #2 |
| `FUNC-BLK-002` | ফিল্টার্ড ব্লক শিডিউল তালিকা ও টাইমলাইন | `GET` | `/api/v1/blocks/` | `blocks_blockproposal` | Feature #3 |
| `FUNC-BLK-003` | ব্লকের বিস্তারিত বিবরণ ও জিআইএস ম্যাপ | `GET` | `/api/v1/blocks/{id}/` | `blocks_blockproposal` | Feature #13 |
| `FUNC-BLK-004` | স্পেশিয়াল-টেম্পোরাল কনফ্লিক্ট সুইপ | Celery | `blocks.tasks.sweep_conflicts` | `blocks_blockconflict` | Feature #31 |
| `FUNC-BLK-005` | এআই কনফ্লিক্ট রেজোলিউশন ও রি-ফিট | `POST` | `/api/v1/blocks/{id}/resolve/` | `blocks_blockproposal` | Feature #32 |
| `FUNC-BLK-006` | এক্সপার্ট সিস্টেম প্রায়োরিটি স্কোরিং | `POST` | `/api/v1/blocks/calculate-priority/`| Algorithm (Pure) | Feature #34, #94 |
| `FUNC-BLK-007` | ইন্টার-ডিপার্টমেন্টাল কম্বাইন্ড উইন্ডো বান্ডলিং| `POST` | `/api/v1/blocks/combine-windows/` | `blocks_blockproposal` | Feature #98 (USP) |
| `FUNC-BLK-008` | ব্লকের আনুষ্ঠানিক স্যাংশন ও অনুমোদন | `POST` | `/api/v1/blocks/{id}/sanction/` | `blocks_blockproposal` | Feature #11 |
| `FUNC-BLK-009` | ট্র্যাকে ডিজিটাল টোকেনসহ ব্লক সক্রিয়করণ | `POST` | `/api/v1/blocks/{id}/activate/` | `blocks_blockpossession` | Feature #71 |
| `FUNC-BLK-010` | কাজ শেষে সেকশন ক্লিয়ারেন্স ও ব্লক ক্লোজ | `POST` | `/api/v1/blocks/{id}/complete/` | `blocks_blockpossession` | Feature #80 |
| `FUNC-BLK-011` | স্প্লিট ব্লক উইন্ডো ক্যালকুলেশন | `POST` | `/api/v1/blocks/{id}/split/` | `blocks_blockproposal` | Feature #6 |
| `FUNC-BLK-012` | সাপ্তাহিক মেগা ব্লক প্ল্যানার | `POST` | `/api/v1/blocks/mega-block-plan/` | `blocks_blockproposal` | Feature #102 |

---

### 2.3 Departmental Resources & Field Coordination (`SVC-DEPT` / `apps.departments`)
| Function ID | নাম ও কর্মপরিধি | মেথড / ট্রিগার | পাথ / কিউ | টার্গেট টেবিল (PostgreSQL 15) | এক্সেল ফিচার রেফারেন্স |
|---|---|:---:|---|---|---|
| `FUNC-DEPT-001` | গ্যাং রোস্টার তালিকা ও প্রাপ্যতা কোয়ারি | `GET` | `/api/v1/departments/gangs/` | `departments_gang` | Feature #37 |
| `FUNC-DEPT-002` | নতুন গ্যাং ও কর্মী প্রোফাইল তৈরি | `POST` | `/api/v1/departments/gangs/` | `departments_gang` | Operational Setup |
| `FUNC-DEPT-003` | ভারী যন্ত্রপাতি (TTM/BCM) প্রাপ্যতা | `GET` | `/api/v1/departments/equipment/` | `departments_equipment` | Resource Registry |
| `FUNC-DEPT-004` | ডিপার্টমেন্টাল ওয়ার্ক অর্ডার ইস্যু | `POST` | `/api/v1/departments/work-orders/` | `departments_workorder` | Work Delegation |
| `FUNC-DEPT-005` | সেকশন ক্লিয়ারেন্স ও টুল কাউন্ট সাইন-অফ | `PATCH`| `/api/v1/departments/work-orders/{id}/clearance/` | `departments_workorder` | Feature #80, #81 |
| `FUNC-DEPT-006` | গ্যাং হোম-বেস স্মার্ট রাউটিং ক্যালকুলেটর| `POST` | `/api/v1/departments/gangs/route-optimizer/` | Routing Engine | Feature #100 |
| `FUNC-DEPT-007` | মেটেরিয়াল ডেলিভারি ট্রেন স্লট বুকিং | `POST` | `/api/v1/departments/materials/book-slot/` | `departments_material` | Feature #101 |
| `FUNC-DEPT-008` | ডিজিটাল টুলবক্স টক (TBT) ও ব্রিফিং লগ | `POST` | `/api/v1/departments/safety/tbt-log/` | `departments_tbt_log` | Feature #83 |

---

### 2.4 Semantic Digital Twin & Formal Reasoning (`SVC-ONTO` / `apps.ontology`)
| Function ID | নাম ও কর্মপরিধি | মেথড / ট্রিগার | পাথ / কিউ | টার্গেট সিস্টেম | এক্সেল ফিচার রেফারেন্স |
|---|---|:---:|---|---|---|
| `FUNC-ONTO-001` | HermiT DL ইন্টারলকিং রিজনার ট্রিগার | `POST` | `/api/v1/ontology/reason/` | Celery `celery-ontology` | Formal Verification |
| `FUNC-ONTO-002` | রিজনার টাস্ক স্ট্যাটাস ও প্রুফ পোলিং | `GET` | `/api/v1/ontology/jobs/{job_id}/` | Redis Job Cache | Zero-Hallucination |
| `FUNC-ONTO-003` | ব্লক প্রস্তাবের জন্য সেম্যান্টিক ভায়োলেশন | `GET` | `/api/v1/ontology/violations/` | `ontology_semantic_violation` | Stranded Train Proof |
| `FUNC-ONTO-004` | রিয়েল-টাইম টুইন গ্রাফ টপোলজি সারাংশ | `GET` | `/api/v1/ontology/graph/summary/` | `railway_ontology.owl` | Digital Twin Master |
| `FUNC-ONTO-005` | কাস্টম SPARQL 1.1 স্পেশিয়াল গ্রাফ কোয়ারি | `POST` | `/api/v1/ontology/sparql/` | SQLite Quadstore | Graph Query |
| `FUNC-ONTO-006` | সিগন্যাল ওভারল্যাপ ও পাওয়ার কাট প্রুফ এক্সপ্লেনার | `POST` | `/api/v1/ontology/explain/` | Explanation Service | Formal Safety Audit |

---

### 2.5 Train Operations & Timetable Engine (`SVC-TRN` / `apps.trains`)
| Function ID | নাম ও কর্মপরিধি | মেথড / ট্রিগার | পাথ / কিউ | টার্গেট টেবিল (PostgreSQL 15) | এক্সেল ফিচার রেফারেন্স |
|---|---|:---:|---|---|---|
| `FUNC-TRN-001` | ট্রেনের মাস্টার ক্যাটালগ ও ফিল্টারিং | `GET` | `/api/v1/trains/` | `trains_train` | Feature #24 |
| `FUNC-TRN-002` | প্রকাশিত মাস্টার টাইমটেবিল স্টপ ও কিমি | `GET` | `/api/v1/trains/{number}/schedule/`| `trains_trainschedule` | Feature #114 |
| `FUNC-TRN-003` | লাইভ রানিং অবস্থান ও পোস্টজিআইএস GeoJSON| `GET` | `/api/v1/trains/live/` | `trains_livelocation` | Feature #48 |
| `FUNC-TRN-004` | শিডিউল বিচ্যুতি শনাক্তকরণ (NTES বনাম TT) | `POST` | `/api/v1/trains/deviation-detect/` | Deviation Engine | Feature #116 |
| `FUNC-TRN-005` | ডিলে ক্যাসকেড রিক্যালকুলেশন ও উইন্ডো রি-ফিট| `POST` | `/api/v1/trains/delay-cascade-recalculate/`| `trains_delay_cascade_event`| Feature #115 |
| `FUNC-TRN-006` | ব্লকের কারণে প্যাসেঞ্জার ইমপ্যাক্ট ক্যালকুলেশন | `POST` | `/api/v1/trains/passenger-impact/` | Algorithm (Pure) | Feature #27 |
| `FUNC-TRN-007` | মালগাড়ির পূর্বাভাস ম্যানুয়াল এন্ট্রি | `POST` | `/api/v1/trains/goods-forecast/` | `trains_goods_forecast` | Feature #91, #28 |
| `FUNC-TRN-008` | NTES এপিআই সিঙ্ক ও লোকাল সিমুলেশন | `POST` | `/api/v1/trains/ingest-ntes/` | `trains_livelocation` | Feature #48 |
| `FUNC-TRN-009` | COA ডিভিশনাল লাইভ ফিড ইনজেশন | `POST` | `/api/v1/trains/ingest-coa/` | `trains_livelocation` | Feature #42 |

---

### 2.6 Infrastructure Asset Health (`SVC-AST` / `apps.assets`)
| Function ID | নাম ও কর্মপরিধি | মেথড / ট্রিগার | পাথ / কিউ | টার্গেট টেবিল (PostgreSQL 15) | এক্সেল ফিচার রেফারেন্স |
|---|---|:---:|---|---|---|
| `FUNC-AST-001` | ইউনিফাইড অ্যাসেট ইনভেন্টরি ও চেইনেজ ফিল্টার| `GET` | `/api/v1/assets/` | `assets_trackasset` | Feature #86 |
| `FUNC-AST-002` | নির্দিষ্ট অ্যাসেটের পূর্ণ বিবরণ ও ত্রুটি ইতিহাস | `GET` | `/api/v1/assets/{tag}/` | `assets_trackasset` | Master Registry |
| `FUNC-AST-003` | ক্রস-সিস্টেম ডিফেক্ট লগ তৈরি ও এজিং স্কোর | `POST` | `/api/v1/assets/defects/` | `assets_defect_log` | Feature #45-47, #93 |
| `FUNC-AST-004` | ফাইল-বেসড সিএসভি/এক্সএমএল ডাম্প ইনজেশন | `POST` | `/api/v1/assets/defects/import-file/`| `assets_file_import_audit` | Feature #88 |
| `FUNC-AST-005` | চেইনেজ নরমালাইজেশন (KM 45/2 -> 45.200) | `POST` | `/api/v1/assets/normalize-chainage/` | Normalization Engine | Feature #87 |
| `FUNC-AST-006` | ডুপ্লিকেট ডিফেক্ট শনাক্তকরণ ও মার্জিং | `POST` | `/api/v1/assets/defects/merge/` | `assets_defect_log` | Feature #90 |
| `FUNC-AST-007` | চার সোর্সের ডেটা ফ্রেশনেস মনিটর | `GET` | `/api/v1/assets/freshness-status/` | `assets_sync_status` | Feature #89 |
| `FUNC-AST-008` | CoF × LoF রিস্ক ম্যাট্রিক্স ও প্রায়োরিটি | `GET` | `/api/v1/assets/risk-matrix/` | Algorithm (Pure) | Feature #92 |
| `FUNC-AST-009` | প্রেডিক্টিভ ব্রেকডাউন পূর্বাভাস ও ব্লক রিকমেন্ড| `GET` | `/api/v1/assets/predictive-maintenance/`| `assets_predictive_schedule`| Feature #33, #36 |

---

### 2.7 Operations Analytics & Reporting (`SVC-ANL` / `apps.analytics`)
| Function ID | নাম ও কর্মপরিধি | মেথড / ট্রিগার | পাথ / কিউ | টার্গেট টেবিল (PostgreSQL 15) | এক্সেল ফিচার রেফারেন্স |
|---|---|:---:|---|---|---|
| `FUNC-ANL-001` | অ্যাসেট প্রাপ্যতা স্কোর (% Availability) | `GET` | `/api/v1/analytics/availability-score/` | `analytics_corridor_daily_kpi`| Feature #50 (Primary KPI) |
| `FUNC-ANL-002` | ব্লক সময় ব্যবহারের দক্ষতা ড্যাশবোর্ড | `GET` | `/api/v1/analytics/utilization-dashboard/`| `analytics_block_efficiency` | Feature #49 |
| `FUNC-ANL-003` | প্ল্যান ভ্যারিয়েন্স স্বয়ংক্রিয় রুট-কজ বিশ্লেষণ | `GET` | `/api/v1/analytics/variance-analysis/` | `analytics_variance_summary` | Feature #109 |
| `FUNC-ANL-004` | অটোমেটেড দৈনিক সারাংশ পিডিএফ রিপোর্ট | `POST` | `/api/v1/analytics/reports/daily/` | ReportLab / WeasyPrint | Feature #53 |
| `FUNC-ANL-005` | অফিশিয়াল স্যাংশন অর্ডার পিডিএফ জেনারেটর | `POST` | `/api/v1/analytics/reports/sanction-order/`| `analytics_sanction_order` | Feature #107 |
| `FUNC-ANL-006` | অপরিবর্তনীয় অডিট ট্রেইল ও রেগুলেটরি লগ | `GET` | `/api/v1/analytics/audit-trail/` | `analytics_audit_trail` | Feature #67 |
| `FUNC-ANL-007` | হোয়াট-ইফ সিনারিও স্যান্ডবক্স সিমুলেটর | `POST` | `/api/v1/analytics/simulator/what-if/` | Simulator Engine | Feature #62 |

---

### 2.8 Safety Broadcast & Real-Time Alerts (`SVC-NOTIF` / `apps.notifications`)
| Function ID | নাম ও কর্মপরিধি | মেথড / ট্রিগার | পাথ / কিউ | টার্গেট টেবিল (PostgreSQL 15) | এক্সেল ফিচার রেফারেন্স |
|---|---|:---:|---|---|---|
| `FUNC-NOTIF-001`| ইউজারের অপঠিত নোটিফিকেশন তালিকা | `GET` | `/api/v1/notifications/` | `notifications_notification` | Feature #40 |
| `FUNC-NOTIF-002`| নোটিফিকেশন পড়া সম্পন্ন হিসেবে মার্ক | `PATCH`| `/api/v1/notifications/{id}/read/` | `notifications_notification` | Multi-Channel Hub |
| `FUNC-NOTIF-003`| ১-ট্যাপ জিপিএস এসওএস জরুরি অ্যালার্ম জারি | `POST` | `/api/v1/notifications/sos/trigger/` | `notifications_sos_event` | Feature #79 (Life Safety) |
| `FUNC-NOTIF-004`| কন্ট্রোল রুম সাইরেন একনলেজ ও সিগন্যাল হোল্ড | `POST` | `/api/v1/notifications/sos/ack/` | `notifications_sos_event` | Control Room Siren |
| `FUNC-NOTIF-005`| ট্রেন অ্যাপ্রোচ ওয়ার্নিং সাইরেন পুশ | `POST` | `/api/v1/notifications/train-approach/` | WebSocket / SMS | Feature #76 (Life-Saving) |
| `FUNC-NOTIF-006`| লোন ওয়ার্কার ৩০-মিনিট ডেড-ম্যান চেক-ইন | `POST` | `/api/v1/notifications/lone-worker/ping/`| `notifications_lone_worker_tracker`| Feature #78 |
| `FUNC-NOTIF-007`| ইন্টার-ডিপার্টমেন্টাল চ্যাট হিস্ট্রি | `GET` | `/api/v1/notifications/chat/{block_id}/` | `notifications_department_message`| Feature #43 |
| `FUNC-NOTIF-008`| চ্যাটরুমে বার্তা প্রেরণ ও অ্যাকশন আইটেম ট্যাগ | `POST` | `/api/v1/notifications/chat/{block_id}/` | `notifications_department_message`| Real-Time Team Collab |

---

## 3. Next File Dependency Note

> **পরবর্তী ফাইল:** [04-function-maps/01-accounts-function-map.md](file:///c:/work%20pase/Railway-Project-for-SIH/docs/04-function-maps/01-accounts-function-map.md)

`00-function-id-registry.md` সফলভাবে এবং নিখুঁতভাবে সম্পূর্ণ হয়েছে। প্ল্যাটফর্মের ৬৬টি এন্ড-টু-এন্ড ফাংশনের গ্লোবাল ম্যাপিং প্রতিষ্ঠিত হলো। পরবর্তী ফাইল `01-accounts-function-map.md`-এ **`SVC-AUTH` (`apps.accounts`)**-এর আটটি ফাংশনের ইনপুট DTO, আউটপুট DTO, ডেটাবেস ট্রানজ্যাকশন ও এরর কোডের বিস্তারিত ম্যাপিং প্রদান করা হবে।
