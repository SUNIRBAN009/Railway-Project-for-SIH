# 01-decision-log.md

> **ফাইল ক্রম:** ২/৪৫  
> **ডিরেক্টরি:** `00-master-high-level/`  
> **পূর্ববর্তী ফাইল:** `00-master-high-level/00-architecture.md` (আর্কিটেকচারাল সিদ্ধান্তের উৎস)  
> **পরবর্তী ফাইল:** `00-master-high-level/02-glossary.md`  
> **কন্টেন্ট সোর্স:** `RailBlock_Feature_Master_Plan_PS26027(1).xlsx` (১২২টি ফিচার, ৪টি মূল সমস্যা স্তম্ভ) এবং `ai-project-spec-generator (1).md`।  
> **ডাটাবেস ও এআই নীতি:** **PostgreSQL 15/16 + PostGIS 3.3** (নো MySQL) এবং **Neuro-Symbolic Hybrid AI** (Symbolic AI: Owlready2 + HermiT ↔ Neural AI: Google Gemini 1.5 Flash)।

---

## 1. Master Decision Summary Table

| # | Decision ID | Title | Status | Impact Area | Owner |
|---|-------------|-------|--------|-------------|-------|
| 1 | **DEC-001** | Modular Clean Architecture over Distributed Microservices | ✅ Accepted | Backend Architecture | Tech Lead |
| 2 | **DEC-002** | PostgreSQL 15/16 + PostGIS 3.3 over MySQL 8.0 | ✅ Accepted | Spatial Data Layer | Database Lead |
| 3 | **DEC-003** | Neuro-Symbolic Hybrid AI over Pure LLM & Pure Heuristics | ✅ Accepted | Decision & AI Engine | AI & Safety Lead |
| 4 | **DEC-004** | React 18 + TypeScript + Vite + Zustand + TanStack Query over Next.js & Redux | ✅ Accepted | Frontend Client Tier | Frontend Lead |
| 5 | **DEC-005** | Django Channels (Daphne ASGI WebSockets) + Redis Pub/Sub over Polling & Socket.io | ✅ Accepted | Real-time Communication | Backend Lead |
| 6 | **DEC-006** | 4-Queue Dedicated Celery Worker Architecture over Monolithic Queue | ✅ Accepted | Asynchronous Processing | DevOps Lead |
| 7 | **DEC-007** | Leaflet + OpenStreetMap PostGIS GeoJSON over Cloud-Locked Mapbox/Google Maps | ✅ Accepted | Corridor Map & GIS | GIS Lead |
| 8 | **DEC-008** | Pluggable Source Adapter Pattern (Feature #121 Mock ↔ Real Switch) over Hardcoded Mock | ✅ Accepted | External Integrations | Backend Lead |
| 9 | **DEC-009** | ReportLab Native Python Engine over Headless Chrome / WeasyPrint for Sanction PDF (#107) | ✅ Accepted | Document Generation | Backend Lead |
| 10 | **DEC-010** | Stateless JWT Auth with Redis Blacklist & Spatial RBAC over Session Cookies | ✅ Accepted | Security & Compliance | Security Lead |

---

## 2. Detailed Architectural Decision Records (ADRs)

### DEC-001: Modular Clean Architecture over Distributed Microservices
- **Status:** ✅ Accepted
- **Date:** 2026-09-18
- **Owner:** Tech Lead
- **Context:**
  ভারতীয় রেলওয়ের ব্লক প্ল্যানিংয়ে ৫টি স্বতন্ত্র অপারেশনাল ডোমেইন রয়েছে (অ্যাকাউন্টস/আরবিএসি, ব্লক অপ্টিমাইজেশন ও কম্বাইন্ড উইন্ডো, পোস্টজিআইএস রেলওয়ে অ্যাসেট, ট্রেনের সময়সূচি ও এনটিইএস ট্র্যাকিং, এবং ১৫-ফিচার সেফটি স্যুট)। মাইক্রোসার্ভিস আর্কিটেকচার গ্রহণ করলে প্রতিটি সার্ভিসের জন্য আলাদা ডেটাবেস, ডিস্ট্রিবিউটেড ট্রানজ্যাকশন (Saga/2PC), নেটওয়ার্ক ল্যাটেন্সি এবং অতিরিক্ত ক্লাউড কনটেইনার ওভারহেড তৈরি হয়, যা বর্তমান বাস্তবায়নে অপ্রয়োজনীয় জটিলতা বাড়ায়।
- **Decision:**
  আমরা ব্যাকএন্ডে **Django 5.0 Modular Clean Monolith** গ্রহণ করেছি। প্রতিটি ডোমেইন `apps/` ফোল্ডারের ভেতরে নিজস্ব Bounded Context হিসেবে স্বাধীন মডেল, সিরিয়ালাইজার, সার্ভিস লেয়ার এবং টেস্ট স্যুট বজায় রাখবে। তবে তারা একটি একক অপ্টিমাইজড PostgreSQL ডেটাবেস এবং Redis ব্রোকার শেয়ার করবে।
- **Positive Consequences:**
  - একক ট্রানজ্যাকশনে ক্রস-ডিপার্টমেন্টাল (ENGG + S&T + TRD) কম্বাইন্ড ব্লক লক করার ACID গ্যারান্টি।
  - দ্রুত লোকাল বিল্ড ও এক কমান্ডে স্টার্টআপ (`.\scripts\start.ps1` বা `docker compose up -d`)।
  - ডিস্ট্রিবিউটেড নেটওয়ার্ক কল পরিহার করায় সাব-মিলিসেকেন্ড ইন-মেমোরি ফাংশন কল।
- **Negative Consequences:**
  - একাধিক ডেভেলপার একই রিপোজিটরিতে কাজ করার সময় গিট মার্জ কনফ্লিক্টের ঝুঁকি (ক্লিন ফোল্ডার স্ট্রাকচারের মাধ্যমে সমাধান করা হয়েছে)।
- **Alternatives Considered & Rejected:**
  - *Distributed Microservices (FastAPI / Spring Boot per service):* রিজেক্টেড — ডিস্ট্রিবিউটেড জয়েন এবং এসআইএইচ হ্যাকাথন/ডিভিশনাল ডেপ্লয়মেন্টে অতিরিক্ত অবকাঠামো ব্যয় ও জটিলতা।

---

### DEC-002: PostgreSQL 15/16 + PostGIS 3.3 over MySQL 8.0
- **Status:** ✅ Accepted
- **Date:** 2026-09-18
- **Owner:** Database Lead
- **Context:**
  ভারতীয় রেলওয়ের ট্র্যাক সেকশনগুলো রৈখিক চেইনেজ (যেমন: কিমি ৪৫/২ থেকে ৪৭/৮), সিগন্যাল পয়েন্ট কোঅর্ডিনেট এবং ওএইচই সাবস্টেশন পলিগন দিয়ে সংজ্ঞায়িত। দুটি আলাদা বিভাগের কাজের মধ্যে স্থানিক ওভারল্যাপ এবং করিডোর ইন্টারসেকশন শনাক্ত করার জন্য ইন্ডাস্ট্রিয়াল-গ্রেড স্প্যাশিয়াল কম্পিউটেশন প্রয়োজন।
- **Decision:**
  সম্পূর্ণ সিস্টেমে একমাত্র রিলেশনাল ও স্প্যাশিয়াল ডেটাবেস হিসেবে **PostgreSQL 15/16 + PostGIS 3.3 (SRID 4326/3857)** ব্যবহার করা হবে। পূর্বে থাকা যেকোনো MySQL রেফারেন্স সম্পূর্ণ বাতিল করা হলো।
- **Positive Consequences:**
  - `ST_Intersects`, `ST_DWithin`, `ST_LineLocatePoint` এবং `ST_Buffer` ব্যবহার করে ট্র্যাক চেইনেজের ওপর কাজের সঠিক সীমানা ও সম্ভাব্য ক্ল্যাশ স্বয়ংক্রিয়ভাবে নির্ণয়।
  - Spatial GiST ইনডেক্সিংয়ের মাধ্যমে ৫০,০০০+ ট্র্যাক জিওমেট্রিতে সাব-১০ms কুয়েরি পারফরম্যান্স।
  - GeoDjango-র সাথে নেটিভ ইন্টিগ্রেশন এবং PostGIS রাস্টার/ভেক্টর এক্সপোর্ট।
  - JSONB কলামের মাধ্যমে আনস্ট্রাকচার্ড সেন্সর ও টেলিমেট্রি লগ সংরক্ষণ।
- **Negative Consequences:**
  - ডেভ মেশিনে PostgreSQL ও PostGIS এক্সটেনশন ইন্সটল থাকা আবশ্যক (যা আমরা ডকারাইজড `postgis/postgis:15-3.3` ইমেজের মাধ্যমে সমাধান করেছি)।
- **Alternatives Considered & Rejected:**
  - *MySQL 8.0:* রিজেক্টেড — MySQL Spatial ফাংশন অত্যন্ত সীমিত; রেলওয়ের রৈখিক রেফারেন্সিং (LRS) ও চেইনেজ জিওমেট্রিক প্রজেকশন পরিচালনায় অকার্যকর।

---

### DEC-003: Neuro-Symbolic Hybrid AI over Pure LLM & Pure Heuristics
- **Status:** ✅ Accepted
- **Date:** 2026-09-18
- **Owner:** AI & Safety Lead
- **Context:**
  ভারতীয় রেলে নিরাপত্তা আপসহীন। ব্লক অনুমোদন বা ট্রেনের স্লট পরিবর্তনের মতো জীবন-মরণ সিদ্ধান্তে একক জেনারেটিভ এআই (যেমন GPT বা Gemini) ব্যবহার করা আত্মঘাতী, কারণ সেখানে হ্যালুসিনেশনের ঝুঁকি থাকে। আবার সনাতন রুল-বেসড if-else ইঞ্জিন দিয়ে বহু-বিভাগীয় ট্রানজিটিভ লুকায়িত ঝুঁকি শনাক্ত করা এবং কন্ট্রোলারদের সহজ ভাষায় বুঝিয়ে বলা অসম্ভব।
- **Decision:**
  আমরা একটি **Neuro-Symbolic Hybrid AI Architecture** তৈরি করেছি:
  1. *সিম্বলিক এআই (নিরাপত্তার মস্তিষ্ক):* `Owlready2` + `HermiT OWL 2 DL Reasoner` + `pyshacl` — যা রেলওয়ের ভৌত নেটওয়ার্ক ও সেফটি ইন্টারলকিংয়ের ওপর নির্মিত ডিজিটাল টুইনে ১০০% ডিটারমিনিস্টিক রুল যাচাই করে (০% হ্যালুসিনেশন)।
  2. *নিউরাল এআই (যোগাযোগের কণ্ঠস্বর):* `Google Gemini 1.5 Flash` — যা সিম্বলিক ইঞ্জিনের প্রস্তুতকৃত প্রুফ পড়ে চিফ কন্ট্রোলারের জন্য "Why #1?" এক্সপ্লেনেবল কার্ড (#94) এবং বাংলা/হিন্দিতে সংক্ষিপ্ত রিপোর্ট তৈরি করে।
- **Positive Consequences:**
  - শতভাগ সুরক্ষিত ও গাণিতিকভাবে প্রমাণিত ব্লক শিডিউল।
  - ব্ল্যাক-বক্স এআই-এর বদলে সম্পূর্ণ এক্সপ্লেনেবল এবং মানুষের বোধগম্য সিদ্ধান্ত।
  - Celery-র মাধ্যমে ডেডিকেটেড `symbolic_ai` ব্যাকগ্রাউন্ড কিউতে রিজনার চালানোয় মূল এপিআই সার্ভার ব্লক হয় না।
- **Negative Consequences:**
  - বড় নেটওয়ার্কের জন্য HermiT রিজনারের মেমোরি খরচ বেশি (ডিভিশনাল কোয়াডস্টোর স্লাইসিংয়ের মাধ্যমে নিয়ন্ত্রিত)।
- **Alternatives Considered & Rejected:**
  - *Pure Generative LLM (Direct Block Scheduling):* রিজেক্টেড — নিরাপত্তার জন্য চরম বিপজ্জনক ও অগ্রহণযোগ্য।
  - *Pure Hardcoded Rule Engine:* রিজেক্টেড — বহু-বিভাগীয় শ্যাডো উইন্ডো অপ্টিমাইজেশন ও মানবীয় ভাষার ব্যাখ্যা দিতে অক্ষম।

---

### DEC-004: React 18 + TypeScript + Vite + Zustand + TanStack Query over Next.js & Redux
- **Status:** ✅ Accepted
- **Date:** 2026-09-18
- **Owner:** Frontend Lead
- **Context:**
  রেলওয়ে ডিভিশনাল কন্ট্রোল রুমে একাধিক মনিটরে লাইভ ম্যাপ, সময়সূচি গ্যান্ট চার্ট এবং অ্যালার্ট স্ক্রিন সার্বক্ষণিক চালু থাকে। এর জন্য অতি-দ্রুত ক্লায়েন্ট-সাইড রেন্ডারিং, কঠোর টাইপ নিরাপত্তা এবং মসৃণ স্টেট সিঙ্ক প্রয়োজন।
- **Decision:**
  ফ্রন্টএন্ডের জন্য **React 18.2 SPA + TypeScript 5 + Vite 5** স্ট্যাক নির্বাচন করা হয়েছে। গ্লোবাল ক্লায়েন্ট স্টেটের জন্য **Zustand 4.5** এবং সার্ভার ডেটা ফেচিং/ক্যাশিংয়ের জন্য **TanStack Query v5** ব্যবহৃত হবে।
- **Positive Consequences:**
  - টাইপস্ক্রিপ্টের মাধ্যমে ১-১২২ ফিচারের জটিল পে-লোড ও ডেটা স্ট্রাকচারে রানটাইম বাগ শূন্যের কোঠায় নামিয়ে আনা।
  - Vite HMR-এর মাধ্যমে সাব-৫০ms ডেভেলপার রিফ্রেশ এবং অত্যন্ত হালকা প্রোডাকশন বান্ডেল (<২০০ KB gzipped)।
  - Zustand-এর মাধ্যমে রেডাক্সের অপ্রয়োজনীয় বয়লারপ্লেট ছাড়া হালকা স্টেট ট্র্যাকিং।
  - TanStack Query-র মাধ্যমে অটোমেটিক ব্যাকগ্রাউন্ড রিফেচ এবং উইন্ডো ফোকাস রিভ্যালিডেশন।
- **Negative Consequences:**
  - এসএসআর (SSR) না থাকায় ক্লায়েন্টকে জাভাস্ক্রিপ্ট বান্ডেল একবার ডাউনলোড করতে হয় (ইন্টারনাল কন্ট্রোল রুম অ্যাপ্লিকেশনে এটি কোনো সমস্যা নয়)।
- **Alternatives Considered & Rejected:**
  - *Next.js 14 (App Router):* রিজেক্টেড — সার্ভার কম্পোনেন্ট ও এসএসআর ক্যাশিং লোকাল ডিভিশনাল ইন্ট্রানেটে জটিলতা তৈরি করে; অফলাইন ম্যাপ ইন্টিগ্রেশনে সমস্যা হয়।
  - *Redux Toolkit:* রিজেক্টেড — অতিরিক্ত ফাইল ও বয়লারপ্লেট কোড ডেভেলপমেন্টের গতি কমিয়ে দেয়।

---

### DEC-005: Django Channels (Daphne ASGI) + Redis Pub/Sub over HTTP Polling & Socket.io
- **Status:** ✅ Accepted
- **Date:** 2026-09-18
- **Owner:** Backend Lead
- **Context:**
  জরুরি ব্রেকডাউন (SOS #79), ট্রেনের লেট ডিটেকশন (#116) এবং ডিজিটাল টোকেন হ্যান্ডওভারের (#71) মতো ঘটনা ঘটার সাথে সাথে কন্ট্রোল রুম ও ফিল্ড স্টাফদের স্ক্রিনে তাৎক্ষণিক লাল ফ্ল্যাশ ও অডিও অ্যালার্ট দেখাতে হবে।
- **Decision:**
  আমরা **Django Channels 4.0 (Daphne ASGI Server)** এবং **Redis 7 Channel Layer** ব্যবহার করছি।
- **Positive Consequences:**
  - স্ট্যান্ডার্ড দ্বিমুখী WebSocket (WSS) সংযোগ — ক্লায়েন্ট থেকে সার্ভার এবং সার্ভার থেকে ক্লায়েন্টে <৫০ms ল্যাটেন্সিতে পুশ নোটিফিকেশন।
  - Django মডেল ও অথেনটিকেশনের সাথে সরাসরি সংযোগ — ওয়েবসকেট কানেকশন হ্যান্ডশেকের সময়ই ইউজারের আরবিক রোল ও ডিভিশন ভেরিফাই করা যায়।
  - Redis পাব/সাব আর্কিটেকচার অনুভূমিকভাবে (Horizontal) একাধিক সার্ভারে স্কেল করা সম্ভব।
- **Negative Consequences:**
  - ASGI সার্ভার (Daphne) এবং WSGI সার্ভার (Gunicorn) একসাথে পরিচালনা করতে হয় (Nginx রিভার্স প্রক্সির মাধ্যমে রুট আলাদা করে সমাধান করা হয়েছে)।
- **Alternatives Considered & Rejected:**
  - *HTTP Long Polling:* রিজেক্টেড — উচ্চ ল্যাটেন্সি এবং প্রতি সেকেন্ডে সার্ভারে হাজার হাজার অতিরিক্ত রিকোয়েস্ট পাঠিয়ে ডাটাবেসে চাপ ফেলে।
  - *Standalone Node.js Socket.io Server:* রিজেক্টেড — আলাদা নোড সার্ভার মেইনটেইন করা এবং পাইথন ব্যাকএন্ডের সাথে অথেনটিকেশন শেয়ার করা জটিল।

---

### DEC-006: 4-Queue Dedicated Celery Worker Architecture over Monolithic Queue
- **Status:** ✅ Accepted
- **Date:** 2026-09-18
- **Owner:** DevOps Lead
- **Context:**
  ব্যাকগ্রাউন্ডে বিভিন্ন প্রকৃতির কাজ সম্পাদিত হয়: রিয়েল-টাইম কনফ্লিক্ট ডিটেকশন (দ্রুত এক্সিকিউশন জরুরি), এসএমএস অ্যালার্ট পাঠানো (আই/ও বাউন্ড), হারমিট রিজনার চালানো (সিপিইউ ও মেমোরি বাউন্ড), এবং স্যাংশন পিডিএফ জেনারেশন (ডকুমেন্ট বাউন্ড)। একক কিউ ব্যবহার করলে দীর্ঘ পিডিএফ তৈরির কাজ জরুরি ট্রাফিক এলার্টকে লাইনে আটকে রাখে।
- **Decision:**
  Celery 5.3-তে ৪টি স্বতন্ত্র ডেডিকেটেড কিউ বাস্তবায়ন করা হয়েছে:
  1. `high`: জরুরি কনফ্লিক্ট ডিটেকশন ও ওভাররাইড।
  2. `notify`: SMS ও পুশ নোটিফিকেশন ডেলিভারি।
  3. `symbolic_ai`: Owlready2 নলেজ গ্রাফ ও HermiT রিজনার এক্সিকিউশন।
  4. `default_low`: অফিসিয়াল স্যাংশন অর্ডার PDF (#107), অডিট লগ ও সাপ্তাহিক ডেটা রোল-আপ।
- **Positive Consequences:**
  - কোনো ধীরগতির কাজের কারণে জীবন-সংকটকালীন অ্যালার্ট এক মিলিমিটারও বিলম্বে পড়ে না (Zero Head-of-Line Blocking)।
  - প্রয়োজন অনুযায়ী নির্দিষ্ট কিউতে আলাদা ডকার রিসোর্স (সিপিইউ/মেমোরি সীমা) বরাদ্দ করা যায়।
- **Negative Consequences:**
  - Celery কনফিগারেশনে অতিরিক্ত কিউ রাউটিং নিয়ম লিখতে হয়।
- **Alternatives Considered & Rejected:**
  - *Single Celery Queue:* রিজেক্টেড — বড় কোনো রিপোর্ট জেনারেশনের সময় কন্ট্রোলারদের কনফ্লিক্ট ডিটেকশন আটকে থাকবে।

---

### DEC-007: Leaflet + OpenStreetMap PostGIS GeoJSON over Cloud-Locked Mapbox/Google Maps
- **Status:** ✅ Accepted
- **Date:** 2026-09-18
- **Owner:** GIS Lead
- **Context:**
  রেলওয়ের প্রধান কন্ট্রোল রুমের সিস্টেমগুলো প্রায়শই ডেডিকেটেড অভ্যন্তরীণ ইন্ট্রানেটে (Railnet) চলে, যেখানে বাইরের পাবলিক ইন্টারনেটের অ্যাক্সেস নিয়ন্ত্রিত। এছাড়া পাবলিক ক্লাউড ম্যাপ সার্ভিসগুলোতে প্রতি মাসে টাইল লোডের ওপর বিলিং সীমা থাকে।
- **Decision:**
  আমরা **Leaflet 1.9 + OpenStreetMap / CartoDB Dark Matter টাইলস** এবং ব্যাকএন্ড থেকে আসা সরাসরি **PostGIS GeoJSON ভেক্টর লেয়ার** ব্যবহার করছি।
- **Positive Consequences:**
  - শূন্য এপিআই লাইসেন্স খরচ (Zero API Cost) এবং অফলাইন টাইল ক্যাশিং সুবিধা।
  - পোস্টজিআইএস থেকে আসা সেকশন লাইনস্ট্রিং এবং চেইনেজ মার্কার কোনো ক্লাউড টোকেন ছাড়াই ইন্টারফেসে রেন্ডার হয়।
  - সুপার-লাইটওয়েট বান্ডেল সাইজ (~৪০ KB)।
- **Negative Consequences:**
  - Mapbox-এর মতো আউট-অব-দ্য-বক্স ৩ডি গ্লোবাল গ্লোব ভিউ নেই (যা রেলওয়ের ২ডি ট্র্যাক মনিটরিংয়ে প্রয়োজনও নেই)।
- **Alternatives Considered & Rejected:**
  - *Google Maps API:* রিজেক্টেড — অত্যধিক ব্যয়বহুল এবং ডার্ক থিম রেল কন্ট্রোল ট্র্যাক কাস্টমাইজেশনে জটিল।
  - *Mapbox GL JS (Cloud Token Only):* সেকেন্ডারি অপশন হিসেবে রাখা হয়েছে, কিন্তু মূল ডিফল্ট ইঞ্জিন হিসেবে Leaflet নির্বাচিত।

---

### DEC-008: Pluggable Source Adapter Pattern (Feature #121 Mock ↔ Real Switch) over Hardcoded Mock
- **Status:** ✅ Accepted
- **Date:** 2026-09-18
- **Owner:** Backend Lead
- **Context:**
  হ্যাকাথন ও জাজেস ডেমো চলাকালীন লাইভ TMS/SMMS/TDMS সার্ভারের বাস্তব অ্যাক্সেস থাকে না। কিন্তু সফটওয়্যারটিকে কেবল হার্ডকোডেড ফেক ডেটায় তৈরি করলে প্রোডাকশনে আসল রেলওয়ে এপিআই ইন্টিগ্রেশনের সময় পুরো কোডবেস নতুন করে লিখতে হতো।
- **Decision:**
  আমরা একটি **Pluggable Source Adapter Interface (Feature #121)** তৈরি করেছি। সিস্টেম কনফিগারেশনের একটি এনভায়রনমেন্ট ভ্যারিয়েবল (`DATA_SOURCE_MODE=MOCK` বা `REAL`) পরিবর্তন করেই মক অ্যাডাপ্টার এবং আসল এন্টারপ্রাইজ রেলওয়ে এপিআই-এর মধ্যে টগল করা যায়।
- **Positive Consequences:**
  - একক কোডবেস ডেমো এবং প্রোডাকশন উভয় ক্ষেত্রে কার্যকর।
  - ডেমো চলাকালীন ফিক্সড সিড ২৬০২৭ (`seed_railway_demo.py`) দিয়ে ১০০% পুনরাবৃত্তিযোগ্য ও স্থিতিশীল ডেটাসেট প্রদর্শন সম্ভব।
- **Negative Consequences:**
  - প্রতিটি বাহ্যিক সিস্টেমের জন্য আলাদা অ্যাডাপ্টার ক্লাস লেখার প্রাথমিক কোডিং প্রয়োজন।
- **Alternatives Considered & Rejected:**
  - *Hardcoded JSON Files:* রিজেক্টেড — কোনো ডাইনামিক ডেটা তৈরি হয় না এবং প্রোডাকশন-রেডিনেস প্রমাণ করা যায় না।

---

### DEC-009: ReportLab Native Python Engine over Headless Chrome / WeasyPrint for Sanction PDF (#107)
- **Status:** ✅ Accepted
- **Date:** 2026-09-18
- **Owner:** Backend Lead
- **Context:**
  অনুমোদিত ব্লকের জন্য ভারতীয় রেলের স্ট্যান্ডার্ড ফরম্যাটে অফিসিয়াল "Sanction Order PDF" (#107) তৈরি করতে হয়, যাতে ডিজিটাল স্বাক্ষর, নিরাপত্তা টোকেন নম্বর এবং মোবাইল স্ক্যানযোগ্য কিউআর কোড থাকবে।
- **Decision:**
  আমরা পাইথনের নেটিভ **ReportLab 4.0** লাইব্রেরি ব্যবহার করছি।
- **Positive Consequences:**
  - অত্যন্ত দ্রুত জেনারেশন স্পিড (<১০০ms পার ডকুমেন্ট)।
  - কোনো ব্রাউজার বাইনারি (যেমন Chromium/Puppeteer) বা এক্সটার্নাল C-লাইব্রেরির ওপর নির্ভর করতে হয় না।
  - কিউআর কোড সরাসরি ইন-মেমোরি ভেক্টর হিসেবে এম্বেড হয়।
- **Negative Consequences:**
  - এইচটিএমএল-টু-পিডিএফ সিএসএস স্টাইলিংয়ের বদলে পাইথন কোডে লেআউট পজিশনিং ড্র করতে হয়।
- **Alternatives Considered & Rejected:**
  - *Headless Chrome / Puppeteer:* রিজেক্টেড — কন্টেইনারে অতিরিক্ত ৩০০+ MB মেমোরি নষ্ট করে এবং ক্র্যাশ হওয়ার ঝুঁকি থাকে।
  - *WeasyPrint:* রিজেক্টেড — ফন্ট ডিপেন্ডেন্সি ও লিনাক্স প্যাক সিস্টেমে জটিলতা তৈরি করে।

---

### DEC-010: Stateless JWT Auth with Redis Blacklist & Spatial RBAC over Traditional Session Cookies
- **Status:** ✅ Accepted
- **Date:** 2026-09-18
- **Owner:** Security Lead
- **Context:**
  প্ল্যাটফর্মটিতে বিভিন্ন ডিভাইসে (কন্ট্রোল রুম ডেস্কটপ, জে/এসএসইদের মোবাইল ট্যাবলেট) কর্মীরা লগইন করে। স্টেটলেস স্কেলিংয়ের পাশাপাশি নিরাপত্তা নিশ্চিত করতে লগআউটের সাথে সাথে টোকেন অকার্যকর করা এবং ব্যবহারকারীর জিপিএস অবস্থান অনুমোদিত ট্র্যাক সেকশনে কিনা তা নিশ্চিত করা জরুরি।
- **Decision:**
  আমরা **Stateless JWT (১৫ মিনিট মেয়াদ) + Refresh Token (৭ দিন মেয়াদ, httpOnly)** এবং লগআউটের জন্য **Redis Blacklist** আর্কিটেকচার গ্রহণ করেছি। এর সাথে যুক্ত করা হয়েছে **Spatial Role-Based Access Control (Spatial RBAC - Feature #112)**।
- **Positive Consequences:**
  - ডাটাবেস হিট না করেই এপিআই গেটওয়েতে টোকেন যাচাই।
  - কোনো সিকিউরিটি ব্রিচ হলে বা ইউজার লগআউট করলে Redis ব্ল্যাকলিস্টের মাধ্যমে তাৎক্ষণিক টোকেন রিভোকেশন।
  - স্প্যাশিয়াল আরবিএসির মাধ্যমে নিশ্চিত করা হয় যে ফিল্ড স্টাফ কেবল তাদের নির্ধারিত ডিভিশন ও সেকশনের জন্যই পারমিট বা ক্লিয়ারেন্স আপলোড করতে পারবে।
- **Negative Consequences:**
  - Redis সাময়িকভাবে ডাউন হলে ব্ল্যাকলিস্ট যাচাই বাধাগ্রস্ত হতে পারে (Redis ক্লাস্টার বা মাস্টার-স্লেভ ফেইলওভারের মাধ্যমে সমাধানযোগ্য)।
- **Alternatives Considered & Rejected:**
  - *Traditional Server Sessions:* রিজেক্টেড — মাল্টি-সার্ভার ডেপ্লয়মেন্টে স্টিকি সেশন প্রয়োজন হয় এবং মোবাইল ক্লায়েন্টে সহজে ইন্টিগ্রেট হয় না।

---

## 3. Decision Traceability Matrix to Subsequent Specification Files

| Decision ID | Short Decision Name | Impacted Specification File | Implementation Focus in Target File |
| :--- | :--- | :--- | :--- |
| **DEC-001** | Modular Monolith | `02-microservices/00-service-index.md` | Bounded Context অ্যাপ ক্যাটালগ ও আন্তঃ-মডিউল ডিপেন্ডেন্সি। |
| **DEC-002** | PostgreSQL + PostGIS | `01-tech-infra/02-data-layer.md` | টেবিল স্কিমা, জিওমেট্রি কলাম ও স্প্যাশিয়াল ইনডেক্স। |
| **DEC-003** | Neuro-Symbolic AI | `05-deep-dive-logs/01-common-payloads-and-algorithms.md` | HermiT রিজনার রুলস ও Gemini 1.5 ফ্রেমওয়ার্ক। |
| **DEC-004** | React + TS + Zustand | `01-tech-infra/01-frontend-core.md` | ফ্রন্টএন্ড আর্কিটেকচার, টাইপ ডেফিনিশন ও স্টেট মডেল। |
| **DEC-005** | Channels + Redis | `01-tech-infra/03-event-brokers.md` | ওয়েবসকেট ইভেন্ট স্কিমা ও পাব/সাব ব্রডকাস্ট। |
| **DEC-006** | 4-Queue Celery | `01-tech-infra/07-workers-consumers.md` | কিউ কনফিগারেশন, রিট্রাই পলিসি ও ব্যাকগ্রাউন্ড টাস্ক। |
| **DEC-007** | Leaflet + PostGIS | `03-service-blueprints/03-asset-digital-twin-service.md` | করিডোর স্প্যাশিয়াল ম্যাপ ও জিওজেসন রেন্ডারিং। |
| **DEC-008** | Pluggable Adapters | `03-service-blueprints/05-demo-data-system.md` | মক ↔ রিয়েল অ্যাডাপ্টার প্যাটার্ন ও সিড ইঞ্জিন। |
| **DEC-009** | ReportLab PDF | `05-deep-dive-logs/contracts/01-block-service-contracts.md` | অফিসিয়াল স্যাংশন অর্ডার PDF ডায়াগ্রাম ও পে-লোড। |
| **DEC-010** | JWT + Spatial RBAC | `01-tech-infra/06-security.md` | আরবিএসি ম্যাট্রিক্স, টোকেন রোটেশন ও অডিট ট্রেইল। |
