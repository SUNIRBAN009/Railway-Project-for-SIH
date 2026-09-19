import json
import sys
from collections import Counter

sys.stdout.reconfigure(encoding='utf-8')
with open(r'C:\Users\mrinm\.gemini\antigravity-ide\brain\b35975f5-cc5c-4d55-90cf-e0e124b2c600\scratch\excel_dump.json', encoding='utf-8') as f:
    d = json.load(f)

fm = d['Feature_Master']['rows']
print('Total features in Feature_Master:', len(fm))

cats = Counter(r.get('Category') for r in fm)
print('\n--- Categories ---')
for cat, cnt in cats.items():
    print(f"  {cat}: {cnt}")

tiers = Counter(r.get('Priority_Tier') for r in fm)
print('\n--- Priority Tiers ---')
for tier, cnt in tiers.items():
    print(f"  {tier}: {cnt}")

aligns = Counter(r.get('PS_Point_Alignment') for r in fm)
print('\n--- PS Point Alignment ---')
for al, cnt in aligns.items():
    print(f"  {al}: {cnt}")

print('\n--- Sample Features (First 10) ---')
for r in fm[:10]:
    print(f"SL #{r.get('SL')} | {r.get('Feature_Name')} | Tier: {r.get('Priority_Tier')} | Cat: {r.get('Category')}")
    print(f"   Desc: {r.get('Description')[:100]}...")
    print(f"   Demo Data: {r.get('Demo_Data_Needed')}")
    print(f"   Build Steps: {r.get('How_To_Build_Steps')}")
    print('-'*50)
