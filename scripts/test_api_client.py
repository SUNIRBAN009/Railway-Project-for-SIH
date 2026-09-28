import os
import sys
import django

sys.path.insert(0, '.')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'railway_sih.settings')
django.setup()

from rest_framework.test import APIClient
from apps.accounts.models import User

u = User.objects.first()
client = APIClient()
client.force_authenticate(user=u)

r = client.get('/api/v1/analytics/dashboard/summary/?corridor=NDLS-CNB-MAIN&range=7d')
print("Status:", r.status_code)
cards = r.data.get('data', {}).get('executive_cards', {})
print("Executive cards from API:")
for k, v in cards.items():
    print(f"  {k}: {v}")
