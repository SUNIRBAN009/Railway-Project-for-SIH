from django.core.management.base import BaseCommand
from django.core.management import call_command
from django.utils import timezone
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from apps.blocks.models import Block, Corridor, BlockStatus
from apps.demo.management.commands.seed_railway_demo import Command as SeedCommand

class Command(BaseCommand):
    help = 'Resets the demo platform state back to the pristine master baseline (PS 26027)'

    def add_arguments(self, parser):
        parser.add_argument('--hard', action='store_true', help='Perform a full hard wipe and re-seed all master data')
        parser.add_argument('--seed', type=int, default=26027, help='Random seed to restore')

    def handle(self, *args, **options):
        hard = options['hard']
        seed = options['seed']

        self.stdout.write(self.style.WARNING("🔄 Initializing Railway Demo State Reset..."))

        if hard:
            self.stdout.write("  [HARD RESET] Re-running master data seeder from scratch...")
            call_command('seed_railway_demo', seed=seed)
        else:
            self.stdout.write("  [SOFT RESET] Pruning temporary blocks and restoring baseline...")
            # 1. Remove all generated scenario/conflict blocks
            deleted_count, _ = Block.objects.filter(
                block_code__regex=r'^(BLK-SCEN|BLK-COMB|BLK-EMG|BLK-GEN|BLK-SAF|BLK-TRD-OHE|BLK-SNT-SIG|BLK-ENG-NDLS)'
            ).delete()
            self.stdout.write(f"  [OK] Cleaned {deleted_count} transient/injected blocks.")

            # 2. Re-assert the baseline 8 scheduled blocks via seeder
            seed_cmd = SeedCommand()
            seed_cmd.handle(seed=seed)

        # 3. Broadcast CORRIDOR_RESET event to Daphne WebSockets
        channel_layer = get_channel_layer()
        if channel_layer:
            for grp in ['corridor_ndls-cnb-main', 'corridor_ndls-gzb', 'corridor_all']:
                try:
                    async_to_sync(channel_layer.group_send)(
                        grp,
                        {
                            "type": "corridor.event",
                            "data": {
                                "event_type": "CORRIDOR_RESET",
                                "payload": {
                                    "status": "RESET_COMPLETE",
                                    "seed": seed,
                                    "timestamp": timezone.now().isoformat()
                                }
                            }
                        }
                    )
                except Exception:
                    pass
            self.stdout.write("  [OK] Dispatched CORRIDOR_RESET event to WebSocket groups.")

        self.stdout.write(self.style.SUCCESS("✨ Railway Demo environment successfully reset to baseline!"))
