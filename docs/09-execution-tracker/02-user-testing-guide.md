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

## ২. সিস্টেমে প্রবেশের উপায় (Frictionless Access & 1-Click Login)

- **লোকাল ইউআরএল:** `http://localhost:3000/login`

### ২.১ ১-ক্লিক পার্সোনা লগইন (পাসওয়ার্ড ছাড়াই পরীক্ষা করুন)
লগইন পেজে বিচারক ও পরীক্ষকদের সুবিধার জন্য ৬টি রেডিমেড পার্সোনা কার্ড দেওয়া আছে। যেকোনো একটিতে ক্লিক করলেই আপনি সংশ্লিষ্ট ড্যাশবোর্ডে প্রবেশ করবেন:
- **`1: Chief Controller (COA)`** &rarr; সরাসরি সেন্ট্রাল কন্ট্রোল ড্যাশবোর্ডে (`/coa`) নিয়ে যাবে।
- **`2: P-Way Track Engineer (ENG)`** &rarr; সিভিল ট্র্যাক ড্যাশবোর্ডে (`/eng`) নিয়ে যাবে।
- **`3: Traction Power (TRD)`** &rarr; ইলেকট্রিক্যাল ওএইচই ড্যাশবোর্ডে (`/trd`) নিয়ে যাবে।
- **`4: Signal & Telecom (S&T)`** &rarr; সিগন্যাল ও ইন্টারলকিং ড্যাশবোর্ডে (`/snt`) নিয়ে যাবে।
- **`5: Section Controller (DLI)`** &rarr; সেকশন টাইমটেবিল তদারকিতে নিয়ে যাবে।
- **`6: Lead Administrator`** &rarr; অ্যাডমিন মাস্টার ডেটা কনসোলে নিয়ে যাবে।

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
```

---

## ৬. প্রশ্নোত্তর ও সাধারণ জিজ্ঞাসা (FAQ)

- **প্রশ্ন: আমি কি যেকোনো পাসওয়ার্ড দিয়ে লগইন করতে পারি?**  
  *উত্তর:* হ্যাঁ, পরীক্ষক ও বিচারকদের দ্রুত টেস্ট করার সুবিধার্থে ডেমো মোডে পাসওয়ার্ড যাচাই বাইপাস রাখা হয়েছে। তবে আপনি যদি মূল প্রোফাইল ক্রেডেনশিয়াল দিতে চান, তবে ইউজারনেম `coa_delhi_chief` এবং পাসওয়ার্ড `railway@123` দিলে ডেটাবেস থেকে আসল Argon2id হ্যাশিং যাচাই হয়ে JWT টোকেন ইস্যু হবে।

- **প্রশ্ন: ব্লক তৈরি করলে কি তা ডেটাবেসে স্থায়ী হয়?**  
  *উত্তর:* হ্যাঁ, ফর্ম থেকে সাবমিট করা বা `+5 Blocks` বাটন দিয়ে তৈরি করা প্রতিটি ব্লক সরাসরি PostgreSQL-এর `apps_blocks_block` টেবিলে স্থায়ীভাবে সেভ হয় এবং রিফ্রেশ করলেও অক্ষুণ্ণ থাকে।
