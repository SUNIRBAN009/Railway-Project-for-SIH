import requests
import json
import sys

BASE = 'http://127.0.0.1:3000/api/v1/demo'

print('=== 1. TEST CONTROLLER STATUS ===')
r1 = requests.get(f'{BASE}/controller/status/')
print('Status Code:', r1.status_code, r1.json())
assert r1.status_code == 200

print('\n=== 2. TEST OPERATIONAL MODE & SPEED DIAL UPDATE ===')
r2 = requests.post(f'{BASE}/controller/status/', json={'active_mode': 'STREAM', 'speed_multiplier': 5.0, 'is_paused': False})
print('Updated Status:', r2.status_code, r2.json()['active_mode'], r2.json()['stream_speed'])
assert r2.status_code == 200

print('\n=== 3. TEST CONFLICT INJECTION: USP #98 (ENG vs TRD) ===')
r3 = requests.post(f'{BASE}/inject-conflict/', json={'conflict_type': 'COMBINED_BLOCK'})
s3 = r3.json().get('scenario', {})
print('Injected:', s3.get('title'), '| Blocks:', len(s3.get('blocks', [])))
assert r3.status_code == 200

print('\n=== 4. TEST CONFLICT INJECTION: RAJDHANI TIMETABLE COLLISION ===')
r4 = requests.post(f'{BASE}/inject-conflict/', json={'conflict_type': 'TRAIN_PRECEDENCE'})
s4 = r4.json().get('scenario', {})
print('Injected:', s4.get('title'), '| Blocks:', len(s4.get('blocks', [])))
assert r4.status_code == 200

print('\n=== 5. TEST CONFLICT INJECTION: RULE 3 GANG TRAVEL PHYSICS ===')
r5 = requests.post(f'{BASE}/inject-conflict/', json={'conflict_type': 'RESOURCE_PHYSICS'})
s5 = r5.json().get('scenario', {})
print('Injected:', s5.get('title'), '| Blocks:', len(s5.get('blocks', [])))
assert r5.status_code == 200

print('\n=== 6. TEST BATCH BLOCK GENERATION (+5 BLOCKS) ===')
r6 = requests.post(f'{BASE}/generate/blocks/', json={'count': 5, 'mode': 'SEED'})
print('Generated Blocks:', r6.status_code, 'Count:', r6.json().get('count'))
assert r6.status_code == 200

print('\n=== 7. TEST TRACK DEFECT GENERATION (+4 DEFECTS) ===')
r7 = requests.post(f'{BASE}/generate/defects/', json={'count': 4, 'mode': 'SEED'})
print('Generated Defects:', r7.status_code, 'Count:', r7.json().get('count'))
assert r7.status_code == 200

print('\n=== 8. TEST SCENARIOS RUN END-TO-END ===')
r8 = requests.post(f'{BASE}/scenarios/run/', json={'scenario': 'eng_vs_trd_conflict'})
print('Scenario Run:', r8.status_code, r8.json().get('scenario', {}).get('name'))
assert r8.status_code == 200

print('\n=== 9. TEST SIMULATION RESET TO BASELINE ===')
r9 = requests.post(f'{BASE}/reset/', json={'seed': 26027})
print('Reset:', r9.status_code, r9.json())
assert r9.status_code == 200

print('\n>>> ALL 9 BACKEND DEMO API TESTS PASSED SUCCESSFULLY! 100% OPERATIONAL! <<<')
