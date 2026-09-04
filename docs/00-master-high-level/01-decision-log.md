# 01-decision-log.md

> **ফাইল ক্রম:** ২/৪৫  
> **পূর্ববর্তী ফাইল:** `00-master-high-level/00-architecture.md` (সিদ্ধান্তের উৎস)  
> **পরবর্তী ফাইল:** `00-master-high-level/02-glossary.md`  
> **সংযোগ:** এই ফাইলে ব্যবহৃত প্রতিটি টেকনিক্যাল টার্ম (`Modular Monolith`, `Owlready2`, `Quadstore`, `ASGI`, ইত্যাদি) `02-glossary.md`-এ সংজ্ঞায়িত হবে।

---

## Decision Summary Table

| # | Decision ID | Title | Status | Owner |
|---|-------------|-------|--------|-------|
| 1 | DEC-001 | Modular Monolith over Microservices | Accepted | Tech Lead |
| 2 | DEC-002 | Django + DRF over FastAPI | Accepted | Tech Lead |
| 3 | DEC-003 | Owlready2 over Apache Jena | Accepted | AI Lead |
| 4 | DEC-004 | Gemini API over Local LLM (Primary) | Accepted | AI Lead |
| 5 | DEC-005 | Django Channels + Redis over Socket.io | Accepted | Backend Lead |
| 6 | DEC-006 | Railway/Render Free Tier over AWS | Accepted | DevOps Lead |
| 7 | DEC-007 | Mapbox GL JS over Leaflet | Accepted | Frontend Lead |
| 8 | DEC-008 | MySQL over PostgreSQL | Accepted | Backend Lead |
| 9 | DEC-009 | Zustand over Redux | Accepted | Frontend Lead |
| 10 | DEC-010 | React 18 + Vite over Next.js | Accepted | Frontend Lead |

---

## DEC-001: Modular Monolith over Microservices

**Status:** ✅ Accepted  
**Date:** 2026-09-02  
**Owner:** Tech Lead

### Context
PS 26027 হ্যাকাথন প্রজেক্ট (৩ দিনের টাইমলাইন)। ৫টি লজিক্যাল ডোমেইন আছে (Auth, Blocks, Ontology, Trains, Notifications) কিন্তু টিম সাইজ ছোট (৪-৫ জন)। প্রতিটা সার্ভিস আলাদা ডিপ্লয়, আলাদা ডাটাবেজ, আলাদা CI/CD পাইপলাইন ম্যানেজ করার রিসোর্স নেই।

### Decision
Django apps কে Bounded Context হিসেবে ব্যবহার করে একটি Single Deployable Unit (Modular Monolith) তৈরি করা হবে। প্রতিটি অ্যাপ (`accounts`, `blocks`, `ontology`, `trains`, `notifications`) নিজের মডেল, ভিউ, সিরিয়ালাইজার, এবং টেস্ট নিজের ফোল্ডারে রাখবে, কিন্তু শেয়ারড ডাটাবেজ (MySQL) এবং শেয়ারড Redis ইনস্ট্যান্স ব্যবহার করবে।

### Positive Consequences
- ⚡ র‍্যাপিড ডেভেলপমেন্ট — একটা প্রজেক্ট রান করলে সব অ্যাপ রানিং
- 🧪 সহজ টেস্টিং — `pytest` একবার চালালে সব অ্যাপের টেস্ট রান হয়
- 🗃️ একটা ডাটাবেজ — ক্রস-অ্যাপ JOIN query সহজ, transaction ACID গ্যারান্টি
- 🚀 সহজ ডেপ্লয়মেন্ট — একটা Docker image, একটা Railway service

### Negative Consequences
- 📦 Tight coupling risk — একটা অ্যাপের চেঞ্জ অন্যটাকে অফেক্ট করতে পারে
- 🏗️ Future extraction cost — স্কেল করতে গেলে পরে microservice-এ ভাগ করতে হবে
- 📊 Independent scaling impossible — পুরো অ্যাপ একসাথে স্কেল করতে হয়

### Alternatives Considered
- **Microservices (FastAPI per service):** Rejected — ৩ দিনে Docker Compose + K8s + Service Discovery + Inter-service auth ম্যানেজ করা অসম্ভব।
- **Serverless (AWS Lambda / Vercel Functions):** Rejected — Cold start latency, vendor lock-in, এবং Django ORM-এর সাথে serverless প্যাটার্ন মানানসই নয়।

