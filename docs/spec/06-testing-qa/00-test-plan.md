# 00-test-plan.md

> **File Order:** 33/45  
> **Previous File:** `05-deep-dive-logs/06-adrs-registry.md`  
> **Next File:** `06-testing-qa/01-e2e-scenarios.md`  
> **Connection:** This folder outlines how we prove the architecture designed in Phases 1-3 actually works under pressure.

---

## QA Strategy & Test Plan

For a 36-hour hackathon, QA is often neglected until the demo fails. This plan outlines a lean, high-ROI testing strategy to guarantee a flawless final presentation.

### 1. Pre-Merge Verification (CI)

Every Pull Request to the `main` branch must pass the GitHub Actions CI pipeline defined in `08-deployment.md`. 
- **Backend:** `pytest` must pass. (Targeting 60% coverage on the `blocks` app).
- **Frontend:** `npm run build` must succeed to ensure no breaking syntax errors.

### 2. Manual End-to-End (E2E) Testing

Because automated UI testing (Playwright) is time-consuming to write, we rely on a strict script of manual tests.

**Execution Cadence:**
- Run once at the end of Day 1 (Integration Checkpoint).
- Run twice on Day 2 (Pre-Demo Checkpoint).

**Scope:**
The exact step-by-step flows to be executed are documented in the next file: `01-e2e-scenarios.md`.

### 3. "Demo God" Protection (Fail-safes)

To ensure the live presentation to the judges goes smoothly, we implement the following QA rules specifically for the demo environment:

1. **Idempotent Data Seeding:** If the database gets corrupted, we must be able to run `python manage.py runscript seed_demo_data` to instantly reset the app to a known, perfect state exactly 2 minutes before the presentation. (See `03-data-seeding.md`).
2. **API Mocking Toggles:** If the venue WiFi is blocking Twilio or Gemini, we have environment variables (`MOCK_AI=True`, `MOCK_SMS=True`) that bypass the external HTTP calls and instantly return a successful dummy response so the UI flow doesn't break.
3. **Frontend Error Boundaries:** If a specific React component crashes, it must not take down the whole screen. (Implemented in `05-observability.md`).
