/**
 * k6 Production Load & Stress Test Suite (TSK-P4-006).
 * Authoritative reference: docs/03-service-blueprints/07-analytics.md
 * Simulates up to 1,000 Concurrent Virtual Users (VUs) against RailBlock AI platform.
 * 
 * Execution:
 *   k6 run tests/load/k6_corridor_stress.js
 *   k6 run --vus 50 --duration 30s tests/load/k6_corridor_stress.js (smoke test)
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Custom Metrics
const failureRate = new Rate('custom_failure_rate');
const apiResponseTime = new Trend('api_response_time_ms');
const blocksQueried = new Counter('total_blocks_queried');

export const options = {
  scenarios: {
    // 1,000 Virtual Users Ramp & Stress Test
    corridor_peak_stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 200 },   // Warm up to 200 users
        { duration: '1m',  target: 500 },   // Ramp up to 500 section controllers
        { duration: '2m',  target: 1000 },  // Peak load: 1,000 concurrent controllers
        { duration: '1m',  target: 1000 },  // Sustained peak load
        { duration: '30s', target: 0 },     // Graceful ramp-down
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    // SLA Guarantees (PS 26027 specifications)
    http_req_duration: ['p(95)<200', 'p(99)<500'], // 95% of queries under 200ms
    http_req_failed: ['rate<0.01'],                 // Under 1% error rate
    custom_failure_rate: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';

const HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
};

export default function () {
  // Scenario 1: Executive Analytics Dashboard KPI Summary (FUNC-ANA-001)
  {
    const res = http.get(`${BASE_URL}/api/v1/analytics/dashboard/summary/?corridor=NDLS-CNB&range=7d`, { headers: HEADERS });
    const success = check(res, {
      'analytics summary status is 200 or 401': (r) => r.status === 200 || r.status === 401,
      'response time < 250ms': (r) => r.timings.duration < 250,
    });
    failureRate.add(!success);
    apiResponseTime.add(res.timings.duration);
  }

  sleep(0.5);

  // Scenario 2: Multi-Corridor Performance Matrix
  {
    const res = http.get(`${BASE_URL}/api/v1/analytics/corridors/comparison/`, { headers: HEADERS });
    check(res, {
      'corridor comparison status OK or Auth': (r) => r.status === 200 || r.status === 401,
    });
  }

  sleep(0.3);

  // Scenario 3: Live Trains Telemetry Stream (SVC-TRN)
  {
    const res = http.get(`${BASE_URL}/api/v1/trains/live/`, { headers: HEADERS });
    check(res, {
      'trains feed status OK or Auth': (r) => r.status === 200 || r.status === 401,
    });
  }

  sleep(0.4);

  // Scenario 4: Real-Time Unread Alarms & Notifications Poll (SVC-NOTIF)
  {
    const res = http.get(`${BASE_URL}/api/v1/notifications/unread-count/`, { headers: HEADERS });
    check(res, {
      'notifications unread-count OK or Auth': (r) => r.status === 200 || r.status === 401,
    });
  }

  sleep(0.5);

  // Scenario 5: Public Home Page & Gantt Matrix
  {
    const res = http.get(`${BASE_URL}/`);
    check(res, {
      'homepage 200 OK': (r) => r.status === 200,
    });
    blocksQueried.add(1);
  }

  sleep(1);
}
