# 01-milestones.md

> **ফাইল ক্রম:** ৫১/৫৯  
> **ডিরেক্টরি:** `07-roadmap/`  
> **সার্ভিস স্কোপ:** Key Project Milestones, Acceptance Criteria & Release Delivery Gates  
> **পূর্ববর্তী ফাইল:** [07-roadmap/00-phases.md](file:///c:/work%20pase/Railway-Project-for-SIH/docs/07-roadmap/00-phases.md) (Engineering Implementation Phases)  
> **পরবর্তী ফাইল:** [07-roadmap/02-rollback-plan.md](file:///c:/work%20pase/Railway-Project-for-SIH/docs/07-roadmap/02-rollback-plan.md) (Disaster Recovery & Zero-Data-Loss Rollback Plan)  
> **সংযোগ ও উদ্দেশ্য:** এই ফাইলে প্ল্যাটফর্মের ৬টি প্রধান প্রকল্প ডেলিভারি মাইলফলক, গ্রহণযোগ্যতার মানদণ্ড (Acceptance Criteria), লাইফ-সেফটি গেট এবং দায়িত্বপ্রাপ্ত অনুমোদনকারী কর্তৃপক্ষের বিবরণ লিপিবদ্ধ করা হয়েছে।

---

# Project Delivery Milestones & Acceptance Gates (প্রকল্পের প্রধান মাইলফলক ও মানদণ্ড)

## 1. Master Milestone Schedule (মাস্টার মাইলফলক সময়সূচি)

| মাইলফলক কোড | মাইলফলকের শিরোনাম | লক্ষ্যমাত্রা সময় | ক্রিটিক্যাল গ্রহণযোগ্যতার গেট ক্রাইটেরিয়া (Acceptance Criteria) | অনুমোদনকারী কর্তৃপক্ষ |
|---|---|:---:|---|---|
| **MS-01** | Architecture, PostGIS Schema & Spec Baseline | দিন ৩ | সমস্ত স্পেসিফিকেশন ফাইল অনুমোদিত, জিরো প্লেসহোল্ডার, **PostgreSQL 15.6 + PostGIS 3.3** DDL চূড়ান্ত, ভারতীয় রেলওয়ে পরিভাষা অক্ষুণ্ণ। | Lead Systems Architect |
| **MS-02** | Enterprise Security, RBAC & Quick-Switch | দিন ৭ | Argon2id হ্যাশিং, RS256 JWT টোকেন রোটেশন, কুইক-সুইচ সেকশন ডেলিগেশন (#122), এবং সেশন পারসিস্টেন্স পরীক্ষিত। | Security & Backend Lead |
| **MS-03** | Core Block Scheduling, PostGIS Spatial Engine & Timetable | দিন ১৪ | PostGIS GiST `LineString` স্প্যাশিয়াল করিডোর ইনডেক্স সক্রিয়; সুইপ-লাইন কনফ্লিক্ট ডিটেকশন, টাইমটেবিল মাস্টার (#114), এবং ডিলে ক্যাসকেড (#115) ১০০% টেস্ট পাস। | Operations & Spatial Lead |
| **MS-04** | Semantic Digital Twin Reasoner & Safety Suite | দিন ২১ | HermiT DL রিজনার Celery ওয়ার্কারে সক্রিয় (`ONTO-001`), ১-ট্যাপ জিপিএস এসওএস সাইরেন (#79), ডিজিটাল টোকেন (#71), ওএইচই এলওটিও (#74) এবং প্রাক-কাজের টুল কাউন্ট (#81)। | AI & Safety Lead |
| **MS-05** | Real-Time Push Invalidation & Asset Ingestion Hub | দিন ২৮ | Daphne ASGI ওয়েবসকেট পুশ-টু-ইনভ্যালিডেট (< ২৫ms), চেইনেজ নরমালাইজেশন ইঞ্জিন (#87), ইউনিফায়েড অ্যাসেট রেজিস্ট্রি (#86), এবং CoF×LoF রিস্ক ম্যাট্রিক্স (#92)। | Frontend & Core Lead |
| **MS-06** | Analytics, SIH Master Demonstration & Production Gate | দিন ৩৫ | নয়াদিল্লি–কানপুর করিডোরের লাইভ ডেমো (`seed_railway_demo`), অ্যাসেট অ্যাভেইলেবিলিটি স্কোরিং (#50, ৭৮.৪% থেকে ৯৫.৩%), k6 ১,০০০ VU লোড টেস্ট পাস, এবং CRIS অডিট ক্লিয়ারেন্স। | CTO / Team Lead |

---

## 2. Detailed Acceptance Criteria per Milestone (মাইলফলকভিত্তিক বিস্তারিত মানদণ্ড)

### MS-01: Architecture & Spatial Database Foundation
- [x] **PostgreSQL 15.6 + PostGIS 3.3** ডেটাবেসে সমস্ত টেবিল ও স্প্যাশিয়াল কলাম মাইগ্রেশন সম্পন্ন।
- [x] কোডবেস এবং ডকুমেন্টেশন থেকে পুরানো MySQL-এর সমস্ত উল্লেখ সম্পূর্ণ নির্মূল।
- [x] ভারতীয় রেলওয়ে ক্যানোনিকাল পরিভাষা (TMS, SMMS, TDMS, COA, NTES, OHE, TSR, LOTO, TBT, PTW) সুপ্রতিষ্ঠিত।

### MS-03: Core Spatial Scheduling & Conflict Detection
- [x] `corridors`, `blocks`, `trains`, এবং `block_conflicts` টেবিল PostGIS GiST ইনডেক্স সহ সফলভাবে মাইগ্রেট করা।
- [x] ৪৪০ কিমি দীর্ঘ করিডোরে PostGIS স্প্যাশিয়াল বাফার ইন্টারসেকশন (`ST_DWithin` on geography, 50m) ৩০ মিলিসেকেন্ডের মধ্যে এক্সিকিউট হয়।
- [x] ১২৪২৪ রাজধানী এক্সপ্রেসের সময়সূচির সাথে ওভারল্যাপ হওয়া যে কোনো ব্লকে HTTP 409 এবং এরর কোড `BLK-003` রিটার্ন করে।
- [x] একাধিক সেকশন কন্ট্রোলার যাতে একই সাথে ব্লক স্টেট ওভাররাইট করতে না পারেন, সেজন্য PostgreSQL অপ্টিমিস্টিক কনকারেন্সি কন্ট্রোল (`version` কলাম) সক্রিয়।

### MS-04: Semantic Reasoner & Safety Triple-Lock
- [x] Celery `worker-ontology` প্রসেস Java 17 JVM রানটাইমে বুট হয়ে `railway_ontology.owl` সফলভাবে লোড করে।
- [x] স্ট্যান্ডার্ড ব্লকের জন্য HermiT রিজনার ১,৫০০ মিলিসেকেন্ডের মধ্যে ডেসক্রিপশন লজিক ক্লাসিফিকেশন সম্পন্ন করে।
- [x] `StrandedElectricTrainHazard` এবং ইন্টারলকিং লঙ্ঘনের ক্ষেত্রে মানুষের বোধগম্য ফর্মাল প্রুফ জেনারেট হয় (`ONTO-001`)।
- [x] মোবাইল অ্যাপ থেকে ১-ট্যাপ জিপিএস এসওএস চাপলে কন্ট্রোল রুমে < ১০০ms-এ অডিও সাইরেন বেজে ওঠে (#79)।
- [x] স্টেশন মাস্টার ও সুপারভাইজারের ডিজিটাল টোকেন ম্যাচ না করা পর্যন্ত সেকশন পজেশন লক হয় না (#71)।

### MS-05: Real-Time Streaming & Asset Data Integration
- [x] Daphne ASGI ওয়েবসকেট গেটওয়ে React ক্লায়েন্ট অ্যাপে পুশ ফ্রেম সরবরাহ করে; ব্রাউজার ক্যাশ ইনভ্যালিডেশন < ২৫ মিলিসেকেন্ডে ঘটে।
- [x] ভারতীয় রেলওয়ের বিভিন্ন ফরম্যাটের চেইনেজ ইনপুট (`KM 142/5`, `142+250`, `142.500`) স্বয়ংক্রিয়ভাবে ফ্লোট কিলোমিটারে কনভার্ট হয় (#87)।
- [x] CoF × LoF রিস্ক ম্যাট্রিক্সে স্কোর $\ge 15$ বিশিষ্ট অ্যাসেট স্বয়ংক্রিয়ভাবে P1 Urgent ব্লকে বরাদ্দ হয় (#92)।

### MS-06: Production Hardening & Live Demonstration Gate
- [x] `python manage.py seed_railway_demo` কমান্ড নির্বাহের মাধ্যমে নয়াদিল্লি–কানপুর ট্রাঙ্ক করিডোর এবং ১২টি ট্রেনের লাইভ ট্র্যাকিং সম্পূর্ণ কার্যকরী।
- [x] ডিভিশনাল অ্যাসেট অ্যাভেইলেবিলিটি স্কোর (#50) সূত্র অনুযায়ী নির্ভুলভাবে হিসাব হয় এবং অপ্টিমাইজেশনের মাধ্যমে ৯৫.৩% মান প্রদর্শন করে।
- [x] k6 লোড টেস্টিং ১,০০০ সমসাময়িক ভার্চুয়াল ইউজারে ১,২০০ RPS থ্রুপুট বজায় রাখে (p95 < ৪০ms)।
- [x] Bandit SAST সিকিউরিটি অডিটে জিরো হাই/মিডিয়াম ভালনারেবিলিটি নিশ্চিত করা।
