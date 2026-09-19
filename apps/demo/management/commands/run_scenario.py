from django.core.management.base import BaseCommand
from apps.demo.scenarios import SCENARIO_REGISTRY

class Command(BaseCommand):
    help = 'Runs a specific presentation scenario'

    def add_arguments(self, parser):
        parser.add_argument('scenario_name', type=str, help='Name of the scenario to run')
        parser.add_argument('--live', action='store_true', help='Run with real-time delays')
        parser.add_argument('--broadcast', action='store_true', help='Broadcast events via WebSocket')

    def handle(self, *args, **options):
        scenario_name = options['scenario_name']
        live = options['live']
        broadcast = options['broadcast']
        
        if scenario_name not in SCENARIO_REGISTRY:
            self.stdout.write(self.style.ERROR(f"Scenario '{scenario_name}' not found."))
            return
            
        scenario_class = SCENARIO_REGISTRY[scenario_name]
        scenario = scenario_class(live_mode=live, broadcast=broadcast)
        
        self.stdout.write(self.style.SUCCESS(f"Starting {scenario.name}"))
        scenario.setup()
        scenario.execute()
        self.stdout.write(self.style.SUCCESS(f"Finished {scenario.name}"))
