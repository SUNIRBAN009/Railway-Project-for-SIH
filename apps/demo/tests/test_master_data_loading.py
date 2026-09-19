from django.test import TestCase
from apps.demo.views import perform_seed
from apps.blocks.models import Corridor
from apps.trains.models import Station, Train, TrainSchedule
from apps.accounts.models import UserProfile
from apps.assets.models import UnifiedAsset, TrackAsset

class MasterDataLoadingTestCase(TestCase):
    """
    TSK-P0.5-01-TEST: Verify JSON loading into PostGIS models
    (Corridor, Station, Train, UserProfile, UnifiedAsset) with zero foreign key or geometry errors.
    """

    def test_json_loading_into_models(self):
        logs = perform_seed()
        self.assertTrue(len(logs) >= 5, "Expected all 5 entity layers to report seeding logs")

        # 1. Verify Corridor
        corridor = Corridor.objects.filter(code='NDLS-CNB-MAIN').first()
        self.assertIsNotNone(corridor, "NDLS-CNB-MAIN corridor must exist")
        self.assertEqual(float(corridor.start_km), 0.0)
        self.assertEqual(float(corridor.end_km), 440.2)

        # 2. Verify Stations
        stations = Station.objects.filter(code__in=['NDLS', 'GZB', 'ALJN', 'TDL', 'ETW', 'CNB'])
        self.assertEqual(stations.count(), 6, "All 6 NDLS-CNB junction stations must exist")
        for stn in stations:
            self.assertIsNotNone(stn.latitude, f"Station {stn.code} must have latitude")
            self.assertIsNotNone(stn.longitude, f"Station {stn.code} must have longitude")
            self.assertGreaterEqual(stn.latitude, 26.0)
            self.assertLessEqual(stn.latitude, 29.0)

        # 3. Verify Trains & Schedules
        trains = Train.objects.all()
        self.assertGreaterEqual(trains.count(), 12, "At least 12 authoritative trains must be present")
        rajdhani = Train.objects.filter(train_number='12301').first()
        self.assertIsNotNone(rajdhani, "Train 12301 Rajdhani must exist")
        
        # Verify foreign keys on schedules
        schedules = TrainSchedule.objects.filter(train=rajdhani)
        self.assertGreaterEqual(schedules.count(), 2, "Rajdhani schedule stops must exist")
        orphaned_schedules = TrainSchedule.objects.filter(train__isnull=True).count()
        self.assertEqual(orphaned_schedules, 0, "No orphaned train schedules allowed (FK error = 0)")

        # 4. Verify UserProfiles
        users = UserProfile.objects.all()
        self.assertGreaterEqual(users.count(), 8, "All 8 operational staff personas must have UserProfiles")
        chief = UserProfile.objects.filter(user__username='coa_delhi_chief').first()
        self.assertIsNotNone(chief, "coa_delhi_chief user profile must exist")

        # 5. Verify UnifiedAssets
        assets = UnifiedAsset.objects.filter(corridor=corridor)
        self.assertGreaterEqual(assets.count(), 50, "At least 50 unified track assets must be linked to corridor")
        orphaned_assets = UnifiedAsset.objects.filter(corridor__isnull=True).count()
        self.assertEqual(orphaned_assets, 0, "No orphaned assets allowed (FK error = 0)")
