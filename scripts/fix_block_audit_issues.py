import os
import sys
import django

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'railway_sih.settings')
django.setup()

from apps.blocks.models import Block, BlockStatus
from apps.accounts.models import DepartmentCode

def reconcile_blocks():
    fixed_gangs = 0
    fixed_machinery = 0
    reconciled_parents = 0
    
    # 1. Reconcile missing gang and machinery
    for b in Block.objects.all():
        changed = False
        desc = (b.work_description or '').lower()
        is_emg = 'emergency' in desc or 'halt' in desc or 'emg' in str(b.id)
        
        if not b.gang_id:
            if is_emg:
                b.gang_id = 'GANG-TRD-EMG-01' if b.department_code == DepartmentCode.TRD else 'GANG-ENG-EMG-01'
            elif b.department_code == DepartmentCode.TRD:
                b.gang_id = 'GANG-TRD-OHE-01'
            elif b.department_code == DepartmentCode.SNT:
                b.gang_id = 'GANG-SNT-SIG-01'
            else:
                b.gang_id = 'GANG-ENG-PWAY-01'
            fixed_gangs += 1
            changed = True
            
        if not b.equipment_required:
            if is_emg:
                b.equipment_required = 'OHE Emergency Tower Wagon 4W-TW-EMG' if b.department_code == DepartmentCode.TRD else 'Rail Fracture Rapid Restoration Unit & USFD Trolley'
            elif b.department_code == DepartmentCode.TRD:
                b.equipment_required = 'TW-104 Tower Wagon'
            elif b.department_code == DepartmentCode.SNT:
                b.equipment_required = 'Point Machine Testing Rig'
            else:
                b.equipment_required = 'CSM-NR-092 Track Tamper'
            fixed_machinery += 1
            changed = True
            
        if changed:
            b.save(update_fields=['gang_id', 'equipment_required'])
            
    # 2. Reconcile AI Combined Block eca807ff and constituent blocks
    comb_blocks = Block.objects.filter(work_description__icontains='AI Combined Block')
    for comb in comb_blocks:
        # Find constituent overlapping blocks around KM 142-146
        constituents = Block.objects.filter(
            corridor=comb.corridor,
            line_type=comb.line_type,
            start_km__gte=140.0,
            end_km__lte=150.0,
            status=BlockStatus.CONFLICT_DETECTED
        ).exclude(id=comb.id)
        
        for const in constituents:
            const.status = BlockStatus.COORDINATED
            const.parent_block = comb
            const.save(update_fields=['status', 'parent_block'])
            reconciled_parents += 1

    print(f"Reconciliation Complete: {fixed_gangs} gangs fixed, {fixed_machinery} machinery fixed, {reconciled_parents} constituent blocks linked to parent combined block.")

if __name__ == '__main__':
    reconcile_blocks()
