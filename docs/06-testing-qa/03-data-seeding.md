# 03-data-seeding.md

> **ফাইল ক্রম:** ৪৮/৫৯  
> **ডিরেক্টরি:** `06-testing-qa/`  
> **সার্ভিস স্কোপ:** Master Ground-Truth Corridor Dataset, Continuous Coherence Engine & Scenario Builder Platform (`apps/demo`)  
> **পূর্ববর্তী ফাইল:** [06-testing-qa/02-load-test-strategy.md](file:///c:/work%20pase/Railway-Project-for-SIH/docs/06-testing-qa/02-load-test-strategy.md) (k6 Load & Stress Test Strategy)  
> **পরবর্তী ফাইল:** [06-testing-qa/04-security-audit-report.md](file:///c:/work%20pase/Railway-Project-for-SIH/docs/06-testing-qa/04-security-audit-report.md) (Security Audit & Vulnerability Assessment Report)  
> **সংযোগ ও উদ্দেশ্য:** এই ফাইলে ভারতীয় রেলওয়ের প্রামাণ্য নয়াদিল্লি–কানপুর (NDLS–CNB) ট্রাঙ্ক করিডোরের ভৌগোলিক ডেটাসেট, PostGIS স্প্যাশিয়াল লাইনস্ট্রিং, ১২টি ট্রেনের মাস্টার টাইমটেবিল, বিভাগীয় গ্যাং ও যন্ত্রপাতি, এবং স্মার্ট ইন্ডিয়া হ্যাকাথন (SIH PS 26027)-এর জন্য একটি স্বয়ংসম্পূর্ণ **Continuous Demo Data Engine & Dynamic Scenario Builder Platform** বিস্তারিতভাবে লিপিবদ্ধ করা হয়েছে।

---

# Master Demo Data, Continuous Coherence Engine & Scenario Builder

## 1. Executive Summary & Why Coherent Data is Mission-Critical

> *"Random data দিলে প্রজেক্ট মরে যাবে। Coherent data না হলে ১১৬/১২২টি ফিচারের কোনোটাও বিশ্বাসযোগ্যভাবে জুরি ও বিচারকদের সামনে demo করা সম্ভব নয়।"*

ভারতীয় রেলওয়ের ব্লক প্ল্যানিং একটি জটিল, মাল্টি-ডোমেন ও ইন্টার-ডিপেন্ডেন্ট অপারেশনাল সমস্যা। যদি ডেমো ডেটায় লজিক্যাল অসঙ্গতি থাকে (যেমন: কানপুর সেকশনের গ্যাং একই সময়ে আলিগড়ে কাজ করছে, অথবা বন্ধ ব্লকের ওপর দিয়ে রাজধানী এক্সপ্রেস ১২০ কিমি/ঘণ্টায় ছুটে চলেছে), তবে সিস্টেমের AI সিদ্ধান্ত সম্পূর্ণ অবিশ্বাস্য হয়ে পড়ে।

এই সমস্যা সমাধানের জন্য আর্কিটেকচারে একটি **Hybrid Continuous Demo Engine** যুক্ত করা হয়েছে, যা **Deterministic + Controlled Randomness + Dynamic Streaming** নীতিতে কাজ করে:
1. **Deterministic Master Data:** স্থির ভৌগোলিক করিডোর ও স্টেশন কোঅর্ডিনেট (`NDLS-CNB-MAIN`), প্রামাণ্য ১২টি ট্রেন ও টাইমটেবিল।
2. **Coherence Engine (Rules Enforcer):** ৭টি অপরিবর্তনীয় রেলওয়ে বিধি যা নিশ্চিত করে তৈরি করা প্রতিটি ডেটা ১০০% ভ্যালিড।
3. **4 Generation Modes:** `SEED_GEN` (ফিক্সড সিড ২৬০২৭), `RANDOM_GEN` (নিয়ন্ত্রিত বৈচিত্র্য), `STREAM_GEN` (রিয়েল-টাইম ইভেন্ট স্ট্রিম), এবং `SCENARIO_GEN` (স্ক্রিপ্টেড প্রেজেন্টেশন স্টোরি)।
4. **Dynamic Scenario Builder:** জুরি বা বিচারকের পছন্দমতো যেকোনো নতুন ড্রামাটিক সিনারিও সহজে তৈরি ও এক ক্লিকে রান করার ফ্রেমওয়ার্ক।

---

## 2. Step 1: Feature-Data Dependency Matrix (Excel Master Mapping)

প্ল্যাটফর্মের ১১৬/১২২টি ফিচারের মধ্যে **৩৫টি ফিচার সম্পূর্ণভাবে ডেটা-নির্ভর (Data-Dependent)**। এই ৩৫টি ফিচারের সুনির্দিষ্ট ডেটা না থাকলে কোর প্ল্যাটফর্মের কোনো বাস্তবসম্মত প্রদর্শন সম্ভব নয়:

| ফিচার # | ফিচার নাম | নির্ভরশীল ডেটাসেট (Required Data) | ডেটা না থাকলে কী ব্যর্থ হবে (Failure Impact) |
|---|---|---|---|
| **#98** | ⭐ **Combined Block Window (USP)** | ENG এবং TRD বিভাগের ওভারল্যাপিং ব্লক রিকোয়েস্ট ও ট্র্যাক স্পেস | প্ল্যাটফর্মের প্রধান USP (ট্র্যাক সময় সাশ্রয়) প্রদর্শন করা যাবে না। |
| **#114** | **Train Time Table Master** | ১২টি ট্রেনের রুট, শিডিউল ও ৫-৬টি করে স্টেশন স্টপ | AI ব্লক প্ল্যানিংয়ের বেস প্যাসেঞ্জার ট্র্যাফিক ডেটা শূন্য থাকবে। |
| **#115** | **Delay Cascade Recalculator** | লাইভ ট্রেন লেট ও ব্লক ওভারল্যাপ ইন্টারভাল | "Breathing Plan" এবং ডাউনস্ট্রিম লেট প্রপাগেশন ডেমো ব্যর্থ হবে। |
| **#116** | **Schedule Deviation Detector** | NTES-স্টাইল লাইভ ট্রেন অবস্থান ও স্পিড ভেক্টর | রিয়েল-টাইম কন্ট্রোল রুম ও ডিসপ্যাচ ড্যাশবোর্ড অকেজো দেখাবে। |
| **#92** | **CoF × LoF Risk Matrix** | ডিফেক্টের Consequence of Failure ও Likelihood of Failure স্কোর | স্মার্ট প্রায়োরিটি স্কোরিং ও কালার হিটম্যাপ দেখানো যাবে না। |
| **#93** | **Defect Aging Score** | ৩৮ দিন ও ৩০০ দিন পুরনো ওভারডিউ ট্র্যাক ডিফেক্ট হিস্ট্রি | "ঘুমন্ত ও দীর্ঘস্থায়ী লুক্কায়িত ঝুঁকি" চিহ্নিতকরণ গল্প বলা যাবে না। |
| **#94** | **"Why #1?" Explanation Card** | নিউরো-সিম্বলিক AI সিদ্ধান্তের ব্যাকগ্রাউন্ড যুক্তি ও প্রমাণ | বিচারকদের *"আমরা AI-কে কেন বিশ্বাস করব?"* প্রশ্নের কোনো উত্তর থাকবে না। |
| **#31-#32** | **AI Conflict Detection & Resolution** | একই সেকশন ও সময়ে ২টি বিভাগের ব্লক রিকোয়েস্ট | সুইপ-লাইন কনফ্লিক্ট অ্যালগরিদম ও ডিপার্টমেন্টাল ডি-কনফ্লিক্টশন ব্যর্থ হবে। |
| **#71** | **Digital Token Handover** | কন্ট্রোল রুম ↔ ফিল্ড গ্যাং ক্রিপ্টোগ্রাফিক টোকেন আদান-প্রদান | ডিজিটাল লাইফ-সেফটি প্রোটোকল ও ওয়ার্ক অথরাইজেশন দেখানো যাবে না। |
| **#76** | **Train Approach Warning** | ব্লক সেকশনের ২-৩ স্টেশন দূরে ধেয়ে আসা ট্রেনের লাইভ অবস্থান | গ্যাং কর্মীদের জীবন রক্ষাকারী প্রক্সিমিটি সাইরেন অ্যালার্ম প্রদর্শিত হবে না। |
| **#45-#47** | **TMS / SMMS / TDMS Integration** | ট্র্যাক ফ্র্যাকচার, সিগন্যাল ফেইলিওর ও OHE লগের সিন্থেটিক ফিড | মাল্টি-সোর্স ডেটা ইনজেশন ও ইউনিফাইড অ্যাসেট প্ল্যাটফর্ম প্রমাণ হবে না। |
| **#86** | **Unified Asset Registry** | একই অ্যাসেটের ৩টি সিস্টেম ID ম্যাপিং (`TMS`, `SMMS`, `TDMS`) | ক্রস-সিস্টেম ডিজিটাল টুইন এবং ইন্টার-ডিপার্টমেন্টাল লিঙ্কেজ নষ্ট হবে। |
| **#81** | **Tool Count Verification (LOTO)** | ইনিশিয়াল ও ফাইনাল টুলের সংখ্যা এবং ট্যাগ হিস্ট্রি | কাজ শেষে ট্র্যাক ক্লিয়ারেন্সের সাইবার-ফিজিক্যাল সেফটি গেট অকেজো হবে। |
| **#82** | **Geo-Tagged Track Clearance Photo** | এক্সিফ মেটাডেটা (GPS Lat/Lng, Timestamp) সহ সাইট ফটো | ভুয়া কাজ সমাপ্তি রোধ ও জিপিএস ফেন্সিং যাচাই সম্ভব হবে না। |
| **#75** | **Weather Gate Integration** | ওপেন-মেটিও বাতাসের গতি (২২ কিমি/ঘণ্টা), বৃষ্টি ও কুয়াশার পূর্বাভাস | প্রতিকূল আবহাওয়ায় OHE টাওয়ার ওয়াগন ব্লকের ঝুঁকি বিশ্লেষণ কাজ করবে না। |

---

## 3. Step 2: Master Data Entity Universe (মাত্র ১১টি কোর এন্টিটি)

ডেটার ধারাবাহিকতা বজায় রাখার জন্য পুরো ডেটাসেটকে **১১টি কোর এন্টিটিতে (Entity)** এবং প্রায় **২০০টি উচ্চ-বিশ্বস্ত রেকর্ডে** সীমাবদ্ধ রাখা হয়েছে:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                       DEMO DATA ENTITY UNIVERSE                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  🗺️ GEOGRAPHY LAYER (PostGIS SRID 4326)                                     │
│  ├─ Corridor (1): NDLS-CNB-MAIN (440.200 km Trunk Golden Corridor)          │
│  ├─ Stations (6): NDLS (0km), GZB (24.5km), ALJN (126.1km),                 │
│  │                TDL (204.3km), ETW (296.8km), CNB (440.2km)                │
│  └─ Sections (5): NDLS-GZB, GZB-ALJN, ALJN-TDL, TDL-ETW, ETW-CNB            │
│                                                                             │
│  🚆 TRAIN LAYER                                                             │
│  ├─ Trains (12): 4 Prestige (Rajdhani, Shatabdi, Vande Bharat) +            │
│  │               4 Express (Prayagraj, Magadh, Gomti, Mahabodhi) +          │
│  │               4 Freight (Container Rake, BCN Coal, POL Tanker)           │
│  ├─ Schedules (60): প্রতিটি ট্রেনের স্টপ-বাই-স্টপ টাইমটেবিল                 │
│  └─ Live Status (12): বর্তমান চেইনেজ, স্পিড ও লেট মিনিট                      │
│                                                                             │
│  🔧 ASSET LAYER                                                             │
│  ├─ Assets (50): 60kg Rail, Point Machine, OHE Catenary, Relay Interlocking │
│  └─ Defects (15): 5 Critical (Immediate Stop), 5 High, 5 Medium             │
│                                                                             │
│  👥 RESOURCE LAYER                                                          │
│  ├─ Departments (3): ENG (Civil/Track), TRD (OHE/Power), SNT (Signal)       │
│  ├─ Gangs (6): 2 Gangs per Department with contact & tools                  │
│  ├─ Heavy Machinery (5): CSM-981 Tamper, BCM-402, TW-108 Tower Wagon, USFD  │
│  └─ Staff Users (8): 1 Admin, 3 JE, 2 SE, 1 Chief Controller (COA), 1 Sup   │
│                                                                             │
│  📋 OPERATIONS LAYER                                                        │
│  ├─ Blocks (10): 2 Active, 3 Pending, 3 Completed, 2 Emergency              │
│  ├─ Conflicts (3): 1 Critical (Train-Block), 1 High, 1 Co-Possession (USP)  │
│  └─ Work Orders (6): লিঙ্কড টাস্ক, এলওটিও সেফটি সাইন-অফ                      │
│                                                                             │
│  📡 EXTERNAL LAYER (Mock Feeds & Alerts)                                    │
│  ├─ Weather Advisories (2): বাতাসের গতিবেগ ও ঘন কুয়াশার সতর্কতা              │
│  └─ Notifications (20): এসএমএস ও ওয়েবসকেট অ্যালার্ম হিস্ট্রি                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Step 3: The 7 Coherence Rules (কোর ভ্যালিডেশন ইঞ্জিন)

`apps/demo/coherence/` মডিউলের মাধ্যমে জেনারেট হওয়া প্রতিটি রেকর্ডের ওপর এই **৭টি নিয়ম বাধ্যতামূলকভাবে প্রযোজ্য** থাকে:

### Rule 1: Geography Consistency (ভৌগোলিক সীমানা সত্যতা)
প্রতিটি ডিফেক্ট, ব্লক ও গ্যাং-এর অবস্থান অবশ্যই সংশ্লিষ্ট সেকশনের চেইনেজ সীমানার (`start_km` থেকে `end_km`) ভেতরে হতে হবে।
- ❌ **ভুল:** KM 500.000-এ ডিফেক্ট (করিডোরের সমাপ্তি KM 440.200-এ)।
- ✅ **সঠিক:** KM 144.200-এ ডিফেক্ট (ALJN–TDL সেকশনের ১২৬.১০০ থেকে ২০৪.৩০০ কিমির ভেতর)।

### Rule 2: Time Ordering Consistency (সময়ক্রমের যৌক্তিকতা)
লজিক্যাল সময়ক্রম: `defect_reported_at < block_proposed_at < block_sanctioned_at < work_started_at < work_completed_at`।
- ❌ **ভুল:** ব্লক সম্পন্ন হয়েছে সকাল ১০:০০টায়, কিন্তু ডিফেক্ট রিপোর্ট করা হয়েছে দুপুর ১২:০০টায়।
- ✅ **সঠিক:** ডিফেক্ট ৩ দিন আগে রিপোর্ট, ব্লক আজ সকাল ০২:০০টায় অনুমোদিত, ০৬:০০টায় কাজ শেষ।

### Rule 3: Resource Exclusivity & Travel Physics (সম্পদের অনন্যতা ও ভ্রমণ দূরত্ব)
একটি রক্ষণাবেক্ষণ গ্যাং বা ভারী মেশিনারি একই সময়ে দুটি ব্লকে থাকতে পারবে না। দুটি কাজের মধ্যে ন্যূনতম ভ্রমণ গতিবেগ হবে ৪০ কিমি/ঘণ্টা।
- ❌ **ভুল:** পি-ওয়ে গ্যাং ০৪ সকাল ০৮:০০টায় আলিগড়ে এবং ০৯:০০টায় টুন্ডলায় (দূরত্ব ৭৮ কিমি, ১ ঘণ্টায় স্থানান্তর অসম্ভব)।
- ✅ **সঠিক:** গ্যাং ০৪ সকাল ০৮:০০টায় আলিগড়ে, বিকেল ০৩:০০টায় টুন্ডলায়।

### Rule 4: Train-Block Exclusion for Sanctions (অনুমোদিত ব্লকে ট্রেনের অনুপস্থিতি)
অনুমোদিত (`SANCTIONED`/`ACTIVE`) ব্লকের সময় ও সেকশনে কোনো শিডিউলড ট্রেন থাকতে পারবে না। তবে পেন্ডিং (`PENDING`) ব্লকের ক্ষেত্রে ট্রেন ওভারল্যাপ রাখা হয়, যাতে AI কনফ্লিক্ট ইঞ্জিন তার ডিটেকশন ক্ষমতা দেখাতে পারে।

### Rule 5: Cross-Department Overlap for Combined Block (USP এনফোর্সার)
অন্তত একটি সেকশনে একই সময়ে ইঞ্জিনিয়ারিং (ENG) এবং বৈদ্যুতিক (TRD) বিভাগ ব্লক রিকোয়েস্ট করবে। AI এটিকে চিহ্নিত করে **Combined Block (ফিচার #98)** প্রস্তাব করবে।

### Rule 6: Unified Asset ID Triplet Mapping (ক্রস-সিস্টেম ইন্টিগ্রিটি)
প্রতিটি অ্যাসেটের ৩টি প্রাতিষ্ঠানিক ID সংরক্ষিত থাকবে:
- `TMS_ID`: `"TMS-RAIL-NDLS-CNB-144.2"` (ট্র্যাক ও রেল ফ্র্যাকচার)
- `SMMS_ID`: `"SMMS-SIG-NDLS-CNB-144.5"` (সিগন্যাল ও ইন্টারলকিং)
- `TDMS_ID`: `"TDMS-OHE-NDLS-CNB-144.0"` (ওএইচই ক্যাটেনারি ফিডার)
Unified Asset Registry (`apps/assets/models.py`) এ এগুলো একক গ্লোবাল UUID-র সাথে ম্যাপ করা থাকে।

### Rule 7: Fixed Seed for Reproducibility (ডিটারমিনিস্টিক পরীক্ষণ)
```python
random.seed(26027)  # Smart India Hackathon Problem Statement 26027
```
প্রতিবার সিড রান করলে হুবহু একই ডেটাসেট তৈরি হয়, যা যেকোনো ল্যাপটপ বা CI/CD পাইপলাইনে শতভাগ সামঞ্জস্যপূর্ণ ফলাফল নিশ্চিত করে।

---

## 5. Step 4: The 4 Presentation Scenarios (বিচারকদের সামনে প্রদর্শনের চিত্রনাট্য)

### 🎭 Scenario A: "Morning Dashboard" (২ মিনিট — প্রথম দর্শন)
- **গল্প:** চিফ কন্ট্রোলার লগইন করে কন্ট্রোল রুমের ৩ডি ম্যাপ ওপেন করলেন। পুরো নয়াদিল্লি–কানপুর করিডোর সবুজ, হলুদ ও লাল সেকশনে স্পন্দনশীল।
- **প্রদর্শিত উপাদান:** আজকের শিডিউল করা ৮টি ব্লক, ৩টি পেন্ডিং রিকোয়েস্ট, এবং **"Why #1?" কার্ড**: *"Rail fracture at KM 144.2 — ৩৮ দিন ধরে জমে থাকা লুক্কায়িত ঝুঁকি + ব্যস্ত রুট + CoF×LoF = Critical"*।
- **সংশ্লিষ্ট ফিচারসমূহ:** #3, #4, #14, #17, #34, #92, #93, #94, #97।

### 🎭 Scenario B: "Conflict → Combined Block" (৩ মিনিট — কোর USP) ⭐
- **গল্প:** 
  1. ENG জুনিয়র ইঞ্জিনিয়ার KM 142.5 থেকে 146.2 পর্যন্ত ০২:০০-০৬:০০ সময়ে ট্র্যাক ট্যাম্পিং ব্লক চায়।
  2. TRD জুনিয়র ইঞ্জিনিয়ার ওই একই সেকশনে (KM 143.0-145.5) ০৩:০০-০৭:০০ সময়ে OHE পাওয়ার ব্লক চায়।
  3. **AI কনফ্লিক্ট অ্যালার্ট:** লাল সাইরেন ও ইন্টারভাল ভিউয়ে ডিপার্টমেন্টাল সংঘাত প্রদর্শিত হয়।
  4. **AI Combined Suggestion:** প্ল্যাটফর্ম প্রস্তাব করে: *"উভয় ডিপার্টমেন্টকে ০২:৩০ থেকে ০৬:৩০ পর্যন্ত একটি সম্মিলিত ব্লক দিন — ৩.৫ ঘণ্টা ট্রেন চলাচলের সময় বাঁচবে!"*
  5. চিফ কন্ট্রোলার এক ক্লিকে অনুমোদন করেন এবং উভয় গ্যাং-এর কাছে এসএমএস অ্যালার্ট চলে যায়।
- **সংশ্লিষ্ট ফিচারসমূহ:** #1, #2, #11, #31, #32, #40, #41, #71, **#98 (USP)**।

### 🎭 Scenario C: "Live Disruption & Breathing Plan" (৩ মিনিট — ট্রেন বিলম্ব ব্যবস্থাপনা)
- **গল্প:**
  1. লাইভ ফিড সিমুলেটর কল: ১২৪২৪ ডিব্রুগড় রাজধানী এক্সপ্রেস কানপুরের দিকে ৪৫ মিনিট দেরিতে চলছে।
  2. **Schedule Deviation Detector (#116)** তাৎক্ষণিক সংকেত দেয়।
  3. **Delay Cascade Recalculator (#115)** পরের ৩টি ট্রেনের বিলম্ব হিসাব করে ব্লকের অনুমোদিত সময় স্বয়ংক্রিয়ভাবে ৪৫ মিনিট পিছিয়ে দেয়।
  4. ফিল্ড কর্মীদের কাছে রিয়েল-টাইম এসএমএস চলে যায়: *"আপনার ব্লক সময়সূচি ৪৫ মিনিট পুনঃনির্ধারণ করা হয়েছে।"*
- **সংশ্লিষ্ট ফিচারসমূহ:** #25, #27, #40, #76, **#114, #115, #116**।

### 🎭 Scenario D: "Zero-Fatality Digital Safety Protocol" (২ মিনিট — সাইবার-ফিজিক্যাল সেফটি)
- **গল্প:**
  1. গ্যাং সাইটে পৌঁছে ডিজিটাল টোকেন গ্রহণ করে (`TOK-BL-20260920-7F8E-ACD9`)।
  2. ১২/১২ জন কর্মীর বায়োমেট্রিক/হেডকাউন্ট এবং ২৪/২৪টি টুলের গণনা ডিজিটাল রেজিস্টারে মেলে।
  3. TRD সাবস্টেশন থেকে OHE 25kV পাওয়ার আইসোলেশন ও LOTO নিশ্চিত হয়।
  4. কাজ শেষ হলে ফিল্ড সুপারভাইজার জিও-ট্যাগযুক্ত ট্রু-ক্লিয়ারেন্স ফটো আপলোড করে।
  5. ডিজিটাল সেফটি সার্টিফিকেট ইস্যু হওয়ার পর ট্র্যাক স্বাভাবিক ও সবুজ রঙে ফিরে আসে।
- **সংশ্লিষ্ট ফিচারসমূহ:** #71, #72, #73, #74, #80, #81, #82।

---

## 6. Step 5: Implementation Architecture (`apps/demo/`)

সিস্টেমটি জ্যাঙ্গোর একটি ডেডিকেটেড অ্যাপ হিসেবে বাস্তবায়িত:

```text
backend/apps/demo/
├── __init__.py
├── apps.py
├── master_data/                   # স্ট্যাটিক ও অরিজিনাল মাস্টার ডেটা
│   ├── stations.json              # ৬টি প্রধান স্টেশন (NDLS, GZB, ALJN, TDL, ETW, CNB)
│   ├── trains.json                # ১২টি প্রামাণ্য ট্রেনের টাইমটেবিল ও ক্যাটাগরি
│   ├── users.json                 # ৮ জন অপারেশনাল স্টাফ (COA, JE, SSE, Supervisor)
│   └── assets.json                # ৫০টি ট্র্যাক, সিগন্যাল ও ক্যাটেনারি অ্যাসেট
├── coherence/                     # ৭টি কোহেরেন্স রুলস ভ্যালিডেশন ইঞ্জিন
│   ├── __init__.py                # CoherenceEngine, CoherenceViolation
│   ├── geography_validator.py     # চেইনেজ ও করিডোর সীমানা যাচাই
│   ├── time_validator.py          # সময়ক্রম ও সর্বোচ্চ ব্লক সময়সীমা (<= ৮ ঘণ্টা)
│   ├── resource_validator.py      # গ্যাং ও ইকুইপমেন্ট ডাবল-বুকিং প্রতিরোধ
│   └── train_block_validator.py   # ট্রেনের ট্রাফিকের সাথে ব্লকের ওভারল্যাপ চেক
├── generators/                    # ডেটা জেনারেটর ক্লাসসমূহ
│   ├── __init__.py
│   ├── base.py                    # BaseDataGenerator (৪টি মোড সাপোর্ট)
│   ├── block_generator.py         # কোহেরেন্ট ব্লক ও ইচ্ছাকৃত কনফ্লিক্ট জেনারেটর
│   ├── defect_generator.py        # CoF x LoF ও এজিং স্কোর সহ ডিফেক্ট জেনারেটর
│   └── train_generator.py         # রিয়েল-টাইম মুভমেন্ট ও লেট ভেক্টর জেনারেটর
├── scenarios/                     # পূর্ব-নির্ধারিত চিত্রনাট্য ফ্রেমওয়ার্ক
│   ├── __init__.py
│   ├── base_scenario.py           # BaseScenario (লগিং, ওয়েট, এসএমএস, ম্যাপ আপডেট)
│   ├── eng_vs_trd_conflict.py     # Scenario B: কোর USP ডেমো
│   ├── emergency_rail_fracture.py # Scenario: ইউএসএফডি রেল ফ্র্যাকচার অ্যালার্ট
│   └── rajdhani_delay_cascade.py  # Scenario C: লাইভ ডিসরাপশন ও ক্যাসকেড
├── streaming/                     # রিয়েল-টাইম লাইভ ডেমো ইঞ্জিন
│   ├── __init__.py
│   └── stream_engine.py           # প্রতি ৩-৫ সেকেন্ডে ওয়েবসকেটে লাইভ ইভেন্ট ব্রডকাস্ট
└── management/
    └── commands/
        ├── seed_railway_demo.py   # প্রধান ওয়ান-ক্লিক সিডার কমান্ড
        ├── stream_demo_data.py    # কন্টিনিউয়াস ওয়েবসকেট স্ট্রিমিং কমান্ড
        ├── run_scenario.py        # সুনির্দিষ্ট চিত্রনাট্য রান করার কমান্ড
        ├── list_scenarios.py      # উপলব্ধ সকল চিত্রনাট্যের তালিকা
        └── reset_demo.py          # ডেটাবেস সম্পূর্ণ ক্লিন করার কমান্ড
```

---

## 7. Step 6: Core Engine Implementation Patterns

### 1. Base Scenario API (`apps/demo/scenarios/base_scenario.py`)

```python
import time
from abc import ABC, abstractmethod
from typing import Dict, Any
from django.utils import timezone
from apps.notifications.services.ws_broadcaster import get_ws_broadcaster

class BaseScenario(ABC):
    """
    সমস্ত ডেমো চিত্রনাট্যের জন্য বেস ক্লাস।
    এটি লগিং, ট্রানজাকশন হ্যান্ডলিং, ওয়েবসকেট ব্রডকাস্টিং এবং স্টেপ-বাই-স্টেপ এক্সিকিউশন নিয়ন্ত্রণ করে।
    """
    name: str = "Base Scenario"
    description: str = ""
    duration_minutes: int = 5

    def __init__(self, live_mode: bool = False, broadcast: bool = True):
        self.live_mode = live_mode
        self.broadcast = broadcast
        self.broadcaster = get_ws_broadcaster() if broadcast else None

    @abstractmethod
    def setup(self):
        """প্রয়োজনীয় প্রি-কন্ডিশন ও অবজেক্ট ইনিশিয়ালাইজেশন"""
        pass

    @abstractmethod
    def execute(self):
        """সিনারিওর প্রধান ঘটনাপ্রবাহ"""
        pass

    def log(self, message: str):
        timestamp = timezone.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {message}")

    def wait(self, seconds: float):
        if self.live_mode:
            time.sleep(seconds)

    def broadcast_event(self, event_type: str, payload: Dict[str, Any], corridor_code: str = "NDLS-CNB-MAIN"):
        if self.broadcaster:
            self.broadcaster.broadcast_to_corridor(
                corridor_code=corridor_code,
                event_type=event_type,
                payload=payload
            )
```

### 2. Coherence Engine Validator (`apps/demo/coherence/__init__.py`)

```python
from datetime import datetime
from typing import Dict, Any, List

class CoherenceViolation(Exception):
    """যখন ডেটা কোনো রেলওয়ে অপারেশনাল রুল ভঙ্গ করে তখন উত্তোলিত হয়"""
    pass

class CoherenceEngine:
    """
    ৭টি অপারেশনাল রুল কঠোরভাবে প্রয়োগ করে।
    ভুল ডেটা কোনোভাবেই ডেটাবেসে ঢুকতে দেয় না।
    """
    def __init__(self, master_data: Dict[str, Any]):
        self.sections = master_data.get('sections', {})
        self.corridor_start = 0.000
        self.corridor_end = 440.200

    def validate_block(self, block: Dict[str, Any], existing_blocks: List[Dict[str, Any]] = None) -> bool:
        start_km = block['start_km']
        end_km = block['end_km']
        
        # Rule 1: Geography
        if start_km < self.corridor_start or end_km > self.corridor_end or start_km >= end_km:
            raise CoherenceViolation(f"Invalid KM Range: {start_km} to {end_km}")

        # Rule 2: Time Ordering
        start_time = block['scheduled_start_time']
        end_time = block['scheduled_end_time']
        if start_time >= end_time:
            raise CoherenceViolation("Start time must be before end time")
            
        duration = (end_time - start_time).total_seconds() / 3600
        if duration > 8.0:
            raise CoherenceViolation(f"Block duration {duration}h exceeds maximum allowed 8.0 hours")

        # Rule 3: Resource Exclusivity
        gang_id = block.get('gang_id')
        if gang_id and existing_blocks:
            for ex in existing_blocks:
                if ex.get('gang_id') == gang_id:
                    if not (end_time <= ex['scheduled_start_time'] or start_time >= ex['scheduled_end_time']):
                        raise CoherenceViolation(f"Gang {gang_id} double-booked across overlapping blocks!")

        return True
```

---

## 8. Step 7: Command Line Interface & Usage Guide

### ১. ডিটারমিনিস্টিক ফুল ডেটাসেট সিডিং (Testing & Baseline)
```bash
python manage.py seed_railway_demo --seed 26027
```
*আউটপুট:* ৬টি স্টেশন, ১২টি ট্রেন, ৮ জন স্টাফ, ৫০টি অ্যাসেট, এবং ৬টি কোহেরেন্ট ব্লক পোস্টজিআইএস ডেটাবেসে সফলভাবে সংরক্ষিত হবে।

### ২. উপলব্ধ সিনারিও তালিকা দেখা
```bash
python manage.py list_scenarios
```
*আউটপুট:*
```text
Available Scenarios for SIH PS 26027:
  1. eng_vs_trd_conflict      - Scenario B: AI Conflict Detection & Combined Block (USP #98)
  2. emergency_rail_fracture  - Scenario: USFD Critical Rail Fracture Emergency Halt & Rerouting
  3. rajdhani_delay_cascade   - Scenario C: Rajdhani Late Propagation & Breathing Plan (#115)
  4. safety_token_lifecycle   - Scenario D: Digital Token, LOTO & Photo Verification (#71, #81)
```

### ৩. বিচারকদের সামনে লাইভ সিনারিও পরিচালনা
```bash
python manage.py run_scenario eng_vs_trd_conflict --live --broadcast
```
*আউটপুট:* কনসোলে ধাপে ধাপে ধারাভাষ্য চলবে এবং একই সাথে ওয়েবসকেটের মাধ্যমে রিয়্যাক্ট ফ্রন্টএন্ডে রিয়েল-টাইমে সাইরেন, ম্যাপ কালার পরিবর্তন ও AI কম্বাইন্ড ব্লকের কার্ড পপ-আপ হবে।

### ৪. ব্যাকগ্রাউন্ড কন্টিনিউয়াস ইভেন্ট স্ট্রিমিং (Live Demo Feel)
```bash
python manage.py stream_demo_data --rate 4.0 --duration 1800 --broadcast
```
*আউটপুট:* প্রতি ৪ সেকেন্ডে স্বয়ংক্রিয়ভাবে নতুন ট্রেনের পজিশন, লাইভ স্পিড, ছোটখাটো ডিফেক্ট এবং ব্লক প্রপোজাল তৈরি হয়ে ব্রাউজারে লাইভ রিঅ্যাক্টিভ ড্যাশবোর্ড আপডেট করবে।

### ৫. ডেটাবেস ক্লিন স্লেট রিসেট
```bash
python manage.py reset_demo --confirm
```
*আউটপুট:* পূর্বের সমস্ত ডেমো ব্লক, ডিফেক্ট ও লাইভ ট্র্যাকিং মুছে সম্পূর্ণ পরিষ্কার অবস্থায় ফিরিয়ে আনবে।
