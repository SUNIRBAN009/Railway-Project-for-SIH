# 00-master-checklist.md

> **File Order:** 43/45  
> **Previous File:** `08-standards/02-ui-ux-design-system.md`  
> **Next File:** None. (End of Specifications)  

---

## 🚀 "T-Minus 2 Hours" Hackathon Submission Checklist

Use this checklist precisely 2 hours before the final hackathon submission/presentation deadline to ensure the project is in a perfect, deployable state.

### 1. Code Freeze
- [ ] Announce Code Freeze to the team. No new features, only bug fixes.
- [ ] Ensure all local branches (`feat/*`, `fix/*`) are merged into `main`.
- [ ] Confirm the GitHub Action CI Pipeline passed on the latest `main` commit.

### 2. Infrastructure Verification (Railway)
- [ ] Check Railway Dashboard: Are the DB and Redis plugins green?
- [ ] Check Railway Dashboard: Is the `backend` container running without restart loops?
- [ ] Check Railway Dashboard: Is the `celery_worker` container running?
- [ ] Check Railway Dashboard: Is the `frontend` container serving the Vite build?

### 3. Environment Variables
- [ ] Backend: `GEMINI_API_KEY` is present and active (verify billing).
- [ ] Backend: `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` are correct.
- [ ] Frontend: `VITE_MAPBOX_TOKEN` is present.

### 4. Database Seeding (The Demo Reset)
- [ ] Connect to the Railway PostgreSQL instance using CLI or DBeaver.
- [ ] Verify the table schema exists.
- [ ] Run `python manage.py runscript seed_core` in the Railway environment (or locally connected to the remote DB).
- [ ] Verify the `accounts_user` table has the `coa_admin`, `eng_je_01`, `trd_je_01`, and `snt_je_01` accounts.
- [ ] Verify there is exactly 1 Approved Block on HWH-KGP for tomorrow to populate the initial map.

### 5. Final E2E Run
- [ ] Run Scenario 1 from `01-e2e-scenarios.md` (Happy Path).
- [ ] Run Scenario 2 from `01-e2e-scenarios.md` (AI Conflict). *Crucial: Verify Gemini API responds in <5 seconds.*
- [ ] Run Scenario 3 from `01-e2e-scenarios.md` (Emergency). *Crucial: Verify the physical SMS reaches the team lead's phone.*

### 6. Presentation Readiness
- [ ] Laptops plugged into power.
- [ ] Presentation slide deck open.
- [ ] Two browser windows ready (one logged in as JE, one logged in as COA).
- [ ] Disable desktop notifications / Slack on presenting laptop.

---
**End of Blueprint.**
