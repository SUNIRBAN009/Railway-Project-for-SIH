# 01-api-standards.md

> **ফাইল ক্রম:** ৫৫/৫৯  
> **ডিরেক্টরি:** `08-standards/`  
> **সার্ভিস স্কোপ:** RESTful API Guidelines, WebSocket Communication Standards & Idempotency Protocols  
> **পূর্ববর্তী ফাইল:** [08-standards/00-coding-standards.md](file:///c:/work%20pase/Railway-Project-for-SIH/docs/08-standards/00-coding-standards.md) (Enterprise Coding Standards & DDL Rules)  
> **পরবর্তী ফাইল:** [08-standards/02-commit-standards.md](file:///c:/work%20pase/Railway-Project-for-SIH/docs/08-standards/02-commit-standards.md) (Git Commit Standards & Branching Strategy)  
> **সংযোগ ও উদ্দেশ্য:** এই ফাইলে প্ল্যাটফর্মের RESTful এপিআই ডিজাইন নীতি, HTTP স্ট্যাটাস কোড ম্যাপিং, PostgreSQL 15.6 কার্সর পেজিনেশন, ড্যাফনি ওয়েবসকেট ফ্রেমওয়ার্ক এবং আইডেমপোটেন্সি কি (Idempotency-Key) প্রোটোকল বিস্তারিতভাবে সংজ্ঞায়িত করা হয়েছে।

---

# RESTful API Standards & Interface Guidelines (রেস্ট ও ওয়েবসকেট এপিআই মানদণ্ড)

## 1. URI Design & Resource Hierarchy (ইউআরআই ডিজাইন ও রিসোর্স বিন্যাস)

1. **পাথ প্রিফিক্স ও ভার্সনিং:** সমস্ত এপিআই এন্ডপয়েন্ট বাধ্যতামূলকভাবে `/api/v1/` ভার্সন প্রিফিক্স দিয়ে শুরু হবে।
2. **বহুবচন বিশেষ্য (Plural Nouns):** রিসোর্স কালেকশনের জন্য সর্বদা বহুবচন বিশেষ্য ব্যবহৃত হবে:
   - ✅ `/api/v1/blocks/`
   - ❌ `/api/v1/block/` অথবা `/api/v1/getBlocks/`
3. **নেস্টেড সাব-রিসোর্স (Sub-Resources):** চাইল্ড এনটিটি প্যারেন্ট ছাড়া স্বাধীনভাবে অর্থহীন হলে কেবল তখনই নেস্টেড পাথ ব্যবহৃত হবে:
   - ✅ `/api/v1/blocks/{id}/conflicts/`
   - ✅ `/api/v1/departments/gangs/{id}/members/`
4. **অ্যাকশন এন্ডপয়েন্টস (Action Sub-paths):** জটিল স্টেট ট্রানজিশন বা লাইফ-সেফটি অ্যাকশনের জন্য বর্ণনামূলক POST সাব-পাথ ব্যবহার বাধ্যতামূলক:
   - ✅ `POST /api/v1/blocks/{id}/sanction/` (অনুমোদন)
   - ✅ `POST /api/v1/blocks/{id}/activate/` (ডিজিটাল টোকেন পজেশন লক)
   - ✅ `POST /api/v1/blocks/{id}/complete/` (সেকশন হ্যান্ডব্যাক ও ক্লিয়ারেন্স)
   - ✅ `POST /api/v1/notifications/sos/trigger/` (১-ট্যাপ জিপিএস এসওএস সাইরেন)

---

## 2. Standard HTTP Status Code Usage (প্রমিত এইচটিটিপি স্ট্যাটাস কোড)

| স্ট্যাটাস কোড | অর্থ ও ব্যবহারিক প্রেক্ষাপট | ভারতীয় রেলওয়ে প্ল্যাটফর্ম ডোমেন প্রয়োগ |
|---|---|---|
| **`200 OK`** | রিকোয়েস্ট সফল | স্ট্যান্ডার্ড ডেটা রিট্রিভাল (GET), আংশিক আপডেট (PATCH), অথবা সফল অ্যাকশন সম্পাদন। |
| **`201 Created`** | নতুন রিসোর্স তৈরি | সফল ব্লক প্রপোজাল সাবমিশন, ওয়ার্ক অর্ডার তৈরি, অথবা গ্যাং রেজিস্ট্রেশন। |
| **`204 No Content`** | বডি ছাড়া সফলতা | ক্যাশ ইনভ্যালিডেশন স্বীকৃতি বা ড্রাফট রেকর্ড মুছে ফেলা। |
| **`400 Bad Request`** | ইনপুট ভ্যালিডেশন ব্যর্থতা | ম্যালফর্মড JSON, নেতিবাচক সময়কাল, অথবা চেইনেজ রেঞ্জ ত্রুটি (`start_km >= end_km`)। |
| **`401 Unauthorized`** | অনুপস্থিত বা অবৈধ অথেনটিকেশন | মেয়াদোত্তীর্ণ বা অবৈধ RS256 JWT টোকেন, অনুপস্থিত Authorization হেডার। |
| **`403 Forbidden`** | পারমিশন বা রোল ঘাটতি | বিভাগীয় ইঞ্জিনিয়ারের দ্বারা চিফ কন্ট্রোলারের অনুমোদন এপিআই অ্যাক্সেস চেষ্টা (`AUTH-005`)। |
| **`404 Not Found`** | এনটিটি খুঁজে পাওয়া যায়নি | নির্দিষ্ট `block_id`, `train_number`, অথবা `asset_uid` PostgreSQL ডেটাবেসে নেই। |
| **`409 Conflict`** | ব্যবসায়িক বা সুরক্ষা সংঘাত | ট্রেনের সাথে করিডোর ওভারল্যাপ (`BLK-003`) অথবা অপ্টিমিস্টিক লকিং ব্যর্থতা (`BLK-006`)। |
| **`412 Precondition Failed`**| সুরক্ষার পূর্বশর্ত অপূর্ণ | Caution Order, Tool Count, Weather Gate বা LOTO সাইন-অফ ছাড়া সক্রিয়করণ চেষ্টা (`BLK-008..010`)। |
| **`422 Unprocessable Entity`**| সিমেন্টিক অনটোলজি অসঙ্গতি | HermiT রিজনার দ্বারা ওএইচই বিদ্যুৎ বিচ্ছিন্নজনিত ট্রেন আটকে পড়ার ঝুঁকি শনাক্তকরণ (`ONTO-001`)। |
| **`429 Too Many Requests`** | রেট লিমিট অতিক্রম | ক্লায়েন্ট কোটা (১২০ রিকোয়েস্ট/মিনিট) অতিক্রম করেছে; `Retry-After` হেডার সংযুক্ত। |
| **`500 Server Error`** | সার্ভার অভ্যন্তরীণ ক্র্যাশ | হ্যান্ডল না করা অভ্যন্তরীণ ব্যতিক্রম বা ডেটাবেস সংযোগ বিঘ্ন। |

---

## 3. PostgreSQL 15.6 Keyset & Cursor Pagination (কার্সর পেজিনেশন প্রোটোকল)

অডিট লগ বা টেলিমেট্রির মতো বিশাল ডেটাসেটে অফসেট পেজিনেশন (`LIMIT offset, count`) টেবিল স্ক্যান ও পারফরম্যান্স স্লো করে দেয়। তাই প্ল্যাটফর্মের সমস্ত কালেকশন এন্ডপয়েন্টে **Keyset (Cursor) Pagination** বাধ্যতামূলক:

```http
GET /api/v1/blocks/audit-logs/?cursor=eyJjcmVhdGVkX2F0IjoiMjAyNi0wOS0xOFQyMTozMDowMC4wMDAwMDBaIiwiaWQiOiJmMS4uLiJ9&limit=50
```

পোস্টগ্রিসকিউএলে ব্যাকগ্রাউন্ড কোয়েরি:
```sql
SELECT * FROM audit_logs
WHERE (created_at, id) < (:cursor_timestamp, :cursor_id)
ORDER BY created_at DESC, id DESC
LIMIT 50;
```

---

## 4. Idempotency Key Specification (আইডেমপোটেন্সি প্রোটোকল)

নেটওয়ার্ক ড্রপআউটের কারণে একই ব্লক দুবার জমা হওয়া বা ডাবল অনুমোদন ঠেকাতে মিউটেটিং এন্ডপয়েন্টে **আইডেমপোটেন্সি কি** ব্যবহার করা হয়:

- ক্লায়েন্ট রিকোয়েস্ট হেডারে প্রেরণ করবে: `Idempotency-Key: <UUIDv4>`।
- জ্যাঙ্গো মিডলওয়্যার কী-টিকে Redis 7-এ ১২০ সেকেন্ডের TTL দিয়ে লক করে রাখে (`idemp:key:<UUIDv4>`)।
- চলমান অপারেশনের সময় হুবহু একই কী দিয়ে পুনরায় রিকোয়েস্ট এলে সেকেন্ডারি এক্সিকিউশন রোধ করে ক্যাশড রেসপন্স সরাসরি ক্লায়েন্টে ফেরত পাঠানো হয়।

---

## 5. WebSocket API Standards (Daphne ASGI ওয়েবসকেট প্রোটোকল)

1. **কানেকশন ইউআরএল:** `wss://[domain]/ws/v1/corridor/{corridor_code}/?token={jwt_token}`
2. **পুশ-টু-ইনভ্যালিডেট ফ্রেম কাঠামো (JSON):**
   ```json
   {
     "type": "INVALIDATE_CACHE",
     "domain": "BLOCKS",
     "entity_id": "7f8e9a2b-3c4d-5e6f-7a8b-9c0d1e2f3a4b",
     "action": "SANCTIONED",
     "timestamp": "2026-09-18T22:35:00.123456Z"
   }
   ```
3. **জরুরি এসওএস সাইরেন ফ্রেম কাঠামো (High-Priority):**
   ```json
   {
     "type": "EMERGENCY_SOS_SIREN",
     "alert_id": "sos-7f8e-acbd-9912",
     "chainage_km": 144.200,
     "section_code": "NDLS-GZB-UP",
     "severity": "CRITICAL_LIFE_SAFETY",
     "siren_frequency_hz": 880,
     "timestamp": "2026-09-18T22:35:00.123456Z"
   }
   ```
4. **হার্টবিট পিং/পং (Heartbeat Protocol):** প্রতি ৩০ সেকেন্ড অন্তর ক্লায়েন্ট `{"type": "PING"}` পাঠায় এবং সার্ভার তাৎক্ষণিক `{"type": "PONG"}` দিয়ে কানেকশন সচল রাখে।
