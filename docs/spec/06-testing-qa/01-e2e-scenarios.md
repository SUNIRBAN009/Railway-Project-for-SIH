# 01-e2e-scenarios.md

> **File Order:** 34/45  
> **Previous File:** `06-testing-qa/00-test-plan.md`  
> **Next File:** `06-testing-qa/02-load-test-strategy.md`  

---

## E2E Manual Test Script

To be executed by a team member before the final hackathon submission. Open two browser windows (one for JE, one for COA).

---

### Scenario 1: The Happy Path (No Conflicts)

**Objective:** Verify a basic block request flows from creation to approval and appears on the map.

1. **[JE Window]** Log in as `eng_je_01` (Engineering Junior Engineer).
2. **[JE Window]** Navigate to "Request Block".
3. **[JE Window]** Select Section `HWH-KGP`, KM `10` to `15`. 
4. **[JE Window]** Set time for tomorrow, duration 2 hours. Submit.
5. **[Verify]** Toast appears: "Block requested successfully."
6. **[COA Window]** Log in as `coa_admin`.
7. **[COA Window]** Observe the top navigation bar—the bell icon should increment (via WebSocket).
8. **[COA Window]** Open Pending Blocks table. Locate the new request.
9. **[COA Window]** Click "Approve".
10. **[Verify]** Toast appears: "Block Approved."
11. **[COA Window]** Navigate to Network Map.
12. **[Verify]** A yellow highlighted line appears between KM 10 and 15 on the HWH-KGP section.

---

### Scenario 2: Conflict Detection & AI Resolution

**Objective:** Verify the system prevents double-booking and that the AI provides a sane recommendation.

1. **[Data Prep]** Ensure Scenario 1 is completed (an approved block exists for tomorrow on HWH-KGP).
2. **[JE Window]** Log in as `trd_je_01` (Traction Distribution JE).
3. **[JE Window]** Attempt to request a block on `HWH-KGP`, KM `12` to `18` for the *same time* tomorrow.
4. **[Verify]** UI prevents submission and shows Error: "Conflict detected with existing Block ID XXX".
5. **[JE Window]** Bypass UI check by clicking "Submit as Override/Conflict Request".
6. **[COA Window]** Log in as `coa_admin`.
7. **[COA Window]** Go to Pending Blocks. The new TRD block should be highlighted in red, indicating a conflict.
8. **[COA Window]** Click the "Resolve via AI" sparkler icon.
9. **[Verify]** A modal appears with a loading spinner. After ~3 seconds, it displays an explanation (in English and Bengali) and a recommended action (e.g., "Reject TRD Block, suggest rescheduling").

---

### Scenario 3: The Emergency Protocol

**Objective:** Verify WebSockets and SMS dispatch instantly when an emergency is declared.

1. **[COA Window]** Be logged into the dashboard on the Network Map view.
2. **[JE Window]** Log in as `snt_je_01` (Signal & Telecom JE).
3. **[JE Window]** Click the red "EMERGENCY BLOCK" button.
4. **[JE Window]** Select Section `SDAH-KLYM`, upload a dummy photo, and submit.
5. **[Verify - JE]** Screen flashes red. Block is instantly marked ACTIVE.
6. **[Verify - COA]** *Without refreshing the page*, the COA screen flashes red, a siren sound plays, and the map instantly highlights the section in blinking red.
7. **[Verify - Backend]** Check the terminal running Celery workers. You should see logs confirming Twilio SMS API was called to alert the crew.
