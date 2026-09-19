# 02-commit-standards.md

> **File Sequence:** Track 08 / Standards  
> **Previous Document:** [08-standards/01-api-standards.md](01-api-standards.md)  
> **Next Document:** [08-standards/03-documentation-standards.md](03-documentation-standards.md)  
> **Context:** Git version control guidelines, Conventional Commits specification, branching models, and Pull Request safety review templates.

---

# Version Control, Commit Conventions & PR Review Standards

---

## 1. Conventional Commits Specification

All commit messages must follow the [Conventional Commits 1.0.0](https://www.conventionalcommits.org/) format:

$$\mathbf{<type>[optional\ scope]:\ <description>}$$

```
feat(blocks): implement sweep-line interval conflict algorithm
fix(accounts): resolve token blacklist key expiration in Redis
perf(spatial): add MySQL spatial index on corridors geometry
docs(api): update OpenAPI 3.0 YAML spec for trains service
test(ontology): add unit tests for HermiT electric train reasoning
refactor(departments): extract gang reservation into domain service
chore(deps): bump django from 5.0.2 to 5.0.3
```

### Approved Commit Types
- **`feat`**: Introduces a new capability to the platform.
- **`fix`**: Patches an operational bug or calculation defect.
- **`perf`**: Code change that improves latency, memory, or database query performance.
- **`docs`**: Documentation changes only (e.g. markdown blueprints, API schemas).
- **`test`**: Adding missing tests or correcting existing test suites.
- **`refactor`**: Code change that neither fixes a bug nor adds a feature.
- **`chore`**: Upgrading dependencies, tooling, or build scripts.

---

## 2. Git Branching Strategy (Trunk-Based Development)

- **`main`**: Always deployable, protected branch. All releases to staging/production are tagged from `main`.
- **Feature Branches**: Short-lived branches created from `main`, living no longer than 48 hours:
  - Format: `feat/FUNC-BLK-001-proposal-submission`
  - Format: `fix/SEC-004-jwt-cookie-samesite`
- **Merge Requirements:** Minimum 1 approving peer review; all automated CI checks (Ruff, ESLint, Pytest, Schemathesis) must pass green.

---

## 3. Pull Request Safety Review Template (`.github/pull_request_template.md`)

```markdown
## Summary of Changes
[Describe what this PR introduces and which functional requirement or bug it resolves.]

## Related Issue / Specification Link
- Function ID: `FUNC-___-___`
- Documentation Reference: `docs/___/___`

## Safety & Database Impact Checklist
- [ ] **No Destructive DB Changes:** Schema changes follow Expand-and-Contract (no dropped columns).
- [ ] **Spatial Geometry Verified:** New spatial queries use `SRID 4326` and `ST_Intersects`.
- [ ] **Locking & Concurrency:** Mutating endpoints use optimistic locking (`version` check).
- [ ] **Performance SLA:** Query execution time tested on local MySQL 8.0 and satisfies p95 < 100ms.
- [ ] **Unit Tests Added:** Test coverage satisfies target (> 80%).
```
