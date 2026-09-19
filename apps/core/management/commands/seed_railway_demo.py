"""
Django management command: python manage.py seed_railway_demo
Master Demo Data Seeder for Indian Railways AI Block Planning Platform (PS 26027).
Delegates to apps.demo authoritative PostGIS seeder.
"""
from apps.demo.management.commands.seed_railway_demo import Command as DemoSeedCommand

class Command(DemoSeedCommand):
    help = 'Seeds database with deterministic Indian Railways master demo data for SIH Demo (PS 26027)'
