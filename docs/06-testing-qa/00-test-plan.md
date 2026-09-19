# 00-test-plan.md

> **ফাইল ক্রম:** ৪৫/৫৯  
> **ডিরেক্টরি:** `06-testing-qa/`  
> **সার্ভিস স্কোপ:** Platform-Wide Test Strategy, Quality Assurance & Safety Verification Framework  
> **পূর্ববর্তী ফাইল:** [05-deep-dive-logs/adrs/adr-0003-owlready2-digital-twin.md](file:///c:/work%20pase/Railway-Project-for-SIH/docs/05-deep-dive-logs/adrs/adr-0003-owlready2-digital-twin.md) (ADR-3: Isolated Owlready2 Reasoning in Celery)  
> **পরবর্তী ফাইল:** [06-testing-qa/01-e2e-scenarios.md](file:///c:/work%20pase/Railway-Project-for-SIH/docs/06-testing-qa/01-e2e-scenarios.md) (End-to-End Operational Journey Scenarios)  
> **সংযোগ ও উদ্দেশ্য:** এই ফাইলে প্ল্যাটফর্মের গুণগত মান নিশ্চিতকরণ, লাইফ-সেফটি ভেরিফিকেশন, PostgreSQL 15.6 + PostGIS 3.3 স্প্যাশিয়াল টেস্ট ডাটাবেস ফ্রেমওয়ার্ক, টেস্ট পিরামিড, এবং অটোমেটেড সিআই/সিডি (CI/CD) টেস্ট পাইপলাইন বিস্তারিতভাবে সংজ্ঞায়িত করা হয়েছে।

---

# Master Quality Assurance & Test Strategy (সার্বিক গুণগত মান ও টেস্টিং কৌশল)

## 1. Quality Mission & Safety Imperative (সুরক্ষা অনুশাসন ও লক্ষ্য)

যেহেতু ভারতীয় রেলওয়ে এআই মেগা-ব্লক ও করিডোর শিডিউলিং প্ল্যাটফর্মটি (PS 26027) নয়াদিল্লি–কানপুর (NDLS–CNB) এবং হাওড়া–দিল্লির মতো ব্যস্ততম ট্রাঙ্ক রুটে ট্রেনের গতিশীলতা এবং মানবকর্মীদের লাইভ ট্র্যাকে কাজের সময়সূচি সমন্বয় করে, তাই সাধারণ ওয়েব অ্যাপ্লিকেশনের তুলনায় এর সফটওয়্যার নির্ভরযোগ্যতা সম্পূর্ণ আপসহীন।

প্ল্যাটফর্মের কোয়ালিটি ফ্রেমওয়ার্ক নিচের ত্রুটিগুলোতে **জিরো টলারেন্স (Zero Tolerance)** প্রয়োগ করে:
1. **স্প্যাশিয়াল ও টেম্পোরাল সংঘাতের ফলস-নেগেটিভ (Spatial Collision False Negatives):** রাজধানী/শতাব্দী/বন্দে ভারত ট্রেনের লাইভ পাথের সাথে মেগা-ব্লকের ওভারল্যাপ শনাক্ত করতে ব্যর্থ হওয়া।
2. **ডাবল-বুকিং রেস-কন্ডিশন (Concurrency Race Conditions):** একই ট্র্যাকে দুই কন্ট্রোলারের দ্বারা দুটি সাংঘর্ষিক ডিপার্টমেন্টাল ব্লকের একযোগে অনুমোদন।
3. **লাইফ-সেফটি ভায়োলেশন (Life-Safety Hazard Leaks):** ওএইচই কারেন্ট আইসোলেশন (LOTO #74) ছাড়া কাজের অনুমোদন বা ট্র্যাকে কর্মীর উপস্থিতিতে জিপিএস অ্যালার্ম ফেইলিউর।
4. **স্প্যাশিয়াল জিওমেট্রি ডেটা বিকৃতি (PostGIS Coordinate Corruption):** ৫০-মিটার সেফটি বাফারের ত্রুটিপূর্ণ গণনা বা অকার্যকর চেইনেজ ইন্টারপোলেশন।

---

## 2. Testing Pyramid & Target Coverage (টেস্টিং পিরামিড ও কভারেজ লক্ষ্য)

```
                          / \
                         /   \
                        / E2E \       10% (Playwright / Multi-Role Operations)
                       /-------\
                      / Integr. \     30% (Pytest-Django + PostGIS 3.3 + Redis 7)
                     /-----------\
                    /  Unit Tests \   60% (Fast Domain Math, Algorithms, Serializers)
                   /---------------\
```

| টেস্টিং লেভেল | পরিধি ও পরীক্ষিত কম্পোনেন্ট | প্রযুক্তি ও ফ্রেমওয়ার্ক | লক্ষ্যমাত্রা কভারেজ | ট্রিগার ইভেন্ট | সর্বোচ্চ সময় |
|---|---|---|:---:|---|:---:|
| **Unit Tests** | গাণিতিক সূত্র (Asset Availability #50, CoF×LoF #92, চেইনেজ পার্সার #87, সুইপ-লাইন কনফ্লিক্ট) | `pytest`, `pytest-mock`, `unittest` | **৮৫%+** লাইনস | প্রতিটি গিট কমিট / প্রি-কমিট হুক | < ৩০ সেকেন্ড |
| **Integration Tests** | DRF এন্ডপয়েন্টস, PostgreSQL 15.6 + PostGIS 3.3 কোয়েরি, সেলরি ওয়ার্কার টাস্ক, Daphne WS চ্যানেল | `pytest-django`, `pytest-asyncio`, Docker PostGIS | **৮০%+** ব্রাঞ্চেস | প্রতিটি Pull Request (GitHub Actions) | < ৩ মিনিট |
| **Contract Tests** | OpenAPI 3.0.3 স্কিমা ভ্যালিডেশন, DTO এনভেলপ অখণ্ডতা, HTTP স্ট্যাটাস কোড | `schemathesis`, `dredd` | **১০০%** এন্ডপয়েন্টস | দৈনিক নাইটলি সিআই বিল্ড | < ২ মিনিট |
| **End-to-End (E2E)** | ব্রাউজারে রিঅ্যাক্ট ইউআই, ইন্টারেক্টিভ ম্যাপ, ব্লক অনুমোদন, এসওএস সাইরেন প্রবাহ | `playwright` (TypeScript) | ৫টি মূল অপারেশনাল জার্নি | মেইন ব্রাঞ্চে মার্জের পূর্বে | < ৮ মিনিট |
| **Load & Stress** | ৫০০ RPS সমসাময়িক ব্লক সাবমিশন, PostGIS কনফ্লিক্ট সুইপ ল্যাটেন্সি, ওয়েবসকেট ফ্যানআউট | `k6` by Grafana | ৫০০ RPS sustained | স্টেজিং রিলিজ গেট | ১৫ মিনিট |

---

## 3. Test Environment Topology (টেস্ট পরিবেশ পরিকাঠামো)

- **আইসোলেটেড স্প্যাশিয়াল টেস্ট ডেটাবেস:**
  - টেস্ট স্যুইট এক্সিকিউশনের জন্য রিয়েল **PostgreSQL 15.6 + PostGIS 3.3** কন্টেইনার ব্যবহৃত হয়, যা `tmpfs` RAM মাউন্টে চলে। এর ফলে টেস্ট কেসের মাঝে টেবিল ড্রপ ও ট্রানজাকশন রোলব্যাক এক সেকেন্ডেরও কম সময়ে সম্পন্ন হয়।
  - কোনো ধরনের মক ডেটাবেস বা SQLite ব্যবহার কঠোরভাবে নিষিদ্ধ, কারণ PostGIS-এর নেটিভ `ST_DWithin`, `ST_LineLocatePoint`, এবং GiST ইনডেক্সিং কেবল আসল ইঞ্জিনেই সঠিক ফলাফল প্রদান করে।
- **মকড এক্সটার্নাল এপিআই গেটওয়ে:**
  - ভারতীয় রেলওয়ের বাহ্যিক সিস্টেম (COA টাইমটেবিল ফিড, CDAC এসএমএস গেটওয়ে, NTES লাইভ ট্রেন স্ট্যাটাস) লোকাল টেস্টে `responses` বা `respx` লাইব্রেরি দ্বারা ডিটারমিনিস্টিক স্টাব হিসেবে মক করা হয়।
- **আইসোলেটেড টেস্ট রেডিস ক্লাস্টার:**
  - Celery ওয়ার্কার ও Daphne ওয়েবসকেট টেস্টিংয়ের জন্য আলাদা Redis DB 15 বরাদ্দ থাকে, যাতে টেস্টের সময় লোকাল ডেভেলপমেন্ট ক্যাশে কোনো ডেটা ওভাররাইট না হয়।

---

## 4. Continuous Demo Data Engine & Scenario Builder Strategy (`apps/demo`)

টেস্টিং, স্বয়ংক্রিয় ইন্টিগ্রেশন এবং জুরির সামনে লাইভ ডেমোনস্ট্রেশনের জন্য প্ল্যাটফর্মটি একটি সমন্বিত **Continuous Demo Data Engine & Scenario Builder (`apps/demo`)** বাস্তবায়ন করেছে। এটি ৪টি মোডে কাজ করে:
1. **`SEED_GEN` (ফিক্সড সিড ২৬০২৭):** ডিটারমিনিস্টিক পরীক্ষণ ও CI/CD টেস্ট ফিক্সচারের জন্য (`python manage.py seed_railway_demo --seed 26027`)।
2. **`RANDOM_GEN` (নিয়ন্ত্রিত বৈচিত্র্য):** এজ-কেস ও রেস-কন্ডিশন পরীক্ষার জন্য কোহেরেন্স রুলস মেনে র‍্যান্ডম ডেটা তৈরি।
3. **`STREAM_GEN` (কন্টিনিউয়াস স্ট্রিমিং):** লাইভ ডেমোর জন্য প্রতি ৩-৫ সেকেন্ডে ওয়েবসকেটে লাইভ ইভেন্ট ব্রডকাস্ট (`python manage.py stream_demo_data --rate 4.0 --broadcast`)।
4. **`SCENARIO_GEN` (স্ক্রিপ্টেড প্রেজেন্টেশন স্টোরি):** বিচারকদের সামনে ৪টি সুনির্দিষ্ট চিত্রনাট্য এক ক্লিকে রান করা (`python manage.py run_scenario eng_vs_trd_conflict --live --broadcast`)।

### Core Validation Engine: The 7 Coherence Rules
- **Rule 1 (Geography):** সমস্ত কিমি রেঞ্জ সংশ্লিষ্ট সেকশনের সীমানার ভেতরে (NDLS–CNB ৪৪০ কিমি)।
- **Rule 2 (Time):** লজিক্যাল সময়ক্রম: `defect_reported < block_start < block_end < completion`।
- **Rule 3 (Resource Exclusivity):** কোনো গ্যাং একই সাথে একাধিক ব্লকে থাকতে পারবে না (নূন্যতম ভ্রমণ গতি ৪০ কিমি/ঘণ্টা)।
- **Rule 4 (Train Exclusion):** অনুমোদিত ব্লকে ট্রেনের অনুপস্থিতি, তবে পেন্ডিং ব্লকে কনফ্লিক্ট প্রদর্শনের সুযোগ।
- **Rule 5 (Cross-Dept Overlap):** ENG + TRD ওভারল্যাপের মাধ্যমে Combined Block (USP #98) ডেমো।
- **Rule 6 (Asset Triplet):** TMS, SMMS, TDMS আইডি একক ইউনিফাইড অ্যাসেটে ম্যাপিং।
- **Rule 7 (Fixed Seed):** `seed=26027` দিয়ে ১০০% পুনরাবৃত্তিযোগ্য ফলাফল।

### ৪টি গোল্ডেন প্রেজেন্টেশন সিনারিও:
- **Scenario A:** "Morning Dashboard" (চিফ কন্ট্রোলার লগইন, ৩ডি ম্যাপ, ৮টি ব্লক, "Why #1?" কার্ড)।
- **Scenario B:** "Conflict -> Combined Block" (ENG + TRD সংঘাত -> AI কম্বাইন্ড ব্লক ৩.৫ ঘণ্টা সাশ্রয় -> ১-ক্লিক অনুমোদন)।
- **Scenario C:** "Live Disruption & Breathing Plan" (রাজধানী ৪৫ মিনিট লেট -> ডিলে ক্যাসকেড রিক্যালকুলেটর -> স্বয়ংক্রিয় ব্লক শিফট ও এসএমএস)।
- **Scenario D:** "Zero-Fatality Digital Safety Protocol" (ডিজিটাল টোকেন #71 -> ২৪/২৪ টুল ও এলওটিও ভেরিফাই -> জিও-ট্যাগ ফটো -> গ্রিন ট্র্যাক)।

---

## 5. Continuous Integration (CI) Pipeline Workflow

```
[GitHub PR Created]
        │
        ├── [1. Lint & Format]: Ruff, Black, ESLint, TypeScript Check (< 45s)
        │
        ├── [2. Unit Test Suite]: Pytest 85%+ Coverage Target (< 60s)
        │
        ├── [3. Integration Suite]: Pytest-Django + PostGIS 3.3 Container (< 3m)
        │
        ├── [4. Contract Validation]: Schemathesis OpenAPI 3.0.3 Fuzzing (< 2m)
        │
        └── [5. Security Audit]: Bandit, pip-audit, TruffleHog Secrets (< 1m)
        │
        ▼
[Merge Allowed to `main`] ──> [Nightly E2E Playwright Suite + k6 Load Test]
```
