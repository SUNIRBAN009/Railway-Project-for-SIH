import random
from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone

class DefectType(models.TextChoices):
    TRACK_CRACK = 'TRACK_CRACK', 'Track Rail Fracture / Crack'
    JOINT_GAP = 'JOINT_GAP', 'Fishplate / Rail Joint Gap'
    OHE_SAG = 'OHE_SAG', 'Overhead Wire (OHE) Sag / Tension Drop'
    WHEEL_HOT_AXLE = 'WHEEL_HOT_AXLE', 'Wheel Flat / Hot Axle Box Temperature'
    PANTOGRAPH_FAULT = 'PANTOGRAPH_FAULT', 'Pantograph Arc / Entanglement'
    SIGNAL_INTERLOCK = 'SIGNAL_INTERLOCK', 'Track Circuit / Signal Interlock Glitch'
    COACH_MECHANICAL = 'COACH_MECHANICAL', 'Coach Automatic Door / Brake Pipe Failure'

class DefectSeverity(models.TextChoices):
    CRITICAL = 'CRITICAL', '🔴 Critical (Immediate Train Halt Required)'
    MAJOR = 'MAJOR', '🟠 Major (Speed Restriction 30 km/h)'
    MINOR = 'MINOR', '🟡 Minor (Schedule Routine Maintenance)'

class DefectStatus(models.TextChoices):
    DETECTED = 'DETECTED', 'Detected / AI Alerted'
    ASSIGNED = 'ASSIGNED', 'Assigned to Crew'
    IN_REPAIR = 'IN_REPAIR', 'Maintenance In Progress'
    RESOLVED = 'RESOLVED', 'Repaired & Cleared'
    VERIFIED = 'VERIFIED', 'Safety Certified & Closed'

def generate_defect_id():
    date_str = timezone.now().strftime("%y%m%d")
    rand_val = random.randint(100, 999)
    return f"DFT-{date_str}-{rand_val}"

class DefectReport(models.Model):
    report_id = models.CharField(max_length=30, unique=True, default=generate_defect_id, editable=False)
    defect_type = models.CharField(max_length=40, choices=DefectType.choices, default=DefectType.TRACK_CRACK)
    severity = models.CharField(max_length=20, choices=DefectSeverity.choices, default=DefectSeverity.MAJOR)
    section_name = models.CharField(max_length=150, help_text="e.g. Kanpur - Prayagraj Section")
    track_km_marker = models.CharField(max_length=50, help_text="e.g. KM 442/18 - 442/20")
    latitude = models.FloatField(default=28.6139)
    longitude = models.FloatField(default=77.2090)
    
    train_number = models.CharField(max_length=20, blank=True, help_text="If detected on coach or rolling stock")
    coach_number = models.CharField(max_length=20, blank=True)
    
    description = models.TextField()
    ai_confidence_score = models.FloatField(default=92.5, help_text="AI Model Confidence % (e.g. 94.2%)")
    detected_by = models.CharField(max_length=100, default="RailVision AI Camera / Sensor Array")
    
    photo = models.ImageField(upload_to='maintenance_defects/', blank=True, null=True)
    status = models.CharField(max_length=30, choices=DefectStatus.choices, default=DefectStatus.DETECTED)
    reported_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.report_id} - {self.get_defect_type_display()} ({self.section_name})"

def generate_work_order_id():
    date_str = timezone.now().strftime("%y%m%d")
    rand_val = random.randint(100, 999)
    return f"WO-{date_str}-{rand_val}"

class WorkOrder(models.Model):
    order_id = models.CharField(max_length=30, unique=True, default=generate_work_order_id, editable=False)
    defect = models.ForeignKey(DefectReport, on_delete=models.CASCADE, related_name='work_orders')
    assigned_crew = models.CharField(max_length=150, default="Track Inspection Gang #4 - Northern Railway")
    assigned_engineer = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_work_orders')
    target_completion_time = models.DateTimeField(null=True, blank=True)
    repair_summary = models.TextField(blank=True)
    status = models.CharField(max_length=30, default="Assigned", choices=[
        ('Assigned', 'Assigned'),
        ('Dispatched', 'Team Dispatched on Site'),
        ('Work_Completed', 'Work Completed'),
        ('Safety_Certified', 'Safety Certified'),
    ])
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.order_id} -> Defect {self.defect.report_id}"