---

## DEC-002: Django + DRF over FastAPI

**Status:** ✅ Accepted  
**Date:** 2026-09-02  
**Owner:** Tech Lead

### Context
ব্যাকএন্ড ফ্রেমওয়ার্ক নির্বাচন। টিমের সবাই Python-এ কমফর্টেবল। দুইটা মেইন অপশন: Django (mature, batteries-included) vs FastAPI (modern, async-native, type-hinted)।

### Decision
Django 5.0 + Django REST Framework (DRF) 3.14 ব্যবহার করা হবে প্রাইমারি ব্যাকএন্ড হিসেবে। FastAPI ব্যবহার করা হবে না।

### Positive Consequences
- 🛡️ Admin Panel — Django built-in admin-এর মাধ্যমে COA ডেটা দেখতে/এডিট করতে পারবে কোনো এক্সট্রা কোড ছাড়াই
- 🗄️ Mature ORM — Django ORM-এর migration system, relationship handling, raw SQL fallback সব প্রোডাকশন-টেস্টেড
- 🔐 Auth Ecosystem — `django-rest-framework-simplejwt`, `django-guardian`, `django-cors-headers` — সব well-maintained
- 📚 Documentation & Community — স্ট্যাকওভারফ্লোতে সমাধান বেশি, AI prompt-এর জন্য example বেশি

### Negative Consequences
- 🐢 Sync by default — Django WSGI sync। Async view (Django 4.2+) আছে কিন্তু ecosystem এখনো পুরোপুরি async-ready নয়
- 📦 Heavier — FastAPI-এর তুলনায় বেশি boilerplate (settings.py, urls.py, apps.py)
- 🔄 Serialization — DRF serializer FastAPI-র `Pydantic model`-এর তুলনায় slow

### Alternatives Considered
- **FastAPI + SQLAlchemy + Alembic:** Rejected — Admin panel নেই, ORM less mature, team-এর অভিজ্ঞতা কম। তবে future microservice extraction-এর জন্য reserve রাখা হলো।
- **Flask + Flask-RESTX:** Rejected — Too minimal। হ্যাকাথনে auth, admin, ORM সব নিজে বানাতে হবে।

---

## DEC-003: Owlready2 over Apache Jena

**Status:** ✅ Accepted  
**Date:** 2026-09-02  
**Owner:** AI Lead

### Context
Semantic Digital Twin-এর জন্য OWL 2 ontology engine লাগবে। দুই মেইন অপশন: Python-native Owlready2 vs Java-based Apache Jena + Fuseki SPARQL server।

### Decision
Owlready2 0.46 ব্যবহার করা হবে Digital Twin ontology management এবং reasoning-এর জন্য। RDFLib (SPARQL execution) companion হিসেবে থাকবে। Apache Jena ব্যবহার করা হবে না।

### Positive Consequences
- 🐍 Same Language — Python backend-এর মধ্যেই সব কিছু (ontology load, reasoning, query) করা যায়, Java stack শেখার দরকার নেই
- 📁 File-based — SQLite quadstore (Owlready2 default) — আলাদা server চালানোর দরকার নেই, Git-এ version control করা যায়
- 🔗 Django Integration — `ontology` app-এর মধ্যে `DigitalTwinManager` class বানিয়ে directly call করা যায়
- ⚡ Fast Startup — Jena Fuseki-র মতো JVM warm-up time নেই

### Negative Consequences
- 🏗️ Limited Scalability — Single-file SQLite quadstore concurrent write-এ bottleneck হতে পারে
- 🧠 Reasoner Limitation — HermiT built-in reasoning, but complex OWL 2 DL feature সম্পূর্ণ support নাও করতে পারে
- 🌐 No Remote SPARQL Endpoint — Jena Fuseki-র মতো HTTP SPARQL endpoint নেই, সব in-process

### Alternatives Considered
- **Apache Jena + Fuseki:** Rejected — Java stack, separate server process, Docker Compose-এ আরেকটা container লাগবে, team-এ Java experience কম।
- **Neo4j + Cypher:** Rejected — Cypher query language (SPARQL নয়), OWL native support নেই, property graph instead of semantic graph। তবে future scale-এর জন্য reserve।
- **RDFLib standalone:** Rejected — Owlready2 RDFLib-র উপর built, কিন্তু OWL 2 reasoning support নেই। তাই RDFLib শুধু SPARQL execution-এ helper হিসেবে।

---

