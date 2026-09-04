# 04-ai-prompt-templates.md

> **File Sequence:** Track 08 / Standards  
> **Previous Document:** [08-standards/03-documentation-standards.md](03-documentation-standards.md)  
> **Next Document:** [09-execution-tracker/00-implementation-checklist.md](../09-execution-tracker/00-implementation-checklist.md)  
> **Context:** Production-ready AI Agent Prompt Templates designed to guide autonomous AI models during system implementation, refactoring, test generation, and bug fixing for the Indian Railways Block Planning Platform (PS 26027).

---

# Canonical AI Agent Prompt Templates

---

## Template 1: "Implement Service X"

```markdown
### Context Files to Read Before Starting:
1. `docs/00-master-high-level/00-architecture.md`
2. `docs/01-tech-infra/02-data-layer.md`
3. `docs/03-service-blueprints/[01-08-service-name].md`
4. `docs/04-function-maps/[01-08-service-name]-function-map.md`

### Task Instruction:
You are an expert Django 5.0 systems architect. Implement the complete bounded context application `apps.[service_name]` according to its blueprint.
1. Create `apps/[service_name]/models.py` with exact MySQL 8.0 InnoDB types, foreign keys, spatial linestrings, and indexes specified in the blueprint.
2. Implement DRF Serializers in `serializers.py` with standard JSON envelopes (`ApiResponse<T>`).
3. Implement API controllers in `views.py` enforcing RBAC permissions and optimistic locking (`version` checks).
4. Implement background Celery tasks in `tasks.py` with appropriate Redis queue routing.
5. Register routes in `urls.py` mounted under `/api/v1/[domain]/`.

### Validation Checklist:
- [ ] No placeholders or `TODO` comments.
- [ ] Uses MySQL 8.0 types (`CHAR(36)` UUIDs, Spatial `SRID 4326`).
- [ ] Errors map to `docs/05-deep-dive-logs/02-error-code-registry.md`.
- [ ] Run `python manage.py makemigrations [service_name]` and verify 0 syntax errors.
```

---

## Template 2: "Add Function Y"

```markdown
### Context Files to Read Before Starting:
1. `docs/04-function-maps/00-function-id-registry.md`
2. `docs/04-function-maps/[service]-function-map.md` (Target function `FUNC-[SVC]-[NUM]`)
3. `docs/05-deep-dive-logs/01-common-payloads-and-algorithms.md`

### Task Instruction:
Implement Function `FUNC-[SERVICE]-[NUMBER]`: [Function Name].
1. Follow the exact input and output schemas outlined in the function map.
2. Enforce transaction safety using `@transaction.atomic`.
3. If this function modifies state, emit the corresponding domain event to Redis channel `events:[domain]`.
4. Return appropriate error codes from the error registry on failure cases.

### Validation Checklist:
- [ ] Conforms to HTTP method and path in registry.
- [ ] Validates all incoming parameters.
- [ ] Dispatches cache invalidation WebSocket frame if state changed.
```

---

## Template 3: "Write Tests for Z"

```markdown
### Context Files to Read Before Starting:
1. `docs/06-testing-qa/00-test-plan.md`
2. `docs/06-testing-qa/01-e2e-scenarios.md`
3. Target source file: `apps/[service]/[module].py`

### Task Instruction:
Write a comprehensive `pytest` test suite in `apps/[service]/tests/test_[module].py`.
1. Include parameterized unit tests covering normal execution, edge cases, and boundary conditions.
2. Include negative test cases asserting exact HTTP status codes and machine error codes (`BLK-003`, `AUTH-001`, etc.).
3. Mock external services (Redis, CDAC SMS, COA API) using `pytest-mock` or `unittest.mock`.
4. Verify database assertions using `@pytest.mark.django_db`.

### Validation Checklist:
- [ ] Test coverage exceeds 85% for the target module.
- [ ] All tests execute and pass: `pytest apps/[service]/tests/`.
```

---

## Template 4: "Generate Database Migration"

```markdown
### Context Files to Read Before Starting:
1. `docs/01-tech-infra/02-data-layer.md`
2. `docs/07-roadmap/02-rollback-plan.md` (Expand-and-Contract Section)
3. Current models: `apps/[service]/models.py`

### Task Instruction:
Generate a non-destructive, backward-compatible Django database migration for `apps.[service]`.
1. Ensure all new columns are nullable or have deterministic default values.
2. Ensure spatial columns include `srid=4326`.
3. Include reverse migration operations in case rollback is triggered.

### Validation Checklist:
- [ ] Migration applies cleanly: `python manage.py migrate [service]`.
- [ ] Rollback succeeds cleanly: `python manage.py migrate [service] [previous_migration]`.
```

---

## Template 5: "Fix Production Bug ABC"

```markdown
### Context Files to Read Before Starting:
1. `docs/05-deep-dive-logs/04-bug-log-template.md`
2. `docs/05-deep-dive-logs/02-error-code-registry.md`
3. Affected stack trace and logs.

### Task Instruction:
Diagnose and patch bug [BUG_ID].
1. Reproduce the bug by writing a failing unit test in the appropriate test file.
2. Apply the minimal, surgical code modification to resolve the root cause.
3. Verify that the unit test now passes green and no regression is introduced.
4. Document the resolution in `docs/05-deep-dive-logs/04-bug-log-template.md` following the 5-Whys format.
```
