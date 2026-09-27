import os
import sys
import time
import random
from datetime import timedelta
import django

# Setup Django
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'railway_sih.settings')
django.setup()

from apps.blocks.models import Block, Corridor, LineType, WorkType, BlockStatus, BlockConflict, ConflictType, ConflictSeverity
from django.utils import timezone
from apps.accounts.models import DepartmentCode

def generate_random_block(department, current_time):
    corridor = Corridor.objects.first()
    if not corridor:
        print("No corridors found. Please run seed script first.")
        return None

    block_code = f"DEMO-{department}-{random.randint(1000, 9999)}"
    start_km = round(random.uniform(float(corridor.start_km), float(corridor.end_km) - 5), 1)
    end_km = start_km + round(random.uniform(1, 5), 1)

    work_types = {
        DepartmentCode.ENG: [WorkType.TRACK_TAMPING, WorkType.BALLAST_CLEANING, WorkType.RAIL_RENEWAL],
        DepartmentCode.TRD: [WorkType.OHE_INSPECTION, WorkType.CATENARY_MAINTENANCE],
        DepartmentCode.SNT: [WorkType.SIGNAL_INTERLOCKING_TEST, WorkType.TURNOUT_OVERHAUL]
    }
    work_type = random.choice(work_types.get(department, [WorkType.TRACK_TAMPING]))

    # Schedule for sometime today
    scheduled_start = current_time + timedelta(hours=random.randint(1, 4))
    scheduled_end = scheduled_start + timedelta(hours=random.randint(1, 3))

    block = Block.objects.create(
        block_code=block_code,
        corridor=corridor,
        line_type=random.choice(LineType.choices)[0],
        department_code=department,
        work_type=work_type,
        start_km=start_km,
        end_km=end_km,
        scheduled_start_time=scheduled_start,
        scheduled_end_time=scheduled_end,
        status=BlockStatus.PENDING_APPROVAL,
        work_description=f"Auto-generated {department} block request",
        traction_power_cutoff_required=(department == DepartmentCode.TRD)
    )
    print(f"Generated Block: {block.block_code} for {department}")
    return block

def generate_conflict(block):
    # Generates a background conflict
    conflict_type = random.choice([ConflictType.TRAIN_PATH_COLLISION, ConflictType.PARALLEL_BLOCK_COLLISION, ConflictType.OHE_POWER_CONCURRENT_LOCK])
    BlockConflict.objects.create(
        block=block,
        conflict_type=conflict_type,
        severity=random.choice(ConflictSeverity.choices)[0],
        conflicting_entity_id=f"ENT-{random.randint(100, 999)}",
        conflicting_entity_label=f"Conflicting Entity {random.randint(10, 99)}",
        overlap_start_km=block.start_km,
        overlap_end_km=block.end_km,
        conflict_start_time=block.scheduled_start_time,
        conflict_end_time=block.scheduled_end_time,
        resolution_status='UNRESOLVED'
    )
    print(f"Generated Conflict for {block.block_code}")

def run_generator():
    print("Starting Demo Generator...")
    print("Will generate blocks for ENG (every 5 mins), TRD (every 8 mins), SNT (every 10 mins)")
    print("Press Ctrl+C to stop.")

    # Convert minutes to seconds for the loop, but for testing, let's make it real-time minutes
    eng_interval = 5 * 60
    trd_interval = 8 * 60
    snt_interval = 10 * 60

    last_eng = time.time() - eng_interval # Trigger immediately
    last_trd = time.time() - trd_interval
    last_snt = time.time() - snt_interval

    try:
        while True:
            current_time = time.time()
            now = timezone.now()
            
            if current_time - last_eng >= eng_interval:
                b = generate_random_block(DepartmentCode.ENG, now)
                if b and random.random() < 0.3: # 30% chance of conflict
                    generate_conflict(b)
                last_eng = current_time
                
            if current_time - last_trd >= trd_interval:
                b = generate_random_block(DepartmentCode.TRD, now)
                if b and random.random() < 0.3:
                    generate_conflict(b)
                last_trd = current_time
                
            if current_time - last_snt >= snt_interval:
                b = generate_random_block(DepartmentCode.SNT, now)
                if b and random.random() < 0.3:
                    generate_conflict(b)
                last_snt = current_time
                
            time.sleep(10) # check every 10 seconds
            
    except KeyboardInterrupt:
        print("\nDemo Generator stopped.")

if __name__ == '__main__':
    run_generator()
