# 01-dependency-matrix.md

> **ফাইল ক্রম:** ১৫/৪৫  
> **পূর্ববর্তী ফাইল:** `02-microservices/00-service-index.md`  
> **পরবর্তী ফাইল:** `03-service-blueprints/00-service-template.md`  
> **সংযোগ:** সার্ভিস ইনডেক্সে নির্ধারিত ৮টি মডিউলের পারস্পরিক কল এবং ডেটা নির্ভরতা ম্যাট্রিক্স।

---

## 1. Inter-Service Dependency Matrix (8 Core Modules)

| Calling Module \ Depended Module | `SVC-AUTH` | `SVC-BLK` | `SVC-TRN` | `SVC-DEPT` | `SVC-ONTO` | `SVC-AST` | `SVC-ANLY` | `SVC-NOTIF` |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **`SVC-AUTH`** | ── | Direct | ── | Direct | ── | ── | Read | Direct |
| **`SVC-BLK`** | Auth Check | ── | Read (Schedule) | Sync (Gang) | Sync (Topology) | Read (Defects) | Publish KPI | Trigger Alert |
| **`SVC-TRN`** | Auth Check | Read (Blocks) | ── | ── | Read (Interlocking) | ── | Publish Delay | Trigger Alert (#76) |
| **`SVC-DEPT`** | Auth Check | Read (Blocks) | ── | ── | ── | Sync (Tools) | ── | Safety Alert |
| **`SVC-ONTO`** | ── | Read (Section) | Read (Routes) | ── | ── | Sync (Assets) | ── | ── |
| **`SVC-AST`** | Auth Check | ── | ── | ── | Graph Update | ── | Publish Health | Trigger LOTO |
| **`SVC-ANLY`** | Auth Check | Read (All) | Read (All) | Read (All) | Read (Topology) | Read (Health) | ── | ── |
| **`SVC-NOTIF`** | Token Verify | Read (Status) | Read (Approach) | Read (Crew) | ── | Read (OHE Power) | ── | ── |

---
*ডকুমেন্ট সম্পূর্ণ সিঙ্ক্রোনাইজড: RailBlock_Feature_Master_Plan_PS26027(1).xlsx*
