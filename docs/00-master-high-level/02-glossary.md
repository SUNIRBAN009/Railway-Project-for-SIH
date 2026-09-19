# 02-glossary.md

> **ফাইল ক্রম:** ৩/৪৫  
> **ডিরেক্টরি:** `00-master-high-level/`  
> **পূর্ববর্তী ফাইল:** `00-master-high-level/01-decision-log.md` (আর্কিটেকচারাল সিদ্ধান্তের উৎস)  
> **পরবর্তী ফাইল:** `01-tech-infra/00-backend-core.md`  
> **কন্টেন্ট সোর্স:** `RailBlock_Feature_Master_Plan_PS26027(1).xlsx` (ট্যাব: `System_Name_Glossary` ও `Feature_Master`), `ai-project-spec-generator (1).md` এবং **Neuro-Symbolic AI Architecture**।  
> **ডাটাবেস ও এআই নীতি:** **PostgreSQL 15/16 + PostGIS 3.3** (নো MySQL) এবং **Neuro-Symbolic Hybrid AI** (Symbolic AI: Owlready2 + HermiT ↔ Neural AI: Google Gemini 1.5 Flash)।

---

## 1. Master System Glossary

| # | Term | Definition | Context & Role in Project | Domain Type |
|---|------|-----------|---------------------------|-------------|
| 1 | **ACID** | Atomicity, Consistency, Isolation, Durability — চারটি অপরিহার্য ডাটাবেজ ট্রানজ্যাকশন বৈশিষ্ট্য। | কম্বাইন্ড ব্লক লক ও ডিজিটাল টোকেন হ্যান্ডওভারে PostgreSQL ট্রানজ্যাকশন অখণ্ডতা নিশ্চিত করে। | Database |
| 2 | **Adapter (Feature #121)** | DataSource Interface — কনফিগারেশন সুইচের মাধ্যমে ডেমো মক ডেটা এবং আসল রেলওয়ে সিস্টেম এপিআই অদলবদল করার নকশা। | `DATA_SOURCE_MODE=MOCK/REAL` পরিবর্তনের মাধ্যমে কোড পরিবর্তন ছাড়াই প্রোডাকশন রেডি রাখা। | Architecture |
| 3 | **Asset Availability Score (#50)** | প্রাথমিক সাফল্য পরিমাপক (Primary KPI) — ট্র্যাফিক চলাচলের জন্য ট্র্যাক ও পাওয়ার লাইনের নেট কার্যক্ষম সময়ের শতকরা হার। | কম্বাইন্ড ব্লক ও অপ্টিমাইজেশনের মাধ্যমে ডাউনটাইম কমিয়ে আপটাইম সর্বোচ্চ করা। | Business KPI |
| 4 | **BDMS** | Block Data Management System — ভারতীয় রেলে বিদ্যমান সনাতন কাগুজে/ম্যানুয়াল ব্লক রিকোয়েস্ট সফটওয়্যার। | আমাদের প্ল্যাটফর্ম BDMS-এর ডেটা ইনজেস্ট করে তার ওপর স্বয়ংক্রিয় এআই অপ্টিমাইজেশন প্রদান করে। | Railway Domain |
| 5 | **Block (Maintenance Block)** | নির্দিষ্ট সময়ের জন্য একটি রেলওয়ে সেকশনে ট্রেন চলাচল স্থগিত রেখে রক্ষণাবেক্ষণ করার অনুমোদিত উইন্ডো। | ট্র্যাক, সিগন্যাল বা OHE মেরামতের মৌলিক অপারেশনাল একক। | Railway Domain |
| 6 | **Celery Worker** | ডিস্ট্রিবিউটেড অ্যাসিঙ্ক্রোনাস টাস্ক কিউ প্রসেসর। | ৪টি আলাদা কিউ (`high`, `notify`, `symbolic_ai`, `default_low`) দিয়ে ব্যাকগ্রাউন্ড টাস্ক পরিচালনা করে। | Backend |
| 7 | **Chainage (Feature #87)** | রেলওয়ে ট্র্যাকের রৈখিক কিলোমিটার মার্কার (যেমন: কিমি ৪৫/২ থেকে ৪৭/৮)। | বিভিন্ন সিস্টেমের (TMS, SMMS, TDMS) মধ্যবর্তী অবস্থান ডেটা পোস্টজিআইএসে নরমালাইজ করার ভিত্তি। | Railway Domain |
| 8 | **COA** | Control Office Application — ভারতীয় রেলের ট্রাফিক অপারেশন কন্ট্রোল রুম সিস্টেম। | করিডোর খালি থাকা, ট্রেনের রিয়েল-টাইম চলাচল এবং মালগাড়ির পূর্বাভাস ডেটা পাওয়ার প্রধান উৎস। | Railway Domain |
| 9 | **CoF × LoF (Feature #92)** | Consequence of Failure (ব্যর্থতার পরিণতি) × Likelihood of Failure (ব্যর্থতার সম্ভাবনা)। | স্বচ্ছ ও গাণিতিক প্রায়োরিটাইজেশনের জন্য ৫×৫ এআই রিস্ক ম্যাট্রিক্স স্কোরিং। | AI / Risk |
| 10 | **Coherence Rule Engine (#117)** | ডেটা অসংগতি রোধকারী ৭টি হার্ড রুল চেক ইঞ্জিন। | ডেমো ডেটা এবং ইনজেস্টেড ডেটাতে ভৌগোলিক বা সময়গত বিরোধ (যেমন: বন্ধ লাইনে ট্রেনের উপস্থিতি) প্রতিহত করে। | Demo & Data |
| 11 | **Combined Block Window (#98)** | আমাদের কোর ইনোভেশন (USP) — একই সেকশনে ট্র্যাক, সিগন্যাল ও OHE-এর কাজকে একটি একক শ্যাডো ব্লকে একত্রিত করা। | পৃথক তিনটি ব্লকের পরিবর্তে একবারে কাজ শেষ করে ট্রেনের মোট ব্যাঘাত সর্বনিম্ন রাখা। | Core Innovation |
| 12 | **Daphne (ASGI)** | Asynchronous Server Gateway Interface ওয়েব সার্ভার। | Django Channels-এর মাধ্যমে ওয়েবসকেট কানেকশন হ্যান্ডেল করে কন্ট্রোল রুমে রিয়েল-টাইম পুশ প্রদান করে। | Backend |
| 13 | **Defect Aging Score (#93)** | ট্র্যাক বা সিগন্যালে ত্রুটি শনাক্ত হওয়ার পর কত দিন অমীমাংসিত রয়েছে তার ওপর ভিত্তি করে অতিরিক্ত জরুরি স্কোর। | পুরোনো কিন্তু ঝুঁকিপূর্ণ ডিফেক্টকে কিউয়ের শীর্ষে তুলে এনে দুর্ঘটনা প্রতিরোধ করে। | Maintenance |
| 14 | **Digital Token (Feature #71)** | লাইন ক্লোজার ও হস্তান্তরের ক্রিপ্টোগ্রাফিক ডিজিটাল টোকেন। | ব্লক শুরু করার পূর্বে কন্ট্রোল এবং মাঠপর্যায়ের ইঞ্জিনিয়ারের মধ্যে বিনিময়যোগ্য ডিজিটাল অনুমতিপত্র। | Safety Suite |
| 15 | **DRF** | Django REST Framework — Django-র ওপর নির্মিত এন্টারপ্রাইজ RESTful API ফ্রেমওয়ার্ক। | কঠোর সিরিয়ালাইজেশন, ভ্যালিডেশন, পেজিনেশন ও রোল-বেসড এক্সেস কন্ট্রোল প্রদান করে। | Backend |
| 16 | **HermiT Reasoner** | হাইপারট্যাবলো (Hypertableau) অ্যালগরিদম ভিত্তিক ডেসক্রিপশন লজিক (OWL 2 DL) রিজনার। | সিম্বলিক ডিজিটাল টুইনের ওপর গণনামূলক প্রমাণ নিশ্চিত করে (০% হ্যালুসিনেশন সেফটি গ্যারান্টি)। | AI / Logic |
| 17 | **Idempotency** | যে বৈশিষ্ট্যের কারণে একই এপিআই রিকোয়েস্ট নেটওয়ার্ক বিভ্রাটে একাধিকবার পাঠালেও সিস্টেমে একবারই ট্রানজ্যাকশন ঘটে। | ডাবল-ব্লক অনুমোদন বা অর্থ লেনদেনের মতো অনাকাঙ্ক্ষিত পুনরাবৃত্তি রোধ করে। | Architecture |
| 18 | **JE / SE / SSE** | Junior Engineer / Section Engineer / Senior Section Engineer। | ফিল্ড পর্যায়ে ব্লক রিকোয়েস্টকারী এবং অনুমোদনের নির্দিষ্ট পদমর্যাদা। | Railway Persona |
| 19 | **LOTO (Feature #74)** | Lock-Out Tag-Out — বৈদ্যুতিক ও যান্ত্রিক সুইচবোর্ডে ফিজিক্যাল লক ও ডিজিটাল ট্যাগের রেকর্ড। | OHE মেরামতের সময় অন্য কেউ ভুলবশত বিদ্যুৎ সংযোগ চালু করতে না পারার জীবনরক্ষাকারী প্রটোকল। | Safety Suite |
| 20 | **Neuro-Symbolic AI** | হাইব্রিড এআই আর্কিটেকচার যা সিম্বলিক লজিক এবং নিউরাল ল্যাঙ্গুয়েজ মডেলকে একসাথে ইন্টারফেস করায়। | HermiT শতভাগ নির্ভুল নিরাপত্তা প্রুফ দেয় এবং Gemini 1.5 Flash সেটিকে বাংলা/হিন্দিতে ব্যাখ্যা করে। | Core AI |
| 21 | **NTES** | National Train Enquiry System — ভারতীয় রেলের পাবলিক ও অপারেশনাল লাইভ ট্রেন ইনফরমেশন সিস্টেম। | লাইভ ট্রেনের অবস্থান ও বিলম্বে চলার ডেটা সংগ্রহ করে তাৎক্ষণিক শিডিউল ডেভিয়েশন ডিটেক্ট করা (#114, #116)। | Railway Domain |
| 22 | **OHE** | Overhead Equipment — ট্রেনের লোকোমোটিভে বিদ্যুৎ সরবরাহের জন্য ব্যবহৃত ২৫ kV ওভারহেড ক্যাটেনারি তার। | Traction Distribution (TRD) বিভাগের আওতাধীন রক্ষণাবেক্ষণ অ্যাসেট। | Railway Domain |
| 23 | **PostGIS** | PostgreSQL-এর জন্য ইন্ডাস্ট্রিয়াল স্প্যাশিয়াল ডেটাবেস এক্সটেনশন (SRID 4326/3857)। | রেলওয়ে ট্র্যাকের লাইনস্ট্রিং জিওমেট্রি, পয়েন্ট মার্কার এবং স্থানিক ক্ল্যাশ ইন্টারসেকশন কোয়েরি করে। | Database |
| 24 | **PostgreSQL** | বিশ্বের সবচেয়ে উন্নত ওপেন-সোর্স অবজেক্ট-রিলেশনাল ডেটাবেস (সংস্করণ ১৫/১৬)। | সম্পূর্ণ সিস্টেমের প্রাইমারি স্প্যাশিয়াল ও অপারেশনাল ডেটা স্টোরেজ। | Database |
| 25 | **PS 26027** | স্মার্ট ইন্ডিয়া হ্যাকাথনের সমস্যা বিবৃতি কোড (রেল মন্ত্রণালয়)। | "AI-Powered Automatic Block Planning to Maximize Asset Availability for Train Operations on Indian Railways"। | Problem Statement |
| 26 | **PTW (Feature #84)** | Permit-to-Work — উচ্চ ঝুঁকিপূর্ণ ট্র্যাক বা হাই-ভোল্টেজ ওএইচই কাজের জন্য ডিজিটাল পারমিট অনুমোদন। | সেফটি গেট শর্ত পূরণ সাপেক্ষে সেফটি অফিসার কর্তৃক ইস্যুকৃত ইলেকট্রনিক ক্লিয়ারেন্স। | Safety Suite |
| 27 | **Redis 7** | ইন-মেমোরি কি-ভ্যালু ডেটা স্ট্রাকচার স্টোর ও পাব/সাব ব্রোকার। | ডিস্ট্রিবিউটেড ক্যাশিং, সেশন স্টোর, Celery টাস্ক কিউ এবং চ্যানেলস ওয়েবসকেট লেয়ার। | Infrastructure |
| 28 | **ReportLab 4.0** | পাইথনের নেটিভ হাই-পারফরম্যান্স PDF ডকুমেন্ট জেনারেশন ইঞ্জিন। | অনুমোদিত ব্লকের জন্য অফিসিয়াল ডিজিটাল সাইন ও কিউআর কোড যুক্ত স্যাংশন অর্ডার PDF জেনারেট করে (#107)। | Document Engine |
| 29 | **Sanction Order PDF (#107)** | অনুমোদিত ব্লকের জন্য ইস্যুকৃত অফিশিয়াল ভারতীয় রেলওয়ে ফরম্যাটের ডিজিটাল ডিসপ্যাচ মেমো। | ডিজিটাল স্বাক্ষর, সময়সীমা, গ্যাং আইডি এবং মোবাইল স্ক্যানযোগ্য ভেরিফিকেশন কিউআর কোড ধারণ করে। | Operations |
| 30 | **Scenario Injector (#120)** | জাজেস ডেমো উপস্থাপনার জন্য প্রি-স্ক্রিপ্টেড ৪টি নাটকীয় বাস্তবসম্মত অপারেশনাল সিনারিও (A, B, C, D)। | সাধারণ দিন (A), ওএইচই ব্রেকডাউন (B), রাজধানী ফাস্ট-ট্র্যাক ক্ল্যাশ (C), এবং মেগা ব্লক অপ্টিমাইজেশন (D)। | Demo & Data |
| 31 | **Section** | দুটি স্টেশনের মধ্যবর্তী ব্লকেবল ট্র্যাক অংশ (যেমন: হাওড়া-ব্যান্ডেল, বর্ধমান-আসানসোল সেকশন)। | স্থানিক ও সময়গত ব্লক বরাদ্দের ভৌগোলিক একক। | Railway Topology |
| 32 | **SMMS** | Signalling Maintenance and Management System — সিগন্যাল অ্যান্ড টেলিকম (S&T) বিভাগের মেইনটেন্যান্স সিস্টেম। | পয়েন্ট মেশিন, ট্র্যাক সার্কিট ও সিগন্যাল ত্রুটির প্রাথমিক ডেটা উৎস। | Railway Domain |
| 33 | **Spatial RBAC (#112)** | স্থানিক অবস্থানের ভিত্তিতে নিয়ন্ত্রিত রোল-বেসড এক্সেস কন্ট্রোল (Spatial Role-Based Access Control)। | নিশ্চিত করে যে একজন প্রকৌশলী কেবল তার নিজস্ব পোস্টজিআইএস ডিভিশন/সেকশনের ভেতরেই রিকোয়েস্ট জমা বা সাইন করতে পারেন। | Security |
| 34 | **TanStack Query** | রিয়্যাক্ট অ্যাপ্লিকেশনের জন্য অ্যাসিনক্রোনাস সার্ভার স্টেট ফেচিং, ক্যাশিং ও অটো-রিভ্যালিডেশন ইঞ্জিন। | নেটওয়ার্ক রিকোয়েস্ট অপ্টিমাইজ করে এবং ব্রাউজার উইন্ডো ফোকাসে লাইভ ব্লক ডেটা রিফ্রেশ করে। | Frontend |
| 35 | **TBT (Feature #83)** | Toolbox Talk — কাজ শুরু করার ঠিক পূর্বে ট্র্যাকে দাঁড়িয়ে সুপারভাইজার কর্তৃক প্রদত্ত নিরাপত্তা ব্রিফিং। | ক্রুদের শারীরিক উপস্থিতি ও নিরাপত্তা নির্দেশিকা নিশ্চিত করে অ্যাপে ডিজিটাল স্বাক্ষর সংরক্ষণ। | Safety Suite |
| 36 | **TDMS** | Traction Distribution Management System — ট্র্যাকশন (TRD) বিভাগের পাওয়ার ও ক্যাটেনারি ডেটা সোর্স। | ওএইচই টাওয়ার ওয়াগন, ক্যাটেনারি ওয়্যার ইন্সপেকশন ও পাওয়ার আইসোলেশন লগ ডেটা সরবরাহ করে। | Railway Domain |
| 37 | **TMS** | Track Management System — সিভিল ইঞ্জিনিয়ারিং (ENGG - P-Way) বিভাগের মূল ট্র্যাক রক্ষণাবেক্ষণ সিস্টেম। | রেলওয়ে ট্র্যাক ডিফেক্ট, ওয়েল্ড ফ্র্যাকচার, স্লিপার ক্ষয় ও ব্যাল্লাস্ট ট্যাম্পিং চাহিদার উৎস। | Railway Domain |
| 38 | **TSR (Feature #77)** | Temporary Speed Restriction — অসম্পূর্ণ বা মেরামতকৃত ট্র্যাকে ট্রেনের গতির অস্থায়ী বিধিনিষেধ (যেমন: ২০ কিমি/ঘণ্টা)। | কাজ সম্পূর্ণ না হওয়া সেকশনের ওপর দিয়ে প্রথম ট্রেন চলাচলের সময় নিরাপত্তা নিশ্চিত করে। | Safety Suite |
| 39 | **Why #1? Card (Feature #94)** | জেনারেটিভ এআই (Gemini 1.5) দ্বারা বাংলা/হিন্দিতে তৈরি এক্সপ্লেনেবল এআই কার্ড। | চিফ কন্ট্রোলারকে বুঝিয়ে দেয় কেন একটি নির্দিষ্ট ব্লককে কিউয়ের শীর্ষে রাখা হলো এবং ট্রেনের ওপর কী প্রভাব পড়বে। | Explainable AI |
| 40 | **Zustand** | অতি-হালকা (১ KB) এবং দ্রুতগতির রিয়্যাক্ট গ্লোবাল ক্লায়েন্ট স্টেট ম্যানেজমেন্ট লাইব্রেরি। | অ্যাক্টিভ সেশন, ম্যাপ ফিল্টার ও লাইভ এলার্ট স্টেট সংরক্ষণ করে কোনো অপ্রয়োজনীয় রি-রেন্ডার ছাড়াই। | Frontend |

---

## 2. Alphabetical Abbreviation Quick Reference

| Abbreviation | Expanded Form | Operational Domain | Role in RailBlock AI |
|:---|:---|:---|:---|
| **ACID** | Atomicity, Consistency, Isolation, Durability | Database | PostgreSQL ট্রানজ্যাকশন নির্ভরযোগ্যতা |
| **API** | Application Programming Interface | Core Architecture | ব্যাকএন্ড ও ফ্রন্টএন্ড যোগাযোগ মাধ্যম |
| **ASGI** | Asynchronous Server Gateway Interface | Backend Server | Daphne ওয়েবসকেট সংযোগ ব্যবস্থাপনা |
| **BDMS** | Block Data Management System | Indian Railways | সনাতন ব্লক রিকোয়েস্টের ইনজেকশন সোর্স |
| **COA** | Control Office Application | Indian Railways | কন্ট্রোল রুম অপারেশনস ও করিডোর মনিটরিং |
| **CoF** | Consequence of Failure | AI / Risk Engine | অ্যাসেট ফেইলিওরের ক্ষয়ক্ষতি স্কোর |
| **DRF** | Django REST Framework | Backend API | সিকিউর REST এপিআই এন্ডপয়েন্টস |
| **ENGG** | Engineering (Permanent Way / Track) | Railway Department | ট্র্যাক, স্লিপার ও ব্যাল্লাস্ট মেরামতকারী |
| **GIS** | Geographic Information System | Mapping / Spatial | পোস্টজিআইএস স্থানিক রেল নেটওয়ার্ক |
| **GiST** | Generalized Search Tree | Database Indexing | পোস্টজিআইএস স্প্যাশিয়াল লাইনস্ট্রিং ইনডেক্স |
| **HMR** | Hot Module Replacement | Frontend Build | Vite কোড পরিবর্তনের তাৎক্ষণিক রিফ্রেশ |
| **JE** | Junior Engineer | Railway Persona | ব্লক রিকোয়েস্টকারী ফিল্ড ইঞ্জিনিয়ার |
| **JWT** | JSON Web Token | Security | স্টেটলেস অথেনটিকেশন ও টোকেন পে-লোড |
| **LoF** | Likelihood of Failure | AI / Risk Engine | ত্রুটি ঘটার গাণিতিক সম্ভাবনা |
| **LOTO** | Lock-Out Tag-Out | Safety Protocol | ইলেকট্রিক্যাল ও মেকানিক্যাল নিরাপত্তা লক |
| **NTES** | National Train Enquiry System | Indian Railways | লাইভ ট্রেনের অবস্থান ও বিলম্ব ডেটা ফিড |
| **OHE** | Overhead Equipment | Railway Traction | ২৫ kV বৈদ্যুতিক ক্যাটেনারি পাওয়ার লাইন |
| **OWL** | Web Ontology Language | Semantic Web | ডিজিটাল টুইন নলেজ গ্রাফ স্পেসিফিকেশন |
| **PostGIS** | PostgreSQL Spatial Extension | Database | স্থানিক জ্যামিতি ও চেইনেজ ইন্টারসেকশন |
| **PS** | Problem Statement (PS 26027) | SIH Railway Theme | এই সিস্টেমের কেন্দ্রীয় সমস্যা চ্যালেঞ্জ |
| **PTW** | Permit-to-Work | Safety Protocol | উচ্চ ঝুঁকিপূর্ণ কাজের ডিজিটাল অনুমতিপত্র |
| **RBAC** | Role-Based Access Control | Security | দায়িত্বভিত্তিক পারমিশন ও অ্যাক্সেস নিয়ন্ত্রণ |
| **S&T** | Signal & Telecom Department | Railway Department | ইন্টারলকিং ও সিগন্যালিং রক্ষণাবেক্ষণকারী |
| **SHACL** | Shapes Constraint Language | Semantic Graph | ডিজিটাল টুইন ডেটা ভ্যালিডেশন রুলস |
| **SMMS** | Signalling Maintenance & Management System| Indian Railways | সিগন্যাল ও পয়েন্ট মেশিন ডেটা সোর্স |
| **SPARQL** | SPARQL Protocol and RDF Query Language | Semantic Web | নলেজ গ্রাফ কোয়েরি ল্যাঙ্গুয়েজ |
| **SSE** | Senior Section Engineer | Railway Persona | ২ ঘণ্টা পর্যন্ত ব্লক অনুমোদনকারী কর্মকর্তা |
| **TBT** | Toolbox Talk | Safety Protocol | কাজ শুরুর প্রাক-মুহূর্তের নিরাপত্তা ব্রিফিং |
| **TDMS** | Traction Distribution Management System | Indian Railways | ট্র্যাকশন পাওয়ার ও ওএইচই ডেটা সোর্স |
| **TMS** | Track Management System | Indian Railways | ট্র্যাকের ত্রুটি ও ট্যাম্পিং রিকোয়েস্ট সোর্স |
| **TRD** | Traction Distribution Department | Railway Department | ওভারহেড পাওয়ার লাইন রক্ষণাবেক্ষণকারী |
| **TSR** | Temporary Speed Restriction | Safety Protocol | কাজের সেকশনে ট্রেনের সতর্কতামূলক গতিসীমা |
| **USP** | Unique Selling Proposition | Core Innovation | কম্বাইন্ড ব্লক উইন্ডো (#98) |
| **Vite** | Next-Generation Frontend Tooling | Frontend Build | দ্রুততম বিল্ড ও ডেভ সার্ভার ইঞ্জিন |
| **WSGI** | Web Server Gateway Interface | Backend Server | Gunicorn সিঙ্ক্রোনাস HTTP হ্যান্ডলার |

---

## 3. Traceability to Subsequent Technical Infrastructure Documents

এই গ্লোসারির সংজ্ঞাসমূহ পরবর্তী টেকনিক্যাল ইনফ্রাস্ট্রাকচার ফাইলগুলোতে সরাসরি ব্যবহৃত হবে (সেখানে আর নতুন করে সংজ্ঞা দেওয়া হবে না):

| Defined Term | Primary Usage in Upcoming Files |
| :--- | :--- |
| **`ASGI / WSGI`** | [`01-tech-infra/00-backend-core.md`](file:///c:/work%20pase/Railway-Project-for-SIH/docs/01-tech-infra/00-backend-core.md) — Gunicorn ও Daphne সার্ভার কনফিগারেশন। |
| **`PostGIS / GiST`** | [`01-tech-infra/02-data-layer.md`](file:///c:/work%20pase/Railway-Project-for-SIH/docs/01-tech-infra/02-data-layer.md) — স্প্যাশিয়াল টেবিল ডিজাইন, লাইনস্ট্রিং ও চেইনেজ ইন্ডেক্সিং। |
| **`HermiT / Neuro-Symbolic`** | [`05-deep-dive-logs/01-common-payloads-and-algorithms.md`](file:///c:/work%20pase/Railway-Project-for-SIH/docs/05-deep-dive-logs/01-common-payloads-and-algorithms.md) — ডিজিটাল টুইন রিজনিং রুলস। |
| **`Zustand / TanStack Query`**| [`01-tech-infra/01-frontend-core.md`](file:///c:/work%20pase/Railway-Project-for-SIH/docs/01-tech-infra/01-frontend-core.md) — স্টেট ম্যানেজমেন্ট ও সার্ভার ক্যাশ মডেল। |
| **`Combined Block (#98)`** | [`03-service-blueprints/01-block-planning-service.md`](file:///c:/work%20pase/Railway-Project-for-SIH/docs/03-service-blueprints/01-block-planning-service.md) — কম্বাইন্ড ব্লক ব্লুপ্রিন্ট ও এপিআই। |
| **`15 Safety Suite Terms`** | [`03-service-blueprints/04-safety-compliance-service.md`](file:///c:/work%20pase/Railway-Project-for-SIH/docs/03-service-blueprints/04-safety-compliance-service.md) — টোকেন, LOTO, TBT ও TSR ওয়ার্কফ্লো। |
