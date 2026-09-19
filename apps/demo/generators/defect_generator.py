from .base import BaseDataGenerator, OperationalMode

class DefectGenerator(BaseDataGenerator):
    """
    Defect & Infrastructure Risk Generator.
    Generates realistic civil, electrical, and signaling anomalies
    mapped to PostGIS assets with LoF x CoF risk matrices.
    """
    DEFECT_TEMPLATES = [
        # ENG Track Defects
        {
            'type': 'RAIL_FRACTURE',
            'category': 'PERMANENT_WAY',
            'department': 'ENG',
            'severity': 'CRITICAL',
            'lof': 5,
            'cof': 5,
            'description': 'Transverse fatigue rail fissure detected via Ultrasonic testing. Immediate containment required.',
            'asset_type': '60KG_UIC_RAIL'
        },
        {
            'type': 'USFD_WELD_FLAW',
            'category': 'PERMANENT_WAY',
            'department': 'ENG',
            'severity': 'HIGH',
            'lof': 4,
            'cof': 4,
            'description': 'Alumino-thermic weld root imperfection exceeding USFD manual permissible threshold.',
            'asset_type': 'GLUED_INSULATED_JOINT'
        },
        {
            'type': 'BALLAST_DEEP_CUSHION_DEFICIT',
            'category': 'PERMANENT_WAY',
            'department': 'ENG',
            'severity': 'MEDIUM',
            'lof': 3,
            'cof': 3,
            'description': 'Ballast consolidation deficit below sleeper bottom creating local dynamic dip.',
            'asset_type': 'PSC_SLEEPER'
        },
        # TRD OHE Defects
        {
            'type': 'OHE_CATENARY_SAG',
            'category': 'TRACTION_DISTRIBUTION',
            'department': 'TRD',
            'severity': 'HIGH',
            'lof': 4,
            'cof': 4,
            'description': 'Contact wire sag exceeding 100mm tolerance at 25kV span under high thermal load.',
            'asset_type': 'CONTACT_WIRE'
        },
        {
            'type': 'INSULATOR_POLLUTION_FLASH',
            'category': 'TRACTION_DISTRIBUTION',
            'department': 'TRD',
            'severity': 'MEDIUM',
            'lof': 3,
            'cof': 3,
            'description': 'Composite stay-arm insulator surface contamination flash risk near industrial zone.',
            'asset_type': 'STAY_INSULATOR'
        },
        # SNT Signaling Defects
        {
            'type': 'POINT_MACHINE_OBSTRUCTION',
            'category': 'SIGNAL_AND_TELECOM',
            'department': 'SNT',
            'severity': 'CRITICAL',
            'lof': 5,
            'cof': 4,
            'description': 'Point motor stroke travel lock impedance detected on crossover switch tongue rail.',
            'asset_type': 'POINT_MACHINE_143'
        },
        {
            'type': 'TRACK_CIRCUIT_DROP',
            'category': 'SIGNAL_AND_TELECOM',
            'department': 'SNT',
            'severity': 'HIGH',
            'lof': 4,
            'cof': 4,
            'description': 'Relay drop transient voltage instability across audio frequency track circuit block.',
            'asset_type': 'AF_TRACK_CIRCUIT'
        }
    ]

    def generate(self, count=1, severity_filter=None, department_filter=None):
        defects = []
        master_assets = self.master_data.get('assets', [])

        for i in range(count):
            # Select appropriate template
            templates = self.DEFECT_TEMPLATES
            if severity_filter:
                templates = [t for t in templates if t['severity'] == severity_filter] or templates
            if department_filter:
                templates = [t for t in templates if t['department'] == department_filter] or templates

            tmpl = self.rng.choice(templates)

            # Pick nearby master asset or random chainage in NDLS-CNB corridor (0.0 to 440.2 km)
            if master_assets and self.rng.random() < 0.7:
                asset = self.rng.choice(master_assets)
                chainage = float(asset.get('chainage_km', self.rng.uniform(10.0, 430.0)))
                asset_tag = asset.get('asset_tag', f"TMS-RAIL-{chainage:.1f}")
                line_type = asset.get('line_type', 'DOWN')
            else:
                chainage = round(self.rng.uniform(5.0, 435.0), 3)
                asset_tag = f"TMS-RAIL-{chainage:.1f}"
                line_type = self.rng.choice(['UP', 'DOWN'])

            lof = tmpl['lof']
            cof = tmpl['cof']
            risk_score = lof * cof
            aging_days = self.rng.randint(1, 30)

            # Generate AI "Why #1?" Priority Justification (#94)
            why_explanation = (
                f"{tmpl['severity']} {tmpl['type']} located at KM {chainage:.2f} on high-density {line_type} corridor. "
                f"Risk Score {risk_score}/25 (LoF: {lof}, CoF: {cof}) with {aging_days} days aging. "
                f"Requires immediate synchronized possession block."
            )

            defect = {
                'id': f"DEF-{len(defects) + 1:04d}-{int(chainage)}",
                'defect_code': f"DEF-{tmpl['department']}-{len(defects) + 1:03d}",
                'type': tmpl['type'],
                'category': tmpl['category'],
                'department': tmpl['department'],
                'severity': tmpl['severity'],
                'chainage_km': chainage,
                'line_type': line_type,
                'asset_tag': asset_tag,
                'description': tmpl['description'],
                'lof': lof,
                'cof': cof,
                'risk_score': risk_score,
                'aging_days': aging_days,
                'why_priority_explanation': why_explanation,
                'status': 'OPEN',
            }
            defects.append(defect)

        return defects
