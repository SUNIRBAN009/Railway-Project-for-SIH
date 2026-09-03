# 02-load-test-strategy.md

> **File Order:** 35/45  
> **Previous File:** `06-testing-qa/01-e2e-scenarios.md`  
> **Next File:** `06-testing-qa/03-data-seeding.md`  

---

## Load & Stress Testing

While we do not expect thousands of concurrent users during a hackathon demo, the system is designed to simulate a real-world zone (e.g., Eastern Railway) which processes hundreds of events per minute. We must prove the architecture *can* scale.

### 1. Bottleneck Identification

Before testing, we identify the known architectural bottlenecks:
1. **Gemini API Limits:** Free tier allows ~15 RPM (Requests Per Minute). If 20 conflicts happen simultaneously, the API will reject requests.
2. **SQLite Quadstore Locks:** The Semantic Ontology graph can only be written to by one thread at a time.
3. **WebSocket Fan-out:** Broadcasting an emergency to 1,000 connected clients simultaneously stresses the Redis channel layer.

### 2. Mitigation Strategies (Tested)

We test the mitigations designed in Phase 2:
- **Mitigation 1 (Celery Queues):** We run a script to generate 50 simultaneous conflict requests. We verify that Celery queues them in the `ai_tasks` queue (concurrency=2) and processes them slowly over 3 minutes, rather than crashing the Django server.
- **Mitigation 2 (Throttling):** We run a script to hit the login endpoint 50 times in 10 seconds. We verify DRF returns `HTTP 429 Too Many Requests`.

### 3. Artillery Load Test Script

If time permits, we will use `Artillery.io` (a Node.js load testing tool) to simulate 100 JEs logging in and requesting blocks over 60 seconds.

```yaml
# load_test.yml
config:
  target: "https://staging-rly-ai.up.railway.app"
  phases:
    - duration: 60
      arrivalRate: 5  # 5 new users per second
      name: "Sustained load"
scenarios:
  - name: "Login and View Dashboard"
    flow:
      - post:
          url: "/api/v1/auth/login/"
          json:
            username: "test_je"
            password: "password123"
          capture:
            - json: "$.access"
              as: "token"
      - get:
          url: "/api/v1/blocks/pending/"
          headers:
            Authorization: "Bearer {{ token }}"
```
