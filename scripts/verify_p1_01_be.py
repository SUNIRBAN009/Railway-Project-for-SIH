import os
import sys
sys.path.insert(0, '/app')
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'railway_sih.settings')
django.setup()

from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from apps.accounts.models import UserProfile, UserRole, DepartmentCode

usernames = [
    'coa_delhi_chief',
    'sec_controller_dli',
    'admin',
    'eng_track_pway',
    'trd_ohe_power',
    'snt_signal_telecom',
    'eng_sse',
    'site_supervisor_gang01',
]

print("=" * 80)
print(f"{'USERNAME':25} | {'HASHER':8} | {'AUTH_OK':7} | {'ROLE':18} | {'DEPT':10} | {'EMPLOYEE_ID'}")
print("=" * 80)

for uname in usernames:
    u = User.objects.filter(username=uname).first()
    if not u:
        print(f"[-] {uname:25} | NOT FOUND")
        continue
    p = getattr(u, 'profile', None)
    hasher = u.password.split('$')[0] if u.password else 'NONE'
    auth_ok = authenticate(username=uname, password='railway@123') is not None
    role = p.role if p else "NONE"
    dept = p.department_code if p else "NONE"
    emp_id = p.employee_id if p else "NONE"
    print(f"[+] {uname:21} | {hasher:8} | {str(auth_ok):7} | {role:18} | {dept:10} | {emp_id}")

print("=" * 80)
