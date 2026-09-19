# 02-load-test-strategy.md

> **ফাইল ক্রম:** ৪৭/৫৯  
> **ডিরেক্টরি:** `06-testing-qa/`  
> **সার্ভিস স্কোপ:** Performance Engineering, k6 Stress Workloads & PostgreSQL/PostGIS Scaling Bottleneck Analysis  
> **পূর্ববর্তী ফাইল:** [06-testing-qa/01-e2e-scenarios.md](file:///c:/work%20pase/Railway-Project-for-SIH/docs/06-testing-qa/01-e2e-scenarios.md) (End-to-End Operational Journey Scenarios)  
> **পরবর্তী ফাইল:** [06-testing-qa/03-data-seeding.md](file:///c:/work%20pase/Railway-Project-for-SIH/docs/06-testing-qa/03-data-seeding.md) (Master Data Seeding & Simulation Data Commands)  
> **সংযোগ ও উদ্দেশ্য:** এই ফাইলে প্ল্যাটফর্মের পারফরম্যান্স ইঞ্জিনিয়ারিং, সার্ভিস-লেভেল এগ্রিমেন্ট (SLA) বাজেট, k6 লোড ও স্ট্রেস টেস্ট স্ক্রিপ্ট, PostgreSQL 15.6 + PostGIS 3.3 কানেকশন পুলিং (PgBouncer) এবং হাই-কনকারেন্সি বটলনেক বিশ্লেষণ লিপিবদ্ধ করা হয়েছে।

---

# Load Testing Strategy & Performance Engineering (লোড টেস্টিং ও পারফরম্যান্স কৌশল)

## 1. Performance Targets & SLA Budgets (এসএলএ ও পারফরম্যান্স লক্ষ্যমাত্রা)

প্ল্যাটফর্মের ৮টি মাইক্রোসার্ভিস এবং রিয়েল-টাইম লাইফ-সেফটি ফিচারের জন্য প্রোডাকশন স্কেলে নির্ধারিত SLA মেট্রিক্স:

| কার্যভারের ধরন (Workload Category) | কনকারেন্ট ইউজার (VUs) | লক্ষ্যমাত্রা থ্রুপুট | p95 ল্যাটেন্সি বাজেট | সর্বোচ্চ অনুমোদিত এরর রেট |
|---|:---:|:---:|:---:|:---:|
| **Read APIs (করিডোর ম্যাপ, টাইমটেবিল ও অ্যাসেট)** | ১,০০০ ভার্চুয়াল ইউজার | ১,২০০ RPS | **< ৪০ms** | < ০.০১% |
| **PostGIS স্প্যাশিয়াল ইন্টারসেকশন কোয়েরি (`ST_DWithin`)** | ৫০০ ভার্চুয়াল ইউজার | ৬০০ RPS | **< ৩০ms** | < ০.০১% |
| **সুইপ-লাইন কনফ্লিক্ট ডিটেকশন (Celery Task)** | ১০০ কনকারেন্ট টাস্ক | ১৫০ sweeps/sec | **< ৫০ms** | < ০.০৫% |
| **১-ট্যাপ জিপিএস এসওএস সাইরেন ও ড্যাফনি ফ্যানআউট (#79)** | ৫০ সমসাময়িক অ্যালার্ম | ১০০ alerts/sec | **< ৭৫ms** | **০.০০০% (Zero Loss)** |
| **ব্লক প্রপোজাল সাবমিশন (ACID ট্রানজাকশন)** | ২০০ ভার্চুয়াল ইউজার | ২৫০ RPS | **< ৮০ms** | < ০.০২% |
| **অ্যাসেট অ্যাভেইলেবিলিটি স্কোর কম্পিউটেশন (#50)** | ৫০ অ্যানালিটিক্স কোয়েরি | ৩০ reports/sec | **< ১৮০ms** | < ০.০৫% |
| **HermiT DL অনটোলজি রিজনার সুইপ (`worker-ontology`)** | ২০ কনকারেন্ট সুইপ | ১৫ sweeps/sec | **< ১,৫০০ms** | < ০.১০% |
| **Daphne ASGI ওয়েবসকেট পুশ ফ্রেম ডিসপ্যাচ** | ১০,০০০ কানেকশন | ১৫,০০০ frames/sec | **< ২০ms** | < ০.০১% |

---

## 2. Production k6 Load Testing Script (`tests/load/k6_corridor_stress.js`)

এই k6 স্ক্রিপ্টটি নয়াদিল্লি–কানপুর করিডোরের সমসাময়িক ১,০০০ কন্ট্রোলার ও ফিল্ড ইঞ্জিনিয়ারের মিথস্ক্রিয়া এবং পোস্টগ্রিসকিউএল স্প্যাশিয়াল লোড সিমুলেট করে:

```javascript
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom Enterprise Metrics
export const errorRate = new Rate('system_errors');
export const spatialQueryDuration = new Trend('postgis_query_duration');
export const blockSubmissionDuration = new Trend('block_submission_duration');

export const options = {
  stages: [
    { duration: '1m', target: 100 },  // Ramp-up to 100 concurrent controllers
    { duration: '3m', target: 500 },  // Scale to 500 divisional users
    { duration: '2m', target: 1000 }, // Peak stress at 1,000 users
    { duration: '2m', target: 1000 }, // Sustained peak load
    { duration: '1m', target: 0 },    // Graceful ramp-down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<120', 'p(99)<250'],
    'system_errors': ['rate<0.005'], // Max 0.5% errors allowed under peak stress
    'block_submission_duration': ['p(95)<100'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000/api/v1';
const AUTH_TOKEN = __ENV.TEST_JWT_TOKEN || 'test_controller_jwt_token';

export default function () {
  const requestHeaders = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AUTH_TOKEN}`,
    },
  };

  group('1. Corridor Map & Spatial Live Feeds', () => {
    const t0 = new Date().getTime();
    
    // Query active blocks in NDLS-CNB corridor (PostGIS ST_Intersects execution)
    const blocksRes = http.get(
      `${BASE_URL}/blocks/?corridor=NDLS-CNB-MAIN&status=SANCTIONED`,
      requestHeaders
    );
    spatialQueryDuration.add(new Date().getTime() - t0);

    const successBlocks = check(blocksRes, {
      'blocks status 200': (r) => r.status === 200,
      'has data payload': (r) => JSON.parse(r.body).data !== undefined,
    });
    errorRate.add(!successBlocks);

    // Query live trains telemetry
    const trainsRes = http.get(`${BASE_URL}/trains/live/?corridor_code=NDLS-CNB-MAIN`, requestHeaders);
    const successTrains = check(trainsRes, {
      'trains status 200': (r) => r.status === 200,
    });
    errorRate.add(!successTrains);
  });

  sleep(1);

  group('2. Submit Maintenance Block Proposal & Trigger Sweep', () => {
    const proposalPayload = JSON.stringify({
      section_code: 'NDLS-GZB-UP',
      line_type: 'UP',
      department_code: 'ENGG',
      work_type: 'TRACK_TAMPING',
      start_km: 14.250,
      end_km: 18.800,
      scheduled_start_time: new Date(Date.now() + 3600000).toISOString(),
      scheduled_end_time: new Date(Date.now() + 18000000).toISOString(),
      traction_power_cutoff_required: false,
      shadow_slot_eligible: true,
      crew_headcount_expected: 22,
    });

    const tStart = new Date().getTime();
    const proposalRes = http.post(`${BASE_URL}/blocks/proposals/`, proposalPayload, requestHeaders);
    blockSubmissionDuration.add(new Date().getTime() - tStart);

    const successProposal = check(proposalRes, {
      'proposal created (201) or detected clash (409)': (r) => r.status === 201 || r.status === 409,
    });
    errorRate.add(!successProposal);
  });

  sleep(1.5);
}
```

---

## 3. PostgreSQL 15.6 + PostGIS Stress Criteria & Mitigation (বটলনেক বিশ্লেষণ ও প্রশমন)

| সম্ভাব্য বটলনেক (Potential Bottleneck) | পর্যবেক্ষণ মেট্রিক ও সাইন | রুট-কজ বিশ্লেষণ | প্রোডাকশন মিটিগেশন কৌশল |
|---|---|---|---|
| **PostgreSQL Connection Exhaustion** | `FATAL: remaining connection slots are reserved for non-replication superuser connections` | সরাসরি জ্যাঙ্গো থেকে পোস্টগ্রিস কানেকশন খোলা হলে ১,০০০ VUs-এ মেমরি ক্র্যাশ করে। | **PgBouncer** ট্রানজাকশন পুলার (`pool_mode = transaction`) কনফিগার করা; `max_client_conn = 2000`, `default_pool_size = 80`। |
| **PostGIS GiST R-Tree Contention** | `pg_locks` টেবিলে `ExclusiveLock` ওয়েট বৃদ্ধি এবং ল্যাটেন্সি > ২০০ms | প্রচুর নতুন করিডোর ও পয়েন্ট জিওমেট্রি একযোগে ইনসার্ট হলে ইনডেক্স স্প্লিট লকিং ঘটে। | GiST ইনডেক্সে `buffering = on` এনাবল করা এবং রিড কোয়েরির জন্য PostgreSQL Read Replica ব্যবহার। |
| **Transaction Deadlocks (`40P01`)** | PostgreSQL লগ ফাইলে `deadlock detected` স্পাইক | একাধিক কন্ট্রোলার একই সাথে পাশাপাশি অবস্থিত ব্লকে অনুমোদন ও ওভারল্যাপ লক করতে চাওয়া। | জ্যাঙ্গো ওআরএমে সুনির্দিষ্ট deterministic row ordering (`ORDER BY id ASC FOR UPDATE NOWAIT`) এবং তিনবার স্বয়ংক্রিয় এক্সপোনেনশিয়াল ব্যাকঅফ রিট্রাই। |
| **Redis Channel Layer Saturation** | `redis_connected_clients` স্পাইক এবং মেমরি ব্যবহার > ৮০% | ড্যাফনি ওয়েবসকেট ক্লাস্টারে প্রতি সেকেন্ডে ১০,০০০ ফ্রেম ফ্যানআউট চলাকালীন বাফার উপচে পড়া। | Redis 7 ক্লাস্টারে `maxmemory-policy volatile-lru` নির্ধারণ এবং ইনভ্যালিডেশন ইভেন্ট ব্যাচিং (Batching window: 50ms)। |
| **Celery Queue Backlog** | `celery_queue_length{queue="high"}` > ৫০০ আইটেম | কনফ্লিক্ট সুইপ ও লাইভ ট্র্যাকিং টাস্ক জমা হয়ে যাওয়া। | Celery HPA (Horizontal Pod Autoscaler) সক্রিয় করা; ওয়ার্কার সংখ্যা ৪ থেকে বৃদ্ধি করে ১২-তে উন্নীতকরণ। |

---

## 4. Post-Stress Health Check & Recovery Runbook (স্ট্রেস-পরবর্তী স্বাস্থ্য পরীক্ষা)

লোড টেস্টিং সম্পন্ন হওয়ার পর ৫ মিনিটের মধ্যে সিস্টেম স্বয়ংক্রিয়ভাবে স্বাভাবিক অবস্থায় ফেরে কিনা তা যাচাই করতে নিচের কমান্ডগুলো নির্বাহ করা হয়:

```bash
# 1. Check PostgreSQL active connections and lock wait counts
docker exec -it railway_postgres psql -U postgres -d railway_block_db -c "
SELECT count(*), state FROM pg_stat_activity GROUP BY state;
SELECT count(*) AS active_locks FROM pg_locks WHERE NOT granted;
"

# 2. Verify Redis memory usage and channel latency
docker exec -it railway_redis redis-cli info memory | grep used_memory_human

# 3. Inspect Celery queue backlog status
docker exec -it railway_backend celery -A config inspect active
```
