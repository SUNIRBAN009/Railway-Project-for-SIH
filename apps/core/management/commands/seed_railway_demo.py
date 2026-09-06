"""
Django management command: python manage.py seed_railway_demo
Master Demo Data Seeder for Indian Railways AI Block Planning Platform (PS 26027).
"""
from django.core.management.base import BaseCommand
from scripts.seed_railway_demo import run_seeder


class Command(BaseCommand):
    help = 'Seeds database with realistic Indian Railways mock data for SIH Demo (PS 26027)'

    def handle(self, *args, **options):
        run_seeder()
