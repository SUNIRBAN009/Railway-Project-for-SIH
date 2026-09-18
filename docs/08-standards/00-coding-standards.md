# 00-coding-standards.md

> **ফাইল ক্রম:** ৫৪/৫৯  
> **ডিরেক্টরি:** `08-standards/`  
> **সার্ভিস স্কোপ:** Authoritative Software Engineering Guidelines, Coding Conventions & PostgreSQL/PostGIS DDL Rules  
> **পূর্ববর্তী ফাইল:** [07-roadmap/03-frontend-roadmap.md](file:///c:/work%20pase/Railway-Project-for-SIH/docs/07-roadmap/03-frontend-roadmap.md) (Frontend Development Roadmap & UI Architecture)  
> **পরবর্তী ফাইল:** [08-standards/01-api-standards.md](file:///c:/work%20pase/Railway-Project-for-SIH/docs/08-standards/01-api-standards.md) (REST & WebSocket API Design Standards)  
> **সংযোগ ও উদ্দেশ্য:** এই ফাইলে পাইথন (Django), টাইপস্ক্রিপ্ট (React), এবং PostgreSQL 15.6 + PostGIS 3.3 ডেটাবেসের ক্যানোনিকাল নামকরণ কনভেনশন, ডোমেন-ড্রিভেন কোডবেস ডিরেক্টরি কাঠামো এবং স্বয়ংক্রিয় লিন্টিং রুলস লিপিবদ্ধ করা হয়েছে।

---

# Enterprise Coding Standards & Architecture Rules (সফটওয়্যার ইঞ্জিনিয়ারিং ও কোডিং মানদণ্ড)

## 1. Universal Naming Conventions (সার্বজনীন নামকরণ কনভেনশন)

| ভাষা / স্তর (Layer) | আইডেন্টিফায়ারের ধরন | কেস কনভেনশন | প্রমিত উদাহরণ (Canonical Example) |
|---|---|---|---|
| **Python (Django)** | File / Module | `snake_case.py` | `conflict_detector.py`, `serializers.py`, `tasks.py` |
| **Python (Django)** | Class Names | `PascalCase` | `BlockProposalCreateView`, `CorridorSpatialService` |
| **Python (Django)** | Functions / Methods | `snake_case()` | `evaluate_conflicts()`, `normalize_chainage()` |
| **Python (Django)** | Constants / Enums | `UPPER_SNAKE_CASE` | `MAX_BLOCK_DURATION_MINUTES = 480`, `DEFAULT_SRID = 4326` |
| **TypeScript (React)**| File Names (Components)| `PascalCase.tsx` | `RailMap.tsx`, `BlockTimeline.tsx`, `EmergencyModal.tsx` |
| **TypeScript (React)**| File Names (Hooks/Utils)| `camelCase.ts` | `useCorridorSocket.ts`, `normalizeKm.ts`, `exportPdf.ts` |
| **TypeScript (React)**| Interfaces / Types | `PascalCase` | `BlockDetailDTO`, `LiveTrainStatus`, `SafetyAttestation` |
| **PostgreSQL 15.6** | Table Names | `plural_snake_case`| `blocks`, `railway_corridors`, `unified_assets` |
| **PostgreSQL 15.6** | Column Names | `snake_case` | `scheduled_start_time`, `is_electrified`, `digital_token` |
| **PostGIS 3.3** | Spatial Geometry Columns| `snake_case` | `track_geometry`, `coordinates`, `safety_buffer_geom` |
| **PostGIS 3.3** | Spatial GiST Indexes | `idx_[table]_[col]_gist`| `idx_corridors_geom_gist`, `idx_trains_coords_gist` |
| **PostgreSQL 15.6** | Foreign Keys & Unique | `fk_[source]_[target]` | `fk_blocks_corridor`, `uq_users_employee_id` |

---

## 2. Directory & App Architecture Standard (অ্যাপ ডিরেক্টরি কাঠামো)

প্ল্যাটফর্মের ৮টি ডোমেন বাউন্ডেড কনটেক্সটের প্রতিটিতে কঠোরভাবে নিচের ফাইল লেআউট মেনে কোড বিন্যস্ত থাকবে:

```
apps/[bounded_context]/
├── __init__.py
├── apps.py               # জ্যাঙ্গো অ্যাপ কনফিগারেশন ও ডোমেন মেটাডেটা
├── models.py             # PostgreSQL 15.6 + PostGIS 3.3 অথরিটেটিভ মডেলস
├── views.py              # DRF APIView / ViewSet এইচটিটিপি কন্ট্রোলারস (Zero Business Logic)
├── serializers.py        # Pydantic v2 / DRF রিকোয়েস্ট ভ্যালিডেশন ও DTO স্কিমা
├── urls.py               # লোকাল রাউট ম্যাপিং (মাউন্টেড: /api/v1/[domain]/)
├── services/             # বিশুদ্ধ ব্যবসায়িক যুক্তি ও গাণিতিক অ্যালগরিদম (No HTTP Logic)
│   ├── __init__.py
│   ├── deconfliction_engine.py
│   └── normalizer_service.py
├── tasks.py              # Celery অ্যাসিনক্রোনাস ব্যাকগ্রাউন্ড টাস্ক ও শিডিউলড জবস
└── tests/                # স্বয়ংক্রিয় Pytest ইউনিট ও ইন্টিগ্রেশন টেস্ট স্যুইট
    ├── __init__.py
    ├── test_models.py
    ├── test_services.py
    ├── test_views.py
    └── test_tasks.py
```

---

## 3. Automated Linting & Static Analysis Configuration (স্বয়ংক্রিয় লিন্টিং কনফিগারেশন)

### ৩.১ Python (Ruff, Black & Pytest - `pyproject.toml`)
```toml
[tool.ruff]
line-length = 100
target-version = "py311"
select = ["E", "F", "W", "I", "B", "UP", "N", "ASYNC"]
ignore = ["E501"]

[tool.ruff.isort]
known-first-party = ["apps", "config"]
combine-as = true

[tool.pytest.ini_options]
DJANGO_SETTINGS_MODULE = "config.settings.test"
python_files = ["tests.py", "test_*.py", "*_tests.py"]
addopts = "--strict-markers --no-migrations --cov=apps --cov-report=term-missing"
markers = [
    "spatial: tests requiring real PostGIS 3.3 database queries",
    "unit: fast in-memory mathematical logic tests",
    "celery: asynchronous worker task execution tests",
]
```

### ৩.২ TypeScript & React (ESLint, Prettier & TypeScript 5.3)
```json
{
  "root": true,
  "parser": "@typescript-eslint/parser",
  "plugins": ["@typescript-eslint", "react-hooks"],
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react-hooks/recommended"
  ],
  "rules": {
    "no-console": ["warn", { "allow": ["warn", "error"] }],
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/explicit-function-return-type": "off",
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn"
  }
}
```

---

## 4. Architectural Separation of Concerns (দায়িত্বের বিভাজন নীতি)

1. **ভিউ বনাম সার্ভিস লেয়ার (Views vs Services):** `views.py`-এর কাজ শুধুমাত্র HTTP রিকোয়েস্ট গ্রহণ করা, সিরিয়ালাইজারের মাধ্যমে টাইপ যাচাই করা এবং সার্ভিস লেয়ারকে কল করা। কোনো ধরনের ডোমেন অ্যালগরিদম (যেমন: সুইপ-লাইন বা চেইনেজ ইন্টারপোলেশন) ভিউ মেথডে লেখা কঠোরভাবে নিষিদ্ধ।
2. **PostGIS স্প্যাশিয়াল কোয়েরি আইসোলেশন:** জটিল স্প্যাশিয়াল জিওমেট্রি অপারেশনগুলো মডেল ম্যানেজার (`CustomQuerySet`) অথবা ডেডিকেটেড সার্ভিস ক্লাসে সীমাবদ্ধ থাকবে।
3. **লাইফ-সেফটি মিউটেশন ট্রানজাকশন:** ব্লক অনুমোদন ও টোকেন জেনারেশনের প্রতিটি ডাটাবেস অপারেশন `transaction.atomic()` ব্লকে আবৃত থাকবে, যা ব্যর্থতায় স্বয়ংক্রিয়ভাবে রোলব্যাক হয়।
