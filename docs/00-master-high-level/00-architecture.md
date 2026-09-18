# 00-architecture.md

> **ফাইল ক্রম:** ১/৪৫  
> **ডিরেক্টরি:** `00-master-high-level/`  
> **পরবর্তী ফাইল:** `00-master-high-level/01-decision-log.md`  
> **কন্টেন্ট সোর্স:** `RailBlock_Feature_Master_Plan_PS26027(1).xlsx` (১২২টি ফিচার, ৪টি মূল সমস্যা স্তম্ভ, ১৫টি সেফটি ফিচার, ৬টি ডেমো ডেটা সিস্টেম), `ai-project-spec-generator (1).md` এবং **State-of-the-Art Neuro-Symbolic AI Architecture**।  
> **ডাটাবেস ও এআই নীতি:** **PostgreSQL 15/16 + PostGIS 3.3** (নো MySQL) এবং **Neuro-Symbolic Hybrid AI** (Symbolic AI: Owlready2 + HermiT ↔ Neural AI: Google Gemini 1.5 Flash)।

---

## 1. Executive Summary & Problem Context

### 1.1 Project Identity & Alignment
- **Problem Statement ID:** PS 26027 (Ministry of Railways — Smart India Hackathon)
- **Official Problem Statement:** *"AI-Powered Automatic Block Planning to Maximize Asset Availability for Train Operations on Indian Railways"*
- **Project Name:** RailBlock AI (Automatic Block Planning & Asset Availability Maximization Engine)
- **Architectural Paradigm:** **Neuro-Symbolic AI Architecture** — যেখানে ১০০% নির্ভুল ডিটারমিনিস্টিক রুল-বেসড সিম্বলিক রিজনিং (OWL 2 DL + HermiT) এবং ল্যাঙ্গুয়েজ ফ্লুয়েন্ট নিউরাল এআই (LLM: Gemini 1.5 Flash) একত্রে কাজ করে।
- **One-Line Value Pitch:** Engineering (TMS), Signalling (SMMS), এবং Traction (TDMS)-এর বিচ্ছিন্ন ডেটা সাইলোকে রিয়েল-টাইমে একত্রিত করে Neuro-Symbolic AI চালিত Combined Block Window ও PostGIS স্প্যাশিয়াল ডিজিটাল টুইনের মাধ্যমে ট্রেনের সময়ানুবর্তিতা ও লাইনের কার্যক্ষমতা সর্বোচ্চকরণ।
- **System Classification:** Mission-Critical Railway Decision Support System (DSS) + Enterprise Operational Web Platform + Real-Time Track Availability Dashboard.
- **Target Users & Personas:**
  1. **Civil/Track Engineers (ENGG - P-Way):** Junior Engineer (JE) ও Senior Section Engineer (SSE) — Track Maintenance System (TMS) ডিফেক্ট সমাধান।
  2. **Signal & Telecom Engineers (S&T):** JE/SSE — Signalling Maintenance Management System (SMMS) সিগন্যাল ও পয়েন্ট রক্ষণাবেক্ষণ।
  3. **Traction Distribution Engineers (TRD):** JE/SSE — Traction Distribution Management System (TDMS) OHE পাওয়ার লাইন ও সাবস্টেশন রক্ষণাবেক্ষণ।
  4. **Operations & Traffic Controllers (COA):** Chief Controller ও Section Controller — Control Office Application (COA) ও Block Data Management System (BDMS) করিডোর অনুমোদনকারী।
  5. **Safety Officers & Crew In-Charge:** লাইন ক্লোজার টোকেন ও পারমিট-টু-ওয়ার্ক (PTW) যাচাইকারী।
- **Expected Scale:**
  - *Phase 1 (Demonstration / SIH):* Eastern Railway / South Eastern Railway নেটওয়ার্ক (Howrah, Sealdah, Kharagpur, Asansol ডিভিশন) — ৫০+ সেকশন, ১০০+ সমকালীন ট্রেন ও ১৫+ গ্যাং।
  - *Phase 2 (Zonal Production):* পুরো জোন (Zonal Railway HQ ও Divisional Control Rooms) — ১০,০০০+ সক্রিয় কিমি ট্র্যাক ও দৈনিক ৫০০+ ব্লক রিকোয়েস্ট।

