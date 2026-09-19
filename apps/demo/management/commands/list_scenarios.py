from django.core.management.base import BaseCommand
from apps.demo.scenarios import SCENARIO_REGISTRY

class Command(BaseCommand):
    help = 'Lists all available presentation scenarios'

    def handle(self, *args, **options):
        self.stdout.write("Available Scenarios for SIH PS 26027:")
        for key, scenario_class in SCENARIO_REGISTRY.items():
            self.stdout.write(f"  - {key}: {scenario_class.name}")
