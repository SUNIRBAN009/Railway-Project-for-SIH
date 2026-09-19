# 00-service-index.md

> **ফাইল ক্রম:** ১৪/৪৫  
> **পূর্ববর্তী ফাইল:** `01-tech-infra/09-testing-strategy.md`  
> **পরবর্তী ফাইল:** `02-microservices/01-dependency-matrix.md`  
> **সংযোগ:** এই সার্ভিসের ইনডেক্স ১২২টি ফিচারের দায়িত্ব ৮টি কোর মডিউলে বিভক্ত করে।

---

## 1. Core Services / Domain Modules (PS 26027)

| Service Key | Domain Name | Database Tables / Models | Primary Responsibilities | Handled Features (from Master Plan) |
|:---|:---|:---|:---|:---|
| `SVC-AUTH` | Accounts & Access | `User`, `UserProfile`, `DepartmentRole`, `AuditLog` | JWT Auth, RBAC, Quick Demo Role Switcher | #1, #11, #12, #112, #122 |
| `SVC-BLK` | Block Planning & Optimization | `BlockRequest`, `PossessionWindow`, `ConflictRecord`, `SanctionOrder` | ব্লক ক্রিয়েশন, সুইপ-লাইন কনফ্লিক্ট ডিটেকশন, কম্বাইন্ড ব্লক অপ্টিমাইজার (USP), স্মার্ট কিউ, CoF×LoF স্কোরিং, ফ্রিজ উইন্ডো | #2, #3, #4, #5, #6, #7, #8, #13, #25, #30, #31, #32, #34, #37, #61, #62, #63, #70, #92, #94, #95, #98, #99, #102, #103, #104, #105, #106, #107, #108, #109, #110 |
| `SVC-TRN` | Trains & Traffic Control | `TrainMaster`, `TimetableEntry`, `LiveTrainStatus`, `DelayLog` | ১+ মাস পূর্বের টাইমটেবিল, এনটিইএস লাইভ লিংক, ট্রাফিকের গতিবিধির ওপর ভিত্তি করে ডিলে ক্যাসকেড রিক্যালকুলেশন | #24, #27, #28, #29, #42, #48, #91, #114, #115, #116 |
| `SVC-DEPT` | Departments & Gangs | `CrewGang`, `GangMember`, `Equipment`, `ToolInventory` | গ্যাং এলোকেশন, ট্রাভেল টাইম রাউটিং, মেটেরিয়াল স্লটিং, টুল কাউন্ট, টিবিটি | #9, #10, #38, #39, #41, #72, #81, #83, #100, #101 |
| `SVC-ONTO` | Semantic Digital Twin | `OWL 2 Triples`, `TrackTopology`, `ElectricalFeederZone` | ট্র্যাক সেকশন, সিগন্যাল ও ওএইচই ইন্টারলকিং গ্রাফ, ক্রস-ডিপার্টমেন্ট প্রভাব অনুমান | #14, #15, #16, #17, #18, #43, #44, #96 |
| `SVC-AST` | Assets & Ingestion | `AssetRegistry`, `DefectRecord`, `LOTOEntry`, `WeatherGate` | TMS, SMMS, TDMS থেকে ডিফেক্ট ফেচ, পোস্টগিস চেইনেজ নরমালাইজেশন, অফলাইন ফলব্যাক | #33, #36, #45, #46, #47, #73, #74, #75, #84, #86, #87, #88, #89, #90, #93, #97 |
| `SVC-ANLY` | Analytics & Reports | `CorridorKPI`, `AvailabilityIndex`, `DelayCostReport` | অ্যাসেট অ্যাভেইলেবিলিটি ইনডেক্স (#50), ভ্যারিয়েন্স অটো-অ্যানালাইসিস, ড্যাশবোর্ডস | #19, #20, #21, #22, #23, #50, #51, #52, #53, #54, #85 |
| `SVC-NOTIF` | Notifications & Safety Suite | `SafetyAlert`, `DigitalToken`, `SOSLog`, `PushDispatch` | ১৫টি সেফটি মডিউল (টোকেন, লোন ওয়ার্কার, এসওএস, ট্রেন অ্যাপ্রোচ ওয়ার্নিং), এসএমএস/হোয়াটসঅ্যাপ অ্যালার্ট | #40, #49, #64, #71, #76, #77, #78, #79, #80, #82, #111 |

---
*ডকুমেন্ট সম্পূর্ণ সিঙ্ক্রোনাইজড: RailBlock_Feature_Master_Plan_PS26027(1).xlsx*
