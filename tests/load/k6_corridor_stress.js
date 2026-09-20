/**
 * k6 Production Load & Stress Test Suite (TSK-P4-03-BE / TSK-P4-006).
 * Authoritative reference: docs/03-service-blueprints/07-analytics.md & docs/06-testing-qa/02-load-test-strategy.md
 * Simulates up to 1,000 Concurrent Virtual Users (VUs) against RailBlock AI platform.
 * 
 * Execution:
 *   docker run --rm --network railway-project-for-sih_railway_network -e BASE_URL=http://railway_backend:8000 -v "c:\work pase\Railway-Project-for-SIH\tests\load:/tests" grafana/k6 run /tests/k6_corridor_stress.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Custom Metrics
const failureRate = new Rate('custom_failure_rate');
const apiResponseTime = new Trend('api_response_time_ms');
const totalRequests = new Counter('total_requests_executed');

const targetVUs = Number(__ENV.TARGET_VUS || 1000);
const isSmoke = __ENV.SMOKE === 'true';

export const options = isSmoke ? {
  vus: 20,
  duration: '10s',
  thresholds: {
    http_req_duration: ['p(95)<400', 'p(99)<800'],
    http_req_failed: ['rate<0.01'],
    custom_failure_rate: ['rate<0.01'],
  },
} : {
  scenarios: {
    corridor_peak_stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: Math.min(200, targetVUs) },   // Warm up to 200 users
        { duration: '15s', target: Math.min(500, targetVUs) },   // Ramp up to 500 users
        { duration: '20s', target: targetVUs },                  // Peak load: 1,000 concurrent VUs
        { duration: '15s', target: targetVUs },                  // Sustained peak load at 1,000 VUs
        { duration: '10s', target: 0 },                          // Graceful ramp-down
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: {
    // SLA Guarantees: <1% failure rate under 1,000 concurrent VUs peak stress
    http_req_duration: ['p(95)<12000'],
    http_req_failed: ['rate<0.01'],
    custom_failure_rate: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';

export function setup() {
  const loginUrl = `${BASE_URL}/api/v1/auth/login/`;
  const payload = JSON.stringify({
    username: 'coa_delhi_chief',
    password: 'railway@123',
  });
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Host': 'localhost:8000',
    },
  };

  const res = http.post(loginUrl, payload, params);
  let token = null;
  if (res.status === 200) {
    try {
      const body = JSON.parse(res.body);
      token = body.data ? body.data.access_token : (body.access || null);
    } catch (e) {
      console.warn('Failed to parse login response JSON');
    }
  } else {
    console.warn(`Login status ${res.status}: ${res.body}`);
  }

  return { token: token };
}

export default function (data) {
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Host': 'localhost:8000',
  };

  if (data && data.token) {
    headers['Authorization'] = `Bearer ${data.token}`;
  }

  // Scenario 1: Executive Analytics Dashboard KPI Summary (FUNC-ANA-001)
  {
    const res = http.get(`${BASE_URL}/api/v1/analytics/dashboard/summary/?corridor=NDLS-CNB&range=7d`, { headers });
    const success = check(res, {
      'analytics summary status is 200': (r) => r.status === 200,
    });
    failureRate.add(!success);
    apiResponseTime.add(res.timings.duration);
    totalRequests.add(1);
  }

  sleep(0.1);

  // Scenario 2: Multi-Corridor Performance Matrix
  {
    const res = http.get(`${BASE_URL}/api/v1/analytics/corridors/comparison/`, { headers });
    const success = check(res, {
      'corridor comparison status 200': (r) => r.status === 200,
    });
    failureRate.add(!success);
    totalRequests.add(1);
  }

  sleep(0.1);

  // Scenario 3: Live Trains Telemetry Stream (SVC-TRN)
  {
    const res = http.get(`${BASE_URL}/api/v1/trains/live/`, { headers });
    const success = check(res, {
      'trains feed status 200': (r) => r.status === 200,
    });
    failureRate.add(!success);
    totalRequests.add(1);
  }

  sleep(0.1);

  // Scenario 4: Real-Time Unread Alarms & Notifications Poll (SVC-NOTIF)
  {
    const res = http.get(`${BASE_URL}/api/v1/notifications/unread-count/`, { headers });
    const success = check(res, {
      'notifications unread-count 200': (r) => r.status === 200,
    });
    failureRate.add(!success);
    totalRequests.add(1);
  }

  sleep(0.1);

  // Scenario 5: High-Speed Health Status Check (FUNC-SYS-001)
  {
    const res = http.get(`${BASE_URL}/api/v1/health/`, { headers });
    const success = check(res, {
      'health check 200 OK': (r) => r.status === 200,
    });
    failureRate.add(!success);
    totalRequests.add(1);
  }

  sleep(0.2);
}
