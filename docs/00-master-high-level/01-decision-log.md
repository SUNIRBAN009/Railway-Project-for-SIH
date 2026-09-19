# 01-decision-log.md

> **ফাইল ক্রম:** ২/৪৫  
> **পূর্ববর্তী ফাইল:** `00-master-high-level/00-architecture.md`  
> **পরবর্তী ফাইল:** `00-master-high-level/02-glossary.md`  
> **সংযোগ:** এই ফাইলে নথিভুক্ত সিদ্ধান্তসমূহ `00-architecture.md`-এ উপস্থাপিত স্থাপত্য এবং ১২২টি ফিচারের ইঞ্জিনিয়ারিং সলিউশনকে রূপদান করেছে।

---

## Architecture Decision Records (ADR Summary Log)

| ADR ID | Decision Title | Status | Impact Area | Date | Core Rationale |
|:---|:---|:---|:---|:---|:---|
| **ADR-001** | Modular Monolith Architecture Pattern | **ACCEPTED** | Backend Core | 2026-09 | ৮টি ডোমেইন বাউন্ডেড কনটেক্সট একক কোডবেসে সহজে স্থাপনযোগ্য ও মাইক্রোসার্ভিস ওভারহেডমুক্ত। |
| **ADR-002** | PostgreSQL 15 + PostGIS 3.3 with SQLite Local Fallback | **ACCEPTED** | Data Layer | 2026-09 | রেলওয়ে ট্র্যাকের রৈখিক কিলোমিটার চেইনেজ (#87) এবং জিওস্প্যাশিয়াল কোঅর্ডিনেট কোয়ারির জন্য PostGIS অপরিহার্য। |
| **ADR-003** | Owlready2 Semantic Reasoner for Digital Twin | **ACCEPTED** | AI & Ontology | 2026-09 | ট্র্যাক বন্ধ হলে তৎসংলগ্ন সিগন্যাল ও ওএইচই সেকশনের আন্তঃসম্পর্ক গ্রাফ অনুমানের জন্য OWL 2 DL রিজনার। |
| **ADR-004** | Sweep-Line Algorithm for Interval Conflict Detection (#31) | **ACCEPTED** | Scheduling Engine | 2026-09 | ট্রেন ও ব্লকের সময় ও স্পেসের ওভারল্যাপ $O(N \log N)$ সময়ে নিখুঁতভাবে চিহ্নিত করার সর্বোত্তম অ্যালগরিদম। |
| **ADR-005** | Multi-Factor $CoF \times LoF$ Risk Prioritization (#92) | **ACCEPTED** | AI Prioritization | 2026-09 | ব্লকের গুরুত্ব ব্ল্যাক-বক্স না রেখে ইঞ্জিনিয়ারিং সেফটি ও প্যাসেঞ্জার ইমপ্যাক্টের গাণিতিক ফর্মুলায় স্বচ্ছ রাখা। |
| **ADR-006** | Combined Block Window Optimization as Core Platform USP (#98) | **ACCEPTED** | Core Planning | 2026-09 | তিন বিভাগের পৃথক ব্লক রিকোয়েস্টকে একই টাইম স্লটে সমন্বয় করে ট্র্যাক ডাউনটাইম ৬০-৭০% কমিয়ে আনা। |
| **ADR-007** | Coherence Rule Engine with 7 Hard Integrity Rules (#117) | **ACCEPTED** | Demo Data System | 2026-09 | ডেমো ডেটায় ট্রেনের সময় ও সেকশন কিলোমিটারের মধ্যে যাতে কোনো স্ববিরোধ না থাকে তা সুনিশ্চিত করা। |
| **ADR-008** | Multi-Source Adapter Switch Pattern (#121) | **ACCEPTED** | Integration | 2026-09 | প্রোডাকশনে লাইভ রেলওয়ে এপিআই এবং হ্যাকাথন ডেমোতে নির্ভরযোগ্য মক ডেটার মধ্যে কনফিগারেশনভিত্তিক সুইচ। |
| **ADR-009** | 15-Point Railway Safety Suite Integration (#71–#85) | **ACCEPTED** | Safety & Compliance | 2026-09 | ডিজিটাল টোকেন, ওএইচই পাওয়ার আইসোলেশন, লোনের ওয়ার্কার ও ট্রেন অ্যাপ্রোচ অ্যালার্টের মাধ্যমে শূন্য-দুর্ঘটনা নীতি। |
| **ADR-010** | Train Schedule Awareness & Real-Time Delay Cascade Engine (#114–#116) | **ACCEPTED** | Traffic Management | 2026-09 | ১+ মাস পূর্বে নির্ধারিত ট্রেনের সময়সূচি রক্ষা করে কোনো ট্রেন লেট হলে ব্লক উইন্ডো তাৎক্ষণিক স্বয়ংক্রিয়ভাবে রিক্যালকুলেট করা। |

---
*ডকুমেন্ট সম্পূর্ণ সিঙ্ক্রোনাইজড: RailBlock_Feature_Master_Plan_PS26027(1).xlsx*
