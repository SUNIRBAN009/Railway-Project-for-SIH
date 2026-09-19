# 04-bug-log-template.md

> **ফাইল ক্রম:** ৩৮/৪৫  
> **ডিরেক্টরি:** `05-deep-dive-logs/`  
> **সার্ভিস স্কোপ:** Production Incident Post-Mortem, Root Cause Analysis (RCA) & CAPA Runbook  
> **পূর্ববর্তী ফাইল:** [05-deep-dive-logs/03-state-management.md](file:///c:/work%20pase/Railway-Project-for-SIH/docs/05-deep-dive-logs/03-state-management.md) (State Management & WebSocket Invalidation)  
> **পরবর্তী ফাইল:** [05-deep-dive-logs/contracts/01-blocks-contracts.md](file:///c:/work%20pase/Railway-Project-for-SIH/docs/05-deep-dive-logs/contracts/01-blocks-contracts.md) (Block Planning & Corridor Allocation API Contracts)  
> **সংযোগ ও উদ্দেশ্য:** এই ফাইলে রেলওয়ে প্রোডাকশন পরিবেশের লাইফ-সেফটি ও অপারেশনাল ইনসিডেন্টের শ্রেণিবিভাগ (SEV-1 থেকে SEV-4), স্ট্যান্ডার্ড রুট-কজ অ্যানালাইসিস (RCA - 5-Whys), পোস্ট-মর্টেম রিপোর্ট ফরম্যাট এবং সংশোধনমূলক ও প্রতিরোধমূলক ব্যবস্থা (CAPA) ফ্রেমওয়ার্ক বিশদভাবে বিধিবদ্ধ করা হয়েছে।

---

# Production Incident Post-Mortem & RCA Runbook (প্রোডাকশন ইনসিডেন্ট ও আরসিএ রুনবুক)

## 1. Incident Severity Classification Matrix (ইনসিডেন্টের তীব্রতা ম্যাট্রিক্স)

রেলওয়ের ট্র্যাফিক অপারেশন ও মানবজীবনের নিরাপত্তার ওপর প্রভাবের ভিত্তিতে সমস্ত সফটওয়্যার ও সিস্টেম বিঘ্নকে চারটি প্রমিত স্তরে শ্রেণীবদ্ধ করা হয়:

| Severity Level | অপারেশনাল সংজ্ঞা ও রেলওয়ে ডোমেন প্রভাব | Target MTTA (স্বীকৃতি) | Target MTTR (সমাধান) | এসকেলেশন পথ ও অবহিতকরণ |
|---|---|:---:|:---:|---|
| **SEV-1 (Critical)** | **লাইফ-সেফটি ও সরাসরি ট্রেন সংঘাতের ঝুঁকি:**<br>• জিপিএস এসওএস সাইরেন (#79) বা ট্রেন অ্যাপ্রোচ পুশ (#76) অফলাইন।<br>• টাইম-স্পেস সুইপ-লাইন বা PostGIS কনফ্লিক্ট ডিটেকশন ফেইলিউর।<br>• ওএইচই এলওটিও (#74) পাওয়ার আইসোলেশন ট্র্যাকিং ডেটাবেসে অসঙ্গতি। | < ৩ মিনিট | < ৩০ মিনিট | চিফ কন্ট্রোলার (Sr. DOM), ডিভিশনাল রেলওয়ে ম্যানেজার (DRM), সিটিও, সেফটি কমিশনার |
| **SEV-2 (Major)** | **মেজর ট্র্যাফিক বিঘ্ন ও রিয়েল-টাইম ব্ল্যাকআউট:**<br>• ড্যাফনি ওয়েবসকেট ক্লাস্টার ডাউন (কন্ট্রোল রুমে লাইভ ট্র্যাকিং স্থগিত)।<br>• COA/NTES লাইভ টাইমটেবিল ইনজেশন > ১৫ মিনিট বিলম্বিত।<br>• ব্লক স্যাংশন এপিআই সাময়িক অচল বা PostGIS কোয়েরি টাইমআউট। | < ১০ মিনিট | < ১ ঘণ্টা | ইঞ্জিনিয়ারিং লিড, ডেভঅপ্স অন-কল, এরিয়া কন্ট্রোলার |
| **SEV-3 (Moderate)** | **ডিভিশনাল বিলম্ব ও ডেটা ফিড সিঙ্ক ব্যর্থতা:**<br>• TMS/SMMS/TDMS ডেটা ফিড সিঙ্ক ব্যর্থতা (#89)।<br>• What-If সিমুলেশন কিউ ব্যাকলগ (#62)।<br>• এসএমএস গেটওয়ে ফেইলওভার সক্রিয় হওয়া। | < ৩০ মিনিট | < ৪ ঘণ্টা | প্রাইমারি মাইক্রোসার্ভিস ওনার, এসআইএইচ কোর টিম |
| **SEV-4 (Minor)** | **নন-ব্লকিং ইউআই ও রিপোর্ট ফর্ম্যাটিং গ্লিচ:**<br>• গ্যান্ট চার্টে মাইনর কালার রেন্ডারিং বাগ।<br>• এক্সেল/পিডিএফ রিপোর্ট এক্সপোর্টে হেডার অ্যালাইনমেন্ট সমস্যা।<br>• ডার্ক/লাইট মোড সিএসএস স্টাইলিং ইনকনসিস্টেন্সি। | < ২ ঘণ্টা | নেক্সট স্প্রিন্ট | ফ্রন্টএন্ড ডেভেলপার |

---

## 2. Standard Production Incident Post-Mortem Template (ইনসিডেন্ট পোস্ট-মর্টেম টেমপ্লেট)

```markdown
# Incident Post-Mortem: [INC-YYYYMMDD-XXX] - [সংক্ষিপ্ত বিবরণমূলক শিরোনাম]

## Incident Metadata (ইনসিডেন্ট মেটাডেটা)
- **Incident ID:** INC-20260920-001
- **Severity Level:** SEV-[1 / 2 / 3 / 4]
- **Incident Commander:** [নাম ও পদবী - যেমন: Senior Operations Lead]
- **Primary Service Affected:** SVC-[AUTH / BLK / DEPT / ONTO / TRN / AST / ANL / NOTIF]
- **Time Detected (UTC/IST):** 2026-09-20 04:15:00 UTC (09:45:00 IST)
- **Time Mitigated (UTC/IST):** 2026-09-20 04:38:00 UTC (10:08:00 IST)
- **Total Operational Downtime:** ২৩ মিনিট
- **CRS/RDSO Notification Required?:** [YES / NO]

---

## 1. Executive Summary (নির্বাহী সারাংশ)
[সংক্ষিপ্ত ২-অনুচ্ছেদের সারসংক্ষেপ: সিস্টেমে কী ত্রুটি ঘটেছিল, ট্রেন চলাচল ও করিডোর ব্লকে কী প্রভাব পড়েছিল, এবং সিস্টেম কীভাবে পুনরুদ্ধার করা হয়েছে।]

---

## 2. Operational & Safety Impact (অপারেশনাল ও সুরক্ষা প্রভাব)
- **Track Possessions Affected:** [যেমন: ৩টি মেগা-ব্লক স্থগিত, ০টি সেফটি লঙ্ঘন]
- **Passenger Trains Impacted:** [যেমন: ১২৪২৪ রাজধানী এক্সপ্রেস আলিগড় জংশনে ৪ মিনিট ডিলে]
- **Freight Movement Bottlenecks:** [যেমন: ২টি বিসিএন কয়লা রেক লুপ লাইনে নিয়ন্ত্রিত]
- **Data Loss / State Corruption:** [জিরো স্টেট করাপশন; PostgreSQL 15.6 ACID ট্রানজাকশন নিরাপদভাবে রোলব্যাক হয়েছে]
- **Life-Safety Incidents:** [০ জন আহত/নিহত; এসওএস ব্যাকআপ চ্যানেল কার্যকর ছিল]

---

## 3. Chronological Incident Timeline (ঘটনার সময়ক্রমিক বিবরণ)
| Timestamp (IST) | Event / Telemetry / Intervention | Responder / System |
|---|---|---|
| 09:45:00 | Prometheus Alert Fired: `PostGIS_Corridor_Query_Duration_Seconds > 5.0s` | Alertmanager (PagerDuty) |
| 09:47:30 | সেকশন কন্ট্রোলার ব্লক অনুমোদন করতে গিয়ে BLK-006 / 504 গেটওয়ে টাইমআউট দেখতে পান | Section Controller NDLS |
| 09:49:00 | অন-কল ডেভঅপ্স ইঞ্জিনিয়ার ইনসিডেন্ট স্বীকার করেন এবং সেভ-২ ওয়ার-রুম চালু করেন | Incident Commander |
| 09:53:00 | ডায়াগনোসিসে দেখা যায় PostgreSQL `railway_corridors` টেবিলে GiST স্প্যাশিয়াল ইনডেক্স আন-অ্যানালাইজড অবস্থায় টেবিল স্ক্যান চালাচ্ছে | Lead DB Engineer |
| 09:58:00 | হটফিক্স: জরুরি `VACUUM ANALYZE railway_corridors;` এবং কোয়েরি পুলার রিস্টার্ট | DBA On-Call |
| 10:03:00 | PostGIS স্প্যাশিয়াল কোয়েরি ল্যাটেন্সি < ১৮ms-এ নেমে আসে; ব্যাকলগ রিকোয়েস্ট সফল হয় | Backend Lead |
| 10:08:00 | কন্ট্রোল রুম থেকে স্বাভাবিক কার্যক্রমে ফেরার নিশ্চয়তা; ইনসিডেন্ট মিটিগেটেড ঘোষণা | Incident Commander |

---

## 4. Root Cause Analysis (5-Whys Methodology)
1. **কেন ব্লক অনুমোদন এপিআই রেসপন্স ৫ সেকেন্ডের বেশি সময় নিচ্ছিল?**  
   PostgreSQL ডেটাবেসে করিডোর কনফ্লিক্ট শনাক্তকারী PostGIS জিওস্প্যাশিয়াল কোয়েরি সিকোয়েনশিয়াল স্ক্যান করছিল।
2. **কেন PostGIS GiST ইনডেক্স ব্যবহার না করে সিকোয়েনশিয়াল স্ক্যান করছিল?**  
   গত রাতে বাল্ক TMS ডেটা সিঙ্ক চলাকালীন ৮৫,০০০ নতুন ট্র্যাক সেগমেন্ট ইনসার্ট করার পর অটোভ্যাকুয়াম স্ট্যাটিস্টিকস আপডেট হয়নি।
3. **কেন অটোভ্যাকুয়াম স্ট্যাটিস্টিকস সময়মতো রান করেনি?**  
   ডিফল্ট `autovacuum_vacuum_scale_factor` (০.২) অত্যন্ত উচ্চ ছিল, ফলে ব্যাপক ডেটা প্রবেশের পরেও থ্রেশহোল্ড ট্রিগার হয়নি।
4. **কেন বাল্ক ইমপোর্টের পর ম্যানুয়াল অ্যানালাইজ স্ক্রিপ্ট চালানো হয়নি?**  
   ইটিএল (ETL) পাইপলাইনের সেলেরি টাস্কে পোস্ট-ইমপোর্ট ডেটাবেস অ্যানালাইজ হুক অনুপস্থিত ছিল।
5. **কেন এই পারফরম্যান্স ডিগ্রেডেশন স্টেজিং লোড টেস্টে ধরা পড়েনি?**  
   স্টেজিং ডেটাবেসে মাত্র ৫০০টি সিন্থেটিক করিডোর ছিল, যা প্রোডাকশনের ১,২০,০০০ রেলওয়ে ট্র্যাক সেগমেন্টের সমতুল্য ছিল না।

---

## 5. Corrective & Preventive Actions (CAPA)

| Action Item ID | কাজের বিবরণ ও প্রতিরোধমূলক ব্যবস্থা | দায়িত্বপ্রাপ্ত ব্যক্তি | অগ্রাধিকার | লক্ষ্যমাত্রা তারিখ | স্থিতি |
|---|---|---|:---:|---|:---:|
| **CAPA-001** | Celery TMS ETL পাইপলাইনে বাল্ক লোডের পর স্বয়ংক্রিয় `VACUUM ANALYZE` হুক যুক্ত করা। | Backend Lead | P1 - Urgent | 2026-09-22 | Open |
| **CAPA-002** | PostgreSQL টিউনিং: `autovacuum_vacuum_scale_factor` ০.০৫-এ নামানো। | DevOps Lead | P1 - Urgent | 2026-09-21 | Done |
| **CAPA-003** | স্টেজিং পরিবেশে প্রোডাকশন স্কেলের ১,৫০,০০০ PostGIS ট্র্যাক ডেটাসেট সিড করা। | QA Lead | P2 - Planned | 2026-09-25 | In Progress |
| **CAPA-004** | কন্টিনিউয়াস পারফরম্যান্স রিগ্রেশন স্যুইটে PostGIS স্প্যাশিয়াল ল্যাটেন্সি টেস্ট যুক্ত করা। | Test Automator | P2 - Planned | 2026-09-28 | Open |
```

---

## 3. Incident Severity Escalation Workflow (এসকেলেশন ও যোগাযোগ কার্যপ্রণালী)

```
[Incident Detected]
       │
       ▼
[Triage Severity: SEV-1 to SEV-4]
       ├── SEV-1: Auto-trigger Voice Bridge + SMS Blast to DRM & Chief Controller
       ├── SEV-2: Slack/Teams War-room Created + On-call Engineer Paged
       ├── SEV-3: Ticket Logged in Linear/Jira + Department Notification
       └── SEV-4: Bug Backlog Enqueued
       │
       ▼
[Investigation & 5-Whys Diagnostic]
       │
       ▼
[Mitigation Applied & Health Check Validated]
       │
       ▼
[Formal Post-Mortem & CAPA Registration within 48 Hours]
```
