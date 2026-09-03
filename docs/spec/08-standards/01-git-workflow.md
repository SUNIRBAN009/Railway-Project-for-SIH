# 01-git-workflow.md

> **File Order:** 41/45  
> **Previous File:** `08-standards/00-coding-guidelines.md`  
> **Next File:** `08-standards/02-ui-ux-design-system.md`  

---

## The "Hackathon Speed" Git Workflow

Standard GitFlow (with `develop`, `release`, `feature` branches) is too slow for a 36-hour hackathon. We use a modified Trunk-Based Development approach.

### 1. The Branches

- `main`: The only branch that triggers CI/CD to Railway. Must always be deployable.
- `feat/*`: Feature branches (e.g., `feat/auth`, `feat/map`).
- `fix/*`: Bug fixes (e.g., `fix/celery-timeout`).

### 2. Workflow Rules

1. **Never commit directly to `main`.** Always create a branch.
2. **Commit often.** Do not wait 6 hours to commit. Commit every time a function works.
3. **No squashing required.** Ugly commit history is fine. Missing code is fatal.
4. **Fast PRs:** When a feature works locally, open a PR to `main`. Another team member must approve it within 5 minutes. (Do not spend 30 minutes doing a deep code review).

### 3. Handling Merge Conflicts (The Nuclear Option)

If two backend devs edit the same `services.py` file and get a massive merge conflict at hour 30:
1. Stop. Get on a quick voice call or sit next to each other.
2. Do not attempt to resolve a 500-line conflict manually in the terminal.
3. Accept the incoming changes to get a clean working tree.
4. Manually copy-paste the missing functions from the conflicting branch.

### 4. Database Migrations Rule

Django migrations are the #1 cause of Git nightmares.

**RULE:** Only one person manages the database schema at a time. 
If Dev A needs a new field on `BlockRequest`, they must:
1. Announce it to the team.
2. Make the change, run `makemigrations`, and commit.
3. Push to `main`.
4. Everyone else immediately `git pull` and runs `python manage.py migrate`.
