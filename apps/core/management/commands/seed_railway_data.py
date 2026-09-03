import datetime
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.utils import timezone
from apps.accounts.models import UserProfile, UserRole
from apps.trains.models import Station, Train, TrainSchedule, CoachComposition, PlatformAllocation, TrainType, TrainStatus, CrowdLevel
from apps.grievances.models import Grievance, GrievanceComment, GrievanceAuditLog, GrievanceCategory, GrievancePriority, GrievanceStatus
from apps.maintenance.models import DefectReport, WorkOrder, DefectType, DefectSeverity, DefectStatus
from apps.emergency.models import SOSAlert, RPFUnit, EmergencyHelpline, EmergencyType, SOSStatus

class Command(BaseCommand):
    help = 'Seeds database with realistic Indian Railways mock data for SIH Demo'

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING("Starting SIH Railway Data Seeding..."))

        # 1. Create Demo Users
        users_data = [
            ('demo_passenger', 'Rahul', 'Sharma', 'passenger@railconnect.in', UserRole.PASSENGER, '+91 9876543210', 'NDLS'),
            ('demo_station_master', 'Vikram', 'Singh', 'stationmaster@railconnect.in', UserRole.STATION_MASTER, '+91 9811223344', 'NDLS - New Delhi'),
            ('demo_rpf', 'Inspector Amit', 'Verma', 'rpf@railconnect.in', UserRole.RPF_OFFICER, '+91 9822334455', 'HWH - Howrah Jn'),
            ('demo_maintenance', 'Engineer Rajesh', 'Kumar', 'maint@railconnect.in', UserRole.MAINTENANCE_TECH, '+91 9833445566', 'CSMT - Mumbai Central'),
            ('demo_admin', 'Director General', 'Railways', 'admin@railconnect.in', UserRole.ADMIN, '+91 9844556677', 'Railway Board HQ'),
        ]

        created_users = {}
        for username, fname, lname, email, role, phone, station_name in users_data:
            user, created = User.objects.get_or_create(username=username, defaults={
                'first_name': fname,
                'last_name': lname,
                'email': email,
                'is_staff': (role == UserRole.ADMIN),
                'is_superuser': (role == UserRole.ADMIN),
            })
            user.set_password('demo@1234')
            user.save()
            profile, _ = UserProfile.objects.get_or_create(user=user)
            profile.role = role
            profile.phone_number = phone
            profile.assigned_station = station_name
            profile.badge_number = f"IR-{role[:3]}-{100 + user.id}"
            profile.save()
            created_users[role] = user
            self.stdout.write(f"  User ready: {username} ({role})")

        # 2. Create Stations
        stations_data = [
            ('NDLS', 'New Delhi Railway Station', 'Northern Railway (NR)', 'Delhi', 28.6431, 77.2197, 16),
            ('HWH', 'Howrah Junction', 'Eastern Railway (ER)', 'Howrah', 22.5838, 88.3426, 23),
            ('CSMT', 'Chhatrapati Shivaji Maharaj Terminus', 'Central Railway (CR)', 'Mumbai', 18.9401, 72.8354, 18),
            ('CNB', 'Kanpur Central', 'North Central Railway (NCR)', 'Prayagraj', 26.4547, 80.3507, 10),
            ('BSB', 'Varanasi Junction (Cantonment)', 'Northern Railway (NR)', 'Lucknow', 25.3284, 82.9866, 9),
            ('SBC', 'KSR Bengaluru City', 'South Western Railway (SWR)', 'Bengaluru', 12.9774, 77.5670, 10),
            ('MAS', 'Puratchi Thalaivar Dr. M.G.R. Central (Chennai)', 'Southern Railway (SR)', 'Chennai', 13.0827, 80.2755, 15),
            ('PNBE', 'Patna Junction', 'East Central Railway (ECR)', 'Danapur', 25.6022, 85.1376, 10),
            ('ADI', 'Ahmedabad Junction', 'Western Railway (WR)', 'Ahmedabad', 23.0225, 72.5714, 12),
        ]

        stations_dict = {}
        for code, name, zone, division, lat, lng, pf_count in stations_data:
            st, _ = Station.objects.get_or_create(code=code, defaults={
                'name': name,
                'zone': zone,
                'division': division,
                'latitude': lat,
                'longitude': lng,
                'number_of_platforms': pf_count,
            })
            stations_dict[code] = st
        self.stdout.write("  Stations created.")

        # 3. Create Trains
        trains_data = [
            ('22436', 'Vande Bharat Express', TrainType.VANDE_BHARAT, 'NDLS', 'BSB', 'Daily (Except Thu)', 16, TrainStatus.ON_TIME, 0, 'CNB', 'BSB'),
            ('12301', 'Howrah Rajdhani Express', TrainType.RAJDHANI, 'HWH', 'NDLS', 'Daily', 20, TrainStatus.RUNNING, 8, 'CNB', 'NDLS'),
            ('12004', 'Lucknow Swarna Shatabdi', TrainType.SHATABDI, 'NDLS', 'CNB', 'Daily', 14, TrainStatus.ON_TIME, 0, 'NDLS', 'CNB'),
            ('12951', 'Mumbai Tejas Rajdhani Express', TrainType.RAJDHANI, 'CSMT', 'NDLS', 'Daily', 21, TrainStatus.DELAYED, 25, 'CSMT', 'ADI'),
            ('20607', 'Mysuru - Chennai Vande Bharat', TrainType.VANDE_BHARAT, 'SBC', 'MAS', 'Daily (Except Wed)', 16, TrainStatus.ON_TIME, 0, 'SBC', 'MAS'),
            ('12393', 'Sampoorna Kranti Express', TrainType.SUPERFAST, 'PNBE', 'NDLS', 'Daily', 22, TrainStatus.RUNNING, 12, 'CNB', 'NDLS'),
        ]

        train_objects = {}
        for tnum, tname, ttype, src, dst, runs, coaches, status, delay, curr, nxt in trains_data:
            tr, _ = Train.objects.get_or_create(train_number=tnum, defaults={
                'name': tname,
                'train_type': ttype,
                'source_station': stations_dict[src],
                'destination_station': stations_dict[dst],
                'runs_on': runs,
                'total_coaches': coaches,
                'status': status,
                'delay_minutes': delay,
                'current_station': stations_dict.get(curr),
                'next_station': stations_dict.get(nxt),
            })
            train_objects[tnum] = tr

            # Add sample coach composition
            coach_types = [
                ('E1', 'Executive Chair Car', 52, 45, CrowdLevel.MODERATE),
                ('C1', 'AC Chair Car', 78, 74, CrowdLevel.HIGH),
                ('C2', 'AC Chair Car', 78, 50, CrowdLevel.MODERATE),
                ('B1', 'AC 3 Tier', 72, 70, CrowdLevel.HIGH),
                ('B2', 'AC 3 Tier', 72, 68, CrowdLevel.HIGH),
                ('A1', 'AC 2 Tier', 48, 40, CrowdLevel.MODERATE),
                ('H1', 'AC 1st Class', 24, 18, CrowdLevel.LOW),
                ('S1', 'Sleeper Class', 72, 85, CrowdLevel.OVERCROWDED),
            ]
            for cnum, ctype, cap, occ, crowd in coach_types:
                CoachComposition.objects.get_or_create(train=tr, coach_number=cnum, defaults={
                    'coach_type': ctype,
                    'capacity': cap,
                    'current_occupancy': occ,
                    'crowd_level': crowd,
                    'cleanliness_score': 4.6 if crowd == CrowdLevel.LOW else 3.8,
                })

        # 4. Train Schedules
        vande = train_objects.get('22436')
        if vande:
            TrainSchedule.objects.get_or_create(train=vande, stop_number=1, defaults={
                'station': stations_dict['NDLS'], 'arrival_time': None, 'departure_time': datetime.time(6, 0), 'halt_minutes': 0, 'distance_km': 0, 'platform_number': 16
            })
            TrainSchedule.objects.get_or_create(train=vande, stop_number=2, defaults={
                'station': stations_dict['CNB'], 'arrival_time': datetime.time(10, 8), 'departure_time': datetime.time(10, 10), 'halt_minutes': 2, 'distance_km': 440, 'platform_number': 1
            })
            TrainSchedule.objects.get_or_create(train=vande, stop_number=3, defaults={
                'station': stations_dict['BSB'], 'arrival_time': datetime.time(14, 0), 'departure_time': None, 'halt_minutes': 0, 'distance_km': 759, 'platform_number': 1
            })

        # Platform Allocations
        PlatformAllocation.objects.get_or_create(
            station=stations_dict['NDLS'],
            platform_number=16,
            train=train_objects['22436'],
            defaults={
                'expected_arrival': timezone.now() - datetime.timedelta(minutes=30),
                'expected_departure': timezone.now() + datetime.timedelta(minutes=30),
                'status': 'Docked',
                'assigned_by': 'AI Smart Dispatch Engine'
            }
        )
        PlatformAllocation.objects.get_or_create(
            station=stations_dict['NDLS'],
            platform_number=3,
            train=train_objects['12301'],
            defaults={
                'expected_arrival': timezone.now() + datetime.timedelta(minutes=45),
                'expected_departure': timezone.now() + datetime.timedelta(minutes=90),
                'status': 'Approaching',
                'assigned_by': 'Station Master Vikram Singh'
            }
        )

        # 5. Grievances with AI Sentiment & Priorities
        passenger_user = created_users[UserRole.PASSENGER]
        grievances_data = [
            (
                'GRV-20260903-1001', passenger_user, 'Sunirban Ghosh', '+91 9876543210', '2458917302', '22436', 'C1', '34', 'Near Kanpur',
                GrievanceCategory.ELECTRICAL, 'Air Conditioning Cooling Failed in Coach C1',
                'The AC unit in Coach C1 has stopped working completely for the last 2 hours. The coach is extremely hot and suffocating with children inside. Please fix immediately.',
                GrievancePriority.HIGH, GrievanceStatus.IN_PROGRESS, 80, 'Strongly Negative', 'Electrical Maintenance & AC Crew', True
            ),
            (
                'GRV-20260903-1002', passenger_user, 'Priya Sen', '+91 9831001122', '3128945671', '12301', 'B2', '12', 'Approaching Mughalsarai',
                GrievanceCategory.CLEANLINESS, 'Water Leakage and Choked Toilet in Coach B2',
                'The western toilet in coach B2 is overflowing with foul smell spreading across berths 1 to 16. Choked washbasin.',
                GrievancePriority.MEDIUM, GrievanceStatus.OPEN, 60, 'Negative', 'On-Board Housekeeping Staff (OBHS)', False
            ),
            (
                'GRV-20260903-1003', passenger_user, 'Dr. Arpan Mukherjee', '+91 9811442299', '4491028374', '12951', 'A1', '21', 'Vadodara Station',
                GrievanceCategory.MEDICAL, 'Elderly Passenger Severe Chest Pain and Breathing Difficulty',
                'Elderly co-passenger at seat 22 suffering severe chest pain, sweating and fainting. Need immediate medical team with oxygen support at next halt.',
                GrievancePriority.CRITICAL, GrievanceStatus.IN_PROGRESS, 98, 'Urgent / High Distress', 'Railway Medical Rapid Response Unit', True
            ),
            (
                'GRV-20260903-1004', passenger_user, 'Kavita Das', '+91 9748223311', '8910237461', '20607', 'E1', '08', 'Jolarpettai Jn',
                GrievanceCategory.CATERING, 'Stale Breakfast Packet Provided by Pantry',
                'The breakfast packet served today morning had foul smell and expired packaging date. Request inspection of pantry car stock.',
                GrievancePriority.LOW, GrievanceStatus.RESOLVED, 30, 'Mildly Dissatisfied', 'IRCTC Pantry & Catering Quality Cell', False
            ),
            (
                'GRV-20260903-1005', passenger_user, 'Rohit Mehra', '+91 9899112233', '1029384756', '12004', 'C2', '55', 'Ghaziabad',
                GrievanceCategory.SECURITY, 'Suspicious Unattended Bag Near Coach Vestibule',
                'Black unattended trolley bag found between Coach C2 and C3 with no claimant for 45 minutes. RPF check requested.',
                GrievancePriority.CRITICAL, GrievanceStatus.RESOLVED, 92, 'Urgent / High Distress', 'Railway Protection Force (RPF)', True
            ),
        ]

        for tid, user, pname, pphone, pnr, tnum, cnum, snum, loc, cat, subj, desc, prio, stat, score, sent, dept, ai_esc in grievances_data:
            grv, _ = Grievance.objects.get_or_create(tracking_id=tid, defaults={
                'passenger': user,
                'passenger_name': pname,
                'passenger_phone': pphone,
                'pnr_number': pnr,
                'train_number': tnum,
                'coach_number': cnum,
                'seat_number': snum,
                'current_station': loc,
                'category': cat,
                'subject': subj,
                'description': desc,
                'priority': prio,
                'status': stat,
                'urgency_score': score,
                'sentiment_label': sent,
                'assigned_department': dept,
                'is_ai_escalated': ai_esc,
                'assigned_to': created_users[UserRole.MAINTENANCE_TECH] if 'Electrical' in dept else None
            })

            # Add comment and audit log
            GrievanceComment.objects.get_or_create(
                grievance=grv,
                message=f"Ticket registered automatically into {dept} triage queue.",
                defaults={'author_name': 'RailConnect AI Dispatcher', 'is_official_update': True}
            )
            GrievanceAuditLog.objects.get_or_create(
                grievance=grv,
                old_status="New",
                new_status=grv.get_status_display(),
                defaults={'performed_by': created_users[UserRole.ADMIN], 'remarks': 'Initial AI triage & routing'}
            )

        # 6. Maintenance & Track Defects
        defects_data = [
            (
                'DFT-260903-401', DefectType.TRACK_CRACK, DefectSeverity.CRITICAL,
                'Kanpur - Prayagraj Down Line', 'KM 442/18 - 442/20', 26.4547, 80.3507, '', '',
                'Deep transversal crack detected on outer rail head by automated ultrasound track inspection vehicle. Potential derailment hazard.',
                96.4, 'RailVision Acoustic Rail Crack Detector', DefectStatus.IN_REPAIR
            ),
            (
                'DFT-260903-402', DefectType.OHE_SAG, DefectSeverity.MAJOR,
                'Delhi - Mathura Chord Section', 'KM 88/12', 28.1200, 77.3400, '', '',
                'Contact wire height dropped by 65mm due to tension spring wear. Sparking observed at pantograph interface.',
                89.2, 'LiDAR OHE Inspection Drone', DefectStatus.ASSIGNED
            ),
            (
                'DFT-260903-403', DefectType.WHEEL_HOT_AXLE, DefectSeverity.CRITICAL,
                'Asansol - Dhanbad Quadruple Section', 'KM 215/04', 23.6889, 86.9661, '12301', 'B4',
                'Hot Box Detector (HBD) IR camera logged axle box temperature spike (94°C vs ambient 31°C) on coach B4 left wheel pair #2.',
                98.1, 'Wayside Infrared Hot Axle Detector Array', DefectStatus.ASSIGNED
            ),
            (
                'DFT-260903-404', DefectType.COACH_MECHANICAL, DefectSeverity.MINOR,
                'New Delhi Yard Maintenance Bay 3', 'Bay 3B', 28.6431, 77.2197, '22436', 'E2',
                'Pneumatic automatic door sliding track obstruction sensor intermittent latching.',
                91.0, 'Pre-Departure Rolling Stock Diagnostic Tool', DefectStatus.RESOLVED
            ),
        ]

        for did, dtype, sev, sec, km, lat, lng, tnum, cnum, desc, conf, det, stat in defects_data:
            dft, _ = DefectReport.objects.get_or_create(report_id=did, defaults={
                'defect_type': dtype,
                'severity': sev,
                'section_name': sec,
                'track_km_marker': km,
                'latitude': lat,
                'longitude': lng,
                'train_number': tnum,
                'coach_number': cnum,
                'description': desc,
                'ai_confidence_score': conf,
                'detected_by': det,
                'status': stat,
                'reported_by': created_users[UserRole.MAINTENANCE_TECH]
            })

            # Work Order
            WorkOrder.objects.get_or_create(defect=dft, defaults={
                'assigned_crew': 'Track Rapid Repair Gang #12 - Northern Zone',
                'assigned_engineer': created_users[UserRole.MAINTENANCE_TECH],
                'target_completion_time': timezone.now() + datetime.timedelta(hours=4),
                'repair_summary': 'Rail clamp and temporary fishplate bolted. Thermite weld scheduled during 02:00 AM traffic block.',
                'status': 'Dispatched' if stat == DefectStatus.IN_REPAIR else 'Assigned'
            })

        # 7. Emergency SOS Alerts & RPF Units
        sos_data = [
            (
                'SOS-2609031120-11', passenger_user, 'Kiran Kumari', '+91 9876500111', EmergencyType.HARASSMENT,
                '12301', 'S4', '31', 'Approaching Kanpur Central Outer', 26.4500, 80.3400,
                'Two unauthorized intoxicated men shouting and harassing female passengers in bay 4. Need immediate RPF intervention at next signal.',
                SOSStatus.ACTIVE, 'RPF Flying Squad #3 - Kanpur Central'
            ),
            (
                'SOS-2609030940-22', passenger_user, 'Suresh Patel', '+91 9811002233', EmergencyType.MEDICAL,
                '22436', 'C1', '12', 'Varanasi Cantt Platform 1', 25.3284, 82.9866,
                'Severe allergic asthma attack, passenger needing emergency inhaler / doctor on board.',
                SOSStatus.RESOLVED, 'Station Medical Officer & Red Cross First Aid'
            ),
        ]

        for sid, user, pname, pphone, etype, tnum, cnum, snum, loc, lat, lng, det, stat, unit in sos_data:
            SOSAlert.objects.get_or_create(alert_id=sid, defaults={
                'passenger': user,
                'passenger_name': pname,
                'passenger_phone': pphone,
                'emergency_type': etype,
                'train_number': tnum,
                'coach_number': cnum,
                'seat_number': snum,
                'current_location_desc': loc,
                'latitude': lat,
                'longitude': lng,
                'details': det,
                'status': stat,
                'rpf_unit_dispatched': unit,
                'acknowledged_by': created_users[UserRole.RPF_OFFICER]
            })

        # RPF Units
        rpf_units_data = [
            ('RPF Quick Reaction Team (QRT) - NDLS', 'Sub-Inspector R. K. Yadav', 'NDLS - New Delhi', '+91 11-23344556', 'Available', 28.6431, 77.2197),
            ('RPF Flying Squad Unit #2 - HWH', 'Inspector S. Roy', 'HWH - Howrah Jn', '+91 33-26601234', 'Available', 22.5838, 88.3426),
            ('RPF Platform Security Team - CSMT', 'Head Constable M. Shinde', 'CSMT - Mumbai', '+91 22-22620123', 'Dispatched', 18.9401, 72.8354),
            ('RPF Train Escort Brigade - 12301', 'Constable D. Sharma', 'On-Board Train 12301', '+91 9456781234', 'Dispatched', 26.4547, 80.3507),
        ]
        for uname, bofficer, sbase, phone, stat, lat, lng in rpf_units_data:
            RPFUnit.objects.get_or_create(unit_name=uname, defaults={
                'badge_officer': bofficer,
                'station_base': sbase,
                'phone_number': phone,
                'status': stat,
                'latitude': lat,
                'longitude': lng
            })

        # 8. Emergency Helplines
        helplines_data = [
            ('Rail Madad (All-in-One Railway Helpline)', '139', 'Railways', '24x7 Universal Helpline for Medical, Security, Catering & Enquiries', True),
            ('RPF Security & Passenger Safety', '182', 'Security', 'Immediate Railway Protection Force assistance on-board and at stations', True),
            ('National Emergency Response Service', '112', 'National', 'Unified Emergency Support for Police, Fire, and Ambulance', True),
            ('Railway Accident Emergency Information', '1072', 'Disaster', 'Accident emergency helpline & family passenger assistance', True),
            ('Women Passenger Helpline', '1091', 'Safety', '24x7 Dedicated Women Assistance & Helpline', True),
        ]
        for title, num, cat, desc, is_toll in helplines_data:
            EmergencyHelpline.objects.get_or_create(title=title, defaults={
                'number': num,
                'category': cat,
                'description': desc,
                'is_toll_free': is_toll
            })

        self.stdout.write(self.style.SUCCESS("SIH Railway Project Database seeded successfully!"))
