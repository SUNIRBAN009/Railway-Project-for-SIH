# 03-data-seeding.md

> **File Order:** 36/45  
> **Previous File:** `06-testing-qa/02-load-test-strategy.md`  
> **Next File:** `07-roadmap/00-readme.md`  
> **Connection:** This concludes the Deep Dive and QA phase. The data seeding scripts ensure the environments described here can be instantiated reliably for the hackathon presentation.

---

## Data Seeding Strategy (The Demo Reset)

During development and before the final presentation, the database will become cluttered with test data. We use Django Management Commands (`scripts/`) to completely wipe and recreate a realistic railway zone state.

### 1. Execution

To reset the entire system to the "Golden Demo State":

```bash
# Run from backend directory
python manage.py flush --no-input
python manage.py runscript seed_core
```

### 2. What `seed_core.py` generates:

**1. Accounts (Identity):**
- `coa_admin` (Control Office Admin)
- `eng_je_01` (Track Engineer, Howrah Division)
- `trd_je_01` (OHE Engineer, Howrah Division)
- `snt_je_01` (Signal Engineer, Sealdah Division)
*(All passwords set to `demo123`)*

**2. Assets & Geography:**
- Creates Section `HWH-KGP` (Howrah to Kharagpur, 115 KM).
- Creates Section `SDAH-KLYM` (Sealdah to Kalyani, 53 KM).
- Injects real GeoJSON coordinate arrays for these routes so Mapbox draws the lines correctly over West Bengal.

**3. Departments (Resources):**
- Assigns 2 `ENG` crews to HWH-KGP.
- Assigns 1 `TRD` crew to HWH-KGP.
- Sets inventory levels (e.g., 500 meters of Copper Wire at HWH Depot).

**4. Trains (Schedules):**
- Creates `12001` (Shatabdi Express, High Priority). Scheduled on HWH-KGP arriving tomorrow at 08:00 AM.
- Creates `38201` (Howrah Local, Low Priority). Scheduled on HWH-KGP arriving tomorrow at 08:30 AM.

**5. The Setup (The CLI Hook):**
- Automatically generates one **Approved** block on HWH-KGP for tomorrow at 07:00 AM to 09:00 AM. 
- *Why?* Because when the demo starts, the COA dashboard should not be empty. It should look like a living system. This also perfectly sets up the AI Impact Calculation demonstration, as the approved block overlaps with both the Shatabdi and Local trains.
