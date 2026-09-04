# 03-data-seeding.md

> **File Sequence:** 42/45  
> **Previous Document:** [06-testing-qa/02-load-test-strategy.md](02-load-test-strategy.md)  
> **Next Document:** [07-roadmap/00-phases.md](../07-roadmap/00-phases.md)  
> **Context:** Master Test Data Generation & Realistic Indian Railways Corridor Seeding Command (`seed_railway_demo.py`).

---

# Test Data Seeding Strategy & Master Corridor Dataset

---

## 1. Ground Truth Target Corridor: New Delhi – Kanpur Central (NDLS – CNB)

To ensure realistic testing, load profiling, and live judge demonstrations during SIH, the platform seeds a high-fidelity replica of the **North Central / Northern Railway Delhi-Kanpur Trunk Route**:
- **Total Corridor Length:** 440.000 KM.
- **Electrification:** 25 kV AC 50 Hz Overhead Catenary (TRD).
- **Signaling:** Automatic Block Signaling with 4-aspect color lights.
- **Key Interlocking Stations:**
  1. `NDLS` (New Delhi - KM 0.000)
  2. `GZB` (Ghaziabad Junction - KM 24.500)
  3. `ALJN` (Aligarh Junction - KM 126.100)
  4. `TDL` (Tundla Junction - KM 204.300)
  5. `ETW` (Etawah Junction - KM 296.800)
  6. `CNB` (Kanpur Central - KM 440.200)

---

## 2. Seed Data Catalog

| Entity Category | Records Count | Key Exemplar Entities |
|---|:---:|---|
| **Users & Roles** | 8 Users | `admin` (Admin), `controller_dli` (Chief Controller), `se_eng_aljn` (Senior Section Engineer ENG), `se_trd_tdl` (TRD Engineer), `supervisor_gang4` (Site Supervisor) |
| **Corridors & Tracks** | 1 Corridor, 4 Tracks | `NDLS-CNB-MAIN` (UP Line, DOWN Line, Loop Line 1, Loop Line 2) |
| **Trains & Timetables** | 12 Trains | 12424 (DBRG Rajdhani), 12004 (Lucknow Shatabdi), 22436 (Vande Bharat Express), 12418 (Prayagraj Express), 2 BCN Freight Rakes |
| **Department Gangs** | 6 Gangs | ENG Gang 04 (Aligarh), ENG Gang 11 (Tundla), TRD Tower Wagon Crew 02, S&T Relay Gang 01 |
| **Heavy Machinery** | 5 Machines | CSM-981 (Track Tamper), BCM-402 (Ballast Cleaner), TW-108 (OHE Tower Wagon), USFD-04 (Ultrasonic Tester) |
| **Pre-Configured Blocks** | 6 Blocks | 2 Active Blocks, 2 Pending Approval, 1 Co-Possession Block, 1 Completed Block |

---

## 3. Master Management Command (`apps/core/management/commands/seed_railway_demo.py`)

```python
import uuid
from datetime import datetime, timedelta
from django.core.management.base import BaseCommand
from django.db import transaction
from django.contrib.auth import get_user_model
from apps.accounts.models import User
from apps.blocks.models import Corridor, Block
from apps.departments.models import Department, Gang, MaintenanceEquipment
from apps.trains.models import Train, TrainSchedule

class Command(BaseCommand):
    help = "Seeds high-fidelity Indian Railways Delhi-Kanpur corridor operational data."

    @transaction.atomic
    def handle(self, *args, **options):
        self.stdout.write("Initializing Railway Demo Data Seeding...")

        # 1. Seed Core Departments
        eng_dept, _ = Department.objects.get_or_create(
            code="ENG", defaults={"name": "Civil Engineering (P-Way)", "escalation_phone": "+911123340001"}
        )
        trd_dept, _ = Department.objects.get_or_create(
            code="TRD", defaults={"name": "Traction Distribution (Electrical)", "escalation_phone": "+911123340002"}
        )
        snt_dept, _ = Department.objects.get_or_create(
            code="SNT", defaults={"name": "Signalling & Telecom", "escalation_phone": "+911123340003"}
        )

        # 2. Seed Administrative & Operational Users
        controller, _ = User.objects.get_or_create(
            username="controller_dli",
            defaults={
                "employee_id": "NR-OPT-1001",
                "email": "chief.controller@nr.railnet.gov.in",
                "role": "CHIEF_CONTROLLER",
                "department_code": "OPERATIONS",
                "division_code": "DLI",
                "phone_number": "+919810012345"
            }
        )
        controller.set_password("Railway@2026")
        controller.save()

        # 3. Seed Corridor Geometry (SRID 4326)
        corridor, _ = Corridor.objects.get_or_create(
            code="NDLS-CNB-MAIN",
            defaults={
                "name": "New Delhi - Kanpur Central Trunk Route",
                "zone": "NCR",
                "division": "PRYJ",
                "start_km": 0.000,
                "end_km": 440.200,
                "track_geometry": "SRID=4326;LINESTRING(77.2167 28.6139, 77.4538 28.6692, 78.0880 27.8974, 80.3319 26.4499)",
                "is_electrified": True,
                "max_permissible_speed_kmh": 130
            }
        )

        # 4. Seed Prestige Express Trains
        rajdhani, _ = Train.objects.get_or_create(
            train_number="12424",
            defaults={
                "train_name": "NDLS-DBRG DIBBRUGARH RAJDHANI",
                "train_type": "PRESTIGE_SUPERFAST",
                "priority_rank": 1,
                "source_station": "NDLS",
                "destination_station": "DBRG",
                "max_speed_kmh": 130
            }
        )

        self.stdout.write(self.style.SUCCESS("Successfully seeded Indian Railways demo dataset!"))
```
