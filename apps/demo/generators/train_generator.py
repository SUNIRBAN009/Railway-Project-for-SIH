from .base import BaseDataGenerator, OperationalMode

class TrainPositionGenerator(BaseDataGenerator):
    """
    Train Telemetry & Position Generator (#114, #116).
    Generates live 60 FPS realistic telemetry markers for the authoritative trains
    interpolated accurately along the 440.2 km NDLS-CNB trunk corridor.
    """
    def generate(self, count=None):
        master_trains = self.master_data.get('trains', [])
        master_stations = self.master_data.get('stations', [])

        if not master_trains:
            master_trains = [
                {'train_number': '22436', 'name': 'Vande Bharat Express', 'train_type': 'PRESTIGE', 'max_speed_kmph': 160},
                {'train_number': '12301', 'name': 'Howrah Rajdhani Express', 'train_type': 'PRESTIGE', 'max_speed_kmph': 130},
                {'train_number': '12417', 'name': 'Prayagraj Superfast Express', 'train_type': 'EXPRESS', 'max_speed_kmph': 110},
                {'train_number': 'BOXN-8801', 'name': 'Heavy Haul Coal Rake', 'train_type': 'FREIGHT', 'max_speed_kmph': 75},
            ]

        # Use all master trains or limit by count
        target_trains = master_trains[:count] if count else master_trains
        telemetry = []

        # Station chainages for location calculation
        # NDLS: 0.0, GZB: 28.5, ALJN: 131.0, TDL: 206.0, ETW: 297.0, CNB: 440.2
        corridor_stations = sorted(
            master_stations,
            key=lambda s: float(s.get('chainage_km', 0.0))
        )

        for train in target_trains:
            max_speed = float(train.get('max_speed_kmph', 110.0))
            is_prestige = train.get('train_type') == 'PRESTIGE' or 'Rajdhani' in train.get('name', '') or 'Vande' in train.get('name', '')

            # Realistic speed distribution
            if is_prestige:
                speed = round(self.rng.uniform(max_speed * 0.85, max_speed), 1)
                delay = self.rng.choice([0, 0, 2, 5, 8]) # High punctuality
            elif 'Freight' in train.get('name', '') or 'BOXN' in train.get('train_number', ''):
                speed = round(self.rng.uniform(45.0, 75.0), 1)
                delay = self.rng.randint(15, 60)
            else:
                speed = round(self.rng.uniform(70.0, max_speed * 0.95), 1)
                delay = self.rng.choice([0, 4, 12, 22])

            current_km = round(self.rng.uniform(1.0, 439.0), 2)
            direction = 'DOWN' if int(train.get('train_number', '0')[-1] if train.get('train_number')[-1].isdigit() else 0) % 2 == 1 else 'UP'

            # Interpolate Geo Coordinates (Latitude 28.6 to 26.4, Longitude 77.2 to 80.3)
            # NDLS (28.64, 77.22) to CNB (26.45, 80.35)
            progress = current_km / 440.2
            lat = round(28.642 - (progress * (28.642 - 26.454)), 5)
            lon = round(77.221 + (progress * (80.351 - 77.221)), 5)

            # Determine next approaching station
            next_station = 'CNB' if direction == 'DOWN' else 'NDLS'
            if corridor_stations:
                if direction == 'DOWN':
                    ahead = [s for s in corridor_stations if float(s.get('chainage_km', 0.0)) > current_km]
                    if ahead:
                        next_station = ahead[0].get('code', 'CNB')
                else:
                    ahead = [s for s in corridor_stations if float(s.get('chainage_km', 0.0)) < current_km]
                    if ahead:
                        next_station = ahead[-1].get('code', 'NDLS')

            telemetry.append({
                'train_number': train['train_number'],
                'train_name': train.get('name', train.get('train_name', 'Express')),
                'train_type': train.get('train_type', 'EXPRESS'),
                'current_km': current_km,
                'speed_kmph': speed,
                'delay_minutes': delay,
                'direction': direction,
                'line_type': direction,
                'next_station': next_station,
                'latitude': lat,
                'longitude': lon,
                'signal_aspect': 'DOUBLE_YELLOW' if delay > 10 else 'GREEN',
                'is_prestige': is_prestige,
            })

        return telemetry