## DEC-004: Gemini API over Local LLM (Primary)

**Status:** ✅ Accepted  
**Date:** 2026-09-02  
**Owner:** AI Lead

### Context
AI text generation-এর জন্য (conflict explanation Bengali/Hindi-তে, report generation, chatbot) LLM লাগবে। দুই অপশন: Cloud API (Gemini/OpenAI) vs Local model (Ollama/Llama.cpp)।

### Decision
Google Gemini 1.5 Flash primary LLM হিসেবে ব্যবহার করা হবে। Local fallback হিসেবে Ollama + Phi-3 (3.8B) রাখা হবে (offline/demo backup)। OpenAI GPT-4 ব্যবহার করা হবে না।

### Positive Consequences
- 💰 Free Tier — Gemini API-এর daily limit হ্যাকাথন demo-এর জন্য যথেষ্ট (15 req/min)
- 🌐 Bengali/Hindi — Google-র মডেলে Indic language support OpenAI-এর তুলনায় ভালো
- ⚡ No GPU Needed — Local machine-এ ৭B model run করতে ৮-১৬GB RAM + GPU লাগে, Gemini-তে শুধু internet
- 🔧 Reliable JSON — Structured output (JSON mode) comparatively stable

### Negative Consequences
- 🌐 Internet Dependency — Demo-তে internet না থাকলে Gemini কাজ করবে না (তাই Phi-3 fallback)
- 🔑 API Key Management — Key leak হলে quota শেষ হতে পারে, environment variable-এ রাখতে হবে
- ⏱️ Rate Limits — 15 req/min — bulk report generation-এ throttle খেতে পারে
- 📡 Latency — Network round-trip ~500-1500ms (local model-এর তুলনায় slow)

### Alternatives Considered
- **OpenAI GPT-4 / GPT-3.5:** Rejected — Paid (no generous free tier), Bengali output less natural, hackathon budget নেই।
- **Local Llama 3 8B (Ollama):** Rejected — Primary হিসেবে নয়, কারণ 8GB+ RAM লাগে, JSON output unreliable, demo-তে laptop hang করতে পারে। তবে offline fallback হিসেবে accepted।
- **Local Phi-3 3.8B:** Accepted — Backup only। 4GB RAM-এ চলে, কিন্তু Bengali weak, JSON parsing error বেশি।

---

## DEC-005: Django Channels + Redis over Socket.io Standalone

**Status:** ✅ Accepted  
**Date:** 2026-09-02  
**Owner:** Backend Lead

### Context
Real-time feature লাগবে (block status update, conflict alert, map color change, emergency broadcast)। WebSocket implementation-এর দুই পথ: Django Channels (ASGI) vs standalone Socket.io server (Node.js)।

### Decision
Django Channels 4.0 + Channels-Redis ব্যবহার করা হবে WebSocket এবং background pub/sub-এর জন্য। Redis 7 Channels layer হিসেবে কাজ করবে। Standalone Socket.io server ব্যবহার করা হবে না।

### Positive Consequences
- 🔗 Native Integration — Django authentication middleware, user object, database query — সব WebSocket consumer-এ directly access করা যায়
- 🗃️ Shared Redis — Cache, session, Celery broker, আর Channels layer — সব একটা Redis instance-এ
- 🐍 Single Language — Python-এই সব, Node.js server আলাদা ম্যানেজ করতে হবে না
- 🧪 Testing — Django test client দিয়ে WebSocket consumer test করা যায়

### Negative Consequences
- 📚 Complexity — Django sync world-এ async consumer লেখা mental model shift চাই
- 🐢 ASGI Overhead — Uvicorn + ASGI application WSGI-এর তুলনায় কিছুটা heavy
- 🔧 Limited Browser Support — Channels WebSocket standard WebSocket, Socket.io-র মতো auto-reconnect + fallback (long-polling) নেই

### Alternatives Considered
- **Standalone Socket.io (Node.js) + Redis Adapter:** Rejected — আলাদা Node.js server চালাতে হবে, Django auth share করতে JWT custom logic লিখতে হবে, deployment জটিল।
- **Server-Sent Events (SSE):** Rejected — One-way (server → client) only। Client থেকে emergency block trigger, chat message — এগুলো দরকার, তাই bidirectional WebSocket লাগবে।

---

## DEC-006: Railway/Render Free Tier over AWS

**Status:** ✅ Accepted  
**Date:** 2026-09-02  
**Owner:** DevOps Lead

