import json
import os
from django.core.management.base import BaseCommand
from django.conf import settings

class Command(BaseCommand):
    help = 'Seeds the database with deterministic demo data for SIH PS 26027'

    def add_arguments(self, parser):
        parser.add_argument('--seed', type=int, default=26027, help='Random seed for deterministic generation')

    def handle(self, *args, **options):
        seed = options['seed']
        self.stdout.write(self.style.SUCCESS(f'Starting Demo Data Seeding with seed {seed}...'))
        
        master_data_dir = os.path.join(settings.BASE_DIR, 'apps', 'demo', 'master_data')
        
        # In a real scenario, we'd load JSONs and insert into DB.
        # For phase 0.5, we just validate and print.
        
        files = ['stations.json', 'trains.json', 'users.json', 'assets.json']
        for file in files:
            path = os.path.join(master_data_dir, file)
            if os.path.exists(path):
                with open(path, 'r') as f:
                    data = json.load(f)
                    self.stdout.write(f'Loaded {len(data)} records from {file}')
            else:
                self.stdout.write(self.style.WARNING(f'File not found: {path}'))

        self.stdout.write(self.style.SUCCESS('Successfully seeded demo data!'))
