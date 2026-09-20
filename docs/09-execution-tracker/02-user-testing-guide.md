# 02-user-testing-guide.md

# Indian Railways AI Block Planning Platform (PS 26027)
## Comprehensive End-to-End User Manual & Testing Guide
### প্ল্যাটফর্ম টেস্টিং নির্দেশিকা ও পূর্ণাঙ্গ পরীক্ষামূলক গাইড

> **Document Sequence:** Execution Tracker 02/02  
> **Directory:** `docs/09-execution-tracker/`  
> **Target Audience:** Hackathon Judges, Railway Reviewers, System Auditors & Engineers  
> **Corridor Under Supervision:** New Delhi (NDLS) to Kanpur Central (CNB) Trunk Golden Route (440.200 KM)  
> **Database Architecture:** PostgreSQL 15 + PostGIS (EPSG:4326) • Pure Dynamic DB Records (Zero Mock Data)  
> **Date:** September 19, 2026

---

## ১. সারসংক্ষেপ ও প্ল্যাটফর্ম ওভারভিউ (Executive Summary)

স্মার্ট ইন্ডিয়া হ্যাকাথন (SIH PS 26027) এর জন্য নির্মিত **Indian Railways AI Automatic Block Planning Platform** একটি মিশন-ক্রিটিক্যাল স্বয়ংক্রিয় প্ল্যাটফর্ম যা ভারতীয় রেলওয়ের প্রধান ৪টি ডিপার্টমেন্ট—
1. **OPERATIONS (COA / Traffic Control)**
2. **ENG (Civil Track Engineering / P-Way)**
3. **TRD (Traction Distribution / 25kV AC OHE)**
4. **SNT (Signal & Telecommunication)**

—এর মধ্যকার জটিল ট্রাফিক সমন্বয়, ট্র্যাক রক্ষণাবেক্ষণ এবং ব্লক পারমিট অনুমোদন সম্পূর্ণ AI ও Coherence Rules Engine দ্বারা রিয়েল-টাইমে পরিচালনা করে।

> [!IMPORTANT]
> **১০০% ডায়নামিক ডেটাবেজ নিশ্চয়তা (Zero Static Mock Data):**  
> প্ল্যাটফর্মের প্রতিটি পেজে (COA, ENG, TRD, SNT, Map) প্রদর্শিত সমস্ত ব্লক, ট্রেন, স্টেশন ও অ্যাসেট কোনো হার্ডকোডেড স্ট্যাটিক ডেটা নয়; এগুলো সরাসরি **PostgreSQL / PostGIS ডেটাবেজ** থেকে এপিআই-এর মাধ্যমে ফেচ হয়ে প্রদর্শিত হয়।

---

## ২. সিস্টেমে প্রবেশের উপায় (Frictionless Access & Multi-Device Login)

- **লোকাল কম্পিউটারে:** `http://localhost:3000/login`
- **অন্যান্য কম্পিউটার / মোবাইল / ট্যাব থেকে (Wi-Fi বা LAN এর মাধ্যমে):**  
  👉 **`http://10.119.240.1:3000/login`** *(অথবা আপনার সিস্টেমের লোকাল আইপি অ্যাড্রেস)*

> [!TIP]
> **অন্যান্য সিস্টেমে শতভাগ লাইভ সংযোগ নিশ্চিত:**  
> এখন যেকোনো কম্পিউটার, ল্যাপটপ বা মোবাইল ফোন থেকে একই নেটওয়ার্কে ঢুকে সরাসরি ব্রাউজারে `http://10.119.240.1:3000` খুললে ব্যাকএন্ডের PostgreSQL ডেটাবেজ, রিয়েল-টাইম ওয়েবসকেট লাইভ ট্র্যাকিং ও AI Coherence Engine কোনো বাধা বা এরর ছাড়াই সম্পূর্ণ সচল কাজ করবে।

### ২.১ ১-ক্লিক পার্সোনা লগইন (পাসওয়ার্ড ছাড়াই পরীক্ষা করুন)
লগইন পেজে বিচারক ও পরীক্ষকদের সুবিধার জন্য ৮টি রেডিমেড পার্সোনা কার্ড দেওয়া আছে। যেকোনো একটিতে ক্লিক করলেই আপনি সরাসরি সংশ্লিষ্ট ড্যাশবোর্ডে প্রবেশ করবেন:
- **`1: Chief Controller (COA)`** &rarr; সরাসরি সেন্ট্রাল কন্ট্রোল ড্যাশবোর্ডে (`/coa`) নিয়ে যাবে।
- **`2: P-Way Track Engineer (ENG)`** &rarr; সিভিল ট্র্যাক ড্যাশবোর্ডে (`/eng`) নিয়ে যাবে।
- **`3: Traction Power (TRD)`** &rarr; ইলেকট্রিক্যাল ওএইচই ড্যাশবোর্ডে (`/trd`) নিয়ে যাবে।
- **`4: Signal & Telecom (S&T)`** &rarr; সিগন্যাল ও ইন্টারলকিং ড্যাশবোর্ডে (`/snt`) নিয়ে যাবে।
- **`5: Section Controller (DLI)`** &rarr; সেকশন টাইমটেবিল তদারকিতে (`/coa`) নিয়ে যাবে।
- **`6: Lead Administrator`** &rarr; অ্যাডমিন মাস্টার ডেটা কনসোলে (`/coa`) নিয়ে যাবে।
- **`7: Senior Section Engineer (ENG SSE)`** &rarr; ট্র্যাক রিনিউয়াল ও টার্নআউট রক্ষণাবেক্ষণ (`/eng`) নিয়ে যাবে।
- **`8: Site Supervisor (Gang 01 Leader)`** &rarr; গ্রাউন্ড সেফটি প্রোটোকল ও হেডকাউন্ট ক্লিয়ারেন্স (`/eng`) নিয়ে যাবে।

### ২.২ যেকোনো আইডি দিয়ে লগইন (ID: 1 to 100)
- আপনি ফর্মের ইনপুটে **`1`**, **`2`**, **`42`** বা **`100`** পর্যন্ত যেকোনো সংখ্যা লিখে "Authorize Access" চাপতে পারেন।
- **পাসওয়ার্ড:** সম্পূর্ণ ঐচ্ছিক (ফাঁকা রাখলেও চলবে)। ডেটাবেসে আসল পাসওয়ার্ড সংরক্ষিত আছে: `railway@123`।

---

## ৩. ১-ক্লিকে ৪-স্টেপ স্বয়ংক্রিয় সিস্টেম টেস্ট (Automated Test Runner)

প্ল্যাটফর্মের প্রতিটি পেজে উপরে ডানপাশে একটি উজ্জ্বল বেগুনী-গোলাপী রঙের বাটন দেখতে পাবেন:  
👉 **`🧪 টেস্টিং বাটন (TEST RUNNER)`**

এই বাটনে ক্লিক করলে স্বয়ংক্রিয় অডিট কনসোল ওপেন হবে। সেখান থেকে **`🚀 START 4-STEP LIVE TEST`** বাটনে ক্লিক করলে নিমিষেই ৪টি কোর টেস্ট লাইভ এক্সিকিউট হবে:

| টেস্ট ধাপ | পরীক্ষার বিষয় | ব্যাকএন্ড এপিআই | প্রত্যাশিত ফলাফল |
|---|---|---|:---:|
| **Step 1** | PostgreSQL Master Ground-Truth Test | `GET /api/v1/demo/verify-loading/` | **PASS (200 OK)** — Corridor, 6 Stations, 12 Trains, 8 Users, 51 Assets, 0 FK errors |
| **Step 2** | 7 Coherence Rules Engine Test | `POST /api/v1/demo/validate-block/` | **PASS (200 OK & 400 Bad Request)** — বৈধ ব্লক গ্রহণ, KM 455 আউট-অফ-বাউন্ডস ব্লক প্রত্যাখ্যান |
| **Step 3** | USP #98 Combined Block Conflict Test | `POST /api/v1/demo/inject-conflict/` | **PASS (200 OK)** — ২.৫ কিমি ওভারল্যাপ শনাক্তকরণ, ৩.৫ ঘণ্টা ট্র্যাক সময় বাঁচানোর প্রমাণ |
| **Step 4** | Live Dynamic DB Blocks & Telemetry Test | `GET /api/v1/demo/blocks/` & `/generate/telemetry/` | **PASS (200 OK)** — PostgreSQL থেকে ডায়নামিক ব্লক ও ১২টি ট্রেনের লাইভ কোঅর্ডিনেট |

---

## ৪. বিস্তারিত ম্যানুয়াল টেস্টিং গাইড (Manual Testing Walkthrough)

### ৪.১ টেস্ট ১: চিফ কন্ট্রোলার কমান্ড ড্যাশবোর্ড পরীক্ষা (`/coa`)
1. যান: `http://localhost:3000/coa`
2. **ডায়নামিক ব্লক লিস্ট:** ডেটাবেসের সমস্ত অনুমোদিত ও পেন্ডিং ব্লক বামপাশের প্যানেলে দেখতে পাবেন।
3. **Optimistic Locking Sanctioning:**
   - যেকোনো পেন্ডিং ব্লকে ক্লিক করুন।
   - ডানপাশের "Sanction Block with Optimistic Concurrency" বক্সে রিমার্ক লিখুন (যেমন: *Sanctioned for UP track tamping*).
   - "Sanction Block (Chief Controller)" বাটনে ক্লিক করুন &rarr; স্ট্যাটাস মুহূর্তেই **`SANCTIONED`** হয়ে ডেটাবেসে সেভ হবে।
4. **পিডিএফ ও সিএসভি এক্সপোর্ট:**
   - উপরের ডানদিকের **"Export Possession Sheet (PDF)"** বা **"Export CSV"** বাটনে ক্লিক করে পুরো করিডোরের অফিশিয়াল রিপোর্ট ডাউনলোড/প্রিন্ট করুন।

---

### ৪.২ টেস্ট ২: ডিপার্টমেন্টাল ব্লক ফর্মুলেশন ও Coherence Rules পরীক্ষা (`/eng`)
1. যান: `http://localhost:3000/eng`
2. ডানপাশের প্যানেলে **"Formulate Track Block Proposal (ENG)"** ফর্মে যান।
3. ফর্মের ঠিক উপরে থাকা **"Coherence Rules Live Test Suite"** বক্সটি ব্যবহার করুন:
   - **টেস্ট ২.১ (Rule 1 Out-of-Bounds KM):** `[Simulate Rule 1 (Out-of-Bounds KM 458.5)]` এ ক্লিক করুন।
     - *ফলাফল:* উপরে লাল রঙের `RULE 1 VIOLATION` টোস্ট ভেসে উঠবে, কিলোমিটার ইনপুটে লাল বর্ডার আসবে এবং "Continue" বাটনটি ব্লক হয়ে **"Blocked by Coherence Engine"** দেখাবে।
   - **টেস্ট ২.২ (Rule 1 Reversed Chainage):** `[Simulate Rule 1 (Reversed Chainage)]` এ ক্লিক করুন (Start 42.5 > End 16.0 KM)। রিভার্স ডিরেকশন ত্রুটি দেখাবে।
   - **টেস্ট ২.৩ (Rule 2 Excessive Duration):** `[Simulate Rule 2 (9.5h Duration > 8h)]` এ ক্লিক করুন। ৮ ঘণ্টার সর্বোচ্চ বিধিবদ্ধ সীমার নিয়ম লঙ্ঘিত হওয়ায় ফর্ম আটকে যাবে।
   - **টেস্ট ২.৪ (সঠিক ডেটা সাবমিট):** `[Reset Valid Standards]` এ ক্লিক করুন। সবুজ টোস্ট আসবে। এরপর Continue করে ফর্ম সাবমিট করুন &rarr; এপিআই `POST /api/v1/demo/blocks/` কল করে ব্লকটি সরাসরি PostgreSQL ডেটাবেসে যুক্ত হয়ে যাবে এবং বামদিকের তালিকায় সাথে সাথে দেখাবে।

---

### ৪.৩ টেস্ট ৩: ফ্লোটিং ডেমো কন্ট্রোলার ব্যবহার (নিচে বামপাশের বাটন)
স্ক্রিনের নিচে বামপাশে একটি ভাসমান বাটন দেখতে পাবেন: **`DEMO CONTROLLER • SEED • 1x`**। এটিতে ক্লিক করলে কন্ট্রোল প্যানেল ওপেন হবে:
1. **অপারেশনাল মোড পরিবর্তন:**
   - `[SEED]` : ফিক্সড সিড ২৬০২৭ নিশ্চিত করে (১০০% পুনরাবৃত্তিযোগ্য ফলাফল)।
   - `[RANDOM]` : স্টোকাস্টিক র‍্যান্ডম ডেটা জেনারেশন।
   - `[STREAM]` : লাইভ টেলিমেট্রি স্ট্রিমিং।
2. **কনফ্লিক্ট ইনজেকশন (হ্যাকাথন গোল্ডেন ডেমো):**
   - **`USP #98: ENG vs TRD Overlap`** বাটনে ক্লিক করুন:
     - প্ল্যাটফর্ম সাথে সাথে একই লাইনে সিভিল ও ইলেকট্রিক্যাল কাজের সংঘাত শনাক্ত করবে এবং সবুজ ব্যাজ দেখাবে: **`+3.5h Saved`** এবং উভয় কাজকে একটিমাত্র কম্বাইন্ড ব্লকে সংযুক্ত করার পরামর্শ দেবে।
   - **`Rajdhani Timetable Collision`** বাটনে ক্লিক করুন:
     - ১২৩০১ হাওড়া রাজধানী এক্সপ্রেসের টাইমটেবিলের সাথে ট্রানজিট সংঘাত প্রদর্শন করবে।
   - **`Rule 3: Gang Travel Physics`** বাটনে ক্লিক করুন:
     - ১ ঘণ্টায় ১৬০ কিমি দূরত্বের কাজ দিয়ে গ্যাং ট্রাভেল স্পিড ($\le 40$ কিমি/ঘণ্টা) লঙ্ঘন প্রদর্শন করবে।
3. **১-ক্লিক ব্যাচ ডেটা জেনারেশন:**
   - **`+5 Coherent Blocks`** বাটনে ক্লিক করুন &rarr; ব্যাকএন্ড থেকে সরাসরি ৫টি নতুন ভ্যালিডেটেড ব্লক তৈরি হয়ে ডেটাবেসে যুক্ত হবে এবং পেজে রিয়েল-টাইমে দৃশ্যমান হবে।

---

### ৪.৪ টেস্ট ৪: ৩ডি ডিজিটাল টুইন ম্যাপ পরীক্ষা (`/map`)
1. যান: `http://localhost:3000/map`
2. **ম্যাপবক্স ৩ডি পার্সপেক্টিভ ক্যানভাস:**
   - ৪৪০.২ কিমি ট্রাঙ্ক করিডোর (NDLS–GZB–ALJN–TDL–ETW–CNB) সায়ান রঙের লাইনে প্রদর্শিত হবে।
   - ৬টি প্রধান জংশন স্টেশন নোড এবং ৫১টি PostGIS ট্র্যাক ও OHE অ্যাসেট তাদের নিজস্ব কালার কোডিংয়ে দৃশ্যমান হবে।
   - ১২টি ট্রেন করিডোরের উপর দিয়ে তাদের গতি ও দিক অনুযায়ী লাইভ ট্র্যাক হবে।

---

### ৪.৫ টেস্ট ৫: গোল্ডেন চিত্রনাট্য প্লেয়ার পরীক্ষা (🎬 SCENARIO PLAYER)
স্ক্রিনের উপরে ডানপাশে টেস্ট রানার বাটনের ঠিক পাশেই একটি সোনালী-কমলা রঙের সিনেমা বাটন দেখতে পাবেন:  
👉 **`🎬 চিত্রনাট্য প্লেয়ার (SCENARIOS)`**

বাটনে ক্লিক করলে ইন্টারেক্টিভ সিনারিও প্লেয়ার ওপেন হবে। এখান থেকে বিচারকদের প্রদর্শনের জন্য ৪টি প্রধান চিত্রনাট্য এক ক্লিকে চালানো যায়:
1. **Scenario A: Morning Dashboard & "Why #1?" Card:**
   - করিডোরের ৮টি ব্লক এবং KM 144.2 এ আবিষ্কৃত গুরুতর USFD ত্রুটি প্রদর্শন করবে।
   - AI এক্সপ্লেনেবিলিটি কার্ড ব্যাখ্যা করবে কেন এই ত্রুটির ঝুঁকি স্কোর ০.৮৮ এবং এটি করিডোরের #১ অগ্রাধিকার।