### Context
Cloud deployment-এর জন্য প্ল্যাটফর্ম নির্বাচন। AWS/GCP vs PaaS (Railway, Render, Fly.io)।

### Decision
Railway বা Render Free Tier ব্যবহার করা হবে MVP/hackathon deployment-এর জন্য। AWS/GCP ব্যবহার করা হবে না এই phase-এ।

### Positive Consequences
- 💰 Zero Cost — Free tier-এ PostgreSQL + Redis + Web service — সব ফ্রি
- ⚡ Auto-Deploy — GitHub push-এ automatic deployment
- 🔒 Auto-SSL — HTTPS certificate automatic
- 🐳 Native Docker — Dockerfile থেকে build করে
- 🕐 Time Saving — Terraform, VPC, IAM, Load Balancer — কিছুই কনফিগার করতে হবে পরিচয় করতে হবে না

### Negative Consequences
- 📉 Resource Limit — 512MB RAM, sleep after inactivity (Render free tier)
- 🔒 Vendor Lock-in — Railway/Render-এর নিজস্ব config format
- 🌍 No Multi-Region — Single region only, latency issue for other states
- 💤 Cold Start — Free tier-এ inactive থাকলে first request slow

### Alternatives Considered
- **AWS EC2 + RDS + ElastiCache:** Rejected — Cost (t3.micro ও paid), complexity (Security Group, IAM, VPC), setup time ৩-৪ ঘণ্টা।
- **Google Cloud Run:** Rejected — Stateless container only, PostgreSQL আলাদা provision করতে হয় (Cloud SQL expensive)।
- **Vercel (Frontend) + Railway (Backend):** Considered — Frontend Vercel-এ, backend Railway-এ — এটা future-এ করা যেতে পারে, কিন্তু hackathon-এ single platform simple।

---

## DEC-007: Mapbox GL JS over Leaflet

**Status:** ✅ Accepted  
**Date:** 2026-09-02  
**Owner:** Frontend Lead

### Context
Interactive rail map-এর জন্য library নির্বাচন। দুই মেইন অপশন: Mapbox GL JS (vector tiles, 3D, WebGL) vs Leaflet (raster tiles, lightweight, open-source)।

### Decision
Mapbox GL JS 2.15 ব্যবহার করা হবে primary map library হিসেবে। Leaflet + CartoDB Dark Matter tiles backup plan হিসেবে থাকবে (Mapbox token issue হলে)।

### Positive Consequences
- 🌃 Dark Theme — Built-in `mapbox://styles/mapbox/dark-v11` — railway control room-এর মতো professional look
- 🏢 3D Buildings — Station area-তে 3D building extrusion দেখা যায়
- ✨ Smooth Animation — 60FPS train marker movement, line glow effects
- 🎨 Custom Layers — Custom GeoJSON rail lines, heatmap, animated dashed lines — সব native support
- 📱 Mobile Optimized — Touch gestures, inertia, smooth zoom

### Negative Consequences
- 🔑 API Token Needed — `pk.eyJ1...` public token লাগবে, token invalid হলে map blank দেখাবে
- 📡 Internet Dependency — Vector tiles Mapbox CDN থেকে load হয়, offline চলবে না
- 📊 Usage Limit — 50,000 map loads/month free tier, exceed হলে bill
- 📦 Bundle Size — ~150KB+ (Leaflet-এর তুলনায় heavy)

### Alternatives Considered
- **Leaflet (Offline):** Rejected as primary — Raster tiles, 3D support নেই, animation smoothness কম, কিন্তু backup হিসেবে accepted (CartoDB Dark Matter tiles)।
- **OpenLayers:** Rejected — API complex, documentation scattered, team experience নেই।
- **Google Maps API:** Rejected — Paid (no generous free tier), dark theme customization কম, railway-specific styling difficult।

---

## DEC-008: MySQL over PostgreSQL

**Status:** ✅ Accepted  
**Date:** 2026-09-02  
**Owner:** Backend Lead

### Context
Primary relational database নির্বাচন। PostgreSQL vs MySQL (MariaDB)।

### Decision
MySQL 8.0 ব্যবহার করা হবে primary database হিসেবে। PostgreSQL ব্যবহার করা হবে না।

