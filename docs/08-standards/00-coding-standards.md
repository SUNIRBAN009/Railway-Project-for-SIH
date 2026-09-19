# 00-coding-standards.md

> **File Sequence:** Track 08 / Standards  
> **Directory:** `08-standards/`  
> **Previous Document:** [07-roadmap/02-rollback-plan.md](../07-roadmap/02-rollback-plan.md)  
> **Next Document:** [08-standards/01-api-standards.md](01-api-standards.md)  
> **Context:** Authoritative software engineering, coding conventions, architectural boundaries, and automated linting standards for Python, TypeScript, and SQL.

---

# Enterprise Coding Standards & Architecture Rules

---

## 1. Universal Naming Conventions

| Language / Layer | Identifier Type | Case Convention | Example |
|---|---|---|---|
| **Python (Django)** | File / Module | `snake_case.py` | `conflict_detector.py`, `serializers.py` |
| **Python (Django)** | Class Names | `PascalCase` | `BlockProposalCreateView`, `CorridorService` |
| **Python (Django)** | Functions / Methods | `snake_case()` | `evaluate_conflicts()`, `get_corridor_bounds()` |
| **Python (Django)** | Constants / Enums | `UPPER_SNAKE_CASE` | `MAX_BLOCK_DURATION_MINUTES = 480` |
| **TypeScript (React)**| File Names (Component)| `PascalCase.tsx` | `CorridorMap.tsx`, `BlockScheduleTimeline.tsx` |
| **TypeScript (React)**| File Names (Hook/Util)| `camelCase.ts` | `useCorridorSocket.ts`, `formatKm.ts` |
| **TypeScript (React)**| Interface / Type | `PascalCase` | `BlockDetailDTO`, `UserContextState` |
| **MySQL 8.0** | Table Names | `plural_snake_case`| `blocks`, `corridors`, `maintenance_equipment` |
| **MySQL 8.0** | Column Names | `snake_case` | `scheduled_start_time`, `is_electrified` |
| **MySQL 8.0** | Foreign Key Indexes | `fk_[source]_[target]`| `fk_blocks_corridor` |
| **MySQL 8.0** | Unique Constraints | `uq_[table]_[cols]` | `uq_users_employee_id` |

---

## 2. Directory & App Architecture Standard

Every Django bounded context app must strictly adhere to the following file layout:

```
apps/[bounded_context]/
├── __init__.py
├── apps.py               # App configuration with domain label
├── models.py             # Authoritative MySQL 8.0 InnoDB models
├── views.py              # DRF APIView / ViewSet HTTP controllers
├── serializers.py        # Request validation and Response DTO schemas
├── urls.py               # Local route definitions mounted to /api/v1/
├── services/             # Pure business logic and domain services (No HTTP logic)
│   ├── __init__.py
│   └── domain_engine.py
├── tasks.py              # Celery background tasks and scheduled worker handlers
└── tests/                # Unit and integration test suites
    ├── __init__.py
    ├── test_models.py
    ├── test_views.py
    └── test_tasks.py
```

---

## 3. Automated Linting & Static Analysis Configuration

### Python (Ruff & Black Configuration - `pyproject.toml`)
```toml
[tool.ruff]
line-length = 100
target-version = "py311"
select = ["E", "F", "W", "I", "B", "UP", "N"]
ignore = ["E501"]

[tool.ruff.isort]
known-first-party = ["apps", "railway_sih"]
combine-as = true

[tool.pytest.ini_options]
DJANGO_SETTINGS_MODULE = "railway_sih.settings"
python_files = ["tests.py", "test_*.py", "*_tests.py"]
addopts = "--strict-markers --no-migrations"
```

### TypeScript & React (ESLint & Prettier)
```json
{
  "extends": [
    "next/core-web-vitals",
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended"
  ],
  "rules": {
    "no-console": ["warn", { "allow": ["warn", "error"] }],
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/explicit-function-return-type": "off"
  }
}
```