### 1.2 Core Problem Context (The 4 PS Pillars)
বর্তমানে ভারতীয় রেলে রক্ষণাবেক্ষণ ব্লক অনুমোদন একটি জটিল, সময়সাপেক্ষ এবং বহুলাংশে ম্যানুয়াল প্রক্রিয়া:
1. **সাইলয়েড ডেটা আইল্যান্ড (Pillar 1):** ট্র্যাক ডিফেক্টের তথ্য থাকে TMS-এ, সিগন্যালের সমস্যা SMMS-এ, আর ওভারহেড তারের মেইনটেন্যান্স TDMS-এ। অপারেশন কন্ট্রোল (COA) আলাদাভাবে ট্রেনের সময়সূচি নিয়ন্ত্রণ করে। পরস্পরের মধ্যে স্বয়ংক্রিয় কোনো সমন্বয় নেই।
2. **স্বচ্ছ প্রায়োরিটাইজেশনের অভাব (Pillar 2):** কোন ডিফেক্টটি আগে সারানো জরুরি (CoF × LoF রিস্ক ম্যাট্রিক্স, ডিফেক্ট এজিং, ট্রেনের গুরুত্ব) তা পরিমাপ করার অটোমেটিক গাণিতিক স্কোরিং ব্যবস্থা নেই।
3. **বিচ্ছিন্ন ব্লক বনাম কম্বাইন্ড ব্লক উইন্ডো (Pillar 3 - Core USP):** একই সেকশনে ট্র্যাক, সিগন্যাল এবং OHE-এর তিনটি আলাদা দল সপ্তাহে ৩ বার আলাদা আলাদা ব্লক নিয়ে ট্রেন থামায়। আমাদের কোর উদ্ভাবন হলো **Combined Block Window (Feature #98)** — যেখানে একাধিক ডিপার্টমেন্ট একসাথে "শ্যাডো ব্লক" আকারে কাজ সম্পন্ন করবে, ফলে ট্রেনের ব্যাঘাত একবারই ঘটবে।
4. **পরিকল্পনা ও অনুমোদনের জটিলতা (Pillar 4):** সাপ্তাহিক ও মাসিক দীর্ঘমেয়াদী প্ল্যানিংয়ের অভাব, ট্রেনের লেট হলে তাৎক্ষণিক রিক্যালকুলেশনের সুযোগ না থাকা এবং সনাতন কাগুজে মেমোর বদলে ডিজিটাল স্যাংশন অর্ডার PDF ও SLA ট্র্যাকিংয়ের প্রয়োজনীয়তা।

---

## 2. Complete Directory Structure

প্রজেক্টটি আধুনিক **Modular Clean Architecture** অনুসরণ করে গঠিত। ব্যাকএন্ডে Django 5 + Django REST Framework + Channels (WebSockets) + Celery, এবং ফ্রন্টএন্ডে React 18 + TypeScript + Vite + TailwindCSS:

```
Railway-Project-for-SIH/
├── 📁 apps/                                  # Django Modular Core Applications
│   ├── 📁 accounts/                          # RBAC Authentication, User Personas & Permissions
│   ├── 📁 analytics/                         # Asset Availability Score, Variance, KPI Engine
│   ├── 📁 api/                                # Global URL Routing, Swagger/OpenAPI, Versioning
│   ├── 📁 assets/                           # PostGIS Assets: Track, Signal, OHE, Stations
│   ├── 📁 blocks/                            # Block Request, Optimization, Conflict, Combined Window
│   ├── 📁 core/                              # Base Models, Abstract Audits, Exception Handlers
│   ├── 📁 departments/                       # ENGG, S&T, TRD Gangs, Equipment, Base-Stations
│   ├── 📁 emergency/                         # Emergency Block Override, Track Breach, Derailment Guard
│   ├── 📁 grievances/                        # Driver/Staff Feedback & Crew Safety Reporting
│   ├── 📁 maintenance/                       # TMS/SMMS/TDMS Defect Logs, CoF×LoF Risk Scoring
│   ├── 📁 notifications/                     # Real-time WebSocket Broadcast, SMS/Email Alerts
│   ├── 📁 ontology/                          # Semantic Digital Twin (Owlready2, HermiT Reasoner, SHACL)
│   └── 📁 trains/                            # Train Time Table, Live NTES Delays, Cascade Recalculator
├── 📁 config/                                # Project Configuration & ASGI/WSGI Roots
│   ├── __init__.py
│   ├── asgi.py                               # Daphne ASGI Entrypoint for WebSockets
│   ├── celery.py                             # Celery Worker Configuration (4 Dedicated Queues)
│   ├── settings.py                           # PostgreSQL, Redis, PostGIS & Security Settings
│   ├── urls.py                               # Master Root Router
│   └── wsgi.py                               # Gunicorn WSGI Entrypoint
├── 📁 digital_twin/                          # OWL 2 Ontologies & Semantic Graph Storage
│   ├── railway_digital_twin.owl              # Indian Railways Semantic Network Ontology
│   └── railway_rules.shacl                   # Semantic Coherence & Conflict Validation Rules
├── 📁 docker/                                # Container Orchestration Manifests
│   ├── Dockerfile                            # Multi-stage Python 3.11 Backend Build
│   ├── entrypoint.sh                         # PostgreSQL wait, migrate, seed & run script
│   └── nginx.conf                            # Nginx Reverse Proxy, SSL & Static Asset Server
├── 📁 docs/                                  # 10 Master Specification & Execution Folders
│   ├── 📁 00-master-high-level/              # Architecture, Decision Log, Glossary
│   ├── 📁 01-tech-infra/                     # Backend, Frontend, Data Layer, Security, Testing
│   ├── 📁 02-microservices/                  # Modular App Index & Dependency Matrix
│   ├── 📁 03-service-blueprints/             # Blueprints for Blocks, Trains, Assets, Safety, Demo
│   ├── 📁 04-function-maps/                  # Global Function ID Registry & API Signatures
│   ├── 📁 05-deep-dive-logs/                 # Algorithms, Error Codes, ADRs, REST Contracts
│   ├── 📁 06-testing-qa/                     # E2E Test Scenarios (A/B/C/D), Data Seeding Specs
│   ├── 📁 07-roadmap/                        # Implementation Phases, Milestones, Rollback Plans
│   ├── 📁 08-standards/                      # Coding, API, Commit, Prompt Engineering Standards
│   └── 📁 09-execution-tracker/              # Living Parallel Backend+Frontend Checklist & Proofs
├── 📁 frontend/                              # Enterprise React 18 SPA (TypeScript + Vite)
│   ├── 📁 src/
│   │   ├── 📁 assets/                        # SVG Icons, Indian Railways Badges, Audio Alerts
│   │   ├── 📁 components/                    # Modular UI: GIS Corridor Map, Schedule Gantt, Modals
│   │   ├── 📁 hooks/                         # useWebSocket, useAuth, useCorridorStatus, useLiveTrains
│   │   ├── 📁 layouts/                       # Control Room Layout, Department Workspace Layout
│   │   ├── 📁 pages/                         # Dashboard, Block Planning, Safety Suite, Analytics
│   │   ├── 📁 services/                      # Axios API Clients with Auto-Retry & Error Interceptors
│   │   ├── 📁 stores/                        # Zustand Global State (Auth, Active Blocks, Live Alerts)
│   │   ├── 📁 types/                         # Strict TypeScript Interfaces for all API Entities
│   │   ├── 📁 utils/                         # Date-fns, Chainage Converters, Geometry Parsers
│   │   ├── App.tsx                           # Master Router & Protected Route Guards
│   │   ├── index.css                         # Tailwind Directives, Custom Railway Design Tokens
│   │   └── main.tsx                          # Vite React DOM Bootstrap
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   └── vite.config.ts
├── 📁 scripts/                               # Operational Tooling & Demo Generators
│   ├── init_postgres.sh                      # PostGIS Extension Init Script (`CREATE EXTENSION postgis;`)
│   ├── seed_railway_demo.py                  # Master Seed (Fixed Seed 26027, 7-Phase Execution)
│   ├── start.ps1                             # One-click Windows PowerShell Startup Engine
│   └── start.sh                              # One-click Linux/macOS Startup Engine
├── .env.example                              # Template Environment Variables (Zero Secrets)
├── .gitignore
├── docker-compose.yml                        # Production-ready PostGIS, Redis, Backend, Frontend
├── manage.py                                 # Django CLI Controller
├── README.md                                 # Top-Level System Overview & Setup Guide
└── requirements.txt                          # Locked Production Python Dependencies
```

---

## 3. Master Neuro-Symbolic AI System Architecture

### 3.1 End-to-End Enterprise Architecture Topology

```text
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                              🖥️ CLIENT LAYER (React 18 + Vite + TS)                             │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  ┌────────────────────────┐   │
│  │  ENG/TRD/SNT     │  │  Control Room    │  │  Interactive GIS │  │  TanStack Query +      │   │
│  │  Dashboards      │  │  Big Screen      │  │  Corridor Map    │  │  Zustand State Mgmt    │   │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘  └───────────┬────────────┘   │
└───────────┼─────────────────────┼─────────────────────┼────────────────────────┼────────────────┘
            │ HTTPS / WSS         │                     │                        │
            ▼                     ▼                     ▼                        ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                              🌐 GATEWAY LAYER (Nginx Reverse Proxy)                             │
│           Routes /api/* to Gunicorn (Port 8000) and /ws/* to Daphne (Port 8001)                 │
└──────────────────────────────┬─────────────────────────────────────────┬────────────────────────┘
                               │                                         │
                               ▼                                         ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                           ⚙️ APPLICATION LAYER (Django 5.0 Monolith)                            │
│                                                                                                 │
│  ┌────────────────────────────────┐                 ┌────────────────────────────────────────┐  │
│  │  🦄 Gunicorn (WSGI Server)     │                 │  🐉 Daphne (ASGI WebSocket Server)     │  │
│  │  Port: 8000                    │                 │  Port: 8001                            │  │
│  │  • REST API (DRF)              │◄───────────────►│  • Django Channels                     │  │
│  │  • JWT Auth & RBAC             │      Redis      │  • Real-time Push-to-Invalidate        │  │
│  │  • Block CRUD & Validation     │     Pub/Sub     │  • Emergency Broadcasts & Map Flashes  │  │
│  └────────────────┬───────────────┘                 └────────────────────────────────────────┘  │
│                   │                                                                             │
└───────────────────┼─────────────────────────────────────────────────────────────────────────────┘
                    │ Enqueues Tasks via Redis Broker
                    ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                        🚀 BACKGROUND PROCESSING LAYER (Celery 5.3)                              │
│                                                                                                 │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────────────┐  ┌──────────────────────┐   │
│  │ ⚡ High Worker │  │ 📱 Notify      │  │ 🧠 Symbolic AI Worker  │  │ 🗄️ Default / Low     │   │
│  │ • Conflict     │  │   Worker       │  │   (Ontology Engine)    │  │   Worker             │   │
│  │   Detection    │  │ • SMS (Twilio/ │  │ • Owlready2 Graph      │  │ • Audit Log Archive  │   │
│  │ • Emergency    │  │   CDAC)        │  │ • HermiT Reasoner      │  │ • ReportLab PDF Gen  │   │
│  │   Override     │  │ • WS Push      │  │ • DL Rules & Reasoning │  │ • Data Rollup & KPI  │   │
│  └────────────────┘  └────────────────┘  └────────────────────────┘  └──────────────────────┘   │
└────────────────────────────────────────────────┬────────────────────────────────────────────────┘
                                                 │
                                                 ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                             💾 DATA & AI LAYER (Storage & Intelligence)                         │
│                                                                                                 │
│  ┌────────────────────────────────────────┐  ┌───────────────────────────────────────────────┐  │
│  │  🐘 PostgreSQL 15 + PostGIS 3.3        │  │  ⚡ Redis 7 (In-Memory Data Store)            │  │
│  │  • Users, Blocks, Trains, Defect Logs  │  │  • Cache (Block lists, Active sessions)       │  │
│  │  • Spatial Geometry (SRID 4326/3857)   │  │  • Celery Task Broker (4 Dedicated Queues)    │  │
│  │  • ACID Transactions & GiST Indexes    │  │  • Django Channels Layer (Pub/Sub)            │  │
│  └────────────────────────────────────────┘  │  • JWT Blacklist & API Rate Limiting          │  │
│                                              └───────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │  🧠 HYBRID AI ENGINE (Neuro-Symbolic Architecture)                                        │  │
│  │                                                                                           │  │
│  │  [ Symbolic AI Engine ]                ◄────────────────► [ Neural AI Engine (LLM) ]      │  │
│  │  • Owlready2 + HermiT Reasoner                             • Google Gemini 1.5 Flash      │  │
│  │  • Deterministic Rules (100% Safe, 0 Hallucinations)       • Natural Language Generation  │  │
│  │  • OWL 2 DL Ontology Reasoning                             • Bengali & Hindi Explanations │  │
│  │  • Physical Railway Track & Power Constraints              • "Why #1?" Explainable Card   │  │
│  │  • Multi-Dept Hazard & OHE Cut Inference                   • Automated Shift Summary      │  │
│  └───────────────────────────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────┬────────────────────────────────────────────────┘
                                                 │
                                                 ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   🌍 EXTERNAL SERVICES & ADAPTERS                               │
│  ┌──────────────────┐  ┌──────────────────┐  ┌────────────────────┐  ┌──────────────────────┐   │
│  │ 📱 Twilio / CDAC │  │ 🌦️ Open-Meteo   │  │ 🚆 NTES Live Feed  │  │ 📡 IoT / Sensors     │   │
│  │   SMS Gateway    │  │   Weather API    │  │   (Time Table &    │  │   (Future Scope:     │   │
│  │   (Crew Alerts)  │  │   (Flood/Fog)    │  │    Delay Stream)   │  │    Track Sensors)    │   │
│  └──────────────────┘  └──────────────────┘  └────────────────────┘  └──────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Neuro-Symbolic AI Engineering Framework

### 4.1 Neuro-Symbolic Integration Mechanics
মিশন-ক্রিটিকাল রেলওয়ে অপারেশনসে সেফটি এবং এক্সপ্লেনাবিলিটির সমন্বয় সাধনে সিস্টেমটি দুটি স্বতন্ত্র কিন্তু ইন্টারফেসিং লেয়ার নিয়ে গঠিত:
1. **Symbolic AI Engine (Deterministic Reasoning & Hard Constraints):**
   - **টুল ও লাইব্রেরি:** Python `owlready2` + `HermiT OWL 2 DL Reasoner` + `pyshacl`।
   - **দায়িত্ব:** রেলওয়ে নেটওয়ার্কের টপোলজি, ওভারহেড ক্যাটেনারি তারের ফিড জোন, ইন্টারলকিং সিগন্যাল ও রোলিং স্টকের ভৌত নির্ভরতা মডেল করা।
   - **জিরো-হ্যালুসিনেশন গ্যারান্টি:** গাণিতিক লজিক প্রুফ (Description Logic) ব্যবহার করে নির্ধারণ করা হয় যে কোনো ব্লকের প্রস্তাব অনুমোদিত হলে কোনো লাইভ ট্রেন বা অন্য বিভাগের কাজের সাথে দ্বন্দ্ব বা নিরাপত্তা বিঘ্ন ঘটবে কিনা।
2. **Neural AI Engine (Natural Language Generation & Explainability):**
   - **টুল ও লাইব্রেরি:** `Google Gemini 1.5 Flash` (বা স্থানীয় ফলব্যাক Ollama)।
   - **দায়িত্ব:** সিম্বলিক এআই-এর জটিল ম্যাথমেটিকাল কনস্ট্রেইন্ট ভায়োলেশন অথবা অপ্টিমাইজেশন রেজাল্ট গ্রহণ করে মানুষের বোধগম্য ভাষায় অনুবাদ করা।
   - **কঠোর বাউন্ডারি:** নিউরাল এআই কখনোই নিজে সরাসরি ডাটাবেস পরিবর্তন বা ব্লক শিডিউল নির্ধারণ করতে পারে না; এটি কেবলমাত্র সিম্বলিক ইঞ্জিনের প্রস্তুতকৃত প্রুফের ওপর ভিত্তি করে কন্ট্রোলারদের জন্য "Why #1?" এক্সপ্লেনেবল কার্ড (#94) ও দ্বিভাষিক (বাংলা/হিন্দি) অপারেশনাল রিপোর্ট তৈরি করে।

### 4.2 Data Exchange Contract (Symbolic Reasoner ➔ Neural Generator)
সিম্বলিক ইঞ্জিন যখন কোনো কনফ্লিক্ট বা অপ্টিমাইজড পাথ বের করে, তখন সেটি নিচের স্ট্রাকচার্ড JSON কন্ট্রাক্ট আকারে নিউরাল এআই সার্ভিসকে প্রদান করে:

```json
{
  "trace_id": "PROOF-BLK-20260918-0042",
  "decision_type": "COMBINED_BLOCK_OPTIMIZED",
  "section_id": "HWH-BWN-L1",
  "symbolic_proof": {
    "deterministic_valid": true,
    "departments_combined": ["ENGG_TRACK", "TRD_OHE"],
    "time_window": {"start": "02:00", "end": "05:00", "duration_mins": 180},
    "shadow_window_savings_mins": 120,
    "impacted_trains": ["12301_RAJDHANI_EXPRESS"],
    "safety_constraints_satisfied": ["OHE_POWER_ISOLATION_ZONE_4", "TRACK_CIRCUIT_LOCKED", "LOTO_VERIFIED"]
  },
  "explanation_prompt_directives": {
    "target_audience": "Chief Section Controller",
    "languages": ["bn", "en"],
    "max_bullet_points": 3
  }
}
```

### 4.3 Deterministic Safety Verification Pipeline
1. **ইনপুট রিসিভ:** REST API অথবা ব্যাচ ফিডের মাধ্যমে ব্লক রিকোয়েস্ট আসে।
2. **পোস্টজিআইএস স্থানিক যাচাই:** সেকশন লাইনস্ট্রিং এবং চেইনেজ ইন্টারসেকশন যাচাই করা হয়।
3. **সিম্বলিক ডিজিটাল টুইন রিজনিং:** Celery-র `symbolic_ai` কিউতে HermiT রিজনার চালানো হয়। কোনো সেফটি নিয়ম বিঘ্নিত হলে তৎক্ষণাৎ `REJECT_UNSAFE` ফ্ল্যাগ ওঠে।
4. **নিউরাল এক্সপ্লেনেশন জেনারেশন:** রিজনিং সফল হলে কন্ট্রোলারের জন্য "Why #1?" কার্ড প্রস্তুত হয়।
5. **মানবীয় অনুমোদন (Human-in-the-Loop):** চিফ কন্ট্রোলার ব্যাখ্যা ও ডেটা যাচাই করে চূড়ান্ত অনুমোদন দিলে ডিজিটাল টোকেন ও স্যাংশন PDF ইস্যু হয়।

---

## 5. C4 Model Diagrams (Levels 1 to 4)

### 5.1 System Context Diagram (Level 1)

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                Indian Railways Ecosystem                               │
│                                                                                        │
│  ┌─────────────────────────┐  ┌─────────────────────────┐  ┌────────────────────────┐ │
│  │  Engineering (ENGG)     │  │ Signalling & Telecom    │  │ Traction (TRD)         │ │
│  │  Track Maintenance Team │  │ S&T Maintenance Team    │  │ Overhead Line (OHE)    │ │
│  │  (TMS Users)            │  │ (SMMS Users)            │  │ (TDMS Users)           │ │
│  └────────────┬────────────┘  └────────────┬────────────┘  └───────────┬────────────┘ │
│               │                            │                           │              │
│               └────────────────────────────┼───────────────────────────┘              │
│                                            │                                          │
│                                            ▼                                          │
│                              ┌───────────────────────────┐                            │
│                              │  Control Office (COA)     │                            │
│                              │  Chief Section Controller │                            │
│                              └─────────────┬─────────────┘                            │
│                                            │                                          │
│                                            ▼                                          │
│                        ┌───────────────────────────────────────┐                      │
│                        │       RailBlock AI Platform           │                      │
│                        │       (SIH Problem PS 26027)          │                      │
│                        │ • TMS/SMMS/TDMS Unified Ingestion     │                      │
│                        │ • Neuro-Symbolic AI Optimization      │                      │
│                        │ • Combined Block Optimizer (#98)      │                      │
│                        │ • Real-time PostGIS Corridor Monitor  │                      │
│                        │ • 15-Feature Crew Safety Suite        │                      │
│                        └───────┬───────────────────────┬───────┘                      │
│                                │                       │                              │
│                ┌───────────────┘                       └────────────────┐             │
│                ▼                                                        ▼             │
│   ┌─────────────────────────┐                              ┌────────────────────────┐ │
│   │ External Systems / Mocks│                              │ Field Crew & Stations  │ │
│   │ • COA Live Corridor     │                              │ • Digital Token (71)   │ │
│   │ • NTES Train Movement   │                              │ • LOTO & Isolation (74)│ │
│   │ • Open-Meteo Weather    │                              │ • Clear Section (80)   │ │
│   └─────────────────────────┘                              └────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Container Diagram (Level 2)

```text
┌────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                  RailBlock Platform Containers                                 │
│                                                                                                │
│  ┌──────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │ Client Tier: Modern Browser (Desktop / Tablet)                                            │  │
│  │  ┌────────────────────────────────────────────────────────────────────────────────────┐  │  │
│  │  │ Single Page Application (React 18 + TypeScript + Vite + TailwindCSS + Zustand)     │  │  │
│  │  │ • Multi-Dept Dashboard • Interactive PostGIS Track Map • TanStack Query • Big Screen│  │  │
│  │  └───────────────────────────────────────────┬────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────┼───────────────────────────────────────────┘  │
│                                                 │ HTTPS / WSS                                  │
│                                                 ▼                                              │
│  ┌──────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │ Web & Reverse Proxy Tier: Nginx 1.25 Alpine                                              │  │
│  │ • Port 80/443 Termination • Static/Media Serving • SSL • HTTP/1.1 to Backend Reverse Proxy│  │
│  └──────────────────────┬───────────────────────────────────────────────┬───────────────────┘  │
│                         │ HTTP (Port 8000)                              │ WSS (Port 8001)      │
│                         ▼                                               ▼                      │
│  ┌──────────────────────────────────────────────┐  ┌────────────────────────────────────────┐  │
│  │ Application Server: Gunicorn (WSGI)          │  │ ASGI Server: Daphne (Channels)         │  │
│  │ Django 5.0 + Django REST Framework           │  │ Handles persistent WebSocket channels: │  │
│  │ • REST API Endpoints (/api/v1/)              │  │ • Live train tracking updates          │  │
│  │ • Business Logic & Workflow Engine           │  │ • Real-time block state transitions   │  │
│  │ • Multi-dept CoF×LoF Prioritizer             │  │ • Instant SOS & emergency broadcasts   │  │
│  └──────────────────────┬───────────────────────┘  └────────────────────┬───────────────────┘  │
│                         │                                               │                      │
│                         └───────────────────────┬───────────────────────┘                      │
│                                                 │                                              │
│                                                 ▼                                              │
│  ┌──────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │ Background Tasks & Event Broker: Celery 5.3 + Redis 7                                    │  │
│  │ • Celery Worker (High): Real-time Conflict Engine & Emergency Overrides                  │  │
│  │ • Celery Worker (Notify): SMS via Twilio/CDAC & Push Notifications                       │  │
│  │ • Celery Worker (Symbolic AI): Owlready2 Semantic Graph & HermiT Reasoner Execution      │  │
│  │ • Celery Worker (Default/Low): Sanction Order PDF, Audit Logs, Data Rollup               │  │
│  │ • Redis 7: Shared Channel Layer, Distributed Lock, API Cache, Session Store              │  │
│  └──────────────────────┬───────────────────────────────────────────────┬───────────────────┘  │
│                         │                                               │                      │
│                         ▼                                               ▼                      │
│  ┌──────────────────────────────────────────────┐  ┌────────────────────────────────────────┐  │
│  │ Primary Spatial Database:                    │  │ Hybrid AI & Knowledge Layer:           │  │
│  │ PostgreSQL 15/16 + PostGIS 3.3               │  │ • Symbolic: Owlready2 / HermiT Quadstore│ │
│  │ • PostGIS Geometries: Tracks, Stations, Line │  │ • Neural: Google Gemini 1.5 Flash API  │  │
│  │ • Tables: Blocks, Trains, Defects, Gangs     │  │ • Cross-dept constraint inference      │  │
│  │ • ACID Transactions, Foreign Keys, GiST Idx  │  │ • "Why #1?" Explanations in Bengali    │  │
│  └──────────────────────────────────────────────┘  └────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 5.3 Component Diagram (Level 3) — Block Optimization & Neuro-Symbolic Pipeline

```text
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                 apps.blocks (Block Planning Core)                               │
│                                                                                                 │
│  ┌───────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │ API Layer (REST & WebSockets)                                                             │  │
│  │ • BlockRequestViewSet • PendingApprovalViewSet • CombinedWindowViewSet • SafetyGateViewSet│  │
│  └─────────────────────────────────────────────┬─────────────────────────────────────────────┘  │
│                                                │                                                │
│                                                ▼                                                │
│  ┌───────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │ Service & Orchestration Layer                                                             │  │
│  │ ┌────────────────────────┐  ┌─────────────────────────┐  ┌─────────────────────────────┐  │  │
│  │ │ BlockOptimizationSvc   │  │ CombinedWindowOptimizer │  │ ConflictDetectionEngine     │  │  │
│  │ │ • CoF×LoF prioritization│ │ • Feature #98 Core USP  │  │ • Temporal overlap check    │  │  │
│  │ │ • Duration predictor   │  │ • Shadow block packing  │  │ • PostGIS spatial clash     │  │  │
│  │ │ • Workload balancing   │  │ • Joint ENGG+S&T+TRD win│  │ • Auto-resolution proposer   │  │  │
│  │ └───────────┬────────────┘  └────────────┬────────────┘  └──────────────┬──────────────┘  │  │
│  │             │                            │                              │                 │  │
│  │ ┌───────────▼────────────────────────────▼──────────────────────────────▼──────────────┐  │  │
│  │ │ Neuro-Symbolic Hybrid Bridge                                                         │  │  │
│  │ │ • Symbolic Validation: Invokes Celery `symbolic_ai` worker (HermiT Reasoner)         │  │  │
│  │ │ • Proof Extraction: Generates mathematical constraint satisfaction proof             │  │  │
│  │ │ • Neural Translation: Gemini 1.5 Flash generates "Why #1?" card in Bengali/Hindi     │  │  │
│  │ └────────────────────────────────────────┬─────────────────────────────────────────────┘  │  │
│  │                                          │                                                │  │
│  │ ┌────────────────────────┐  ┌────────────▼────────────┐  ┌─────────────────────────────┐  │  │
│  │ │ SafetyComplianceGuard  │  │ CascadeDelayRecalculator│  │ SanctionOrderGenerator      │  │  │
│  │ │ • Digital Token (#71)  │  │ • Live NTES delay feed  │  │ • Official PDF (#107)       │  │  │
│  │ │ • OHE Isolation (#73)  │  │ • Auto-reschedule (#108)│  │ • Digital Signatures        │  │  │
│  │ │ • LOTO & TSR (#74, #77)│  │ • Express train priority│  │ • QR verification code      │  │  │
│  │ └────────────────────────┘  └─────────────────────────┘  └─────────────────────────────┘  │  │
│  └─────────────────────────────────────────────┬─────────────────────────────────────────────┘  │
│                                                │                                                │
│                                                ▼                                                │
│  ┌───────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │ Data & Storage Layer (PostgreSQL 15 + PostGIS & Redis)                                    │  │
│  │ • BlockSchedule (Spatial Lines, Status, Priority) • ConflictMatrix • SafetyPermitToken    │  │
│  └───────────────────────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 5.4 Deployment Diagram (Level 4)

```text
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                             Host Server / Cloud VM (Docker Engine)                              │
│                                                                                                 │
│  ┌───────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │ Docker Network: `railway_network` (Bridge Mode)                                           │  │
│  │                                                                                           │  │
│  │  ┌────────────────────────┐      ┌─────────────────────────┐      ┌────────────────────┐  │  │
│  │  │ container:             │      │ container:              │      │ container:         │  │  │
│  │  │ railway_nginx          │─────►│ railway_backend         │─────►│ railway_postgres   │  │  │
│  │  │ (Port 80, 443)         │      │ Gunicorn (Port 8000)    │      │ PostGIS 15-3.3     │  │  │
│  │  │ Reverse proxy & SSL    │      │ Daphne (Port 8001)      │      │ (Port 5432)        │  │  │
│  │  └───────────┬────────────┘      └────────────┬────────────┘      └────────────────────┘  │  │
│  │              │                                │                                           │  │
│  │              ▼                                ▼                                           │  │
│  │  ┌────────────────────────┐      ┌─────────────────────────┐                              │  │
│  │  │ container:             │      │ container:              │                              │  │
│  │  │ railway_frontend       │      │ railway_celery_worker   │                              │  │
│  │  │ Vite/Nginx SPA         │      │ (4 Specialized Queues)  │                              │  │
│  │  │ (Port 3000)            │      └────────────┬────────────┘                              │  │
│  │  └────────────────────────┘                   │                                           │  │
│  │                                               ▼                                           │  │
│  │                                  ┌─────────────────────────┐                              │  │
│  │                                  │ container:              │                              │  │
│  │                                  │ railway_redis           │                              │  │
│  │                                  │ Redis 7 Alpine          │                              │  │
│  │                                  │ (Port 6379)             │                              │  │
│  │                                  └─────────────────────────┘                              │  │
│  └───────────────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                                 │
│  Persistent Named Volumes:                                                                      │
│  • `postgres_data` -> `/var/lib/postgresql/data` (PostgreSQL ACID Data)                         │
│  • `redis_data`    -> `/data` (Redis AOF/RDB Persistence)                                       │
│  • `media_volume`  -> `/app/media` (Generated PDFs, Geo-tagged incident photos)                 │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Comprehensive Tech Stack Table

| Layer | Technology | Version | Purpose in PS 26027 | Rejected Alternative & Concrete Rationale |
| :--- | :--- | :--- | :--- | :--- |
| **Database** | **PostgreSQL + PostGIS** | **15-3.3 / 16** | রিয়েল-ওয়ার্ল্ড রেলওয়ে ট্র্যাক চেইনেজ, সেকশন লাইনস্ট্রিং জিওমেট্রি এবং স্থানিক ইন্টারসেকশন কোয়েরি। | **MySQL 8.0:** PostGIS-এর মতো ইন্ডাস্ট্রিয়াল স্প্যাশিয়াল জিওমেট্রি ও চেইনেজ ক্যালকুলেশন লাইব্রেরি নেই। |
| **Symbolic AI Engine** | **Owlready2 + HermiT** | **0.46** | ভারতীয় রেলের ভৌত নিয়মের ওপর নির্মিত Semantic Digital Twin; ১০০% ডিটারমিনিস্টিক সেফটি রিজনিং ও জিরো হ্যালুসিনেশন। | **Pure LLM Decision:** মিশন-ক্রিটিকাল সেফটিতে হ্যালুসিনেশন ও দুর্ঘটনার ঝুঁকি থাকে। |
| **Neural AI (LLM)** | **Google Gemini** | **1.5 Flash** | সিম্বলিক এআই-এর জটিল প্রমাণ পড়ে বাংলা/হিন্দিতে "Why #1?" কার্ড ও এক্সপ্লেনেবল রিপোর্ট তৈরি। | **OpenAI GPT-4:** ধীরগতি, ব্যয়বহুল এবং ভারতীয় রেলওয়ে স্থানীয় ভাষা ব্যাখ্যায় সীমাবদ্ধ। |
| **Backend Framework** | **Django** | **5.0.x** | এন্টারপ্রাইজ রেলওয়ে লজিক, বিল্ট-ইন অ্যাডমিন পোর্টাল, শক্তিশালী ORM এবং মডিউলার অ্যাপ স্ট্রাকচার। | **Node.js/Express:** রেলওয়ের জটিল কোয়ালিটেটিভ অ্যালগরিদম ও ডেটা অ্যানালিটিক্সে Python অপরিহার্য। |
| **API Architecture** | **Django REST Framework (DRF)** | **3.14.x** | কঠোর ভ্যালিডেশন, সিরিয়ালাইজেশন, ফিল্টারিং ও পেজিনেশন সহ RESTful API। | **FastAPI:** ডাটাবেস অ্যাডমিন কনসোল ও ইন্টিগ্রেটেড মডেল ওয়ার্কফ্লো অনুপস্থিত। |
| **Real-time WebSockets** | **Django Channels + Daphne** | **4.0.x** | কন্ট্রোল রুম স্ক্রিনে ইনস্ট্যান্ট ট্রেনের অবস্থান, ব্লক অনুমোদন এবং ইমার্জেন্সি লাল ফ্ল্যাশ ব্রডকাস্ট। | **Polling:** উচ্চ লেটেন্সি এবং ঘন ঘন HTTP রিকোয়েস্টে সার্ভার লোড বৃদ্ধি পায়। |
| **Task Queue & Scheduler** | **Celery + Celery Beat** | **5.3.x** | ৪টি ডেডিকেটেড কিউ (`high`, `notify`, `symbolic_ai`, `default_low`) সহ ডিস্ট্রিবিউটেড ব্যাকগ্রাউন্ড এক্সিকিউশন। | **Django Background Tasks:** হাই-থ্রুপুট রিয়েল-টাইম কিউ ও ডিস্ট্রিবিউটেড স্কেলিং নেই। |
| **In-Memory Cache & Broker**| **Redis** | **7.0 Alpine** | ডিস্ট্রিবিউটেড চ্যানেল লেয়ার, এপিআই রেট লিমিটিং, অ্যাক্টিভ ব্লক ক্যাশ ও Celery ব্রোকার। | **RabbitMQ:** কেবল মেসেজ কিউ; Redis ক্যাশিং ও চ্যানেল লেয়ারের দ্বৈত সুবিধা একসাথে দেয়। |
| **Frontend Framework** | **React + Vite** | **18.2 / 5.0** | কম্পোনেন্ট-ভিত্তিক আল্ট্রা-ফাস্ট ইন্টারেক্টিভ ইউজার ইন্টারফেস এবং লাইটওয়েট সিঙ্গেল পেজ আর্কিটেকচার। | **Next.js:** লোকাল ডিভিশনাল রেলওয়ে সার্ভারে ক্লায়েন্ট-সাইড এক্সিকিউশন ও অফলাইন স্টোরেজ বেশি স্থিতিশীল। |
| **Programming Language (UI)**| **TypeScript** | **5.x** | স্ট্যাটিক টাইপিং — জটিল ব্লক রিকোয়েস্ট ও ট্রেনের পে-লোডে রানটাইম বাগ রোধে অপরিহার্য। | **Plain JavaScript:** ১০০+ ফিল্ড সমৃদ্ধ রেলওয়ে শিডিউল ট্র্যাকিংয়ে টাইপ সেফটি থাকে না। |
| **UI Styling System** | **TailwindCSS** | **3.4.x** | রেলওয়ের ডার্ক কন্ট্রোল-রুম থিম, কাস্টম কালার প্যালেট ও রেস্পন্সিভ লেআউট সিস্টেম। | **Bootstrap:** কাস্টম ইন্টারফেস ও ডাইনামিক ইন্টারঅ্যাকশনে ভারী এবং অপরিবর্তনীয়। |
| **State & Data Fetching** | **Zustand + TanStack Query** | **4.5 / 5.x** | সুপার-ফাস্ট ক্লায়েন্ট স্টেট ও সার্ভার স্টেট সিনক্রোনাইজেশন উইথ অটো-রিট্রাই ও ক্যাশিং। | **Redux Toolkit:** বয়লারপ্লেট বেশি এবং অপ্রয়োজনীয় ওভারহেড তৈরি করে। |
| **GIS Map Engine** | **Leaflet / Mapbox** | **1.9 / 2.15** | ডিভিশনাল ট্র্যাক, চেইনেজ মার্কার ও লাইভ ট্রেনের অবস্থান নির্দেশক হাই-পারফরম্যান্স স্প্যাশিয়াল ম্যাপ। | **Google Maps API:** অফলাইন রেলওয়ে ইন্ট্রানেটে টোকেন ও লাইসেন্সিং জটিলতা। |
| **Document Generation** | **ReportLab** | **4.0.x** | অফিসিয়াল ভারতীয় রেলওয়ে ফরম্যাটে ডিজিটাল সাইন ও কিউআর কোড সহ স্যাংশন অর্ডার PDF জেনারেশন (#107)। | **Weasyprint:** অতিরিক্ত সিস্টেম ডিপেন্ডেন্সি ও ফন্ট রেন্ডারিং ইস্যু থাকে। |
| **Container Engine** | **Docker + Compose** | **24+ / 2.24+** | এক কমান্ডে সম্পূর্ণ ডেটাবেস, ব্রোকার ও অ্যাপ ইন্সট্যান্স তৈরি ও আইসোলেশন। | **Bare Metal:** বিভিন্ন ওএসে লাইব্রেরি ও PostGIS ইন্সটলেশনে অসংগতি ঘটে। |

---

## 7. Step-by-Step Data Flows (Top 3 Mission-Critical Use Cases)

### Use Case 1: Multi-Department Combined Block Window Planning & Sanction (Features #98, #11, #107)
*বর্ণনা:* ট্র্যাক, সিগন্যাল ও OHE বিভাগ একই সেকশনে কাজের আবেদন জানালে Neuro-Symbolic AI ইঞ্জিন তাদের পৃথক ব্লক অনুমোদন না দিয়ে একটি একক "Combined Block Window" তৈরি করে এবং অফিসিয়াল PDF স্যাংশন অর্ডার ইস্যু করে।

```text
┌─────────────┐     ┌────────────────────────────────────────────────────────────────────────┐     ┌───────────────────────┐
│ ENGG / S&T  │     │                       RailBlock AI Platform Core                       │     │  Control Office (COA) │
│ Field Dept  │     │                                                                        │     │  Chief Controller     │
└──────┬──────┘     └───────────────────────────────────┬────────────────────────────────────┘     └───────────┬───────────┘
       │                                                │                                                      │
       │ 1. POST /api/v1/blocks/ (TMS/SMMS/TDMS)        │                                                      │
       │───────────────────────────────────────────────►│                                                      │
       │    Payload: {section_id: "HWH-BWN-L1",         │                                                      │
       │              dept: "ENGG", type: "TAMPING",    │                                                      │
       │              duration_req: 180 mins}           │                                                      │
       │                                                │ 2. Priority & Risk Engine                            │
       │                                                │    • CoF×LoF Score Calculation (#92)                 │
       │                                                │    • Defect Aging Score (#93)                        │
       │                                                │    • Train Timetable Clashes (#114)                  │
       │                                                │                                                      │
       │                                                │ 3. Combined Block Optimizer (#98)                    │
       │                                                │    • Detects TRD OHE Maintenance Request             │
       │                                                │      on same corridor (HWH-BWN-L1)                   │
       │                                                │    • Merges into Single Combined Window              │
       │                                                │    • "Shadow Block" Created (Saves 120 mins)         │
       │                                                │                                                      │
       │                                                │ 4. Symbolic Engine (HermiT): Proves 0 Hazards        │
       │                                                │ 5. Neural Engine (Gemini): Generates "Why #1?" Card  │
       │                                                │                                                      │
       │                                                │ 6. WebSocket Broadcast: NEW_BLOCK_PENDING            │
       │                                                │─────────────────────────────────────────────────────►│
       │                                                │                                                      │
       │                                                │ 7. Review "Why #1?" Card (#94) & Combined Stats      │
       │                                                │    Controller checks impact on 12301 Rajdhani        │
       │                                                │                                                      │
       │                                                │ 8. POST /api/v1/blocks/{id}/approve/                 │
       │                                                │◄─────────────────────────────────────────────────────│
       │                                                │                                                      │
       │                                                │ 9. Celery Worker Triggers:                           │
       │                                                │    • Generate Sanction Order PDF (#107)              │
       │                                                │    • Issue Digital Safety Token (#71)                │
       │                                                │    • Lock PostGIS Corridor Geometry                  │
       │                                                │                                                      │
       │ 10. Real-Time Notification & PDF Download      │ 11. Real-Time Map Update (Section turns AMBER)       │
       │◄───────────────────────────────────────────────│─────────────────────────────────────────────────────►│
       │                                                │                                                      │
```

### Use Case 2: Schedule Deviation & Real-Time Disruption Cascade Auto-Replan (Features #115, #116, #108)
*বর্ণনা:* NTES ফিড থেকে জানা গেল ১২৩০৫ রাজধানী এক্সপ্রেস ৪৫ মিনিট বিলম্বে চলছে। ফলে নির্ধারিত রক্ষণাবেক্ষণ ব্লক এবং ট্রেনের মধ্যে সম্ভাব্য সংঘর্ষ তৈরি হয়েছে। সিস্টেম কোনো মানবিক হস্তক্ষেপ ছাড়াই তাৎক্ষণিক পুনরায় গণনা করে এবং স্লট পুনর্বিন্যাস করে।

```text
┌──────────────────┐     ┌────────────────────────────────────────────────────────┐     ┌────────────────────────┐
│ NTES Live Stream │     │                RailBlock Automation Engine             │     │ Corridor Station & Crew│
└────────┬─────────┘     └───────────────────────────┬────────────────────────────┘     └───────────┬────────────┘
         │                                           │                                              │
         │ 1. NTES Delay Event Detected              │                                              │
         │    Train 12305: +45 mins delay at ASN     │                                              │
         │──────────────────────────────────────────►│                                              │
         │                                           │ 2. Schedule Deviation Detector (#116)        │
         │                                           │    Identifies collision with Block #B-402    │
         │                                           │    scheduled at 14:00 (BWN-KGR Section)      │
         │                                           │                                              │
         │                                           │ 3. Delay Cascade Recalculator (#115)         │
         │                                           │    Simulates passenger delay propagation     │
         │                                           │                                              │
         │                                           │ 4. Auto Re-Plan On Disruption (#108)         │
         │                                           │    • Auto-adjusts Block #B-402 to 14:50      │
         │                                           │    • Preserves Minimum Work Window (#70)     │
         │                                           │    • Backfills Cancelled Window (#103) with  │
         │                                           │      freight train slot (#28)                │
         │                                           │                                              │
         │                                           │ 5. Audit Log & State Persistence             │
         │                                           │    Saved in PostgreSQL with Versioning (#106)│
         │                                           │                                              │
         │                                           │ 6. Real-Time Alert Broadcast                 │
         │                                           │    WebSocket: "SCHEDULE_REOPTIMIZED"         │
         │                                           │─────────────────────────────────────────────►│
         │                                           │    Gantt chart and Track Map update instantly│
```

### Use Case 3: 15-Point Safety Suite Execution — Permit-to-Work, LOTO & Clearance (Features #71, #73, #74, #80)
*বর্ণনা:* ব্লক শুরু করার পূর্বে কন্ট্রোল ও ফিল্ড গ্যাংয়ের মধ্যে ডিজিটাল টোকেন আদান-প্রদান, OHE পাওয়ার আইসোলেশন ও LOTO নিশ্চিতকরণ, এবং কাজ শেষে সম্পূর্ণ সেকশন ক্লিয়ারেন্স সার্টিফিকেট প্রদান।

```text
┌──────────────────┐     ┌────────────────────────────────────────────────────────┐     ┌────────────────────────┐
│ Field Maintenance│     │                Safety Compliance Engine                │     │ Section Controller     │
│ Gang Supervisor  │     │                                                        │     │ (Power & Traffic)      │
└────────┬─────────┘     └───────────────────────────┬────────────────────────────┘     └───────────┬────────────┘
         │                                           │                                              │
         │ 1. Request Digital Token Issue (#71)      │                                              │
         │──────────────────────────────────────────►│                                              │
         │                                           │ 2. Verification Gate:                        │
         │                                           │    • Weather Gate (#75): Wind < 50 km/h      │
         │                                           │    • Crew Headcount (#72): Verified 12/12    │
         │                                           │    • Digital TBT Briefing (#83): Logged      │
         │                                           │                                              │
         │                                           │ 3. TRD Power Isolation Request (#73)         │
         │                                           │─────────────────────────────────────────────►│
         │                                           │                                              │
         │                                           │ 4. OHE Power Isolated & LOTO Activated (#74) │
         │                                           │◄─────────────────────────────────────────────│
         │                                           │                                              │
         │ 5. Digital Token Handed Over              │ 6. Section Status in PostGIS: LOCKED (RED)   │
         │◄──────────────────────────────────────────│                                              │
         │    Permit-to-Work Active (#84)            │                                              │
         │                                           │                                              │
         │ [Work is executed safely on track]        │                                              │
         │                                           │                                              │
         │ 7. Work Completed: Submit Clearance       │                                              │
         │    • Tool Count Verified (24/24) (#81)    │                                              │
         │    • Geo-tagged Photo Uploaded (#82)      │                                              │
         │    • All Staff Accounted For (#72)        │                                              │
         │──────────────────────────────────────────►│                                              │
         │                                           │ 8. Generate Section Clearance Cert (#80)     │
         │                                           │    Verify no overstay / Temporary Speed      │
         │                                           │    Restriction (TSR) enforced (#77)          │
         │                                           │                                              │
         │                                           │ 9. Track Restored: GREEN                     │
         │                                           │─────────────────────────────────────────────►│
```

---

## 8. External Integrations & Data Adapters

যেহেতু হ্যাকাথন ও ডেমো পরিবেশে সব লাইভ রেলওয়ে সিস্টেম সরাসরি ইন্টারনেটে উন্মুক্ত থাকে না, তাই আমাদের আর্কিটেকচারে একটি **Source Adapter Switch (Feature #121)** রয়েছে যা কনফিগারেশনের ভিত্তিতে সিমুলেটেড মক ডেটা এবং লাইভ প্রোডাকশন API-এর মধ্যে তাৎক্ষণিক সুইচ করতে পারে:

| Integration Name | Operational Purpose | Integration Method | Authentication | Rate Limits / Polling | Fallback / Mock Behavior |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TMS (Track Management System)** | ট্র্যাক ফ্র্যাকচার, ওয়েল্ড ডিফেক্ট ও ট্র্যাক প্যারামিটার ডেটা আনা (Pillar 1)। | REST Adapter / Daily Batch CSV Ingestion | Bearer Token / IP Whitelist | প্রতি ২ ঘণ্টা পর সিঙ্ক | `seed_railway_demo.py` হতে প্রি-জেনারেটেড ৫০টি সিন্থেটিক ট্র্যাক ডিফেক্ট লগ। |
| **SMMS (Signalling Management)** | পয়েন্ট মেশিন, ট্র্যাক সার্কিট ও সিগন্যাল ফেইলিওর লগ ডেটা সংগ্রহ। | REST Webhook / Polling | OAuth2 Client Credentials | প্রতি ৫ মিনিট | সিমুলেটেড ইন্টারলকিং ও পয়েন্ট ফেইলিওর ডেটাসেট। |
| **TDMS (Traction Distribution)** | OHE ক্যাটেনারি ইন্সপেকশন, পাওয়ার ব্লকের প্রয়োজনীয়তা ও সাবস্টেশন স্ট্যাটাস। | REST API (JSON) | API Key Header | প্রতি ১৫ মিনিট | OHE সেকশন পাওয়ার আইসোলেশন ও ক্যাটেনারি লগ মক। |
| **COA (Control Office App)** | লাইভ সেকশন অকুপ্যান্সি, ট্রেনের রানিং শিডিউল ও গুডস ট্রেনের পূর্বাভাস (#28)। | Enterprise Message Queue / WebSocket | mTLS / Service Token | রিয়েল-টাইম ইভেন্ট স্ট্রিম | লোকাল ট্র্যাফিক সিমুলেটর (`train_live_status` টেবিল)। |
| **NTES (National Train Enquiry)** | লাইভ ট্রেনের অবস্থান, লেট মিনিট ও প্ল্যাটফর্ম পরিবর্তনের তথ্য (#114, #116)। | HTTPS REST Gateway | API Secret Key | ৬০ রিকোয়েস্ট/মিনিট | ঐতিহাসিক ট্রেনের লেট প্যাটার্ন ও স্ক্রিপ্টেড সিনারিও C। |
| **Open-Meteo Weather API** | ট্র্যাকের তাপমাত্রা, ভারী বৃষ্টি, দৃশ্যমানতা ও ঝড়ঝঞ্ঝা যাচাই (#75 Weather Gate)। | HTTPS REST GET (`api.open-meteo.com/v1/forecast`) | কোনো প্রমাণীকরণ প্রয়োজন নেই (Open Data) | ১০,০০০ কল/দিন | চরম আবহাওয়া সতর্কতার জন্য লোকাল ফলব্যাক ক্যাশ। |
| **Google Gemini API** | জটিল সিদ্ধান্তের যৌক্তিক ব্যাখ্যা ("Why #1?" Card #94) এবং বহুভাষিক রিপোর্ট তৈরি। | HTTPS REST POST (`generativelanguage.googleapis.com`) | `x-goog-api-key` Header | ১৫ RPM (Free Tier) | রুল-বেসড টেমপ্লেট ও লোকাল ফলব্যাক জেনারেটর। |
| **PDF Generation Engine** | ফরম্যাট অনুমোদিত অফিশিয়াল ব্লক স্যাংশন অর্ডার PDF জেনারেশন (#107)। | Internal Native Python (ReportLab Library) | ইন-প্রসেস মেমোরি এক্সিকিউশন | কোনো লিমিট নেই | সরাসরি সার্ভার সাইড স্ট্যাটিক ফাইল ও ডাউনলোড স্ট্রিম। |

---

## 9. Security Architecture & RBAC

### 9.1 Authentication & Token Lifecycle
- **Stateless JWT Architecture:**
  - `Access Token`: HS256 / RS256 অ্যালগরিদম, মেয়াদ ১৫ মিনিট। পে-লোডে থাকে `{user_id, username, role, department_code, division}`।
  - `Refresh Token`: মেয়াদ ৭ দিন। ব্রাউজারে নিরাপদ `httpOnly, Secure, SameSite=Strict` কুকিতে সংরক্ষিত হয়।
- **Token Invalidation & Blacklist:**
  - ইউজার লগআউট করলে অথবা সেশন বাতিল হলে Refresh Token-টি তাৎক্ষণিকভাবে Redis Blacklist-এ জমা হয় এবং মেয়াদ শেষ না হওয়া পর্যন্ত আর ব্যবহার করা যায় না।

### 9.2 Role-Based Access Control (RBAC) Matrix (Feature #112)

| User Role | View Corridor Map | Submit Block Request | Approve Normal Block | Approve Emergency / Mega Block | Safety Token Handover | Admin Console |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Junior Engineer (JE - ENGG/TRD/S&T)** | ✅ | ✅ (Own Dept Only) | ❌ | ❌ | ❌ | ❌ |
| **Senior Section Engineer (SSE)** | ✅ | ✅ (Own Dept Only) | ✅ (Up to 2 Hours) | ❌ | ✅ | ❌ |
| **Chief Controller (Operations - COA)**| ✅ | ✅ (All Depts) | ✅ (Full Authority) | ✅ | ✅ | ❌ |
| **Safety Officer (Safety Suite)** | ✅ | ❌ | ❌ | ❌ | ✅ (LOTO & Token Verify) | ❌ |
| **Platform Administrator** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

### 9.3 Data Protection & Operational Integrity
- **Password Security:** Django-র সমন্বিত Argon2 + PBKDF2 হ্যাশিং।
- **Spatial Fencing:** PostGIS বাফার দিয়ে নিশ্চিত করা হয় যে ফিল্ড গ্যাং শুধুমাত্র তাদের অনুমোদিত সেকশনের ভেতর থেকেই "Digital TBT" অথবা "Clearance Photo" আপলোড করতে পারবে।
- **Audit Trails:** প্রতিটি ব্লক রিকোয়েস্টের অনুমোদন, পরিমার্জন ও বাতিলের জন্য আলাদা `block_audit_log` টেবিলে টাইমস্ট্যাম্প ও ইউজারের বিবরণ সংরক্ষিত থাকে।

---

## 10. Traceability to Subsequent Documents

এই আর্কিটেকচার ফাইলের সিদ্ধান্তসমূহ পরবর্তী স্পেসিফিকেশন ফাইলগুলোতে সরাসরি কার্যকর হবে:

| Document Path | Dependency / Architectural Output from this Document |
| :--- | :--- |
| **`00-master-high-level/01-decision-log.md`** | PostgreSQL বনাম MySQL, Neuro-Symbolic AI বনাম Pure LLM, 4 Celery Workers এবং React+TS নির্বাচনের বিস্তারিত ADR রেকর্ড। |
| **`00-master-high-level/02-glossary.md`** | TMS, SMMS, TDMS, COA, BDMS, NTES, OHE, LOTO, TBT, PTW, Neuro-Symbolic AI সহ ২৫+ মূল রেলওয়ে ও এআই পরিভাষার সংজ্ঞা। |
| **`01-tech-infra/02-data-layer.md`** | PostgreSQL 15/16 + PostGIS টেবিল স্কিমা, জিওমেট্রি কলাম, ইন্ডেক্স ও মাইগ্রেশন পলিসি। |
| **`09-execution-tracker/00-implementation-checklist.md`** | ১-১২২ ফিচারের জন্য প্যারালাল ব্যাকএন্ড ও ফ্রন্টএন্ড কোডিং ও আউটপুট ভেরিফিকেশন চেকলিস্ট। |
