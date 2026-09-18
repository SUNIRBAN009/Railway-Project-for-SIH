# 02-rollback-plan.md

> **ফাইল ক্রম:** ৫২/৫৯  
> **ডিরেক্টরি:** `07-roadmap/`  
> **সার্ভিস স্কোপ:** Disaster Recovery (DR), Zero-Data-Loss Rollback Procedures & PostgreSQL 15.6 WAL PITR  
> **পূর্ববর্তী ফাইল:** [07-roadmap/01-milestones.md](file:///c:/work%20pase/Railway-Project-for-SIH/docs/07-roadmap/01-milestones.md) (Key Milestones & Delivery Gates)  
> **পরবর্তী ফাইল:** [07-roadmap/03-frontend-roadmap.md](file:///c:/work%20pase/Railway-Project-for-SIH/docs/07-roadmap/03-frontend-roadmap.md) (Frontend Development Roadmap & UI Architecture)  
> **সংযোগ ও উদ্দেশ্য:** এই ফাইলে প্ল্যাটফর্মের ডিজাস্টার রিকভারি, রোলব্যাক ট্রিগার, PostgreSQL 15.6 + PostGIS 3.3 স্কিমা রিভার্সাল (Expand-and-Contract), পয়েন্ট-ইন-টাইম রিকভারি (PITR) এবং ব্লু-গ্রিন কন্টেইনার ফেইলওভার প্রণালী বিশদভাবে সংজ্ঞায়িত করা হয়েছে।

---

# System Rollback, Disaster Recovery & Failover Plan (সিস্টেম রোলব্যাক ও ডিজাস্টার রিকভারি পরিকল্পনা)

## 1. Automated & Manual Rollback Triggers (রোলব্যাক ট্রিগার মেট্রিক্স)

কোনো নতুন রিলিজ বা প্যাচ প্রোডাকশনে ডিপ্লয় করার ১৫ মিনিটের মধ্যে নিচের যেকোনো একটি নিরাপত্তা বা অপারেশনাল থ্রেশহোল্ড লঙ্ঘিত হলে তাত্ক্ষণিক অটোমেটেড রোলব্যাক বাধ্যতামূলক:

| ট্রিগার শর্তাবলী (Trigger Condition) | পর্যবেক্ষণ মেট্রিক ও উৎস | সিভিয়ারিটি | তাৎক্ষণিক অ্যাকশন ও ফেইলওভার |
|---|---|:---:|---|
| **API Error Rate Spike** | `http_requests_total{status=~"5.."}` > ১.০% | P1 - Urgent | অটোমেটেড ব্লু-গ্রিন রিভার্স প্রক্সি ট্র্যাফিক পূর্ববর্তী স্ট্যাবল ইমেজে ডাইভার্ট করা। |
| **Latency Degradation** | `http_request_duration_seconds{p95}` > ২৫০ms | P2 - High | নতুন গ্রিন কন্টেইনার ট্র্যাফিক স্থগিত করে ব্লু ক্লাস্টারে ফেরত নেওয়া। |
| **Conflict Sweep Failure** | Celery টাস্ক এক্সেপশন রেট (Queue: `high`) > ১.৫% | P1 - Urgent | `apps.blocks` রিলিজ রোলব্যাক করা এবং ওয়ার্কার ক্লাস্টার রিস্টার্ট। |
| **PostgreSQL Lock Contention** | `pg_locks` টেবিলে ungranted locks > ২৫ (Duration > ৪৫s) | P1 - Urgent | পেন্ডিং মাইগ্রেশন বাতিল করা এবং ব্লকিং ট্রানজাকশন বন্ধ করা (`pg_terminate_backend`). |
| **Safety Data Inconsistency** | কোনো ব্লক কনফ্লিক্ট সুইপ ছাড়া অনুমোদিত হলে | P0 - Critical | তাত্ক্ষণিক এমার্জেন্সি ট্র্যাফিক শাটডাউন; অফলাইন সেফটি অডিট ট্রিগার। |
| **Daphne WS Disconnect Spike** | ওয়েবসকেট ডিসকানেক্ট রেট > ৫% per minute | P2 - High | ড্যাফনি ক্লাস্টার রিভার্স করা এবং ফলব্যাক পুশ চ্যানেল চালু করা। |

---

## 2. Blue-Green Container Rollback Procedure (ব্লু-গ্রিন কন্টেইনার রোলব্যাক)

ডকার বা ক্লাউড কন্টেইনারাইজড পরিবেশে শূন্য-ডাউনটাইম ও শূন্য-ডেটা-লস রোলব্যাক পরিচালনা:

```bash
# ১. Nginx / Traefik রিভার্স প্রক্সিতে তাত্ক্ষণিকভাবে ট্র্যাফিক স্ট্যাবল ব্লু কন্টেইনারে রি-রুট করা
docker exec -it railway-reverse-proxy nginx -s reload -c /etc/nginx/nginx.blue.conf

# ২. সদ্য ডিপ্লয়কৃত ত্রুটিপূর্ণ গ্রিন কন্টেইনারগুলো সুশৃঙ্খলভাবে বন্ধ করা
docker compose stop web-green worker-green daphne-green

# ৩. পূর্ববর্তী স্ট্যাবল ব্লু ক্লাস্টারের হেলথচেক নিশ্চিতকরণ
curl -f http://localhost:8000/api/v1/blocks/health/readiness/

# ৪. অপারেশনাল কন্ট্রোল রুম ও ডেভঅপ্স টিমে জরুরি স্ল্যাক/টেলিগ্রাম অ্যালার্ট প্রেরণ
curl -X POST -H 'Content-type: application/json' \
  --data '{"text":"[CRITICAL ALERT] Indian Railways Platform: Deployment rolled back to previous stable container tag due to SLA violation."}' \
  $OPS_SLACK_WEBHOOK_URL
```

---

## 3. PostgreSQL 15.6 Database Schema Rollback (Expand-and-Contract Pattern)

ডেটাবেস মাইগ্রেশনে চলমান ট্রানজাকশন ও ঐতিহাসিক অডিট ট্রেইল যাতে ধ্বংস না হয়, সেজন্য সমস্ত ডেটাবেস পরিবর্তন **Expand-and-Contract Pattern** মেনে পরিচালিত হয়:
1. **কখনো একটিমাত্র মাইগ্রেশনে কলাম ড্রপ বা ডেটা টাইপ সরাসরি পরিবর্তন করা যাবে না।**
2. **Phase 1 (Expand):** নতুন নাল-যোগ্য (Nullable) কলাম বা স্প্যাশিয়াল কলাম যুক্ত করা। অ্যাপ্লিকেশন ব্যাকগ্রাউন্ডে উভয় কলামে ডেটা রাইট করবে।
3. **Phase 2 (Migrate):** Celery ব্যাকগ্রাউন্ড টাস্কের মাধ্যমে ঐতিহাসিক ডেটা নতুন কলামে ব্যাকফিল করা।
4. **Phase 3 (Contract):** অ্যাপ্লিকেশন সম্পূর্ণভাবে নতুন কলাম থেকে ডেটা রিড করবে; পরবর্তী রিলিজ চক্রে নিরাপদভাবে পুরানো কলাম অপসারণ করা হবে।

### ত্রুটিপূর্ণ জ্যাঙ্গো ও পোস্টগ্রিস মাইগ্রেশন রিভার্সাল (Reversing a Migration)
```bash
# ১. ব্লকের বর্তমান মাইগ্রেশন অবস্থা পরিদর্শন
python manage.py showmigrations blocks

# ২. নিরাপদভাবে নির্দিষ্ট স্ট্যাবল মাইগ্রেশনে রোলব্যাক করা
python manage.py migrate blocks 0004_previous_stable_state

# ৩. PostgreSQL 15.6 + PostGIS 3.3-এ টেবিল স্কিমা এবং GiST ইনডেক্স অখণ্ডতা পরীক্ষা
docker exec -it railway_postgres psql -U postgres -d railway_block_db -c "
\d+ blocks
SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'blocks';
"
```

---

## 4. Disaster Recovery (DR) & Point-In-Time Recovery (PITR)

- **Recovery Point Objective (RPO):** **< ১ মিনিট** (PostgreSQL সিঙ্ক্রোনাস স্ট্রিমিং রেপ্লিকেশন এবং WAL আর্কাইভ স্টোরেজের মাধ্যমে)।
- **Recovery Time Objective (RTO):** **< ১০ মিনিট** (স্ট্যান্ডবাই কন্টেইনার প্রমোশন এবং অটোমেটেড হেলথচেক)।

### ব্যাকআপ ও রিস্টোরেশন রানবুক (PostgreSQL 15.6 + WAL-G)
```bash
# ১. সর্বশেষ সম্পূর্ণ ফিজিক্যাল বেস ব্যাকআপ রিস্টোরেশন
wal-g backup-fetch /var/lib/postgresql/data LATEST

# ২. পয়েন্ট-ইন-টাইম রিকভারি (PITR) টার্গেট টাইম কনফিগার করা
cat <<EOF > /var/lib/postgresql/data/recovery.signal
restore_command = 'wal-g wal-fetch "%f" "%p"'
recovery_target_time = '2026-09-18 21:45:00 UTC'
recovery_target_action = 'promote'
EOF

# ৩. পোস্টগ্রিসকিউএল সার্ভিস পুনরায় চালু করা ও পোস্টগিস এক্সটেনশন সক্রিয়তা যাচাই
docker compose up -d postgres
docker exec -it railway_postgres psql -U postgres -d railway_block_db -c "
SELECT postgis_full_version();
SELECT count(*) FROM blocks WHERE status = 'ACTIVE';
"
```