### Positive Consequences
- 🚀 Speed & Simplicity — MySQL-এর read performance ভালো এবং সেটআপ তুলনামূলকভাবে সহজ।
- 👥 Team Experience — টিমের সবাই MySQL-এ অনেক বেশি অভ্যস্ত।
- 🗺️ Spatial Data — MySQL Spatial extension ব্যবহার করে point/polygon query করা সম্ভব।
- 🔐 ACID & Concurrency — InnoDB engine ACID compliant এবং row-level locking support করে।

### Negative Consequences
- 🐢 GIS Limitations — PostGIS-এর তুলনায় MySQL Spatial-এ advanced GIS function কম।
- 🧩 Django Support — ArrayField-এর মতো কিছু Django feature MySQL-এ native support করে না।

### Alternatives Considered
- **PostgreSQL 15:** Rejected — Team-এর অভিজ্ঞতা কম, এবং হ্যাকাথনের জন্য MySQL-ই যথেষ্ট।
- **SQLite:** Rejected — Concurrent write locking, no separate user management, production-এ নিরাপদ নয় (শুধু ontology quadstore-এ ব্যবহার)।

---

## DEC-009: Zustand over Redux

**Status:** ✅ Accepted  
**Date:** 2026-09-02  
**Owner:** Frontend Lead

### Context
React frontend-এ global state management library নির্বাচন।

### Decision
Zustand 4.5 ব্যবহার করা হবে global client state management-এর জন্য। Redux Toolkit ব্যবহার করা হবে না। Server state (API data) React Query (TanStack Query) দিয়ে handle করা হবে (যদি সময় থাকে), নাহলে Zustand-এই সব।

### Positive Consequences
- 🪶 Lightweight — 1KB bundle size (Redux + RTK + Thunk ~10KB+)
- 📝 Minimal Boilerplate — No actions, reducers, store configuration file
- 🎣 Hooks API — `useAuthStore()`, `useBlockStore()` — direct, readable
- 🔄 Easy Async — Async actions directly in store, no middleware needed
- 🧪 Easy Testing — Plain functions, no provider wrapping needed

### Negative Consequences
- 🏗️ Less Structure — Large team-এ conventions মেনে চলা কঠিন (hackathon-এ team ছোট, সমস্যা নয়)
- 🔍 DevTools — Redux DevTools-এর মতো mature time-travel debugging নেই (Zustand-এ devtools middleware আছে কিন্তু basic)

### Alternatives Considered
- **Redux Toolkit (RTK):** Rejected — Boilerplate বেশি, hackathon-এ সময় নষ্ট, overkill for this scale।
- **React Context + useReducer:** Rejected — Prop drilling, re-render issue, global state-এর জন্য নির্ভরযোগ্য নয়।
- **Jotai / Recoil:** Rejected — Atom-based model, team-এর familiarity কম। Zustand বেশি popular এবং simple।

---

## DEC-010: React 18 + Vite over Next.js

**Status:** ✅ Accepted  
**Date:** 2026-09-02  
**Owner:** Frontend Lead

### Context
Frontend framework এবং build tool নির্বাচন। Next.js 14 (App Router) vs React 18 + Vite।

### Decision
React 18.2 + Vite 5.0 ব্যবহার করা হবে frontend stack হিসেবে। Next.js ব্যবহার করা হবে না।

### Positive Consequences
- ⚡ Fast Dev Server — Vite HMR (Hot Module Replacement) ~50ms, Next.js-এর তুলনায় অনেক fast
- 🎓 Simplicity — No framework-specific conventions (routing, data fetching, server components)
- 🗺️ Mapbox Integration — Client-side only library (Mapbox GL JS) Next.js-এর SSR-এ জটিল, Vite-এ straightforward
- 📦 Flexible Deployment — Static build (`dist/`) যেকোনো static host-এ (Railway, Render, Vercel, Netlify)

### Negative Consequences
- 🏗️ No Built-in Routing — `react-router-dom` আলাদা install করতে হয়
- 🖥️ No SSR/SSG — SEO দরকার নেই (internal tool), কিন্তু first load slightly slower
- 🛡️ No API Routes — Backend API আলাদা, frontend শুধু consumer

### Alternatives Considered
- **Next.js 14 (App Router):** Rejected — SSR/SEO দরকার নেই, deployment slightly complex compared to static Vite build, App Router learning curve steep (hackathon-এর জন্য risky)।
- **Angular:** Rejected — Boilerplate অনেক বেশি, team-এর experience React-এ বেশি।
- **Create React App (CRA):** Rejected — Deprecated, slow build times compared to Vite।
