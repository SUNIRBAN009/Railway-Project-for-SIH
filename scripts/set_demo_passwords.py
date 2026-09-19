import os
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'railway_sih.settings')
import django
django.setup()

from django.contrib.auth.models import User
from apps.accounts.models import UserProfile, UserRole, DepartmentCode

DEMO_PASSWORD = '9999'

demo_users = [
    ('admin', 'System', 'Admin', 'IR-SYS-0001', UserRole.ADMIN, DepartmentCode.OPERATIONS, True, True),
    ('coa_delhi_chief', 'Rajesh', 'Verma', 'IR-COA-1001', UserRole.CHIEF_CONTROLLER, DepartmentCode.OPERATIONS, True, False),
    ('sec_controller_dli', 'Sunil', 'Yadav', 'NR-OPS-2201', UserRole.SECTION_CONTROLLER, DepartmentCode.OPERATIONS, True, False),
    ('eng_track_pway', 'Amit', 'Sharma', 'NR-ENG-4921', UserRole.DEPT_ENGINEER, DepartmentCode.ENG, True, False),
    ('trd_ohe_power', 'Vikram', 'Singh', 'NR-TRD-8842', UserRole.DEPT_ENGINEER, DepartmentCode.TRD, True, False),
    ('snt_signal_telecom', 'Pooja', 'Mishra', 'NR-SNT-3319', UserRole.DEPT_ENGINEER, DepartmentCode.SNT, True, False),
    ('site_supervisor', 'Ramesh', 'Kumar', 'NR-ENG-7702', UserRole.SITE_SUPERVISOR, DepartmentCode.ENG, False, False),
    ('safety_auditor', 'Anjali', 'Deshmukh', 'IR-SAF-9901', UserRole.AUDITOR, DepartmentCode.SAFETY, False, False),
]

print("=" * 60)
print(f"Setting demo users & resetting all passwords to: {DEMO_PASSWORD}")
print("=" * 60)

for username, fname, lname, empid, role, dept, is_staff, is_superuser in demo_users:
    user, created = User.objects.get_or_create(username=username, defaults={
        'first_name': fname,
        'last_name': lname,
        'email': f'{username}@railnet.gov.in',
        'is_staff': is_staff,
        'is_superuser': is_superuser,
    })
    user.is_staff = is_staff
    user.is_superuser = is_superuser
    user.first_name = fname
    user.last_name = lname
    user.set_password(DEMO_PASSWORD)
    user.save()

    profile, _ = UserProfile.objects.get_or_create(user=user)
    profile.employee_id = empid
    profile.role = role
    profile.department_code = dept
    profile.division_code = 'DLI'
    profile.failed_login_attempts = 0
    profile.locked_until = None
    profile.save()
    status_str = "Created" if created else "Updated"
    print(f"[{status_str}] {username:20} -> Role: {role:18} Dept: {dept:12} Password: {DEMO_PASSWORD}")

# Also update ALL other users in the DB to have password 9999
for u in User.objects.all():
    u.set_password(DEMO_PASSWORD)
    u.save()
    if hasattr(u, 'profile') and u.profile:
        u.profile.failed_login_attempts = 0
        u.profile.locked_until = None
        u.profile.save()

print("=" * 60)
print(f"SUCCESS: All {User.objects.count()} users now have password '{DEMO_PASSWORD}' and are unlocked!")
print("=" * 60)
