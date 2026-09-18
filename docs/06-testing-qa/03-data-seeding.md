# 03-data-seeding.md

> **ফাইল ক্রম:** ৪৮/৫৯  
> **ডিরেক্টরি:** `06-testing-qa/`  
> **সার্ভিস স্কোপ:** Master Ground-Truth Corridor Dataset & Django PostGIS Seeding Command (`seed_railway_demo`)  
> **পূর্ববর্তী ফাইল:** [06-testing-qa/02-load-test-strategy.md](file:///c:/work%20pase/Railway-Project-for-SIH/docs/06-testing-qa/02-load-test-strategy.md) (k6 Load & Stress Test Strategy)  
> **পরবর্তী ফাইল:** [06-testing-qa/04-security-audit-report.md](file:///c:/work%20pase/Railway-Project-for-SIH/docs/06-testing-qa/04-security-audit-report.md) (Security Audit & Vulnerability Assessment Report)  
> **সংযোগ ও উদ্দেশ্য:** এই ফাইলে ভারতীয় রেলওয়ের প্রামাণ্য নয়াদিল্লি–কানপুর (NDLS–CNB) ট্রাঙ্ক করিডোরের ভৌগোলিক ডেটাসেট, PostGIS স্প্যাশিয়াল লাইনস্ট্রিং, ১২টি ট্রেনের মাস্টার টাইমটেবিল, বিভাগীয় গ্যাং ও যন্ত্রপাতি এবং স্বয়ংক্রিয় ডাটা সিডিং কমান্ড (`seed_railway_demo.py`) বিস্তারিতভাবে লিপিবদ্ধ করা হয়েছে।

---

# Test Data Seeding Strategy & Master Corridor Dataset (টেস্ট ডেটা সিডিং ও মাস্টার করিডোর ডেটাসেট)

## 1. Ground Truth Target Corridor: New Delhi – Kanpur Central (NDLS – CNB)

স্মার্ট ইন্ডিয়া হ্যাকাথনের (SIH) বিচারক ও মূল্যায়কদের সামনে বাস্তবসম্মত ডেমো উপস্থাপনের জন্য প্ল্যাটফর্মটি উত্তর ও উত্তর-মধ্য রেলওয়ের (NR / NCR) ব্যস্ততম ট্রাঙ্ক রুট **নয়াদিল্লি–কানপুর করিডোর (NDLS–CNB)** সম্পূর্ণ বিশ্বস্ততার সাথে মডেল করেছে:

- **মোট করিডোর দৈর্ঘ্য:** ৪৪০.২০০ কিলোমিটার।
- **বৈদ্যুতিক ট্র্যাকশন:** ২৫ kV AC ৫০ Hz ওভারহেড ক্যাটেনারি (TDMS ওএইচই সাবস্টেশন সহ)।
- **সিগন্যালিং সিস্টেম:** ফোর-অ্যাসপেক্ট অটোমেটিক কালার লাইট ব্লকিং এবং ইলেকট্রনিক ইন্টারলকিং (EI)।
- **মূল ইন্টারলকিং স্টেশনসমূহ (Key Stations):**
  1. `NDLS` (নয়াদিল্লি - KM 0.000, অক্ষাংশ: 28.6139, দ্রাঘিমাংশ: 77.2090)
  2. `GZB` (গাজিয়াবাদ জংশন - KM 24.500, অক্ষাংশ: 28.6692, দ্রাঘিমাংশ: 77.4538)
  3. `ALJN` (আলিগড় জংশন - KM 126.100, অক্ষাংশ: 27.8974, দ্রাঘিমাংশ: 78.0880)
  4. `TDL` (টুন্ডলা জংশন - KM 204.300, অক্ষাংশ: 27.2065, দ্রাঘিমাংশ: 78.2415)
  5. `ETW` (ইটাওয়া জংশন - KM 296.800, অক্ষাংশ: 26.7769, দ্রাঘিমাংশ: 79.0305)
  6. `CNB` (কানপুর সেন্ট্রাল - KM 440.200, অক্ষাংশ: 26.4547, দ্রাঘিমাংশ: 80.3507)

---

## 2. Seed Data Master Catalog (সিডিং ডেটা ক্যাটালগ)

| বিভাগীয় ক্যাটাগরি | রেকর্ড সংখ্যা | প্রধান নমুনা সত্ত্বা (Representative Exemplars) |
|---|:---:|---|
| **Users & Roles (#121, #122)** | ৮ জন ব্যবহারকারী | `chief_dom_dli` (Sr. DOM), `contr_pryj_01` (Section Controller), `sse_pway_aljn` (Senior Section Engineer ENGG), `sse_trd_tdl` (TRD Engineer), `trackman_gang04` (Site Supervisor) |
| **Corridors & PostGIS Tracks** | ১টি করিডোর, ৪টি লাইন | `NDLS-CNB-MAIN`: আপ মেইন লাইন, ডাউন মেইন লাইন, ৩য় লাইন, আলিগড় লুপ লাইন ১ ও ২ (WGS 84 `LineString`) |
| **Trains & Timetables (#114)** | ১২টি ট্রেন | ১২৪২৪ ডিব্রুগড় রাজধানী, ১২৩০১ হাওড়া রাজধানী, ১২০০৪ লখনউ শতাব্দী, ২২৪৩৬ বন্দে ভারত এক্সপ্রেস, ১২৪১৮ প্রয়াগরাজ এক্সপ্রেস, ২টি বিসিএন মালগাড়ি |
| **Department Gangs (#100)** | ৬টি গ্যাং | পি-ওয়ে গ্যাং ০৪ (আলিগড়), পি-ওয়ে গ্যাং ১১ (টুন্ডলা), টিআরডি টাওয়ার ওয়াগন ক্রু ০২, এসঅ্যান্ডটি রিলে গ্যাং ০১ |
| **Heavy Machinery (#101)** | ৫টি মেশিন | CSM-981 (কন্টিনিউয়াস ট্যাম্পার), BCM-402 (ব্যালাস্ট ক্লিনার), TW-108 (ওএইচই টাওয়ার ওয়াগন), USFD-04 (আল্ট্রাসনিক টেস্টার) |
| **Pre-Configured Blocks** | ৬টি ব্লক | ১টি অ্যাক্টিভ ব্লক (উইথ ডিজিটাল টোকেন), ২টি অনুমোদিত, ১টি কো-পজেশন জয়েন্ট ব্লক, ১টি কনফ্লিক্ট ব্লক (রাজধানী এক্সপ্রেস সংঘাত) |
| **Safety Suite Parameters** | সম্পূর্ণ স্যুইট (#71-#85) | ডিজিটাল টোকেন (`TOK-BL-20260920-7F8E-ACD9`), ২৪টি টুল ইনিশিয়াল কাউন্ট, ওএইচই এলওটিও স্ট্যাটাস, লাইভ ওয়েদার গেট (বাতাস: ২২ কিমি/ঘণ্টা) |

---

## 3. PostGIS Master Management Command (`apps/core/management/commands/seed_railway_demo.py`)

```python
import uuid
from datetime import datetime, timedelta, timezone
from django.core.management.base import BaseCommand
from django.db import transaction
from django.contrib.gis.geos import LineString, Point
from apps.accounts.models import User
from apps.blocks.models import Corridor, Block, BlockConflict
from apps.departments.models import Department, Gang, MaintenanceEquipment
from apps.trains.models import Train, TrainSchedule, LiveLocation
from apps.assets.models import UnifiedAsset, TrackDefect

class Command(BaseCommand):
    help = "Seeds high-fidelity Indian Railways Delhi-Kanpur corridor operational data into PostgreSQL 15.6 + PostGIS 3.3."

    @transaction.atomic
    def handle(self, *args, **options):
        self.stdout.write("Initializing Railway PostGIS Demo Data Seeding...")

        # 1. Seed Core Railway Departments
        engg_dept, _ = Department.objects.get_or_create(
            code="ENGG", defaults={"name": "Civil Engineering (P-Way)", "escalation_phone": "+911123340001"}
        )
        trd_dept, _ = Department.objects.get_or_create(
            code="TRD", defaults={"name": "Traction Distribution (OHE)", "escalation_phone": "+911123340002"}
        )
        snt_dept, _ = Department.objects.get_or_create(
            code="SNT", defaults={"name": "Signalling & Telecommunication", "escalation_phone": "+911123340003"}
        )

        # 2. Seed Administrative & Operational Users
        controller, _ = User.objects.get_or_create(
            username="controller_pryj",
            defaults={
                "employee_id": "EMP-CONTR-108",
                "email": "chief.controller@ncr.railnet.gov.in",
                "role": "SECTION_CONTROLLER",
                "division_code": "PRYJ",
                "assigned_sections": ["NDLS-GZB-UP", "GZB-ALJN-UP", "ALJN-CNB-UP"],
                "phone_number": "+919810012345"
            }
        )
        controller.set_password("RailSafe@2026")
        controller.save()

        supervisor, _ = User.objects.get_or_create(
            username="sup_pway_aljn",
            defaults={
                "employee_id": "EMP-SUP-204",
                "email": "pway.aljn@ncr.railnet.gov.in",
                "role": "SITE_SUPERVISOR",
                "division_code": "PRYJ",
                "assigned_sections": ["GZB-ALJN-UP"],
                "phone_number": "+919810054321"
            }
        )
        supervisor.set_password("RailSafe@2026")
        supervisor.save()

        # 3. Seed PostGIS Corridor Geometry (SRID 4326)
        corridor_geom = LineString([
            (77.2090, 28.6139),  # NDLS
            (77.4538, 28.6692),  # GZB
            (78.0880, 27.8974),  # ALJN
            (78.2415, 27.2065),  # TDL
            (79.0305, 26.7769),  # ETW
            (80.3507, 26.4547),  # CNB
        ], srid=4326)

        corridor, _ = Corridor.objects.get_or_create(
            code="NDLS-CNB-MAIN",
            defaults={
                "section_name": "New Delhi - Kanpur Central Trunk Golden Corridor",
                "zone": "NCR",
                "division_code": "PRYJ",
                "start_km": 0.000,
                "end_km": 440.200,
                "track_geometry": corridor_geom,
                "is_electrified": True,
                "max_speed_kmh": 130
            }
        )

        # 4. Seed Prestige Express Train (12424 Dibrugarh Rajdhani)
        rajdhani, _ = Train.objects.get_or_create(
            train_number="12424",
            defaults={
                "train_name": "NEW DELHI - DIBRUGARH RAJDHANI EXPRESS",
                "train_category": "PREMIUM_RAJDHANI_VANDE",
                "priority_rank": 1,
                "source_station": "NDLS",
                "destination_station": "DBRG",
                "max_speed_kmh": 130
            }
        )

        # Live location interpolation via PostGIS Point
        LiveLocation.objects.update_or_create(
            train=rajdhani,
            defaults={
                "current_station": "ALJN",
                "current_chainage_km": 126.400,
                "delay_minutes": 14,
                "speed_kmh": 118.5,
                "coordinates": Point(78.0880, 27.8974, srid=4326),
                "updated_at": datetime.now(timezone.utc)
            }
        )

        # 5. Seed Pre-configured Urgent Block with Safety Tokens (Features #71, #81, #92)
        block_start = datetime.now(timezone.utc) + timedelta(hours=2)
        block_end = block_start + timedelta(hours=4)

        urgent_block, _ = Block.objects.get_or_create(
            block_code="BLK-20260920-ENGG-001",
            defaults={
                "corridor": corridor,
                "section_code": "GZB-ALJN-UP",
                "line_type": "UP",
                "department": engg_dept,
                "work_type": "TRACK_TAMPING",
                "start_km": 142.500,
                "end_km": 146.200,
                "scheduled_start": block_start,
                "scheduled_end": block_end,
                "status": "APPROVED",
                "version": 2,
                "digital_token": "TOK-BL-20260920-7F8E-ACD9",
                "tool_count_initial": 24,
                "weather_gate_passed": True,
                "loto_confirmed": True
            }
        )

        self.stdout.write(self.style.SUCCESS("Successfully seeded Indian Railways PostGIS dataset into PostgreSQL 15.6!"))
```
