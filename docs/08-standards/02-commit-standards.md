# 02-commit-standards.md

> **ফাইল ক্রম:** ৫৬/৫৯  
> **ডিরেক্টরি:** `08-standards/`  
> **সার্ভিস স্কোপ:** Version Control Standards, Conventional Commits 1.0.0 & PR Safety Review Checklists  
> **পূর্ববর্তী ফাইল:** [08-standards/01-api-standards.md](file:///c:/work%20pase/Railway-Project-for-SIH/docs/08-standards/01-api-standards.md) (REST & WebSocket API Standards)  
> **পরবর্তী ফাইল:** [08-standards/03-documentation-standards.md](file:///c:/work%20pase/Railway-Project-for-SIH/docs/08-standards/03-documentation-standards.md) (Documentation & Markdown Quality Guidelines)  
> **সংযোগ ও উদ্দেশ্য:** এই ফাইলে গিট ভার্সন কন্ট্রোল গাইডলাইন, Conventional Commits স্পেসিফিকেশন, ট্রাঙ্ক-বেসড ব্রাঞ্চিং মডেল এবং রেলওয়ে লাইফ-সেফটি পুল রিকোয়েস্ট (PR) টেমপ্লেট লিপিবদ্ধ করা হয়েছে।

---

# Version Control, Commit Conventions & PR Review Standards (ভার্সন কন্ট্রোল ও পিআর মানদণ্ড)

## 1. Conventional Commits 1.0.0 Specification (কমিট মেসেজ কনভেনশন)

প্ল্যাটফর্মের সমস্ত গিট কমিট বাধ্যতামূলকভাবে [Conventional Commits 1.0.0](https://www.conventionalcommits.org/) স্ট্যান্ডার্ড অনুসরণ করবে:

$$\mathbf{<type>[optional\ scope]:\ <description>}$$

```text
feat(blocks): implement sweep-line interval conflict algorithm for corridor tracks
feat(notif): add one-tap GPS SOS emergency siren broadcast over Daphne WebSockets (#79)
fix(accounts): resolve token blacklist key expiration in Redis cluster
perf(spatial): add PostGIS GiST index on railway_corridors track_geometry
docs(api): update OpenAPI 3.0.3 specification for trains timetable service
test(ontology): add unit tests for HermiT stranded electric train DL reasoning
refactor(departments): extract gang reservation and tool count into domain service
chore(deps): bump psycopg from 3.2.0 to 3.2.1
```

### অনুমোদিত কমিট টাইপস (Approved Commit Types)
- **`feat`**: প্ল্যাটফর্মে নতুন সক্ষমতা বা ১২২টি মাস্টার ফিচারের কোনোটির সংযোজন।
- **`fix`**: অপারেশনাল বাগ, নিরাপত্তা ত্রুটি বা গাণিতিক অসঙ্গতি সংশোধন।
- **`perf`**: ল্যাটেন্সি হ্রাস, মেমরি সাশ্রয় বা PostGIS কোয়েরি গতিশীলকরণ সংক্রান্ত পরিবর্তন।
- **`docs`**: শুধুমাত্র টেকনিক্যাল ডকুমেন্টেশন বা এপিআই স্পেসিফিকেশন পরিবর্তন।
- **`test`**: নতুন টেস্ট কেস সংযোজন বা টেস্ট স্যুইট সংশোধন।
- **`refactor`**: বিজনেস লজিক অপরিবর্তিত রেখে কোডের মান ও কাঠামোগত উন্নয়ন।
- **`chore`**: বিল্ড স্ক্রিপ্ট, প্যাকেজ ডিপেন্ডেন্সি বা সিআই/সিডি ওয়ার্কফ্লো পরিবর্তন।

---

## 2. Git Branching Strategy (ট্রাঙ্ক-বেসড ব্রাঞ্চিং মডেল)

- **`main`**: সর্বদা ডিপ্লয়েবল, সুরক্ষিত ও সুরক্ষিত ব্রাঞ্চ। স্টেজিং ও প্রোডাকশন রিলিজ সর্বদা `main` থেকে ট্যাগ করা হয়।
- **Feature Branches**: স্বল্পস্থায়ী ব্রাঞ্চ (সর্বোচ্চ ৪৮ ঘণ্টার জীবনকাল), যা `main` থেকে কাটা হয়:
  - বিন্যাস: `feat/FUNC-BLK-001-sweep-line-conflict`
  - বিন্যাস: `feat/FUNC-NOTIF-003-one-tap-sos-siren`
  - বিন্যাস: `fix/AST-004-chainage-parser-regex`
- **মার্জের পূর্বশর্ত:** সর্বনিম্ন ১ জন সিনিয়র ইঞ্জিনিয়ারের অনুমোদন এবং সমস্ত স্বয়ংক্রিয় সিআই চেক (Ruff, ESLint, Pytest, Schemathesis) সবুজ (Pass) হতে হবে।

---

## 3. Pull Request Safety Review Template (`.github/pull_request_template.md`)

```markdown
## Summary of Changes (পরিবর্তনের সংক্ষিপ্ত বিবরণ)
[এই পিআর-এ কী পরিবর্তন আনা হয়েছে এবং এটি কোন রেলওয়ে ফিচার বা টিকিট সমাধান করে তা সংক্ষেপে লিখুন।]

## Related Issue / Specification Link (সংশ্লিষ্ট স্পেক ও ফাংশন আইডি)
- Function ID: `FUNC-___-___`
- Documentation Reference: `docs/___/___`
- Feature Master Plan ID: `#___`

## Safety, Database & Operational Checklist (সুরক্ষা ও ডাটাবেস চেকলিস্ট)
- [ ] **No Destructive DB Changes:** সমস্ত স্কিমা পরিবর্তন Expand-and-Contract নীতি মেনে তৈরি (কোনো বিদ্যমান কলাম বা টেবিল সরাসরি ড্রপ করা হয়নি)।
- [ ] **PostgreSQL 15.6 + PostGIS 3.3 Verified:** নতুন স্প্যাশিয়াল কোয়েরি `SRID 4326` এবং GiST ইনডেক্স ব্যবহার করে; `ST_DWithin` মিটারে সঠিক দূরত্ব পরিমাপ করে।
- [ ] **Zero MySQL References:** পিআর কোডবেসে কোনো MySQL রেফারেন্স বা ইনোডিবি লকিং নেই।
- [ ] **Locking & Concurrency Hardened:** মিউটেটিং এন্ডপয়েন্টে অপ্টিমিস্টিক কনকারেন্সি কন্ট্রোল (`version` কলাম) নিশ্চিত করা হয়েছে।
- [ ] **Safety Suite Compliance:** লাইফ-সেফটি অপারেশনে ডিজিটাল টোকেন (#71), ওএইচই এলওটিও (#74) এবং প্রাক-কাজের টুল কাউন্ট (#81) যথাযথভাবে সংরক্ষিত।
- [ ] **Performance SLA:** লোকাল PostgreSQL পরিবেশে কোয়েরি এক্সিকিউশন টাইম p95 < 40ms মানদণ্ড পূরণ করে।
- [ ] **Test Coverage:** নতুন কোডের জন্য Pytest ইউনিট/ইন্টিগ্রেশন টেস্ট যুক্ত করা হয়েছে (কভারেজ > ৮৫%)।
```
