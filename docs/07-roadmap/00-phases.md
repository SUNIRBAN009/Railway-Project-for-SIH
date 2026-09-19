# 00-phases.md

> **ফাইল ক্রম:** ৫০/৫৯  
> **ডিরেক্টরি:** `07-roadmap/`  
> **সার্ভিস স্কোপ:** Strategic Multi-Phase Engineering Implementation Roadmap & Deliverables  
> **পূর্ববর্তী ফাইল:** [06-testing-qa/04-security-audit-report.md](file:///c:/work%20pase/Railway-Project-for-SIH/docs/06-testing-qa/04-security-audit-report.md) (Security Audit & Vulnerability Assessment Report)  
> **পরবর্তী ফাইল:** [07-roadmap/01-milestones.md](file:///c:/work%20pase/Railway-Project-for-SIH/docs/07-roadmap/01-milestones.md) (Key Operational Milestones & Release Gates)  
> **সংযোগ ও উদ্দেশ্য:** এই ফাইলে প্ল্যাটফর্মের ফেজ ০ (পরিবেশ ও PostGIS ইনফ্রাস্ট্রাকচার) থেকে ফেজ ৪ (অ্যানালিটিক্স, হার্ডেনিং ও প্রোডাকশন স্কেল) পর্যন্ত ১২২টি মাস্টার ফিচারের সুবিন্যস্ত ইঞ্জিনিয়ারিং বাস্তবায়ন পর্যায় ও ডেলিভারেবলস বিস্তারিতভাবে লিপিবদ্ধ করা হয়েছে।

---

# Multi-Phase Engineering Implementation Roadmap (বহুস্তরীয় ইঞ্জিনিয়ারিং বাস্তবায়ন রোডম্যাপ)

## 1. Project Phase Architecture Overview (পর্যায়ক্রমিক স্থাপত্যিক রূপরেখা)

```
+---------------------------------------------------------------------------------------+
|                       IMPLEMENTATION PHASES & OPERATIONAL TIMELINE                    |
+---------------------------------------------------------------------------------------+
|  Phase 0: Environment & Core Spatial Setup (Week 1)                                   |
|   - Docker Compose, PostgreSQL 15.6 + PostGIS 3.3, Redis 7, PgBouncer, Django 5.0     |
|  Phase 1: Identity, RBAC & Department Foundation (Weeks 2-3)                           |
|   - SVC-AUTH (Argon2id, RS256 JWT, Quick-Switch #122), React 18 Shell, Schema DDLs    |
|  Phase 2: Core Spatial Planning & Train Operations (Weeks 4-6)                        |
|   - SVC-BLK (PostGIS GiST 50m Buffer, Sweep-Line), SVC-TRN (Timetable #114, Delay #115) |
|   - SVC-DEPT (Multi-Dept Gangs, Material Rake Slots #100, #101)                       |
|  Phase 3: Digital Twin, Safety Suite & Real-Time Streaming (Weeks 7-8)               |
|   - SVC-ONTO (HermiT DL Reasoner), Daphne WebSockets, SVC-NOTIF (1-Tap SOS #79)       |
|   - SVC-AST (Chainage Norm #87, Unified Registry #86, CoF×LoF #92, Safety #71-#85)    |
|  Phase 4: Optimization, Analytics & Production Hardening (Weeks 9-10)                 |
|   - SVC-ANL (Asset Availability #50, Variance #109, What-If #62), k6 Load, CRIS Audit |
+---------------------------------------------------------------------------------------+
```

---

## 2. Phase-by-Phase Work Packages & Deliverables (পর্যায়ভিত্তিক কাজের বিবরণ)

### Phase 0: Environment, Spatial Database & Master Demo Data Engine (`apps/demo`) (সপ্তাহ ১)
- **মূল লক্ষ্য:** ডেভলপমেন্ট কন্টেইনার স্থাপন, **PostgreSQL 15.6 + PostGIS 3.3** স্প্যাশিয়াল এক্সটেনশন সক্রিয়করণ, PgBouncer কানেকশন পুলার ও Redis 7 প্রভিশনিং, এবং ৩৫টি ডেটা-নির্ভর ফিচারের ভিত্তি হিসেবে **Continuous Demo Data Engine (`apps/demo`)** ও ৭টি কোহেরেন্স রুলস প্রতিষ্ঠা।
- **প্রধান কাজের প্যাকেজ:**
  - স্ট্যান্ডার্ডাইজড `docker-compose.yml` (PostgreSQL 15.6 + PostGIS 3.3, Redis 7, Django, Celery, Daphne)।
  - ডিপেন্ডেন্সি ম্যানেজমেন্ট (`Django==5.0.8`, `djangorestframework==3.15.2`, `psycopg[binary]==3.2.1`, `django-environ`, `celery==5.4.0`, `channels==4.1.0`, `daphne==4.1.2`, `owlready2==0.46`)।
  - `apps/demo/` ইঞ্জিন: ১১টি কোর এন্টিটি মাস্টার ডেটা, ৭টি কোহেরেন্স রুলস ভ্যালিডেটর, ৪টি জেনারেশন মোড (`SEED`, `RANDOM`, `STREAM`, `SCENARIO`) এবং ৪টি উপস্থাপনা সিনারিও স্ক্রিপ্ট।
  - GitHub Actions CI পাইপলাইনে প্রি-কমিট লিন্টারস (Ruff, Black, ESLint, TypeScript Check) সক্রিয়করণ।
- **চূড়ান্ত ডেলিভারেবলস:** লোকাল ও ক্লাউড ডেভলপমেন্ট কন্টেইনার ক্লাস্টার যেখানে পোস্টগ্রিস স্প্যাশিয়াল কুয়েরি, রেডিস চ্যানেল লেয়ার এবং কোহেরেন্ট ডেমো সিডার (`python manage.py seed_railway_demo`) সম্পূর্ণ কার্যকর।

---

### Phase 1: Identity, RBAC & Multi-Department Foundation (সপ্তাহ ২-৩)
- **মূল লক্ষ্য:** এন্টারপ্রাইজ নিরাপত্তা, ব্যবহারকারী অনুমোদন, বিভাগীয় বিচ্ছিন্নতা, এবং কোর স্কিমা মাইগ্রেশন।
- **প্রধান কাজের প্যাকেজ:**
  - `apps.accounts`: Argon2id পাসওয়ার্ড হ্যাশিং, RS256 JWT টোকেন জেনারেশন ও রোটেশন, Redis ব্ল্যাকলিস্ট।
  - গ্র্যানুলার রোল-বেসড অ্যাক্সেস কন্ট্রোল (RBAC) এবং কুইক-সুইচ সেকশন ডেলিগেশন ইন্টারফেস (#121, #122)।
  - React 18 অথেন্টিকেটেড শেল, TanStack Query v5 ক্যাশ প্রোভাইডার, Zustand স্টোরস, এবং এরর হ্যান্ডলিং টোস্ট।
- **চূড়ান্ত ডেলিভারেবলস:** সম্পূর্ণ সিকিউর লগইন/লগআউট লাইফসাইকেল, রোল-বেসড রাউট গার্ডস, এবং বিভাগীয় প্রোফাইল ড্যাশবোর্ড।

---

### Phase 2: Core Spatial Block Planning & Train Operations (সপ্তাহ ৪-৬)
- **মূল লক্ষ্য:** প্ল্যাটফর্মের মূল ইঞ্জিন — PostGIS স্প্যাশিয়াল করিডোর ট্র্যাকিং, ব্লক প্রপোজাল সুইপ, টাইমটেবিল ও ডিপার্টমেন্ট কোঅর্ডিনেশন বাস্তবায়ন।
- **প্রধান কাজের প্যাকেজ:**
  - `apps.blocks`: PostGIS GiST ইনডেক্সিং, ৫০-মিটার সেফটি বাফার ইন্টারসেকশন (`ST_DWithin`), এবং টাইম-স্পেস সুইপ-লাইন ডিটেকশন ($O((N+M) \log (N+M))$)।
  - `apps.trains`: মাস্টার টাইমটেবিল রেজিস্ট্রি (#114), COA/NTES লাইভ ট্র্যাকিং ফিড (#118), এবং মাল্টি-স্টেশন ডিলে ক্যাসকেড ইঞ্জিন (#115)।
  - `apps.departments`: মেগা-ব্লক গ্যাং রোস্টার, হেভি ট্র্যাক মেশিন ফিটনেস চেক (#100), এবং মেটেরিয়াল রেক স্লট কোঅর্ডিনেশন (#101)।
- **চূড়ান্ত ডেলিভারেবলস:** কার্যকর ব্লক প্রপোজাল সাবমিশন, রিয়েল-টাইম ট্রেন সংঘাত শনাক্তকরণ, এবং মাল্টি-ডিপার্টমেন্ট কো-পজেশন সুপারিশ কার্ড।

---

### Phase 3: Semantic Digital Twin, Safety Suite & Real-Time Daphne (সপ্তাহ ৭-৮)
- **মূল লক্ষ্য:** ডেসক্রিপশন লজিক অনটোলজি রিজনার, লাইফ-সেফটি ট্রিপল-লক স্যুইট এবং তাৎক্ষণিক ওয়েবসকেট স্টেট সমন্বয়।
- **প্রধান কাজের প্যাকেজ:**
  - `apps.ontology`: Owlready2 ডিজিটাল টুইন মডেল (`railway_ontology.owl`), HermiT DL রিজনার আইসোলেটেড Celery ওয়ার্কার (`worker-ontology`), এবং ব্যাখ্যাযোগ্য প্রমাণ চেইন (`ONTO-001`)।
  - `apps.notifications`: Daphne ASGI সার্ভার (পোর্ট ৮০০১), ১-ট্যাপ জিপিএস এসওএস সাইরেন (#79), ট্রেন অ্যাপ্রোচ পুশ ওয়ার্নিং (#76), এবং লোন ওয়ার্কার ডেড-ম্যান হার্টবিট (#78)।
  - `apps.assets`: ভারতীয় রেলওয়ে চেইনেজ নরমালাইজেশন ইঞ্জিন (#87), ইউনিফায়েড অ্যাসেট রেজিস্ট্রি (#86), CoF×LoF রিস্ক ম্যাট্রিক্স (#92), এবং ডিজিটাল সেফটি টোকেন যাচাই (#71, #74, #81-#85)।
- **চূড়ান্ত ডেলিভারেবলস:** রিয়েল-টাইম ইন্টারেক্টিভ ম্যাপ, ১-ক্লিক এসওএস অডিও সাইরেন অ্যালার্ম, এবং ডিজিটাল টোকেন ভিত্তিক সেকশন পজেশন লক।

---

### Phase 4: Asset Availability Analytics, Stress Hardening & Production Handover (সপ্তাহ ৯-১০)
- **মূল লক্ষ্য:** এক্সিকিউটিভ অ্যানালিটিক্স, কেকে (k6) লোড স্ট্রেস টেস্টিং, সাইবার অডিট, এবং প্রোডাকশন হ্যান্ডওভার।
- **প্রধান কাজের প্যাকেজ:**
  - `apps.analytics`: ডিভিশনাল অ্যাসেট অ্যাভেইলেবিলিটি স্কোরিং (#50, ৭৮.৪% থেকে ৯৫.৩% অপ্টিমাইজেশন ট্র্যাকিং), ব্লক ভ্যারিয়েন্স অটো-অ্যানালাইসিস (#109), এবং What-If সিচুয়েশনাল সিমুলেটর (#62)।
  - k6 পারফরম্যান্স টেস্টিং (১,০০০ সমসাময়িক ভার্চুয়াল ইউজার, ১২০০ RPS রিড থ্রুপুট, < ৪০ms ল্যাটেন্সি বাজেট)।
  - CERT-In ও CRIS নির্দেশিকা অনুযায়ী নিরাপত্তা ভেরিফিকেশন এবং `seed_railway_demo` কমান্ড সহ লাইভ জুরি ডেমো প্রস্তুতি।
- **চূড়ান্ত ডেলিভারেবলস:** ১০০% টেস্ট পাস রেট সহ প্রোডাকশন-রেডি রিলিজ ক্যান্ডিডেট এবং সম্পূর্ণ অপারেশনাল ডকুমেন্টেশন।
