# 04-bug-log-template.md

> **File Order:** 30/45  
> **Previous File:** `05-deep-dive-logs/03-state-management.md`  
> **Next File:** `05-deep-dive-logs/05-contracts-registry.md`  

---

## QA & Hackathon Bug Logging

During the rapid development of the MVP, bugs will occur. To ensure they are tracked and fixed efficiently, all issues must be logged using the following markdown template.

---

### Bug Log Template

Copy and paste this block when reporting an issue in the team Slack or GitHub Issues.

```markdown
### Bug Report

**Date/Time:** YYYY-MM-DD HH:MM
**Reported By:** [Your Name]
**Component:** [Frontend / Backend / AI / DB]
**Severity:** [CRITICAL / HIGH / LOW]

**Description:**
What went wrong? (e.g., "Clicking approve block on COA dashboard crashes the UI.")

**Steps to Reproduce:**
1. Login as COA (Admin).
2. Go to pending blocks.
3. Click 'Approve' on block ID `BLK-001`.
4. Result: White screen.

**Expected Behavior:**
Block status changes to approved, toast notification appears, block moves to active map.

**Error Logs:**
*(Paste Frontend Console Error or Backend Terminal Traceback here)*
```json
{
  "error": "TypeError: Cannot read properties of undefined (reading 'status')"
}
```

**Request ID / Context:** 
*(If applicable, paste the `X-Request-ID` from the network tab)*
```