2. **Scenario B: Conflict & Combined Block (USP #98 ⭐):**
   - সিভিল ইঞ্জিনিয়ারিং (ENG) এবং ইলেকট্রিক্যাল (TRD)-এর মধ্যে ২.৫ কিমি ওভারল্যাপিং ব্লকের সংঘাত শনাক্ত হবে।
   - প্ল্যাটফর্ম স্বয়ংক্রিয়ভাবে ৩.৫ ঘণ্টা ট্রেন চলার সময় বাঁচিয়ে উভয় বিভাগকে একটি কম্বাইন্ড ব্লক প্রদান করবে।
3. **Scenario C: Live Disruption & Breathing Plan:**
   - ১২৪২৪ ডিব্রুগড় রাজধানী ট্রেনের ৪৫ মিনিট লেট ইনজেক্ট করবে।
   - স্বয়ংক্রিয় ডিলে ক্যাসকেড অ্যালগরিদম ব্লকের সময় ৪৫ মিনিট পিছিয়ে দিয়ে ট্রেনের অবাধ চলাচল নিশ্চিত করবে।
4. **Scenario D: Zero-Fatality Digital Safety Protocol:**
   - ডিজিটাল সেফটি টোকেন ইস্যু, ১২/১২ জন কর্মীর বায়োমেট্রিক ও টুলের ডিজিটাল মিলকরণ।
   - ২৫kV OHE LOTO নিশ্চিতকরণ এবং ফিল্ড ক্লিয়ারেন্স ফটো আপলোড শেষে ট্র্যাক স্বাভাবিক গতিতে ফিরে আসার পূর্ণাঙ্গ সাইকেল প্রদর্শন।
- **নিয়ন্ত্রণ:** আপনি চাইলে **`Autoplay Story`** চালিয়ে স্বয়ংক্রিয়ভাবে ৪ সেকেন্ড পর পর স্টেপ দেখতে পারেন অথবা **`Next Step`** চেপে নিজের গতিতে যাচাই করতে পারেন।

---

## ৫. সরাসরি ব্যাকএন্ড এপিআই অডিট কমান্ড (Backend Verification Commands)

যেকোনো টার্মিনাল বা ব্রাউজার থেকে সরাসরি ডেটাবেজ ও এপিআই যাচাই করতে পারেন:

```bash
# ১. ডেটাবেজ স্বাস্থ্য ও পোস্টজিআইএস রেকর্ড যাচাই
curl http://127.0.0.1:8000/api/v1/demo/verify-loading/

# ২. ডেটাবেস থেকে লাইভ ব্লক সংগ্রহ (Zero Mock Data)
curl http://127.0.0.1:8000/api/v1/demo/blocks/

# ৩. ট্রেনের রিয়েল-টাইম টেলিমেট্রি কোঅর্ডিনেট
curl http://127.0.0.1:8000/api/v1/demo/generate/telemetry/

# ৪. Coherence Engine লাইভ ভ্যালিডেশন
curl -X POST http://127.0.0.1:8000/api/v1/demo/validate-block/ \
  -H "Content-Type: application/json" \
  -d '{"start_km": 14.2, "end_km": 18.5, "scheduled_start_time": "2026-09-09T02:00:00+05:30", "scheduled_end_time": "2026-09-09T05:00:00+05:30"}'

# ৫. ডকার ব্যাকএন্ড ম্যানেজমেন্ট কমান্ডসমূহ (CLI Management Commands)
# ৫.১ সম্পূর্ণ মাস্টার ডেটা সিডিং (PostgreSQL 15 + PostGIS)
docker exec -i railway_backend python manage.py seed_railway_demo --seed 26027

# ৫.২ রিয়েল-টাইম ২Hz ওয়েবসকেট স্ট্রিমিং
docker exec -i railway_backend python manage.py stream_demo_data --rate 2.0 --duration 60

# ৫.৩ গোল্ডেন চিত্রনাট্য এক্সিকিউশন
docker exec -i railway_backend python manage.py run_scenario eng_vs_trd_conflict --broadcast

# ৫.৪ ডেটাবেস ও ডেমো স্টেট রিসেট (Pristine Baseline)
docker exec -i railway_backend python manage.py reset_demo
```

---

## ৬. প্রশ্নোত্তর ও সাধারণ জিজ্ঞাসা (FAQ)

- **প্রশ্ন: আমি কি যেকোনো পাসওয়ার্ড দিয়ে লগইন করতে পারি?**  
  *উত্তর:* হ্যাঁ, পরীক্ষক ও বিচারকদের দ্রুত টেস্ট করার সুবিধার্থে ডেমো মোডে পাসওয়ার্ড যাচাই বাইপাস রাখা হয়েছে। তবে আপনি যদি মূল প্রোফাইল ক্রেডেনশিয়াল দিতে চান, তবে ইউজারনেম `coa_delhi_chief` এবং পাসওয়ার্ড `railway@123` দিলে ডেটাবেস থেকে আসল Argon2id হ্যাশিং যাচাই হয়ে JWT টোকেন ইস্যু হবে।

- **প্রশ্ন: ব্লক তৈরি করলে কি তা ডেটাবেসে স্থায়ী হয়?**  
  *উত্তর:* হ্যাঁ, ফর্ম থেকে সাবমিট করা বা `+5 Blocks` বাটন দিয়ে তৈরি করা প্রতিটি ব্লক সরাসরি PostgreSQL-এর `apps_blocks_block` টেবিলে স্থায়ীভাবে সেভ হয় এবং রিফ্রেশ করলেও অক্ষুণ্ণ থাকে।

---

## ৭. Phase 1: Identity, Security & RBAC (TSK-P1-01-BE) টেস্ট নির্দেশিকা

`TSK-P1-01-BE` ধাপে ব্যাকএন্ডের সিকিউরিটি, OWASP Argon2id পাসওয়ার্ড হ্যাশিং, RBAC রোলস এবং JWT টোকেন ইস্যু/রিফ্রেশ এপিআই সম্পন্ন হয়েছে। এটি টেস্ট করার উপায়:

### ৭.১ স্বয়ংক্রিয় অল-ইন-ওয়ান ভেরিফিকেশন স্ক্রিপ্ট
আপনার টার্মিনাল বা PowerShell-এ নিচের কমান্ডটি চালান:
```powershell
python scripts/test_p1_01_be_api.py
```
**যাচাই ফলাফল:**
- সরাসরি ব্যাকএন্ড সার্ভারে (`http://127.0.0.1:8000/api/v1/auth/login/`) ৮টি ডেমো পার্সোনার লগইন যাচাই হবে।
- JWT Access Token এবং HTTP-Only Refresh Cookie ইস্যু হওয়া চেক করবে।
- Refresh Token Rotation এবং Anti-Replay নিরাপত্তা (পুরনো টোকেন দ্বিতীয়বার ব্যবহার করলে ৪০১ এরর দ্বারা ব্লক করা) যাচাই করবে।

### ৭.২ ডেটাবেসে ৮টি পার্সোনার Argon2id হ্যাশার চেক
```powershell
docker exec railway_backend python scripts/verify_p1_01_be.py
```
**যাচাই ফলাফল:** ৮টি অ্যাকাউন্টেরই হ্যাশার ফিল্ডে `argon2` দেখাবে এবং ডেটাবেসের সাথে সক্রিয় যোগাযোগ নিশ্চিত হবে।

### ৭.৩ সরাসরি cURL / PowerShell দিয়ে লাইভ লগইন রিকোয়েস্ট
```powershell
curl -X POST http://127.0.0.1:8000/api/v1/auth/login/ -H "Content-Type: application/json" -d "{\"username\": \"coa_delhi_chief\", \"password\": \"railway@123\"}"
```
**প্রত্যাশিত আউটপুট:** `HTTP 200 OK`, সাথে `access_token`, মেয়াদ `expires_in: 900`, রোল `CHIEF_CONTROLLER` এবং ডিপার্টমেন্ট `OPERATIONS` আসবে।

---

## ৮. Phase 1: Frontend Authentication & Persona Switcher (TSK-P1-01-FE) টেস্ট নির্দেশিকা

`TSK-P1-01-FE` ধাপে ফ্রন্টএন্ডের Zustand Auth Store, Axios Interceptors (স্বয়ংক্রিয় Bearer Token ইনজেকশন ও সাইলেন্ট রিফ্রেশ রোটেশন), এবং ৮টি পার্সোনা সংবলিত প্রিমিয়াম লগইন পেজ UI সম্পন্ন হয়েছে।

### ৮.১ ব্রাউজারে লাইভ লগইন পেজ খোলা
- আপনার ব্রাউজারে খুলুন: **`http://localhost:3000/login`**  
  *(অথবা মোবাইল/অন্যান্য ডিভাইস থেকে: `http://10.119.240.1:3000/login`)*

### ৮.২ ৮টি পার্সোনার ১-ক্লিক টেস্ট
1. লগইন পেজের কার্ড গ্রিডে ৮টি ভিন্ন ডিপার্টমেন্টাল কার্ড প্রদর্শিত হচ্ছে:
   - **1: Chief Controller (COA)** (সায়ান বর্ডার)
   - **2: P-Way Track Engineer (ENG)** (নীল বর্ডার)
   - **3: Traction Power (TRD)** (হলুদ বর্ডার)
   - **4: Signal & Telecom (S&T)** (সবুজ বর্ডার)
   - **5: Section Controller (DLI)** (বেগুনি বর্ডার)
   - **6: Lead Administrator** (গোলাপী বর্ডার)
   - **7: Senior Section Engineer (ENG SSE)** (ইন্ডিগো বর্ডার)
   - **8: Site Supervisor (Gang 01 Leader)** (টিয়াল বর্ডার)
2. যেকোনো কার্ডে ক্লিক করলেই ব্যাকএন্ডের `/api/v1/auth/login/` এপিআই কল হয়ে JWT Access Token ইস্যু হবে এবং সংশ্লিষ্ট ডিপার্টমেন্টাল ড্যাশবোর্ডে (`/coa`, `/eng`, `/trd`, `/snt`) প্রবেশ করবে।

### ৮.৩ ব্রাউজার LocalStorage টোকেন যাচাই
1. ড্যাশবোর্ডে প্রবেশের পর কীবোর্ডে `F12` চেপে **Developer Tools** খুলুন।
2. **Application &rarr; Local Storage &rarr; http://localhost:3000** এ যান।
3. **`railway_auth_storage`** কী-টি লক্ষ্য করুন:
   - `accessToken`: ব্যাকএন্ড থেকে পাওয়া লাইভ JWT টোকেন।
   - `user`: ইউজারের রোল, এমপ্লয়ি আইডি ও ডিপার্টমেন্টাল কোড সংরক্ষিত থাকবে।
   - `isAuthenticated`: `true` থাকবে।

### ৮.৪ কুইক আইডি পিলস টেস্ট (1 to 8)
লগইন পেজের নিচে `Quick IDs: 1: COA | 2: ENG | 3: TRD | 4: SNT | 5: SEC | 6: ADMIN | 7: SSE | 8: GANG` বাটনগুলোর যেকোনো একটিতে ক্লিক করে "Authorize Access" চাপলে সাথে সাথে সেই ইউজার হিসেবে লগইন হবে।

---

## ৯. Phase 1: E2E Login ও Role-Based Route Guarding (TSK-P1-01-TEST) টেস্ট নির্দেশিকা

`TSK-P1-01-TEST` ধাপে E2E Login এবং রোল-বেসড রাউট গার্ডিং যাচাই করা হয়েছে।

### ৯.১ স্বয়ংক্রিয় অল-ইন-ওয়ান স্ক্রিপ্ট রান করুন
PowerShell বা টার্মিনালে চালান:
```powershell
python scripts/test_p1_01_test.py
```
**যাচাই ফলাফল:**
- `coa_delhi_chief` ও `eng_track_pway` এর E2E Login যাচাই হবে।
- JWT ক্লেইমস ও Zustand LocalStorage স্কিমা ভেরিফাই হবে।
- রাউট গার্ড ম্যাট্রিক্স টেস্ট হবে: `/coa` রাউটটিতে Chief Controller **ALLOWED**, কিন্তু Track Engineer স্বয়ংক্রিয়ভাবে **BLOCKED** হবে।
- প্রটেক্টেড `/api/v1/auth/me/` এপিআই-তে টোকেন ছাড়া রিকোয়েস্ট পাঠালে `HTTP 401 Unauthorized` ফেরত আসবে।

### ৯.২ ব্রাউজারে রোল-বেসড রাউট গার্ড টেস্ট (Manual Verification)
1. **Track Engineer দিয়ে লগইন করুন:**
   - `http://localhost:3000/login` এ গিয়ে **`2: P-Way Track Engineer (ENG)`** কার্ডে ক্লিক করুন।
   - আপনি সফলভাবে `/eng` ড্যাশবোর্ডে প্রবেশ করবেন।
2. **অননুমোদিত রাউটে সরাসরি প্রবেশের চেষ্টা করুন:**
   - ব্রাউজারের ইউআরএল বারে ম্যানুয়ালি টাইপ করে এন্টার চাপুন: **`http://localhost:3000/coa`**
   - **ফলাফল:** সাথে সাথে লাল বর্ডারের নিরাপত্তা স্ক্রিন আসবে:  
     👉 *"Unauthorized Terminal Access: Your role (DEPT_ENGINEER) does not have security clearance for this operational console."*
3. **Chief Controller দিয়ে পুনরায় লগইন করুন:**
   - লগআউট করে **`1: Chief Controller (COA)`** দিয়ে লগইন করুন।
   - এবার `/coa` এবং `/eng` উভয় কনসোলেই অবাধ নিরাপত্তা অনুমোদন থাকবে।

---

## ১০. Phase 1: Current User Context & Operational Capabilities (TSK-P1-02-BE) টেস্ট নির্দেশিকা

`TSK-P1-02-BE` ধাপে `/api/v1/auth/me/` সুরক্ষিত এন্ডপয়েন্টটি প্রতিটি ইউজারের পূর্ণাঙ্গ প্রোফাইল, বিভাগীয় কোড, এবং অপারেশনাল পারমিশনস (`capabilities`) অবজেক্ট রিটার্ন করে।

### ১০.১ স্বয়ংক্রিয় স্ক্রিপ্ট রান করুন
PowerShell বা টার্মিনালে নিচের কমান্ডটি দিন:
```powershell
python scripts/test_p1_02_be.py
```
**যাচাই ফলাফল:**
- টোকেন ছাড়া বা ভুল টোকেন দিয়ে রিকোয়েস্ট পাঠালে `HTTP 401 Unauthorized` টেস্ট নিশ্চিত করবে।
- `coa_delhi_chief`, `eng_track_pway`, `trd_ohe_power`, `snt_signal_telecom`, `sec_controller_dli`, এবং `admin` এর প্রোফাইল ও পারমিশনস যাচাই করবে:
  - COA ইউজারের `can_approve_blocks: true`, `is_chief_controller: true`
  - ENG/TRD/SNT ইঞ্জিনিয়ারের `can_request_blocks: true`, `is_dept_engineer: true`, `can_approve_blocks: false`

### ১০.২ সরাসরি cURL / PowerShell দিয়ে টেস্ট করুন
প্রথমে যেকোনো পার্সোনা (যেমন `coa_delhi_chief`) এর টোকেন দিয়ে কল করুন:
```powershell
# লগইন করে টোকেন নিন
$loginRes = Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/v1/auth/login/" -Method Post -ContentType "application/json" -Body '{"username":"coa_delhi_chief","password":"railway@123"}'
$token = $loginRes.data.access_token

# /api/v1/auth/me/ কল করুন
Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/v1/auth/me/" -Method Get -Headers @{Authorization="Bearer $token"}
```
**প্রত্যাশিত আউটপুট:** ইউজারের নাম, এমপ্লয়ি আইডি, রোল, ডিপার্টমেন্ট এবং `capabilities` ডিকশনারি প্রদর্শিত হবে।

---

## ১১. Phase 1: Context-Aware ProtectedRoutes & Smart Redirect (TSK-P1-02-FE) টেস্ট নির্দেশিকা

`TSK-P1-02-FE` ধাপে React Router-এ ইউজার রোল ও ডিপার্টমেন্টাল আইসোলেশনের ভিত্তিতে সুরক্ষিত রাউটিং এবং স্মার্ট রিডাইরেকশন নিশ্চিত করা হয়েছে।

### ১১.১ স্মার্ট রুট রিডাইরেকশন পরীক্ষা (Smart Role Redirect)
যেকোনো ইউজার দিয়ে লগইন করার পর ব্রাউজারে রুট পাথ `http://localhost:3000/` অথবা `http://localhost:3000/dashboard` খুললে সিস্টেম ইউজারের ডিপার্টমেন্ট অনুযায়ী সরাসরি সংশ্লিষ্ট ড্যাশবোর্ডে পাঠাবে:
1. **`1: Chief Controller (COA)`** দিয়ে লগইন করে `http://localhost:3000/` খুললে &rarr; সরাসরি `/coa` ড্যাশবোর্ডে যাবে।
2. **`2: P-Way Track Engineer (ENG)`** দিয়ে লগইন করে `http://localhost:3000/` খুললে &rarr; সরাসরি `/eng` ড্যাশবোর্ডে যাবে।
3. **`3: Traction Power (TRD)`** দিয়ে লগইন করে `http://localhost:3000/` খুললে &rarr; সরাসরি `/trd` ড্যাশবোর্ডে যাবে।
4. **`4: Signal & Telecom (S&T)`** দিয়ে লগইন করে `http://localhost:3000/` খুললে &rarr; সরাসরি `/snt` ড্যাশবোর্ডে যাবে।

### ১১.২ ক্রস-ডিপার্টমেন্টাল আইসোলেশন গার্ড টেস্ট (Cross-Dept Security Barrier)
1. **P-Way Track Engineer (ENG) দিয়ে লগইন করুন:**
   - ব্রাউজারের ইউআরএল বারে টাইপ করুন: `http://localhost:3000/trd` (Traction Power কনসোল)।
   - **ফলাফল:** সাথে সাথে অ্যাম্বার/হলুদ বর্ডারের ডিপার্টমেন্টাল ব্যারিয়ার স্ক্রিন আসবে:  
     👉 *"Departmental Isolation Clearance: Your department (ENG) is restricted from accessing this operational console (TRD, OPERATIONS only)."*
2. **চিফ কন্ট্রোলারের সর্বজনীন প্রবেশাধিকার:**
   - চিফ কন্ট্রোলার (`coa_delhi_chief`) অথবা অ্যাডমিন লগইন থাকলে তিনি `/coa`, `/bigscreen`, `/eng`, `/trd`, এবং `/snt` প্রতিটি কনসোলে তদারকির জন্য পূর্ণ প্রবেশাধিকার পাবেন।

---

## ১২. Phase 1: Multi-Department Routing Verification (TSK-P1-02-TEST) টেস্ট নির্দেশিকা

`TSK-P1-02-TEST` ধাপে COA, ENG, TRD, এবং SNT এই চারটি প্রধান অপারেশনাল বিভাগের ইউজারদের রাউটিং ও পারমিশন সম্পূর্ণ সমন্বিতভাবে টেস্ট করা হয়েছে।

### ১২.১ স্বয়ংক্রিয় অল-ইন-ওয়ান স্ক্রিপ্ট চালান
PowerShell বা টার্মিনালে কমান্ডটি দিন:
```powershell
python scripts/test_p1_02_test.py
```
**যাচাই ফলাফল:**
- ৫টি ভিন্ন পার্সোনা (`coa_delhi_chief`, `eng_track_pway`, `trd_ohe_power`, `snt_signal_telecom`, `site_supervisor_gang01`) এর লাইভ লগইন সম্পন্ন হবে।
- প্রতিটি ইউজারের জন্য স্মার্ট রুট `/` রিডাইরেকশন এবং ৫টি ভিন্ন কনসোলের এক্সেস পারমিশন পলিসি টেস্ট হবে (১০০% PASS)।

### ১২.২ ব্রাউজারে ৪টি ডিপার্টমেন্টাল ড্যাশবোর্ড দ্রুত টেস্ট করার গাইড
1. **সেন্ট্রাল কন্ট্রোল ড্যাশবোর্ড (COA):** `http://localhost:3000/login` এ গিয়ে **`1: Chief Controller (COA)`** ক্লিক করুন। পুরো করিডোরের ট্রাফিক মাস্টার কন্ট্রোল কনসোল (`/coa`) দেখতে পাবেন।
2. **সিভিল ইঞ্জিনিয়ারিং ড্যাশবোর্ড (ENG):** লগআউট করে **`2: P-Way Track Engineer (ENG)`** ক্লিক করুন। ট্র্যাক ট্যাম্পিং, ফ্লা রিপোর্ট ও গ্যাং রোস্টার কনসোল (`/eng`) দেখতে পাবেন।
3. **ইলেকট্রিক্যাল ওএইচই ড্যাশবোর্ড (TRD):** লগআউট করে **`3: Traction Power (TRD)`** ক্লিক করুন। ২৫kV OHE ট্র্যাকশন পাওয়ার পারমিট কনসোল (`/trd`) দেখতে পাবেন।
4. **সিগন্যাল ও টেলিকম ড্যাশবোর্ড (S&T):** লগআউট করে **`4: Signal & Telecom (S&T)`** ক্লিক করুন। ইলেকট্রনিক ইন্টারলকিং ও পয়েন্ট মেশিন কনসোল (`/snt`) দেখতে পাবেন।

---

## ১৩. Phase 2: PostGIS GeoJSON Corridor & BlockSection (TSK-P2-01-BE) টেস্ট নির্দেশিকা

`TSK-P2-01-BE` ধাপে ভারতীয় রেলওয়ের গোল্ডেন ট্রাঙ্ক রুট **New Delhi (NDLS) to Kanpur Central (CNB)** করিডোরের ৪৪০.২ কিমি ভৌগোলিক ট্র্যাক, ১০টি স্টেশন নোড, ৯টি ব্লক সেকশন এবং PostGIS WGS-84 SRID 4326 GeoJSON এপিআই সম্পূর্ণ তৈরি ও যাচাই করা হয়েছে।

### ১৩.১ স্বয়ংক্রিয় অল-ইন-ওয়ান স্ক্রিপ্ট চালান
PowerShell বা টার্মিনালে নিচের কমান্ডটি রান করুন:
```powershell
python scripts/test_p2_01_be.py
```
**যাচাই ফলাফল:**
- করিডোর লিস্ট এন্ডপয়েন্ট (`/api/v1/blocks/corridors/`) থেকে `NDLS-CNB-MAIN` করিডোর এবং তার অন্তর্ভুক্ত ৯টি ব্লক সেকশন যাচাই করবে।
- ডেডিকেটেড GeoJSON এন্ডপয়েন্ট (`/api/v1/blocks/corridors/NDLS-CNB-MAIN/geojson/`) থেকে SRID 4326 WGS-84 FeatureCollection (LineString ট্র্যাক ও ১০টি স্টেশন পয়েন্ট) যাচাই করবে।

### ১৩.২ সরাসরি ব্রাউজার বা cURL দিয়ে GeoJSON ডেটা দেখুন
- ব্রাউজারে খুলুন: 👉 **`http://localhost:8000/api/v1/blocks/corridors/NDLS-CNB-MAIN/geojson/`**
- রেসপন্সে দেখতে পাবেন:
  - `properties.total_length_km: 440.2`
  - `properties.srid: 4326`
  - `LineString`: নতুন দিল্লি থেকে কানপুর সেন্ট্রাল পর্যন্ত অরিজিনাল অক্ষাংশ ও দ্রাঘিমাংশ বিশিষ্ট ট্র্যাক জ্যামিতি।
  - `Point`: NDLS, DLI, TKD, SBB, GZB, DER, ALJN, TDL, ETW, এবং CNB-এর ভৌগোলিক নোডস।

---

## ১৪. Phase 2: 3D Perspective Mapbox Canvas 45° Tilt (TSK-P2-01-FE) টেস্ট নির্দেশিকা

`TSK-P2-01-FE` ধাপে ফ্রন্টএন্ডে Mapbox 3D পার্সপেক্টিভ ক্যানভাসকে ৪৫° টিল্ট অ্যাঙ্গেল (`rotateX(45deg)`), ডার্ক কন্ট্রোল-রুম থিম, এবং ব্যাকএন্ডের PostGIS GeoJSON লাইভ লিংকের সাথে সংযুক্ত করা হয়েছে।

### ১৪.১ ব্রাউজারে 3D GIS ম্যাপ খুলুন
- ব্রাউজারে যান: 👉 **`http://localhost:3000/map`**  
  *(অথবা মোবাইল/ট্যাব থেকে: `http://10.119.240.1:3000/map`)*

### ১৪.২ 3D ৪৫° টিল্ট ও ইন্টারঅ্যাক্টিভ কন্ট্রোলস টেস্ট
1. **ডিফল্ট 3D ভিউ:** ম্যাপটি লোড হওয়ার সাথে সাথে ৪৫° আইসোমেট্রিক টিল্ট পার্সপেক্টিভে পুরো ট্র্যাক করিডোর, আপ/ডাউন লাইন, এবং স্টেশন নোডগুলো প্রদর্শিত হবে।
2. **নিচের স্ট্যাটাস স্ট্রিপ লক্ষ্য করুন:**
   - `PITCH: 45° 3D TILT`
   - `CORRIDOR: NDLS–CNB TRUNK (440.2 KM)`
   - `LIVE POSTGIS SRID 4326 ACTIVE` (সবুজ পালসিং ইন্ডিকেটর)
3. **2D / 3D সুইচিং:**
   - উপরে ডানপাশের ফ্লোটিং কন্ট্রোলসে **`3D VIEW / 2D VIEW`** বাটনে চাপুন।
   - মসৃণ ট্রানজিশনে ম্যাপটি ফ্ল্যাট ২D নাদির (0° Nadir) ভিউতে যাবে এবং পুনরায় চাপলে ৪৫° ৩D টিল্টে ফিরে আসবে।
4. **স্টেশন ফোকাস ও ট্রেন ট্র্যাকিং:**
   - ক্যানভাসে যেকোনো স্টেশনে ক্লিক করলে ক্যামেরা স্মুথলি সেই স্টেশনের ইন্টারলকিং পয়েন্টে ফোকাস করবে।
   - ৬০ FPS স্মুথ মুভমেন্টে ট্রেনগুলো ট্র্যাক লাইনের ওপর দিয়ে চলাচল করবে।

---

## ১৫. Phase 2: 3D Pitch Mapbox Canvas ও PostGIS Track Geometry (TSK-P2-01-TEST) টেস্ট নির্দেশিকা

`TSK-P2-01-TEST` ধাপে ব্যাকএন্ডের PostGIS GeoJSON API, ফ্রন্টএন্ড Vite রিভার্স প্রক্সি, JWT রাউট পারমিশন, ৪৫° ৩D টিল্ট পার্সপেক্টিভ এবং লাইভ HUD টেলিমেট্রির রেন্ডারিং সমন্বিতভাবে যাচাই করা হয়েছে।

### ১৫.১ স্বয়ংক্রিয় অল-ইন-ওয়ান স্ক্রিপ্ট চালান
PowerShell বা টার্মিনালে নিচের কমান্ডটি রান করুন:
```powershell
python scripts/test_p2_01_test.py
```
**যাচাই ফলাফল:**
- **Step 1 (Backend PostGIS SRID 4326):** ১০টি ভৌগোলিক ওয়েপয়েন্ট সমন্বিত `LineString` এবং ১০টি স্টেশন `Point` নোড যাচাই হবে (Origin NDLS: 77.2191, 28.6429 &rarr; Terminus CNB: 80.3475, 26.4525)।
- **Step 2 (Vite Reverse Proxy):** ফ্রন্টএন্ড প্রক্সি (`http://localhost:3000/api/v1/blocks/corridors/NDLS-CNB-MAIN/geojson/`) সফলভাবে ব্যাকএন্ড ডেটা পরিবেশন করছে কিনা যাচাই হবে (`HTTP 200`, `total_length_km: 440.2`)।
- **Step 3 (Authentication & Protected Route):** Chief Controller এবং Track Engineer উভয় ইউজারের জন্য `/map` কনসোলে প্রবেশাধিকার ও JWT ক্লেইমস যাচাই হবে।
- **Step 4 (3D Engine & HUD Specifications):** `perspective: 1000px`, `rotateX(45deg)`, `preserve-3d` স্টাইলিং এবং HUD টেলিমেট্রি স্পেসিফিকেশন অডিট হবে।
- **Step 5 (Production Build Audit):** ডকারে `npm run build` নির্বাহ করে ০ কম্পাইল এরর নিশ্চিত করবে।

### ১৫.২ ব্রাউজারে ইন্টারেক্টিভ ভেরিফিকেশন (Manual Verification)
1. **ব্রাউজারে ম্যাপ ওপেন করুন:**
   - ব্রাউজারে যান: 👉 **`http://localhost:3000/map`**  
   *(লগইন চাওয়া হলে `1: Chief Controller (COA)` সিলেক্ট করে প্রবেশ করুন)*
2. **নিচের মিশন-কন্ট্রোল স্ট্যাটাস বার লক্ষ্য করুন:**
   - `MAPBOX 60 FPS WEBGL TWIN` ব্যাজ দেখা যাবে।
   - `PITCH: 45° 3D TILT` প্রদর্শিত হবে।
   - `CORRIDOR: NDLS–CNB TRUNK (440.2 KM)` ব্যাকএন্ডের PostGIS ডেটা থেকে সরাসরি গণনা হয়ে প্রদর্শিত হবে।
   - `LIVE POSTGIS SRID 4326 ACTIVE` সবুজ পালসিং ডট দেখতে পাবেন।
3. **৩D টিল্ট টগল করুন:**
   - উপরে ডানপাশের **`2D / 3D`** বাটনে ক্লিক করে দেখুন ক্যানভাস মসৃণভাবে ফ্ল্যাট ও ৪৫° অ্যাঙ্গেলে মুভ করছে।

---

## ১৬. Phase 2: Block Model & Proposal Submission API (TSK-P2-02-BE) টেস্ট নির্দেশিকা

`TSK-P2-02-BE` ধাপে ব্যাকএন্ডে `POST /api/v1/blocks/` এন্ডপয়েন্টটি CoherenceEngine ভ্যালিডেশন (Rule 1: Geography ও Rule 2: Time Ordering), রোল-বেসড এক্সেস কন্ট্রোল (RBAC Separation of Duties), এবং অটোমেটিক সুইপ-লাইন কনফ্লিক্ট ডিটেকশনের সাথে প্রস্তুত করা হয়েছে।

### ১৬.১ স্বয়ংক্রিয় অল-ইন-ওয়ান স্ক্রিপ্ট চালান
PowerShell বা টার্মিনালে নিচের কমান্ডটি দিন:
```powershell
python scripts/test_p2_02_be.py
```
**যাচাই ফলাফল:**
- **Step 1 (Persona Login):** `eng_track_pway` এবং `coa_delhi_chief` উভয়ের টোকেন ইস্যু হবে।
- **Step 2 (RBAC Separation):** টোকেন ছাড়া সাবমিশনে `HTTP 401` এবং চিফ কন্ট্রোলার সাবমিট করতে গেলে `HTTP 403 Forbidden` আসবে (কারণ কন্ট্রোলাররা ব্লক অনুমোদন করেন, ইঞ্জিনিয়ারিং বিভাগ প্রস্তাব জমা দেয়)।
- **Step 3 (Coherence Rule 1):** চেইনেজ ৪৪০.২ কিমির বাইরে গেলে বা রিভার্স চেইনেজ (`start_km >= end_km`) হলে `HTTP 400 Bad Request` আসবে।
- **Step 4 (Coherence Rule 2):** ৮ ঘণ্টার বেশি বা ০ ঘণ্টার ব্লকে `HTTP 400 Bad Request` আসবে।
- **Step 5 & 6 (Valid Creation & Persistence):** পি-ওয়ে ইঞ্জিনিয়ারের বৈধ প্রস্তাব ডাটাবেসে সেভ হবে, ইউনিক ব্লক কোড তৈরি হবে (`BLK-YYYYMMDD-ENG-XXX`), সুইপ-লাইন অ্যালগরিদম কার্যকর হবে এবং ডাটাবেস থেকে `GET /api/v1/blocks/<id>/` এপিআই দিয়ে তা রিট্রিভ হবে (১০০% PASS)।

### ১৬.২ PowerShell / cURL দিয়ে লাইভ এপিআই টেস্ট
1. **প্রথমে ট্র্যাক ইঞ্জিনিয়ারের টোকেন নিন:**
```powershell
$loginRes = Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/v1/auth/login/" -Method Post -ContentType "application/json" -Body '{"username":"eng_track_pway","password":"railway@123"}'
$token = $loginRes.data.access_token
```

2. **একটি নতুন মেইনটেন্যান্স ব্লক প্রস্তাব সাবমিট করুন:**
```powershell
$blockBody = @{
    corridor = "NDLS-CNB-MAIN"
    department = "ENG"
    line_type = "DOWN"
    work_type = "Track Tamping (CSM)"
    start_km = 14.2
    end_km = 18.5
    scheduled_start_time = "2026-09-20T02:00:00+05:30"
    scheduled_end_time = "2026-09-20T05:00:00+05:30"
    gang_id = "GANG-ENG-01"
    equipment_required = "CSM-09-32"
    work_description = "Manual curl verification of block proposal"
} | ConvertTo-Json

$res = Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/v1/blocks/" -Method Post -Headers @{Authorization="Bearer $token"} -ContentType "application/json" -Body $blockBody
$res.data
```
**প্রত্যাশিত আউটপুট:** ডাটাবেসে সংরক্ষিত ব্লক অবজেক্ট, ব্লক কোড (`BLK-...`), স্ট্যাটাস এবং `sweep_report` অবজেক্ট দেখতে পাবেন।

---

## ১৭. Phase 2: Multi-Step Possession Request Form Wizard (TSK-P2-02-FE) টেস্ট নির্দেশিকা

`TSK-P2-02-FE` ধাপে ফ্রন্টএন্ডে ৪-ধাপের মাল্টি-স্টেপ উইজার্ড (`BlockRequestForm.tsx`) সরাসরি ব্যাকএন্ডের `POST /api/v1/blocks/` এপিআই এবং লাইভ কোহেরেন্স ইঞ্জিন ভ্যালিডেশনের সাথে সংযুক্ত করা হয়েছে।

### ১৭.১ ব্রাউজারে উইজার্ড ওপেন করুন
1. ব্রাউজারে যান: 👉 **`http://localhost:3000/login`**  
   *(লগইন কার্ড থেকে **`2: P-Way Track Engineer (ENG)`** সিলেক্ট করে `/eng` ড্যাশবোর্ডে প্রবেশ করুন)*
2. উপরে ডানদিকের নীল বাটন **`+ Formulate Block Request`** এ ক্লিক করুন।
3. ৪-ধাপের ইন্টারেক্টিভ উইজার্ড ওপেন হবে:
   - **STAGE 01 (Corridor & Alignment):** করিডোর, লাইন টাইপ (`DOWN`), এবং শুরু ও শেষ কিমি (`start_km`, `end_km`)।
   - **STAGE 02 (Machinery Assignment & Crew Roster):** মেশিনারি (`CSM-09-32`) এবং গ্যাং নির্বাচন (`GANG-ENG-01`)।
   - **STAGE 03 (Temporal Window):** তারিখ, শুরুর সময় (`02:00`), সময়কাল (`180 mins`) এবং বাফার মার্জিন।
   - **STAGE 04 (Traction & Safety):** ২৫kV OHE পাওয়ার কাটঅফ ও সেফটি চেকলিস্ট।

### ১৭.২ কোহেরেন্স রুলস লাইভ টেস্ট করুন (Live Simulation Toolbar)
উইজার্ডের শীর্ষে থাকা কুইক টেস্ট বারে নিচের বাটনগুলোতে ক্লিক করে লাইভ অ্যালার্ট ও ফর্ম লকিং টেস্ট করুন:
1. **`Simulate Rule 1 (Out-of-Bounds KM 458.5)`** চাপুন:
   - সাথে সাথে লাল ওয়ার্নিং ব্যানার আসবে: *"COHERENCE VIOLATION DETECTED (RULE 1: GEOGRAPHY)"*
   - নিচে `Continue` বাটনটি লক হয়ে যাবে: *"Blocked by Coherence Engine"*।
2. **`Simulate Rule 1 (Reversed Chainage)`** চাপুন:
   - রিভার্স চেইনেজ অ্যালার্ট প্রদর্শিত হবে এবং পরের ধাপে যাওয়া ব্লক করবে।
3. **`Simulate Rule 2 (9.5h Duration > 8h)`** চাপুন:
   - সময়সীমা ৮ ঘণ্টার বেশি হওয়ায় লাল ব্যানার ও সাবমিশন লক প্রদর্শিত হবে।
4. **`Reset Valid Standards`** বাটনে ক্লিক করুন:
   - সব প্যারামিটার স্ট্যান্ডার্ড ভ্যালুতে রিসেট হবে এবং ফর্মের সব স্টেজ সবুজ/নীল হয়ে যাবে।

### ১৭.৩ সরাসরি ব্যাকএন্ড ডাটাবেসে নতুন ব্লক সাবমিট করুন
1. উইজার্ডের **STAGE 01 &rarr; STAGE 02 &rarr; STAGE 03 &rarr; STAGE 04** পূরণ করে `Continue` চাপুন।
2. চতুর্থ ধাপে এসে সবুজ বাটন **`Submit Proposal for SSE Signoff`** এ ক্লিক করুন।
3. **ফলাফল:**
   - সবুজ সাকসেস টোস্ট আসবে:  
     👉 *"Block Proposal Registered: BLK-YYYYMMDD-ENG-XXX — Saved to database in state: COORDINATED"*
   - উইজার্ডটি বন্ধ হয়ে স্বয়ংক্রিয়ভাবে `/eng` ড্যাশবোর্ডের "Track Possessions" ট্যাবে ফিরে যাবে এবং নতুন প্রস্তাবিত ব্লকটি তালিকার শীর্ষে লাইভ ডাটাবেস থেকে লোড হয়ে প্রদর্শিত হবে!

---

## ১৮. Phase 2: E2E Frontend Block Proposal Submission ও Database Persistence (TSK-P2-02-TEST) টেস্ট নির্দেশিকা

`TSK-P2-02-TEST` ধাপে ফ্রন্টএন্ড পোর্ট (3000) থেকে সাবমিট করা প্রস্তাব সরাসরি ব্যাকএন্ডের (8000) PostgreSQL ডাটাবেসে সেভ হওয়া, ডিপার্টমেন্টাল লিস্টে প্রদর্শিত হওয়া এবং কোহেরেন্স ভ্যালিডেশন এরর ক্লায়েন্টে সঠিকভাবে ফেরত আসা সমন্বিতভাবে টেস্ট করা হয়েছে।

### ১৮.১ স্বয়ংক্রিয় অল-ইন-ওয়ান E2E টেস্ট স্ক্রিপ্ট চালান
PowerShell বা টার্মিনালে নিচের কমান্ডটি দিন:
```powershell
python scripts/test_p2_02_test.py
```
**যাচাই ফলাফল:**
- **Step 1 (Frontend Login):** `eng_track_pway` ইউজার ফ্রন্টএন্ড প্রক্সি (`http://localhost:3000/api/v1/auth/login/`) দিয়ে সফলভাবে লগইন করবে এবং JWT টোকেন ইস্যু হবে।
- **Step 2 (Proxy Submission):** ফ্রন্টএন্ড প্রক্সি রুট `POST http://localhost:3000/api/v1/blocks/` এ উইজার্ড পেলোড সাবমিট হয়ে `HTTP 201 Created` রেসপন্স এবং নতুন ব্লক কোড (`BLK-YYYYMMDD-ENG-XXX`) তৈরি করবে।
- **Step 3 (PostgreSQL Direct DB Query):** ব্যাকএন্ডের পোর্ট ৮০০০-এ সরাসরি কোয়েরি করে ডাটাবেসের `start_km: 18.2`, `end_km: 22.5`, গ্যাং ও ইকুইপমেন্টের ১০০% নির্ভুল পারসিস্টেন্স নিশ্চিত করবে।
- **Step 4 (Frontend List Verification):** ফ্রন্টএন্ডের ডিপার্টমেন্টাল ব্লক লিস্টে (`GET /api/v1/blocks/?department=ENG`) নতুন তৈরি ব্লকটি স্বয়ংক্রিয়ভাবে উপস্থিত থাকবে।
- **Step 5 (Coherence Rejection Propagation):** ফ্রন্টএন্ড প্রক্সি দিয়ে ভুল চেইনেজ (Rule 1) বা ৮ ঘণ্টার বেশি সময়কাল (Rule 2) সাবমিট করলে ব্যাকএন্ডের `HTTP 400` এরর মেসেজ ক্লায়েন্টে সঠিকভাবে প্রপাগেট হবে (১০০% PASS)।

### ১৮.২ ব্রাউজারে E2E ফ্লো ম্যানুয়াল টেস্ট করুন
1. ব্রাউজারে লগইন করুন: `http://localhost:3000/login` &rarr; **`2: P-Way Track Engineer (ENG)`** ক্লিক করুন।
2. নীল বাটন **`+ Formulate Block Request`** চাপুন।
3. নিচের তথ্যগুলো দিয়ে সাবমিট করুন:
   - **Start KM:** `18.2`
   - **End KM:** `22.5`
   - **Machine:** `CSM-09-32`
   - **Gang:** `GANG-ENG-01`
   - **Duration:** `180 minutes` (3.0 hours)
4. চতুর্থ ধাপে **`Submit Proposal for SSE Signoff`** চাপুন।
5. **ফলাফল:**
   - স্ক্রিনে সবুজ টোস্ট আসবে এবং "Track Possessions" টেবিলে নতুন ব্লক কোড (`BLK-...`) দেখা যাবে।
6. **অন্য একটি ব্রাউজার উইন্ডো বা ট্যাবে চিফ কন্ট্রোলার কনসোল খুলুন:**
   - ব্রাউজারে প্রাইভেট/ইনকগনিটো উইন্ডোতে যান: `http://localhost:3000/login`
   - **`1: Chief Controller (COA)`** দিয়ে লগইন করে `/coa` ড্যাশবোর্ডে যান।
   - সেখানেও ইঞ্জিনিয়ারিং বিভাগের নতুন প্রস্তাবিত ব্লকটি লাইভ ডাটাবেস থেকে তৎক্ষণাৎ দেখতে পাবেন!

---

## ১৯. Phase 2: Spatial-Temporal Sweep-Line Conflict Engine & AI Combined Block (TSK-P2-03-BE) টেস্ট নির্দেশিকা

`TSK-P2-03-BE` ধাপে ভারতীয় রেলওয়ের সেফটি স্ট্যান্ডার্ড মেনে **PostGIS 3.3 ST_Intersects / ST_Intersection**, অগমেন্টেড **TemporalIntervalTree** অ্যালগরিদম, এবং **USP #98 (AI Combined Block Recommendation Engine)** ব্যাকএন্ডে সমন্বিতভাবে বাস্তবায়িত হয়েছে।

### ১৯.১ কী কী বৈশিষ্ট্য বাস্তবায়িত হয়েছে?
1. **ম্যাথমেটিক্যাল ইন্টারভাল ট্রি (`TemporalIntervalTree`):** টাইমটেবিল স্লট ও ব্লক ডিউরেশনের মধ্যে সাময়িক ওভারল্যাপ দ্রুত লগারিদমিক টাইমে শনাক্ত করে।
2. **PostGIS জিওস্প্যাশিয়াল ইন্টারসেকশন:** রেলওয়ে ট্র্যাকের চেইনেজ স্প্যান (১.৫ কিমি ব্রেকিং ডিস্ট্যান্স বাফার সহ) এর মধ্যে ইন্টারসেকশন হিসাব করে সুনির্দিষ্ট কমন জোন বের করে।
3. **USP #98 - এআই কম্বাইন্ড ব্লক সিনার্জি ইঞ্জিন:**
   - যখন দুটি ভিন্ন ডিপার্টমেন্টের সামঞ্জস্যপূর্ণ কাজ (যেমন: ENG ট্র্যাক ট্যাম্পিং এবং TRD ২৫kV OHE ওভারহেড পরিদর্শন) একই ট্র্যাকে কাছাকাছি সময়ে পড়ে, তখন ইঞ্জিন এটিকে ধ্বংসাত্মক সংঘাতের বদলে **`SHADOW_MERGED`** হিসেবে চিহ্নিত করে।
   - অটোমেটিক সিনার্জি মেট্রিক্স হিসাব করে:
     - **ট্র্যাক ক্যাপাসিটি সেভ:** &ge; ৩.৫ ঘণ্টা
     - **যাত্রীবাহী ট্রেনের বিলম্ব প্রতিরোধ:** &ge; ১৪০ মিনিট
     - **শ্যাডো বান্ডলিং কার্যক্ষমতা:** +৫০.০% থেকে +৮৭.৫%
4. **অ্যাসিঙ্ক্রোনাস সেলেরি ওয়ার্কার টাস্ক (`apps/blocks/tasks.py`):**
   - `blocks.tasks.sweep_conflicts`: প্রতিটি ব্লক প্রস্তাব জমা বা পরিমার্জনের সাথে সাথে সেলেরির হাই-প্রায়োরিটি কিউতে স্বয়ংক্রিয় কনফ্লিক্ট সুইপ চালায়।
   - `blocks.tasks.detect_combined_blocks_for_corridor`: পুরো করিডোরে ক্রস-ডিপার্টমেন্টাল বান্ডলিং সিনার্জি স্ক্যান করে।
5. **নতুন এপিআই এন্ডপয়েন্টস:**
   - `GET /api/v1/blocks/<id>/combined-recommendation/`: নির্দিষ্ট ব্লকের জন্য USP #98 সিনার্জি পে-লোড ফেরত দেয়।
   - `GET /api/v1/blocks/recommendations/?corridor=NDLS-CNB-MAIN`: পুরো করিডোরের সকল এআই কম্বাইন্ড ব্লক পেয়ারিং ফেরত দেয়।
   - `GET /api/v1/blocks/<id>/`: `BlockDetailSerializer`-এ স্বয়ংক্রিয়ভাবে `combined_recommendation` ফিল্ড যুক্ত করে।

---

### ১৯.২ স্বয়ংক্রিয় টেস্ট স্ক্রিপ্ট চালান (Automated Verification)
PowerShell বা টার্মিনালে নিচের কমান্ডটি রান করুন:
```powershell
python scripts/test_p2_03_be.py
```
**যাচাইকরণের ৯টি ধাপ:**
- **Step 1:** `TemporalIntervalTree` ম্যাথমেটিক্যাল ওভারল্যাপ অ্যালগরিদম যাচাই।
- **Step 2:** ডকার কন্টেইনারে সরাসরি PostgreSQL-এ PostGIS `ST_Intersects` ও `ST_Intersection` ফাংশন এক্সিকিউশন।
- **Step 3:** ট্র্যাক ইঞ্জিনিয়ার (ENG) এবং OHE ইঞ্জিনিয়ার (TRD) হিসেবে JWT টোকেন সংগ্রহ।
- **Step 4:** সিনারিও B অনুযায়ী সমাপতিত (overlapping) দুটি ক্রস-ডিপার্টমেন্টাল ব্লক সাবমিট:
  - ENG ব্লক: KM 142.5 থেকে 146.2 (02:00 – 05:30 IST)
  - TRD ব্লক: KM 143.0 থেকে 145.5 (02:30 – 06:00 IST)
- **Step 5:** কনফ্লিক্ট ইঞ্জিন দ্বারা স্বয়ংক্রিয়ভাবে `SHADOW_MERGED` নির্ধারণ এবং USP #98 সিনার্জি মেট্রিক্স (3.5h সেভ, 140m বিলম্ব প্রতিরোধ) যাচাই।
- **Step 6:** `GET /api/v1/blocks/<id>/combined-recommendation/` এপিআই যাচাই (`OPTIMAL_SHADOW_BUNDLE`)।
- **Step 7:** `GET /api/v1/blocks/recommendations/?corridor=NDLS-CNB-MAIN` করিডোর-ওয়াইড সুইপ যাচাই।
- **Step 8:** ডকারে সেলেরি টাস্ক (`sweep_conflicts_task` এবং `detect_combined_blocks_for_corridor`) এক্সিকিউশন যাচাই।
- **Step 9:** `BlockDetailSerializer`-এ এমবেডেড `combined_recommendation` ফিল্ড যাচাই।
- **ফলাফল:** **100% PASS** (সবগুলো টেস্ট সফল)।

---

### ১৯.৩ ম্যানুয়াল টেস্ট নির্দেশিকা (PowerShell / REST Client)
PowerShell ওপেন করে নিচের স্ক্রিপ্টটি চালান:

1. **ইঞ্জিনিয়ার টোকেন সংগ্রহ করুন:**
```powershell
$trdLogin = Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/v1/auth/login/" -Method Post -ContentType "application/json" -Body '{"username":"trd_traction_power","password":"railway@123"}'
$token = $trdLogin.data.access_token
```

2. **করিডোরে এআই কম্বাইন্ড ব্লক রিকমেন্ডেশনস কোয়েরি করুন:**
```powershell
$recs = Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/v1/blocks/recommendations/?corridor=NDLS-CNB-MAIN" -Headers @{Authorization="Bearer $token"}
$recs.data | Format-List
```
**প্রত্যাশিত আউটপুট:**
- `is_combined_candidate`: `True`
- `candidate_blocks`: প্রস্তাবিত ব্লক কোডসমূহ
- `track_capacity_saved_hours`: `3.5`
- `train_delay_prevented_minutes`: `140`
- `shadow_bundling_efficiency`: `+50.0%`
- `synergy_tier`: `OPTIMAL_SHADOW_BUNDLE`
- `ai_rationale`: বিস্তারিত এআই ব্যাখ্যা

---

## ২০. Phase 2: Interactive Gantt Deconfliction ও AI Combined Block Card (TSK-P2-03-FE) টেস্ট নির্দেশিকা

`TSK-P2-03-FE` ধাপে ফ্রন্টএন্ডে **৪-লেন গ্যান্ট/টাইমলাইন ডিকনফ্লিকশন ভিউ (`BlockTimeline.tsx`)**, ব্লকের অভ্যন্তরে **লাইভ কনফ্লিক্ট ওয়ার্নিং ব্যাজ**, এবং **USP #98 (AI Combined Block Recommendation Card - `CombinedBlockCard.tsx`)** বাস্তবায়িত হয়েছে।

### ২০.১ ব্রাউজারে ইন্টারেক্টিভ গ্যান্ট ভিউ ওপেন করুন
1. ব্রাউজারে যান: 👉 **`http://localhost:3000/login`**  
   *(লগইন কার্ড থেকে **`2: P-Way Track Engineer (ENG)`** অথবা **`3: Traction Power Engineer (TRD)`** সিলেক্ট করুন)*
2. ড্যাশবোর্ডের ট্যাব বার থেকে **`Gantt Deconfliction`** ট্যাবে ক্লিক করুন।
3. **৪-লেনের টাইমলাইন ক্যানভাস দৃশ্যমান হবে:**
   - **LANE 1 (Civil Engineering - Track Tamping):** নীল রঙের ব্লকসমূহ।
   - **LANE 2 (Electrical Traction - 25kV OHE):** অ্যাম্বার রঙের ২৫kV পাওয়ার কাটঅফ ব্লকসমূহ।
   - **LANE 3 (Signal & Telecom - Shadow Bundled):** পান্না-সবুজ রঙের সিগন্যালিং ব্লকসমূহ।
   - **LANE 4 (Commercial Train Paths):** লাল/হলুদ রঙের রাজধানী, শতাব্দী ও ফ্রেইট ট্রেনের লাইভ স্লট।

### ২০.২ লাইভ কনফ্লিক্ট ব্যাজ ও ফিল্টারিং যাচাই
1. **কনফ্লিক্ট ব্যাজ লক্ষ্য করুন:**
   - সমাপতিত সামঞ্জস্যপূর্ণ ব্লকের ওপর উজ্জ্বল পান্না-সবুজ ব্যাজ থাকবে: **`✨ #98 SYNERGY`**।
   - ট্রেনের টাইমে বাধা সৃষ্টিকারী ব্লকের ওপর লাল পালসিং ব্যাজ থাকবে: **`⚠️ CONFLICT`**।
2. **কুইক ফিল্টার বার পরীক্ষা করুন:**
   - **`Shadow Bundles`** চাপুন: শুধুমাত্র এআই সমন্বিত শ্যাডো বান্ডল ব্লকগুলো ফিল্টার হয়ে থাকবে।
   - **`Conflicts Only`** চাপুন: শুধুমাত্র সংঘাতপূর্ণ ব্লকগুলো দৃশ্যমান হবে।
   - **`Night Window` / `24-Hour Cycle`** টগল করে রাতের প্রাইম উইন্ডো (00:00 - 06:00) ও পূর্ণ ২৪ ঘণ্টার সাইকেলের মধ্যে সুইচ করুন।

### ২০.৩ ইন্টারেক্টিভ সিলেকশন ও AI Combined Block Card (#98) পরীক্ষা
1. গ্যান্ট চার্টের যেকোনো একটি ব্লকের ওপর ক্লিক করুন:
   - ব্লকটির চারপাশে উজ্জ্বল সায়ান (Cyan) হাইলাইট রিং জ্বলে উঠবে।
   - নিচে স্বয়ংক্রিয়ভাবে **`Selected Possession Details`** ড্রয়ারটি খুলে যাবে।
2. যদি ব্লকটি এআই কম্বাইন্ড ব্লকের অংশ হয়, তবে ড্রয়ারে সরাসরি প্রিমিয়াম **AI Combined Block Recommendation Card (USP #98)** ফুটে উঠবে:
   - **হেডার:** `AI COMBINED BLOCK RECOMMENDATION (USP #98)` • `OPTIMAL_SHADOW_BUNDLE`
   - **পেয়ারিং ম্যাট্রিক্স:** বামে ENG ট্র্যাক ট্যাম্পিং বনাম ডানে TRD ২৫kV OHE পরিদর্শন (স্প্যাশিয়াল ওভারল্যাপ: ২.৫০ কিমি)।
   - **সিনার্জি ট্রায়াড মেট্রিক্স:**
     - ⚡ **Track Capacity Saved:** `+3.5 Hours` (উজ্জ্বল সবুজ)
     - ⏱️ **Train Delay Prevented:** `~140 Mins` (উজ্জ্বল সায়ান)
     - 📍 **Unified Window & Span:** `02:30 to 06:00 IST` • `KM 142.500 to KM 146.200`
   - **AI Strategic Rationale:** দুটি আলাদা ব্লক না দিয়ে একটি যৌথ ব্লকে ২৫kV পাওয়ার বন্ধ করে কীভাবে ডুপ্লিকেট ট্র্যাক ডাউনটাইম শূন্য করা হয়েছে তার বিস্তারিত বিবরণ।
3. **`Synchronize & Co-Sanction (USP #98)`** বাটনে ক্লিক করুন:
   - বাটনটি সাথে সাথে সফলভাবে **`✓ SHADOW BUNDLE SYNCHRONIZED`** অবস্থায় পরিবর্তিত হবে!

---

## ২১. Phase 2: Scenario B E2E Overlapping Blocks & AI Synergy (TSK-P2-03-TEST) টেস্ট নির্দেশিকা

`TSK-P2-03-TEST` ধাপে **Scenario B (ক্রস-ডিপার্টমেন্টাল ট্র্যাক পজেশন ওভারল্যাপ ও শ্যাডো বান্ডলিং)** ফ্রন্টএন্ড প্রক্সি (Port 3000) থেকে ব্যাকএন্ড ডাটাবেস ও PostGIS এআই ইঞ্জিনের মাধ্যমে সমন্বিতভাবে এন্ড-টু-এন্ড টেস্ট করা হয়েছে।

### ২১.১ স্বয়ংক্রিয় অল-ইন-ওয়ান টেস্ট স্ক্রিপ্ট চালান
PowerShell বা টার্মিনালে নিচের কমান্ডটি রান করুন:
```powershell
python scripts/test_p2_03_test.py
```

**যাচাইকরণের ধাপসমূহ ও ফলাফল:**
- **Step 1:** ফ্রন্টএন্ড পোর্ট ৩০০০-এর মাধ্যমে `eng_track_pway` এবং `trd_traction_power` ব্যবহারকারীদের লগইন করিয়ে JWT টোকেন ইস্যু।
- **Step 2:** ফ্রন্টএন্ড রিভার্স প্রক্সি (`http://localhost:3000/api/v1/blocks/proposals/`) দিয়ে Scenario B ব্লকের সাবমিশন:
  - **ENG ব্লক:** KM 142.500 থেকে 146.200 (CSM-09-32 ট্র্যাক ট্যাম্পিং, 02:00 – 05:30 IST)।
  - **TRD ব্লক:** KM 143.000 থেকে 145.500 (RU-04 টাওয়ার ওয়াগন, ২৫kV OHE পরিদর্শন, 02:30 – 06:00 IST)।
  - উভয় প্রস্তাব `HTTP 201 Created` রিটার্ন করে ডাটাবেসে নতুন ব্লক আইডি পায়।
- **Step 3:** PostGIS কনফ্লিক্ট ইঞ্জিন দ্বারা সমাপতিত ২.৫০ কিমি ট্র্যাকের ওভারল্যাপ স্বয়ংক্রিয়ভাবে **`SHADOW_MERGED`** হিসেবে শ্রেণিবদ্ধ হওয়া।
- **Step 4:** `GET http://localhost:3000/api/v1/blocks/<id>/combined-recommendation/` দ্বারা USP #98 মেট্রিক্স যাচাই:
  - ট্র্যাক ক্যাপাসিটি সেভ: `+3.5 Hours`
  - ট্রেনের বিলম্ব প্রতিরোধ: `~140 Minutes`
  - বান্ডলিং কার্যক্ষমতা: `+50.0%`
  - সিনার্জি টিয়ার: `OPTIMAL_SHADOW_BUNDLE`
- **Step 5:** পুরো করিডোরের সকল এআই কম্বাইন্ড বান্ডল `GET /api/v1/blocks/recommendations/` এ সফলভাবে তালিকাভুক্ত হওয়া।
- **Step 6:** ব্লকের বিস্তারিত প্রোফাইলে (`/api/v1/blocks/<id>/`) এমবেডেড কনফ্লিক্ট ও রিকমেন্ডেশন ফিল্ডের উপস্থিতি নিশ্চিতকরণ।
- **Step 7:** ফ্রন্টএন্ড এসপিএ (Single-Page App) পোর্ট ৩০০০-এ লাইভ এবং রেসপন্সিভ থাকা।
- **ফলাফল:** **100% PASS** (সবগুলো টেস্ট সফল)।

---

### ২১.২ ব্রাউজারে সম্পূর্ণ সিনারিও B ম্যানুয়াল টেস্ট করুন
1. **ব্রাউজারে যান:** 👉 **`http://localhost:3000/login`**
2. **`2: P-Way Track Engineer (ENG)`** হিসেবে লগইন করে ড্যাশবোর্ডের **`Gantt Deconfliction`** ট্যাবে যান।
3. **LANE 1 (Civil ENG)** এবং **LANE 2 (Electrical TRD)**-এ সমাপতিত ব্লকগুলোর অবস্থান লক্ষ্য করুন (রাত ০২:০০ থেকে ০৬:০০ এর মধ্যে KM 142.5 – 146.2 স্প্যানে)।
4. ব্লকগুলোর ওপর পান্না-সবুজ রঙের **`✨ #98 SYNERGY`** ব্যাজটি ক্লিক করুন:
   - নিচে ড্রয়ারে সোনালী ও সায়ান বর্ডারে ঘেরা **AI Combined Block Recommendation Card (USP #98)** প্রদর্শিত হবে।
   - সেখানে স্পষ্ট দেখতে পাবেন কীভাবে ENG ও TRD ব্লককে সমন্বিত করে ৩.৫ ঘণ্টা ট্র্যাকের সময় বাঁচানো হয়েছে এবং ১৪০ মিনিট সম্ভাব্য ট্রেন ডিলে রোধ করা হয়েছে।
5. **`Synchronize & Co-Sanction (USP #98)`** বাটনে চাপ দিন — বাটনটি সবুজ হয়ে **`✓ SHADOW BUNDLE SYNCHRONIZED`** দেখাবে।

---

## ২২. Phase 2: Chief Controller Sanctioning ও Optimistic Concurrency Locking (TSK-P2-04-BE) টেস্ট নির্দেশিকা

`TSK-P2-04-BE` ধাপে চিফ কন্ট্রোলার (COA) কর্তৃক ব্লক অনুমোদন/প্রত্যাখ্যানের **`POST /api/v1/blocks/<id>/sanction/`** এন্ডপয়েন্ট এবং ডাটাবেস লেভেলে রেস কন্ডিশন প্রতিরোধের জন্য **Optimistic Concurrency Locking (`version`)** বাস্তবায়িত হয়েছে।

### ২২.১ কী কী বৈশিষ্ট্য বাস্তবায়িত হয়েছে?
1. **RBAC রোল সেপারেশন অব ডিউটিজ:**
   - ডিপার্টমেন্টাল ইঞ্জিনিয়াররা (`DEPT_ENGINEER`) কেবল প্রস্তাব জমা দিতে পারেন; নিজের বা অন্যের ব্লকে অনুমোদন দেওয়ার অনুমতি নেই (চেষ্টা করলে `HTTP 403 Forbidden` ফেরত আসে)।
   - কেবল অনুমোদিত চিফ কন্ট্রোলার (`coa_delhi_chief`) অথবা সিস্টেম অ্যাডমিন ব্লক অনুমোদন বা বাতিল করতে পারেন।
2. **অপটিমিস্টিক কনকারেন্সি কন্ট্রোল (`version`):**
   - প্রতিটি ব্লকের ডাটাবেসে একটি পূর্ণসংখ্যা `version` থাকে (ডিফল্ট: ১)।
   - ক্লায়েন্টকে বর্তমান `version` পাঠাতে হয়। যদি অন্য কোনো কন্ট্রোলার ইতিমধ্যে ব্লকটি পরিবর্তন করে ফেলে (`block.version != submitted_version`), তবে এপিআই সাথে সাথে **`HTTP 409 Conflict`** এরর দিয়ে রিকোয়েস্ট আটকে দেয়।
   - প্রতিটি সফল অনুমোদনে `version` স্বয়ংক্রিয়ভাবে ১ বৃদ্ধি পায় (`version += 1`)।
3. **অনুমোদন অ্যাকশনসমূহ:**
   - **`SANCTION`:** পূর্ণ অনুমোদন। ব্লকের স্ট্যাটাস `SANCTIONED` হয় এবং অনুমোদকের নাম ও সময় সিলমোহর করা হয়।
   - **`CONDITIONAL_SANCTION`:** শর্তযুক্ত অনুমোদন। ট্র্যাকে গতি সীমাবদ্ধতা (যেমন: ৩০ কিমি/ঘণ্টা কশন স্পিড) এবং কন্ট্রোলারের মন্তব্য ব্লকের বিবরণে রেকর্ড হয়।
   - **`REJECT`:** প্রস্তাব প্রত্যাখ্যান। প্রত্যাখ্যানের কারণ `rejection_reason`-এ লিপিবদ্ধ হয়।

---

### ২২.২ স্বয়ংক্রিয় টেস্ট স্ক্রিপ্ট চালান (Automated Verification)
PowerShell বা টার্মিনালে নিচের কমান্ডটি রান করুন:
```powershell
python scripts/test_p2_04_be.py
```

**যাচাইকরণের ৮টি ধাপ:**
- **Step 1:** ট্র্যাক ইঞ্জিনিয়ার ও চিফ কন্ট্রোলার হিসেবে JWT টোকেন সংগ্রহ।
- **Step 2:** নতুন ব্লক প্রস্তাব সাবমিট করে প্রারম্ভিক `version=1` যাচাই।
- **Step 3:** ইঞ্জিনিয়ার দ্বারা অনুমোদনের চেষ্টা করলে `HTTP 403 Forbidden` ও আন-অথেন্টিকেটেড হলে `HTTP 401` পাওয়া।
- **Step 4:** চিফ কন্ট্রোলার দ্বারা সফল পূর্ণ অনুমোদন (`HTTP 200 OK`, `version 1 -> 2`, স্ট্যাটাস `SANCTIONED`)।
- **Step 5:** পুরনো স্টেল ভার্সন ১ দিয়ে পুনরায় সাবমিট করার চেষ্টা করলে **`HTTP 409 Conflict`** প্রত্যাখ্যান নিশ্চিতকরণ।
- **Step 6:** ৩০ কিমি/ঘণ্টা স্পিড ক্যাপ সহ শর্তযুক্ত অনুমোদন (`CONDITIONAL_SANCTION`) যাচাই।
- **Step 7:** সুস্পষ্ট কারণ সহ চিফ কন্ট্রোলারের প্রস্তাব প্রত্যাখ্যান (`REJECT`) যাচাই।
- **Step 8:** প্রত্যাখ্যাত ব্লকে পুনরায় অনুমোদনের অবৈধ ট্রানজিশন চেষ্টা করলে `HTTP 400 Bad Request` ব্লক নিশ্চিতকরণ।
- **ফলাফল:** **100% PASS** (সবগুলো টেস্ট সফল)।

---

### ২২.৩ ম্যানুয়াল টেস্ট নির্দেশিকা (PowerShell / REST Client)
PowerShell ওপেন করে নিচের স্ক্রিপ্টটি চালান:

1. **চিফ কন্ট্রোলার টোকেন সংগ্রহ করুন:**
```powershell
$coaLogin = Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/v1/auth/login/" -Method Post -ContentType "application/json" -Body '{"username":"coa_delhi_chief","password":"railway@123"}'
$token = $coaLogin.data.access_token
```

2. **একটি ব্লকে অপটিমিস্টিক লক সহ অনুমোদন দিন:**
```powershell
$body = @{
    action = "SANCTION"
    version = 1
    remarks = "Sanction approved by Chief Controller"
} | ConvertTo-Json

$res = Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/v1/blocks/<BLOCK_ID>/sanction/" -Method Post -Headers @{Authorization="Bearer $token"} -ContentType "application/json" -Body $body
$res.data.status # প্রদর্শিত হবে: SANCTIONED
$res.data.version # প্রদর্শিত হবে: 2
```

3. **স্টেল ভার্সন ১ দিয়ে পুনরায় একই কমান্ড চালিয়ে কনকারেন্সি এরর টেস্ট করুন:**
```powershell
# পুনরায় version: 1 পাঠালে সার্ভার HTTP 409 Conflict ফেরত দেবে
try {
    Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/v1/blocks/<BLOCK_ID>/sanction/" -Method Post -Headers @{Authorization="Bearer $token"} -ContentType "application/json" -Body $body
} catch {
    $_.Exception.Response.StatusCode.value__ # প্রদর্শিত হবে: 409
}
```

---

## ২৩. Phase 2: COA কমান্ড কনসোল ও ওয়ান-ক্লিক স্যাংশনিং ইউজার ইন্টারফেস (`TSK-P2-04-FE`)

`TSK-P2-04-FE` ধাপে চিফ অপারেটিং কন্ট্রোলারের (COA) জন্য কমান্ড কনসোলে ওয়ান-ক্লিক স্যাংশনিং টার্মিনাল, অপটিমিস্টিক কনকারেন্সি কন্ট্রোল (`version`) ব্যাজ, HTTP 409 কনফ্লিক্ট নোটিফিকেশন ব্যানার এবং শর্তযুক্ত অনুমোদন উইন্ডো সম্পূর্ণ ফ্রন্টএন্ডে বাস্তবায়িত হয়েছে।

### ২৩.১ কী কী বৈশিষ্ট্য বাস্তবায়িত হয়েছে?
1. **অপটিমিস্টিক কনকারেন্সি লক ভার্সন চিপ (`v{block.version}`):**
   - পেন্ডিং কিউ কার্ডে এবং স্যাংশন টার্মিনাল হেডারে সাইবার-লক আইকন সহ বর্তমান ডেটাবেস ভার্সন (যেমন `v1`, `v2`) স্পষ্টভাবে প্রদর্শিত হয়।
2. **HTTP 409 কনকারেন্সি কনফ্লিক্ট অ্যালার্ট ব্যানার:**
   - একাধিক কন্ট্রোলার একই ব্লকে সমান্তরালভাবে সিদ্ধান্ত নিলে স্টেল রিকোয়েস্ট আটকে লাল/অ্যাম্বার সাইবার ব্যানার আসে:
     - ডেটাবেসের বর্তমান ভার্সন বনাম সাবমিট করা ভার্সন স্পষ্টভাবে নির্দেশ করে।
     - "Reload Latest Track Possession" বাটনে ক্লিক করে সাথে সাথে ডেটাবেসের সর্বশেষ অবস্থা রিলোড করা যায়।
3. **মাল্টি-অ্যাকশন স্যাংশনিং বোতামসমূহ:**
   - **SANCTION BLOCK (সবুজ):** এক ক্লিকে চিফ কন্ট্রোলার এন্ডোর্সমেন্ট রিমার্কস সহ অনুমোদন প্রদান।
   - **Conditional Sanction (হলুদ):** ১৫ থেকে ৯০ কিমি/ঘণ্টা স্পিড ক্যাপ স্লাইডার সহ সেফগার্ড সতর্কতা প্রয়োগ।
   - **Return for Revision (লাল):** জুনিয়র ইঞ্জিনিয়ারের কাছে সংশোধনীর জন্য সুনির্দিষ্ট নির্দেশনাসহ ব্লক ফেরত পাঠানো।
4. **অ্যান্টি-ডাবল-সাবমিশন ও লোডিং স্পিনার:**
   - এপিআই কল চলাকালীন বোতামগুলো নিষ্ক্রিয় (disabled) হয়ে যায় এবং ঘূর্ণায়মান `Loader2` স্পিনার লোড হয়, ফলে আকস্মিক ডাবল সাবমিশন সম্পূর্ণ প্রতিরোধ হয়।

---

### ২৩.২ ব্রাউজারে টেস্ট নির্দেশিকা (Browser Manual Verification)
1. ব্রাউজারে `http://localhost:3000/login` এ যান।
2. চিফ কন্ট্রোলার ক্রেডেনশিয়াল দিয়ে লগইন করুন:
   - **Username:** `chief_controller` (বা `coa_delhi_chief`)
   - **Password:** `Password123!` (বা `railway@123`)
3. নেভিগেট করুন: `http://localhost:3000/control-room` (বা `/coa`)।
4. **বাম পাশের Pending Possession Queue:**
   - দেখুন প্রতিটি ব্লকের পাশে `v1` ব্যাজ প্রদর্শিত হচ্ছে।
   - একটি ব্লকে ক্লিক করে নির্বাচন করুন।
5. **ডান পাশের Sanction Terminal:**
   - ব্লকের কোডের পাশে লক আইকন সহ `v1` এবং বর্তমান স্ট্যাটাস দেখুন।
   - রিমার্কস বক্সে লিখুন: `Authorized for night work corridor.`
   - **`SANCTION BLOCK`** বোতামে ক্লিক করুন।
   - লক্ষ্য করুন:
     - স্পিনার সক্রিয় হবে এবং বোতাম ডিসেবল হবে।
     - সবুজ সাফল্য ব্যানার আসবে: `✓ Possession successfully SANCTIONED. Concurrency version incremented to v2.`
     - পেন্ডিং কিউ এবং হেডারে ভার্সন সাথে সাথে `v2` তে উন্নীত হবে।
6. **Conditional Sanction পরীক্ষা করুন:**
   - অন্য একটি ব্লকে ক্লিক করুন।
   - **`Conditional Sanction`** এ ক্লিক করুন।
   - স্পিড ক্যাপ স্লাইডারে `30 km/h` সেট করুন।
   - **`Endorse Conditional Sanction`** এ ক্লিক করুন &rarr; শর্তযুক্ত অনুমোদন নিশ্চিত হবে।
7. **Return for Revision পরীক্ষা করুন:**
   - অন্য ব্লকে ক্লিক করে **`Return for Revision`** এ ক্লিক করুন।
   - রিভিশন নির্দেশনায় লিখুন: `Reschedule after 03:00 IST` &rarr; প্রস্তাবটি প্রত্যাখ্যাত হয়ে সংশ্লিষ্ট বিভাগে ফেরত যাবে।

---

## ২৪. Phase 2: COA অনুমোদন, অপটিমিস্টিক লকিং ও কনকারেন্সি টেস্ট স্যুট (`TSK-P2-04-TEST`)

`TSK-P2-04-TEST` ধাপে ফ্রন্টএন্ড রিভার্স প্রক্সি (Port 3000), ব্যাকএন্ড রেস্ট এপিআই (Port 8000), এবং PostgreSQL ডেটাবেস স্তরে অপটিমিস্টিক কনকারেন্সি কন্ট্রোল (`version`), চিফ কন্ট্রোলার স্যাংশনিং, এবং HTTP 409 কনফ্লিক্ট রিজেকশন স্বয়ংক্রিয়ভাবে টেস্ট করা হয়েছে।

### ২৪.১ স্বয়ংক্রিয় টেস্ট স্ক্রিপ্ট চালান (Automated E2E Verification)
PowerShell বা টার্মিনালে নিচের কমান্ডটি রান করুন:
```powershell
python scripts/test_p2_04_test.py
```

**যাচাইকরণের ৯টি ধাপ:**
- **Step 1:** ফ্রন্টএন্ড প্রক্সি (Port 3000)-এর মাধ্যমে চিফ কন্ট্রোলার ও ট্র্যাক ইঞ্জিনিয়ার হিসেবে প্রমাণীকরণ (JWT টোকেন সংগ্রহ)।
- **Step 2:** ফ্রন্টএন্ড প্রক্সির মাধ্যমে নতুন ট্র্যাক ট্যাম্পিং প্রস্তাব জমা দিয়ে প্রাথমিক `version=1` যাচাই।
- **Step 3:** সেপারেশন অফ ডিউটিজ (Separation of Duties) - ডিপার্টমেন্টাল ইঞ্জিনিয়ার অনুমোদন করতে গেলে `HTTP 403 Forbidden` পাওয়া।
- **Step 4:** চিফ কন্ট্রোলার কর্তৃক অনুমোদন - ভার্সন ইনক্রিমেন্ট `v1 -> v2` এবং স্ট্যাটাস `SANCTIONED` হওয়া।
- **Step 5:** সরাসরি PostgreSQL ডেটাবেসের `apps_blocks_block` টেবিল অডিট করে `status=SANCTIONED` এবং `version=2` নিশ্চিতকরণ।
- **Step 6:** সমান্তরাল কন্ট্রোলার কলিশন পরীক্ষা - পুরনো স্টেল `version=1` সাবমিট করার চেষ্টা করলে সার্ভার কর্তৃক **`HTTP 409 Conflict`** (`BLK-409`, current 2 vs submitted 1) প্রত্যাখ্যান নিশ্চিতকরণ।
- **Step 7:** শর্তযুক্ত অনুমোদন - ৪৫ কিমি/ঘণ্টা স্পিড ক্যাপ সহ কশন অর্ডার (`CO-BLK-...-45KMH`) জেনারেশন ও `version=2` নিশ্চিতকরণ।
- **Step 8:** প্রস্তাব প্রত্যাখ্যান - সুনির্দিষ্ট কারণসহ চিফ কন্ট্রোলার কর্তৃক রিজেকশন (`REJECTED`) ও `version=2` নিশ্চিতকরণ।
- **Step 9:** ফ্রন্টএন্ড প্রক্সির মাধ্যমে লাইভ ব্লকস তালিকা ফেচ করে আপডেটেড স্ট্যাটাস ও ভার্সন ২ নিশ্চিতকরণ।
- **ফলাফল:** **100% PASS** (সবগুলো টেস্ট সফল)।

---

## ২৫. Phase 2: ট্রেন মাস্টার সময়সূচি, লাইভ রানিং অবস্থান ও ১২টি মাস্টার ট্রেনের COA ইনজেশন (`TSK-P2-05-BE`) টেস্ট নির্দেশিকা

`TSK-P2-05-BE` ধাপে ভারতীয় রেলওয়ের কন্ট্রোল অফিস অ্যাপ্লিকেশন (COA) ও FOIS ফিড অনুকরণে নয়াদিল্লি – কানপুর সেন্ট্রাল (NDLS–CNB) গোল্ডেন করিডোরের জন্য ১২টি মাস্টার ট্রেনের ডেটাবেস মডেল, স্টেশন স্টপেজ সিডিউল, ডাব্লিউজিএস-৮৪ (WGS-84) জিওডেটিক কোঅর্ডিনেট ইন্টারপোলেশন ইঞ্জিন এবং ব্যাকএন্ড টেলিমেট্রি সিমুলেশন এন্ডপয়েন্ট সফলভাবে বাস্তবায়িত হয়েছে।

### ২৫.১ কী কী বৈশিষ্ট্য বাস্তবায়িত হয়েছে?
1. **ট্রেন মাস্টার ও লাইভ স্ট্যাটাস মডেল সম্প্রসারণ (`apps/trains/models.py`):**
   - `Train` মডেলে ট্রেনের দিক (`UP` / `DOWN`), যাত্রী ধারণক্ষমতা (`pax_capacity`), সর্বোচ্চ অনুমোদিত গতি (`max_speed_kmh`), ট্র্যাকশন টাইপ (`ELECTRIC`), এবং র্যাকের দৈর্ঘ্য (`length_meters`) যুক্ত করা হয়েছে।
   - `TrainLiveStatus` মডেলে ট্রেনের অক্ষাংশ (`latitude`), দ্রাঘিমাংশ (`longitude`), ট্রেনের গতিপথের কোণ বা হেডিং (`heading` ০–৩৬০°), এবং ট্রেনের বর্তমান ট্র্যাক সেকশন (`current_section`) ফিল্ড যুক্ত করা হয়েছে।
2. **ডাব্লিউজিএস-৮৪ জিওডেটিক ইন্টারপোলেশন ইঞ্জিন (`apps/trains/tasks.py`):**
   - করিডোরের ৬টি প্রধান স্টেশন ওয়েপয়েন্ট (NDLS, GZB, ALJN, TDL, ETW, CNB) বরাবর ট্রেনের বর্তমান কিলোমিটারের ভিত্তিতে অক্ষাংশ ও দ্রাঘিমাংশ ইন্টারপোলেট করা হয়।
   - ট্রেনের লাইনের দিক অনুযায়ী ল্যাটারাল প্যারালাল ট্র্যাক অফসেট (+0.0004° DOWN / -0.0004° UP) এবং সঠিক কম্পাস হেডিং (122° DOWN / 302° UP) প্রদান করা হয়।
3. **১২টি ক্যানোনিকাল মাস্টার ট্রেন ফিড ইনজেশন:**
   - **১. 12301:** হাওড়া – নয়াদিল্লি রাজধানী এক্সপ্রেস (UP, ১৩০ কিমি/ঘণ্টা, ১২৫০ যাত্রী)
   - **২. 12424:** নয়াদিল্লি – ডিব্রুগড় রাজধানী এক্সপ্রেস (DOWN, ১৪০ কিমি/ঘণ্টা, ১২৫০ যাত্রী)
   - **৩. 12004:** নয়াদিল্লি – লখনউ স্বর্ণ শতাব্দী এক্সপ্রেস (DOWN, ১৪০ কিমি/ঘণ্টা, ৯৮০ যাত্রী)
   - **৪. 22436:** নয়াদিল্লি – বারাণসী বন্দে ভারত এক্সপ্রেস (DOWN, ১৬০ কিমি/ঘণ্টা, ১১২৮ যাত্রী)
   - **৫. 12417:** প্রয়াগরাজ এক্সপ্রেস (UP, ১১০ কিমি/ঘণ্টা, ১৫০০ যাত্রী)
   - **৬. 20801:** মগধ এক্সপ্রেস (DOWN, ১১০ কিমি/ঘণ্টা, ১৬০০ যাত্রী)
   - **৭. 12419:** গোমতী এক্সপ্রেস (UP, ১১০ কিমি/ঘণ্টা, ১৪০০ যাত্রী)
   - **৮. 12397:** মহাবোধি এক্সপ্রেস (DOWN, ১১০ কিমি/ঘণ্টা, ১৫৫০ যাত্রী)
   - **৯. BOXN-998:** কয়লা বোঝাই বাল্ক মালগাড়ি (UP, ৭৫ কিমি/ঘণ্টা)
   - **১০. CONT-402:** কনকর কন্টেইনার এক্সপোর্ট এক্সপ্রেস (DOWN, ৯০ কিমি/ঘণ্টা)
   - **১১. POL-551:** আইওসিএল পেট্রোলিয়াম ট্যাংকার স্পেশাল (UP, ৭০ কিমি/ঘণ্টা)
   - **১২. BCN-774:** খাদ্যশস্য ও সিমেন্ট মালগাড়ি (DOWN, ৭৫ কিমি/ঘণ্টা)
4. **নতুন রেস্ট এপিআই এন্ডপয়েন্টসমূহ:**
   - `GET /api/v1/trains/catalog/`: সমস্ত মাস্টার ট্রেনের ক্যাটালগ ও ফিল্টারিং।
   - `GET /api/v1/trains/<number>/schedule/`: ট্রেনের স্টেশন স্টপেজ তালিকা ও প্ল্যাটফর্ম নম্বর।
   - `GET /api/v1/trains/live/`: ট্রেনের লাইভ রানিং অবস্থান ও জিপিএস কোঅর্ডিনেটস।
   - `POST /api/v1/trains/live/`: ট্রেনের গতিবিধির সিমুলেশন টিক চালনা।
   - `POST /api/v1/trains/ingest/`: COA টাইমটেবিল ফিড ডেটাবেসে পুনরায় ইনজেস্ট ও সিঙ্ক করা।

---

### ২৫.২ স্বয়ংক্রিয় টেস্ট স্ক্রিপ্ট চালান (Automated Backend Verification)
PowerShell বা টার্মিনালে নিচের কমান্ডটি দিন:
```powershell
python scripts/test_p2_05_be.py
```

**যাচাইকরণের ৮টি ধাপ:**
- **Step 1:** চিফ কন্ট্রোলার ক্রেডেনশিয়াল দিয়ে প্রমাণীকরণ (JWT টোকেন সংগ্রহ)।
- **Step 2:** `GET /api/v1/trains/catalog/` এপিআই কল করে ১২টি মাস্টার ট্রেন ক্যাটালগ যাচাই (বন্দে ভারত ১৬০ কিমি/ঘণ্টা, DOWN, ১১২৮ ক্যাপাসিটি)।
- **Step 3:** `GET /api/v1/trains/12424/schedule/` এপিআই কল করে রাজধানী এক্সপ্রেসের ৬টি স্টপেজের সময়সূচি ও প্ল্যাটফর্ম যাচাই।
- **Step 4:** `GET /api/v1/trains/live/` এপিআই কল করে লাইভ ট্রেনের অক্ষাংশ (২৬°–২৯°), দ্রাঘিমাংশ (৭৭°–৮১°), হেডিং কোণ এবং বর্তমান সেকশন যাচাই।
- **Step 5:** টেলিমেট্রি ফিল্টারিং যাচাই (`direction=UP` এবং `status=ON_TIME`)।
- **Step 6:** `POST /api/v1/trains/ingest/` এন্ডপয়েন্টের মাধ্যমে COA টাইমটেবিল ফিড স্বয়ংক্রিয় ইনজেশন যাচাই (১২টি ট্রেন ও ৭০টি স্টপেজ আপডেট)।
- **Step 7:** `POST /api/v1/trains/live/` এন্ডপয়েন্টে ৬০ সেকেন্ডের সিমুলেশন টিক চালিয়ে ২২৪৩৬ ট্রেনের গতিবিধি যাচাই (KM ৭২.০০০ &rarr; ৭৪.৫৮৩)।
- **Step 8:** সরাসরি ডকার PostgreSQL কনটেইনারের `trains_train`, `trains_trainschedule`, `trains_trainlivestatus` টেবিল অডিট।
- **ফলাফল:** **100% PASS** (সবগুলো টেস্ট সফল)।

---

### ২৫.৩ ম্যানুয়াল টেস্ট নির্দেশিকা (PowerShell / REST Client)
PowerShell উইন্ডোতে নিচের ধাপগুলো রান করে ব্যাকএন্ড টেলিমেট্রি এপিআই যাচাই করতে পারেন:

1. **টোকেন সংগ্রহ করুন:**
```powershell
$login = Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/v1/auth/login/" -Method Post -ContentType "application/json" -Body '{"username":"chief_controller","password":"Password123!"}'
$token = $login.data.access_token
```

2. **লাইভ ট্রেনের জিপিএস কোঅর্ডিনেট কোয়েরি করুন:**
```powershell
$live = Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/v1/trains/live/" -Headers @{Authorization="Bearer $token"}
$live.data.active_live_trains | Format-Table train_number, current_km, latitude, longitude, heading, speed_kmh, status
```

3. **৬০ সেকেন্ডের সিমুলেশন মুভমেন্ট টিক দিন:**
```powershell
$tick = Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/v1/trains/live/" -Method Post -Headers @{Authorization="Bearer $token"} -ContentType "application/json" -Body '{"delta_seconds": 60}'
$tick.data # প্রদর্শিত হবে: simulated_trains ও delta_seconds
```

---

## ২৬. Phase 2: ৬০ FPS লাইভ ট্রেন ট্র্যাকিং মার্কার, স্পিড ব্যাজ ও ম্যাপ সিমুলেশন কন্ট্রোলস (`TSK-P2-05-FE`) টেস্ট নির্দেশিকা

`TSK-P2-05-FE` ধাপে ফ্রন্টএন্ড ম্যাপ ক্যানভাসে (`RailMap.tsx` ও `TrainMarker.tsx`) ৬০ FPS `requestAnimationFrame` ইঞ্জিন, লাইভ টেলিমেট্রি পোলিং হুক (`useLiveTrains.ts`), ঘূর্ণায়মান কম্পাস হেডিং শেভ্রন, গতি ও সময়ানুবর্তিতা পিল ব্যাজ এবং টপ সিমুলেশন কন্ট্রোল বার সম্পূর্ণ সমন্বিত হয়েছে।

### ২৬.১ কী কী নতুন ভিজ্যুয়াল ও আর্কিটেকচারাল উপাদান যুক্ত হয়েছে?
1. **৬০ FPS `requestAnimationFrame` স্মুথ ইন্টারপোলেশন ইঞ্জিন (`RailMap.tsx`):**
   - ব্রাউজারের প্রতিটি অ্যানিমেশন ফ্রেমে (১৬.৬৭ মিলিসেকেন্ড) ট্রেনের গতি অনুযায়ী সাব-পিক্সেল স্মুথ মুভমেন্ট সম্পন্ন হয়, ফলে মার্কার লাফিয়ে লাফিয়ে চলার বদলে রিয়েল-টাইমে মসৃণভাবে ট্র্যাকে অগ্রসর হয়।
   - নয়াদিল্লি থেকে কানপুর সেন্ট্রাল পর্যন্ত ৪৪০.২ কিমি ট্রাঙ্ক লাইনের ৬টি প্রধান গোল্ডেন স্টেশন (NDLS, GZB, ALJN, TDL, ETW, CNB) সুনির্দিষ্টভাবে ম্যাপে নোড হিসেবে চিহ্নিত।
2. **ডাইনামিক রোটেশন ও কম্পাস হেডিং শেভ্রন (`TrainMarker.tsx`):**
   - ট্রেনের চলার অভিমুখ অনুযায়ী মার্কারের তীরচিহ্ন স্বয়ংক্রিয়ভাবে অ্যাঙ্গেল পরিবর্তন করে:
     - **DOWN লাইন (নয়াদিল্লি &rarr; কানপুর সেন্ট্রাল):** দক্ষিণ-পূর্বাভিমুখী ১২২° কম্পাস হেডিং।
     - **UP লাইন (কানপুর সেন্ট্রাল &rarr; নয়াদিল্লি):** উত্তর-পশ্চিমাভিমুখী ৩০২° কম্পাস হেডিং।
3. **ক্যাটাগরি-ভিত্তিক স্পিড ও লুমিনেসেন্স পিল ব্যাজ:**
   - **Prestige Superfast (বন্দে ভারত ২২৪৩৬ ও রাজধানী এক্সপ্রেস ১২৩০১/১২৪২৪):** সায়ান ও বেগুনী গ্লো সহ ১৬০/১৪০ কিমি/ঘণ্টা স্পিড ব্যাজ এবং রেডার পালসিং ওয়েভ।
   - **Shatabdi (স্বর্ণ শতাব্দী ১২০০৪):** হলুদ ও অ্যাম্বার নিয়ন ব্যাজ।
   - **Freight (কনকর CONT-402, কয়লা র্যাক BOXN-998, BCN, POL):** গাঢ় স্লেট ও অ্যাম্বার শিল্পোন্নত ব্যাজ।
   - **Express (গোমতী, প্রয়াগরাজ, মহাবোধি):** পান্না-সবুজ ব্যাজ।
4. **পাংকচুয়ালিটি ও ডিলে ব্যাজ:**
   - ট্রেন সময়মতো থাকলে পান্না-সবুজ **`RT` (Right-Time)** ব্যাজ।
   - লেট থাকলে অ্যাম্বার সতর্কতা ব্যাজ (যেমন **`+15m`**)।
5. **টপ টেলিমেট্রি কন্ট্রোল ও ফিল্টার টুলবার:**
   - **লাইন ফিল্টার:** `ALL (12)`, `UP (5)`, `DOWN (7)` চিপ বোতাম দিয়ে নির্দিষ্ট ট্র্যাকের ট্রেন ফিল্টার করা।
   - **অটো-মুভ টগল:** `Auto-Move ON/OFF` বোতামে ক্লিক করে রিয়েল-টাইম অটোমেটিক সিমুলেশন সক্রিয়/নিষ্ক্রিয় করা।
   - **ম্যানুয়াল স্টেপ বোতাম:** `Step +30s` বোতামে ক্লিক করলে এক ক্লিকে ৩০ সেকেন্ডের মুভমেন্ট ট্র্যাকে প্রদর্শিত হয়।
   - **বটম HUD স্ট্রিপ:** `60 FPS RAF ENGINE` স্ট্যাটাস পালস, সক্রিয় ট্রেনের সংখ্যা, সময়মতো চলা ট্রেনের সংখ্যা এবং বিলম্বিত ট্রেনের লাইভ কাউন্টার।

---

### ২৬.২ ব্রাউজারে ইন্টারেক্টিভ ম্যাপ টেস্ট নির্দেশিকা
1. ব্রাউজারে যান: 👉 **`http://localhost:3000/map`** (অথবা লগইন করে টপ নেভিগেশনের **`Corridor Map`** এ ক্লিক করুন)।
2. **ম্যাপ ক্যানভাসে ট্রেন পর্যবেক্ষণ করুন:**
   - ট্র্যাকে বিভিন্ন কালার-কোডেড মার্কার লক্ষ্য করুন।
   - মার্কারের গায়ে স্পিড ব্যাজ (যেমন `160 km/h`, `130 km/h`, `75 km/h`) এবং দিক নির্দেশনা (`DOWN` বা `UP`) দেখুন।
3. **ঘূর্ণায়মান হেডিং যাচাই করুন:**
   - কানপুরের দিকে যাওয়া ট্রেনগুলোর তীরচিহ্ন ১২২° কোণে হেলে আছে।
   - দিল্লির দিকে আসা ট্রেনগুলোর তীরচিহ্ন ৩০২° কোণে বিপরীতমুখী হয়ে আছে।
4. **টুলবার ফিল্টার পরীক্ষা করুন:**
   - উপরের কন্ট্রোল বারে **`UP Trains`** বাটনে ক্লিক করুন: শুধু নয়াদিল্লিমুখী আপ ট্রেনগুলো ট্র্যাকে থাকবে।
   - **`DOWN Trains`** বাটনে ক্লিক করুন: শুধু কানপুরমুখী ডাউন ট্রেনগুলো প্রদর্শিত হবে।
   - **`ALL`** চাপলে পুনরায় সব ১২টি ট্রেন একসাথে প্রদর্শিত হবে।
5. **সিমুলেশন গতিবিধি পরীক্ষা করুন:**
   - **`Step +30s`** বাটনে ক্লিক করুন: দেখুন সমস্ত ট্রেন ট্র্যাকে ৩০ সেকেন্ডের সমান দূরত্ব মসৃণভাবে এগিয়ে গেছে।
   - **`Auto-Move ON`** চালু থাকলে প্রতি ৪ সেকেন্ড অন্তর স্বয়ংক্রিয়ভাবে ট্রেনের মুভমেন্ট ট্র্যাকে রিফ্রেশ হবে।
6. **বিস্তারিত ট্র্যাকিং কার্ড ওপেন করুন:**
   - যেকোনো ট্রেনের মার্কারের ওপর কার্সার হোভার করুন বা ক্লিক করুন:
   - নিচে বিস্তারিত ব্ল্যাক-গ্লাস কার্ড খুলবে, যেখানে ট্রেনের নাম, রেকের দৈর্ঘ্য, বগি সংখ্যা, যাত্রী ধারণক্ষমতা (`1250 Pax`), বর্তমান কিলোমিটার পোস্ট (`KM 72.000`), এবং বর্তমান সেকশন (`GZB - ALJN`) স্পষ্টভাবে দৃশ্যমান হবে।

---

## ২৭. Phase 2: ৬০ FPS ট্রেন ট্র্যাকিং ও কাইনেমেটিক সিমুলেশন স্বয়ংক্রিয় ভেরিফিকেশন (`TSK-P2-05-TEST`) টেস্ট নির্দেশিকা

`TSK-P2-05-TEST` ধাপে ফ্রন্টএন্ড এবং ব্যাকএন্ডের গতিবিদ্যা (kinematics), ৬০ FPS সাব-ফ্রেম ইন্টারপোলেশন অ্যালগরিদম, পোস্টজিআইএস সমান্তরাল ট্র্যাক অফসেট ($\pm 0.0004^\circ$), ১২টি ক্যানোনিকাল ট্রেনের স্থানাঙ্ক সীমা এবং প্রোডাকশন বান্ডল স্বয়ংক্রিয়ভাবে টেস্ট করা হয়েছে।

### ২৭.১ স্বয়ংক্রিয় টেস্ট স্ক্রিপ্ট চালান (Automated E2E Suite)
PowerShell বা টার্মিনালে নিচের কমান্ডটি দিন:
```powershell
python scripts/test_p2_05_test.py
```

**যাচাইকরণের ৬টি ধাপ:**
- **Step 1 (স্প্যাশিয়াল স্প্লাইন ও ল্যাটারাল সেপারেশন):** ডাউন লাইন ও আপ লাইনের মধ্যে $\pm 0.0004^\circ$ অফসেট যাচাই করে নিশ্চিত করা হয়েছে যে মুখোমুখি ট্রেনগুলো একই ট্র্যাকে সংঘর্ষে না গিয়ে সমান্তরাল ডবল ট্র্যাকে পাশাপাশি অতিক্রম করবে ($\Delta Lat=0.0008^\circ, \Delta Lon=0.0008^\circ$ সেপারেশন)।
- **Step 2 (৬০ FPS কাইনেমেটিক ডিসপ্লেসমেন্ট):** ১৮০০টি অ্যানিমেশন ফ্রেমে (৩০ সেকেন্ড $\times$ ৬০ FPS) বন্দে ভারত এক্সপ্রেসের (১৬০ কিমি/ঘণ্টা) গতিবিধি হিসাব করে গাণিতিক তাত্ত্বিক স্থানান্তর ($1.3333$ কিমি) এবং সিমুলেটেড স্থানান্তর ($1.3333$ কিমি) ১০০% নিখুঁতভাবে মিলেছে।
- **Step 3 (১২টি ক্যানোনিকাল মাস্টার ট্রেন অডিট):** ১২টি ট্রেনের প্রতিটি স্থানাঙ্ক করিডোরের ভৌগোলিক বাউন্ডারি (অক্ষাংশ ২৬.০°–২৯.০° N, দ্রাঘিমাংশ ৭৭.০°–৮১.০° E) এবং সঠিক কম্পাস হেডিংয়ের মধ্যে অবস্থান করছে।
- **Step 4 (ফ্রন্টএন্ড কোড কন্ট্রাক্ট অডিট):** `TrainMarker.tsx`, `RailMap.tsx`, `useLiveTrains.ts`, এবং `api.ts` ফাইলে ৬০ FPS `requestAnimationFrame` ইঞ্জিন, রোটেটিং হেডিং, স্পিড ও পাংকচুয়ালিটি ব্যাজ, সিমুলেশন কন্ট্রোল এবং টাইপস্ক্রিপ্ট ইন্টারফেসের উপস্থিতি নিশ্চিতকরণ।
- **Step 5 (টেলিমেট্রি সার্ভিস যাচাই):** লাইভ এপিআই স্ট্যাটাস ও অফলাইন কাইনেমেটিক ইঞ্জিনের ফলব্যাক ডায়াগনস্টিক অডিট।
- **Step 6 (প্রোডাকশন বান্ডল ইন্টিগ্রিটি):** `frontend/dist/assets/index-BzEoqCM4.js` (৬৪৩.৩৫ KB) প্রোডাকশন অ্যাসেটের বৈধতা ও সাইজ যাচাই।
- **ফলাফল:** **100% PASS** (সবগুলো টেস্ট সফল)।

---

## ২৮. Phase 2: গ্যাং ও হেভি ইকুইপমেন্ট রোস্টার এবং রুল ৩ এক্সক্লুসিভিটি টেস্ট নির্দেশিকা (`TSK-P2-06`)

`TSK-P2-06` ধাপে ডিপার্টমেন্টাল গ্যাং রোস্টার (৬টি মাস্টার গ্যাং), হেভি ট্র্যাক মেশিনারি (৫টি প্রধান মেশিন), রিয়েল-টাইম অ্যাভেইল্যাবিলিটি ফিল্টারিং, ফ্রন্টএন্ড উইজার্ড সিলেকশন এবং Coherence Rule 3 (Resource Exclusivity & 40 km/h Travel Physics) সম্পূর্ণ কার্যকর করা হয়েছে।

---

### ২৮.১ ব্রাউজারে গ্যাং ও ইকুইপমেন্ট সিলেকশন ম্যানুয়াল টেস্ট

1. ব্রাউজারে যান এবং লগইন করুন:  
   👉 **`http://localhost:3000/eng`** (লগইন পেজে **`2: P-Way Track Engineer (ENG)`** কার্ডে ক্লিক করলেই সরাসরি প্রবেশ করবেন)।
2. **নতুন ব্লক রিকোয়েস্ট উইজার্ড ওপেন করুন:**  
   - ড্যাশবোর্ডের উপরে ডানপাশে থাকা উজ্জ্বল **`+ Request New Block`** বোতামটিতে ক্লিক করুন।
3. **Step 1: করিডোর ও ট্র্যাক প্যারামিটার পূরণ করুন:**  
   - করিডোর সিলেক্ট করুন: `New Delhi - Ghaziabad Up Main Line (NDLS-GZB-UP)`
   - লাইন ওরিয়েন্টেশন: `UP Main Line`
   - কিলোমিটার চেইনেজ: Start KM: `10.0`, End KM: `14.5`
   - কাজের ধরন: `Track Tamping (CSM)`
   - নিচে ডানপাশে থাকা **`Next: Machinery & Gangs →`** বোতামে ক্লিক করুন।
4. **Step 2: লাইভ গ্যাং ও হেভি মেশিনারি যাচাই করুন (TSK-P2-06):**
   - **মেশিনারি ড্রপডাউন পর্যবেক্ষণ করুন:**  
     - উপরে পান্না-সবুজ রঙের **`● 5 Units Ready`** লাইভ ব্যাজ দেখতে পাবেন।
     - ড্রপডাউনে ক্লিক করলে ডেটাবেস থেকে ৫টি সার্টিফায়েড মেশিন প্রদর্শিত হবে:
       1. `CSM-NR-092 — Plasser 09-32 CSM Continuous Track Tamper (AVAILABLE)`
       2. `BCM-NR-104 — Plasser RM-80 Ballast Cleaning Machine (AVAILABLE)`
       3. `DTS-NR-62N — Plasser Dynamic Track Stabilizer (AVAILABLE)`
       4. `TW-NR-8812 — 8-Wheeler High-Speed OHE Tower Wagon (AVAILABLE)`
       5. `USFD-NR-03 — Ultrasonic Flaw Detection Digital Trolley (AVAILABLE)`
   - **গ্যাং রোস্টার ড্রপডাউন পর্যবেক্ষণ করুন:**  
     - উপরে সায়ান রঙের **`● 6 Gangs Seeded`** লাইভ ব্যাজ দেখতে পাবেন।
     - ড্রপডাউনে ৬টি করিডোর গ্যাং তালিকাভুক্ত থাকবে (যেমন: `GANG-ENG-PWAY-04 (Suresh Singh) — SBB (Crew: 14)` এবং `GANG-ENG-PWAY-07 — ALJN (Crew: 16)` ইত্যাদি)।
   - **লাইভ মেটাডেটা বক্স:**  
     - মেশিন সিলেক্ট করার সাথে সাথে নিচে মেশিনের ফিটনেস মেয়াদ (`2027-01-18 (VALID FIT)`), গ্যাংয়ের হেডকোয়ার্টার্স স্টেশন ও চেইনেজ স্প্যান (`SBB (KM 0.0 - 28.5)`), এবং সুপারভাইজারের নাম ও মোট ক্রু সংখ্যা লাইভ আপডেট হবে।

---

### ২৮.২ Coherence Rule 3 এক্সক্লুসিভিটি ও ডাবল-বুকিং প্রতিরোধ পরীক্ষা

1. একই দিনে একই সময়ে দুটি ব্লকে একই গ্যাং (যেমন: `GANG-ENG-PWAY-04`) বুক করার চেষ্টা করলে:
   - ব্যাকএন্ডের AI Coherence Engine তাত্ক্ষণিকভাবে প্রস্তাবটি বাতিল করবে এবং স্ক্রিনে লাল রঙের ওয়ার্নিং টোস্ট দেখাবে:  
     `COHERENCE-RULE-3: Resource Exclusivity Violation: Gang 'GANG-ENG-PWAY-04' double-booked across overlapping block windows!`
2. দূরবর্তী দুটি স্থানে ৪০ কিমি/ঘণ্টার চেয়ে বেশি দ্রুত স্থানান্তরের প্রয়োজন হলে:  
   - সিস্টেম জানাবে:  
     `Travel Physics Violation: Gang requires > 40.0 km/h relocation speed.`

---

### ২৮.৩ স্বয়ংক্রিয় ব্যাকএন্ড ও E2E টেস্ট স্ক্রিপ্ট চালান

টার্মিনাল বা PowerShell-এ নিচের কমান্ড দুটি চালিয়ে ১০০% স্বয়ংক্রিয় ভেরিফিকেশন দেখে নিতে পারেন:

#### ১. ব্যাকএন্ড টেস্ট চালান:
```powershell
python scripts/test_p2_06_be.py
```
*যাচাইকৃত বিষয়:* ৬টি গ্যাং ও ৫টি মেশিনের উপস্থিতি, ডিপার্টমেন্ট ও স্টেশন ফিল্টারিং, এবং একই গ্যাং ডাবল-বুকিংয়ের সময় Rule 3 রিজেকশন (HTTP 400)।

#### ২. সম্পূর্ণ এন্ড-টু-এন্ড টেস্ট চালান:
```powershell
python scripts/test_p2_06_test.py
```
*যাচাইকৃত বিষয়:* ফ্রন্টএন্ড-ব্যাকএন্ড লাইভ কানেক্টিভিটি, ৩টি ডিপার্টমেন্টের (ENG, TRD, SNT) রোস্টার সেগ্রিগেশন, মেশিনারি ফিটনেস সার্টিফিকশন এবং ৪০ কিমি/ঘণ্টা রিলোকেশন ফিজিক্স পরীক্ষা।

---

### ২৮.৪ ম্যানুয়াল ব্যাকএন্ড টেস্ট নির্দেশিকা (PowerShell / REST Client)

PowerShell উইন্ডোতে নিচের ধাপগুলো রান করে ব্যাকএন্ড গ্যাং রোস্টার ও Rule 3 ডাবল-বুকিং এপিআই সরাসরি যাচাই করতে পারেন:

1. **টোকেন সংগ্রহ করুন (`eng_track_pway`):**
```powershell
$login = Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/v1/auth/login/" -Method Post -ContentType "application/json" -Body '{"username":"eng_track_pway","password":"railway@123"}'
$token = $login.data.access_token
```

2. **৬টি মাস্টার গ্যাং রোস্টার কোয়েরি করুন:**
```powershell
$gangs = Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/v1/departments/gangs/" -Headers @{Authorization="Bearer $token"}
$gangs.data.gangs | Format-Table gang_number, department_code, headquarters_station, crew_strength, supervisor_name
```

3. **৫টি হেভি মেশিনারি ও ফিটনেস কোয়েরি করুন:**
```powershell
$eq = Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/v1/departments/equipment/?fit_only=true" -Headers @{Authorization="Bearer $token"}
$eq.data.equipment | Format-Table equipment_code, equipment_name, equipment_type, home_depot, operational_status, fitness_expiry_date
```

4. **নির্দিষ্ট উইন্ডোতে গ্যাং ফাঁকা আছে কি না চেক করুন:**
```powershell
$avail = Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/v1/departments/gangs/?start_time=2026-11-05T02:00:00Z&end_time=2026-11-05T05:00:00Z" -Headers @{Authorization="Bearer $token"}
$avail.data.gangs | Format-Table gang_number, headquarters_station
```

5. **ডাবল-বুকিং ট্রাই করে Coherence Rule 3 রিজেকশন দেখুন:**
```powershell
$body = @{
    corridor_code = "NDLS-GZB-UP"
    line_type = "UP"
    work_type = "TRACK_TAMPING"
    start_km = 10.0
    end_km = 14.5
    scheduled_start_time = "2026-11-05T03:00:00Z"
    scheduled_end_time = "2026-11-05T06:00:00Z"
    department_code = "ENG"
    gang_id = "GANG-ENG-PWAY-04"
    equipment_required = "CSM-NR-092"
    work_description = "Test overlapping block reservation"
} | ConvertTo-Json

try {
    Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/v1/blocks/proposals/" -Method Post -Headers @{Authorization="Bearer $token"} -ContentType "application/json" -Body $body
} catch {
    $_.ErrorDetails.Message # প্রদর্শিত হবে: COHERENCE-RULE-3 Resource Exclusivity Violation
}
```

---

## ২৯. Phase 3: Daphne ASGI Channels ও Redis Pub/Sub রিয়েল-টাইম পুশ-টু-ইনভ্যালিডেট টেস্ট নির্দেশিকা (`TSK-P3-01-BE`)

`TSK-P3-01-BE` ধাপে Daphne ASGI ওয়েবসকেট ইঞ্জিন (Port 8001), Redis 7 Pub/Sub ব্রোকার, JWT অথেনটিকেশন মিডলওয়্যার এবং প্রমিত **Push-to-Invalidate Event Architecture** (`INVALIDATE_CACHE`, `BLOCK_UPDATE`) সম্পূর্ণরূপে কার্যকর করা হয়েছে।

---

### ২৯.১ আর্কিটেকচার ওভারভিউ (Why Push-to-Invalidate?)

ঐতিহ্যগত সিস্টেমে প্রতিবার পেজ রিফ্রেশ করতে হয় অথবা প্রতি সেকেন্ডে ব্যাকএন্ডে ভারী পোলিং রিকোয়েস্ট পাঠাতে হয়। কিন্তু এই প্ল্যাটফর্মে:
1. ব্যাকএন্ডের ড্যাফনি (Daphne) ও রেডিস (Redis) চ্যানেল লেয়ার সার্বক্ষণিক সচল থাকে।
2. কোনো সেকশন বা চিফ কন্ট্রোলার যখনই কোনো ব্লক অনুমোদন (`SANCTIONED`), প্রস্তাব (`PROPOSED`), সক্রিয় (`ACTIVATED`) বা বাতিল (`CANCELLED`) করেন, ব্যাকএন্ড মাত্র ০.৩ মিলি-সেকেন্ডের মধ্যে করিডোরের সংশ্লিষ্ট সমস্ত ক্লায়েন্টকে একটি লাইটওয়েট ইভেন্ট পাঠায়:
   ```json
   {
     "type": "INVALIDATE_CACHE",
     "domain": "BLOCKS",
     "resource": "blocks",
     "action": "SANCTIONED",
     "block_code": "BLK-20260920-ENG-014",
     "status": "SANCTIONED",
     "version": 2
   }
   ```
3. ব্রাউজার এই বার্তাটি পাওয়ামাত্র TanStack Query ক্যাশ ইনভ্যালিডেট করে ব্যাকগ্রাউন্ডে নিখুঁত ডাটা রিফেচ করে নেয়—**কোনো ম্যানুয়াল পেজ রিফ্রেশ (F5) প্রয়োজন হয় না!**

---

### ২৯.২ স্বয়ংক্রিয় ব্যাকএন্ড টেস্ট স্ক্রিপ্ট চালান (Automated Verification)

PowerShell বা টার্মিনালে নিচের কমান্ডটি চালিয়ে ৮-স্টেপ সম্পূর্ণ স্বয়ংক্রিয় অডিট দেখে নিতে পারেন:

```powershell
python scripts/test_p3_01_be.py
```

**এই স্ক্রিপ্টটি যা যা যাচাই করে:**
1. **Daphne Handshake:** `ws://127.0.0.1:8001/ws/corridor/NDLS-GZB-UP/` এ সফল সংযোগ ও ৩টি রেডিস গ্রুপে অটো-সাবস্ক্রিপশন (`corridor_ndls-gzb-up`, `corridor_ndls-gzb`, `corridor_all`)।
2. **Ping/Pong Latency:** ১.৪২ মিলি-সেকেন্ডের হার্টবিট রাউন্ডট্রিপ (লক্ষ্যমাত্রা: ২০ মিলি-সেকেন্ডের নিচে)।
3. **JWT Bearer Auth:** ওয়েবসকেট ইউআরএলে `?token=...` দিয়ে ক্লায়েন্টকে `eng_track_pway` হিসেবে সনাক্তকরণ এবং ইউজার ও ডিপার্টমেন্ট চ্যানেলে যোগদান।
4. **Block Proposal Broadcast:** এপিআই দিয়ে নতুন ব্লক সাবমিটের সাথে সাথে ০.২৯ মিলি-সেকেন্ডে ওয়েবসকেটে `INVALIDATE_CACHE` ইভেন্ট গ্রহণ।
5. **Block Sanction Broadcast:** চিফ কন্ট্রোলার ব্লক অনুমোদন করার পর ০.২৩ মিলি-সেকেন্ডে `action: SANCTIONED` ও `version: 2` ইভেন্ট প্রাপ্তি।
6. **Multi-Client Concurrency:** একই সাথে একাধিক ব্রাউজার/ক্লায়েন্ট যুক্ত থাকলে প্রত্যেকে একই ফ্রেমে যুগপৎ আপডেট পাওয়ার নিশ্চয়তা।
7. **Database Audit:** PostgreSQL-এর `notifications_notification` টেবিলে নোটিফিকেশন তৈরি ও `WEBSOCKET_INAPP` ডেলিভারি লগ স্টোর হওয়া।

---

### ২৯.৩ ব্রাউজারে ২-উইন্ডো স্প্লিট-স্ক্রিন লাইভ টেস্ট (Jury / Visual Demo)

বিচারক বা পরীক্ষকদের সামনে সবচেয়ে আকর্ষণীয়ভাবে ডেমো প্রদর্শনের জন্য:

1. আপনার মনিটরে পাশাপাশি দুটি ব্রাউজার উইন্ডো (Split Screen) খুলুন:
   - **বামপাশের উইন্ডো:** যান `http://localhost:3000/coa` (চিফ কন্ট্রোলার লগইন)।
   - **ডানপাশের উইন্ডো:** যান `http://localhost:3000/eng` (পি-ওয়ে ট্র্যাক ইঞ্জিনিয়ার লগইন)।
2. **ডানপাশের উইন্ডো (ENG) থেকে:**
   - **`+ Request New Block`** বোতাম চাপুন।
   - কিলোমিটার ১০.০ থেকে ১৪.৫ সিলেক্ট করে সাবমিট করুন।
3. **বামপাশের উইন্ডো (COA) লক্ষ্য করুন:**
   - কোনো পেজ রিলোড বা F5 প্রেস ছাড়াই তৎক্ষণাৎ নতুন ব্লকটি স্ক্রিনে ভেসে উঠবে।
4. **বামপাশের উইন্ডো (COA) থেকে:**
   - ব্লকটির পাশে থাকা **`Approve / Sanction`** বোতামে ক্লিক করুন।
5. **ডানপাশের উইন্ডো (ENG) লক্ষ্য করুন:**
   - সাথে সাথে ডানপাশের উইন্ডোতে ব্লকটি সবুজ রঙের **`SANCTIONED`** স্ট্যাটাসে রূপান্তরিত হবে।

---

### ২৯.৪ ম্যানুয়াল টার্মিনাল টেস্ট (PowerShell / Python WebSocket Listener)

PowerShell থেকে সরাসরি লাইভ ওয়েবসকেট কানেক্ট করে ইভেন্ট শুনতে নিচের এক লাইনের কমান্ডটি চালাতে পারেন:

```powershell
python -c "import asyncio, websockets;
async def listen():
    async with websockets.connect('ws://127.0.0.1:8001/ws/corridor/NDLS-GZB-UP/') as ws:
        print('Connected! Waiting for real-time corridor events...');
        while True:
            msg = await ws.recv();
            print('-> Live Event Received:', msg)
asyncio.run(listen())"
```
*(এই লিসেনারটি চালু থাকা অবস্থায় আপনি ব্রাউজারে বা পোস্টম্যানে যেকোনো ব্লক তৈরি বা অনুমোদন করলে সাথে সাথে টার্মিনালে পুশ-টু-ইনভ্যালিডেট ফ্রেম প্রিন্ট হবে।)*




