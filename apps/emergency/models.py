import random
from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone

class EmergencyType(models.TextChoices):
    SECURITY = 'SECURITY', '🚨 Security Threat / Violence / Assault'
    MEDICAL = 'MEDICAL', '🚑 Critical Medical Emergency'
    FIRE_SMOKE = 'FIRE_SMOKE', '🔥 Fire / Smoke / Short Circuit'
    HARASSMENT = 'HARASSMENT', '⚠️ Women Safety / Harassment'
    SUSPICIOUS_OBJECT = 'SUSPICIOUS_OBJECT', '💣 Unattended / Suspicious Object'
    COACH_DISASTER = 'COACH_DISASTER', '💥 Derailment / Train Incident'

class SOSStatus(models.TextChoices):
    ACTIVE = 'ACTIVE', '🔴 Active / Blinking Beacon'
    RESPONDING = 'RESPONDING', '🟡 RPF Dispatched / En Route'
    RESOLVED = 'RESOLVED', '🟢 Neutralized & Safe'
    FALSE_ALARM = 'FALSE_ALARM', '⚪ False Alarm'

def generate_sos_id():
    date_str = timezone.now().strftime("%y%m%d%H%M")
    rand_val = random.randint(10, 99)
    return f"SOS-{date_str}-{rand_val}"

class SOSAlert(models.Model):
    alert_id = models.CharField(max_length=30, unique=True, default=generate_sos_id, editable=False)
    passenger = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='triggered_sos_alerts')
    passenger_name = models.CharField(max_length=120)
    passenger_phone = models.CharField(max_length=15)
    
    emergency_type = models.CharField(max_length=30, choices=EmergencyType.choices, default=EmergencyType.SECURITY)
    train_number = models.CharField(max_length=20, blank=True)
    coach_number = models.CharField(max_length=10, blank=True)
    seat_number = models.CharField(max_length=10, blank=True)
    current_location_desc = models.CharField(max_length=200, blank=True, help_text="e.g. Between Allahabad & Pt. Deen Dayal Upadhyaya Jn")
    
    latitude = models.FloatField(default=28.6139)
    longitude = models.FloatField(default=77.2090)
    
    details = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=SOSStatus.choices, default=SOSStatus.ACTIVE)
    
    acknowledged_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='acknowledged_sos_alerts')
    rpf_unit_dispatched = models.CharField(max_length=150, blank=True, default="RPF Quick Reaction Team (QRT)")
    response_notes = models.TextField(blank=True)
    
    triggered_at = models.DateTimeField(auto_now_add=True)
    acknowledged_at = models.DateTimeField(null=True, blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-triggered_at']

    def __str__(self):
        return f"{self.alert_id} ({self.get_emergency_type_display()}) - {self.status}"

class RPFUnit(models.Model):
    unit_name = models.CharField(max_length=120)
    badge_officer = models.CharField(max_length=100)
    station_base = models.CharField(max_length=100)
    phone_number = models.CharField(max_length=20)
    status = models.CharField(max_length=20, default="Available", choices=[
        ('Available', 'Available / On Patrol'),
        ('Dispatched', 'Dispatched on Incident'),
        ('Off_Duty', 'Off Duty'),
    ])
    latitude = models.FloatField(default=28.6139)
    longitude = models.FloatField(default=77.2090)

    class Meta:
        ordering = ['unit_name']

    def __str__(self):
        return f"{self.unit_name} ({self.station_base}) - {self.status}"

class EmergencyHelpline(models.Model):
    title = models.CharField(max_length=100)
    number = models.CharField(max_length=50)
    category = models.CharField(max_length=50, default="Railways")
    description = models.CharField(max_length=200, blank=True)
    is_toll_free = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.title}: {self.number}"
