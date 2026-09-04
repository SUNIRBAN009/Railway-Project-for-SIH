# 02-load-test-strategy.md

> **File Sequence:** 41/45  
> **Previous Document:** [06-testing-qa/01-e2e-scenarios.md](01-e2e-scenarios.md)  
> **Next Document:** [06-testing-qa/03-data-seeding.md](03-data-seeding.md)  
> **Context:** Performance engineering, load testing targets, stress scenarios, and production-ready k6 load test scripts.

---

# Load Testing Strategy & Performance Engineering

---

## 1. Performance Targets & SLA Budgets

| Workload Category | Target Concurrency | Target Throughput | p95 Latency Target | Error Rate Threshold |
|---|:---:|:---:|:---:|:---:|
| **Read APIs (Timetable & Corridor Map)** | 1,000 Virtual Users | 1,200 RPS | < 45ms | < 0.01% |
| **Block Proposal Submission (Spatial Insert)** | 100 Virtual Users | 150 RPS | < 120ms | < 0.05% |
| **Conflict Sweep Execution (Celery Task)** | 50 Concurrent Tasks | 80 sweeps/sec | < 200ms | < 0.10% |
| **WebSocket Real-Time Dispatch** | 5,000 Concurrent Connections | 10,000 frames/sec | < 25ms in-app | < 0.01% |

---

## 2. Production k6 Load Testing Script (`tests/load/k6_corridor_stress.js`)

```javascript
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate } from 'k6/metrics';

export const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '1m', target: 100 },  // Ramp-up to 100 users
    { duration: '3m', target: 500 },  // Scale to 500 users
    { duration: '2m', target: 1000 }, // Peak stress at 1000 users
    { duration: '2m', target: 1000 }, // Hold peak
    { duration: '1m', target: 0 },    // Ramp-down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<150', 'p(99)<300'],
    'errors': ['rate<0.01'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000/api/v1';

export default function () {
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${__ENV.TEST_JWT_TOKEN || 'dummy_token'}`,
    },
  };

  group('Corridor Overview & Blocks Query', () => {
    // 1. Fetch Corridor Details
    const corridorRes = http.get(`${BASE_URL}/blocks/?corridor=NDLS-CNB&status=SANCTIONED`, params);
    const success1 = check(corridorRes, {
      'status is 200': (r) => r.status === 200,
      'response has data': (r) => JSON.parse(r.body).data !== undefined,
    });
    errorRate.add(!success1);

    // 2. Fetch Live Trains
    const trainsRes = http.get(`${BASE_URL}/trains/live/?corridor=NDLS-CNB`, params);
    const success2 = check(trainsRes, {
      'trains status is 200': (r) => r.status === 200,
    });
    errorRate.add(!success2);
  });

  sleep(1);

  group('Submit Block Proposal & Trigger Sweep', () => {
    const payload = JSON.stringify({
      corridor_id: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
      line_type: 'DOWN',
      department_code: 'ENG',
      work_type: 'TRACK_TAMPING',
      start_km: 142.500,
      end_km: 146.200,
      scheduled_start_time: new Date(Date.now() + 86400000).toISOString(),
      scheduled_end_time: new Date(Date.now() + 100800000).toISOString(),
      traction_power_cutoff_required: false,
    });

    const proposalRes = http.post(`${BASE_URL}/blocks/proposals/`, payload, params);
    const success3 = check(proposalRes, {
      'proposal created or conflict handled': (r) => r.status === 201 || r.status === 409,
    });
    errorRate.add(!success3);
  });

  sleep(2);
}
```

---

## 3. Stress Failure Criteria & Bottleneck Mitigation

1. **MySQL InnoDB Lock Wait Timeout:** If `Innodb_row_lock_waits` spikes > 10/sec, investigate long transactions in `apps.blocks.views.BlockProposalCreateView` and ensure indexes on `(corridor_id, scheduled_start_time)` are utilized.
2. **Redis Connection Pool Exhaustion:** Django Redis connection pool ceiling set to 100 connections per worker thread; monitor `connected_clients` in Redis metrics.
3. **Celery Worker Backlog:** If queue depth on `high` exceeds 500 items, auto-scale Celery worker pods from 4 to 12 replicas.
