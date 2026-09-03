import uuid
import random
from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from .ai_classifier import analyze_grievance_text

class GrievanceCategory(models.TextChoices):
    SECURITY = 'SECURITY', 'Security / RPF Assistance'
    MEDICAL = 'MEDICAL', 'Medical Emergency'
    CLEANLINESS = 'CLEANLINESS', 'Cleanliness & Sanitation (Coach Mitra)'
    ELECTRICAL = 'ELECTRICAL', 'Electrical & Air Conditioning'
    CATERING = 'CATERING', 'Food & Catering Services'
    STAFF_BEHAVIOR = 'STAFF_BEHAVIOR', 'Staff / TTE Conduct'
    DELAY_INFRA = 'DELAY_INFRA', 'Train Delay & Infrastructure'
    GENERAL = 'GENERAL', 'General Inquiry & Miscellaneous'

class GrievancePriority(models.TextChoices):
    CRITICAL = 'CRITICAL', '🔴 Critical (Emergency / Safety)'
    HIGH = 'HIGH', '🟠 High (Major Comfort / Sanitation)'
    MEDIUM = 'MEDIUM', '🟡 Medium (Standard Maintenance)'
    LOW = 'LOW', '🟢 Low (Minor / General)'

class GrievanceStatus(models.TextChoices):
    OPEN = 'OPEN', 'Open / Registered'
    IN_PROGRESS = 'IN_PROGRESS', 'In Progress / Assigned'
    RESOLVED = 'RESOLVED', 'Resolved'
    CLOSED = 'CLOSED', 'Closed / Verified'

def generate_tracking_id():
    date_str = timezone.now().strftime("%Y%m%d")
    rand_suffix = random.randint(1000, 9999)
    return f"GRV-{date_str}-{rand_suffix}"

class Grievance(models.Model):
    tracking_id = models.CharField(max_length=30, unique=True, default=generate_tracking_id, editable=False)
    passenger = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='lodged_grievances')
    passenger_name = models.CharField(max_length=120)
    passenger_phone = models.CharField(max_length=15)
    pnr_number = models.CharField(max_length=10, blank=True, help_text="10-digit Indian Railways PNR")
    train_number = models.CharField(max_length=10, blank=True)
    coach_number = models.CharField(max_length=10, blank=True, help_text="e.g. B3, S6")
    seat_number = models.CharField(max_length=10, blank=True, help_text="e.g. 42")
    current_station = models.CharField(max_length=100, blank=True, help_text="Nearest station or train location")
    
    category = models.CharField(max_length=30, choices=GrievanceCategory.choices, default=GrievanceCategory.GENERAL)
    subject = models.CharField(max_length=200)
    description = models.TextField()
    
    priority = models.CharField(max_length=20, choices=GrievancePriority.choices, default=GrievancePriority.MEDIUM)
    status = models.CharField(max_length=20, choices=GrievanceStatus.choices, default=GrievanceStatus.OPEN)
    
    # AI Automation Fields
    urgency_score = models.PositiveIntegerField(default=50, help_text="AI calculated urgency 0-100")
    sentiment_label = models.CharField(max_length=50, default="Negative")
    is_ai_escalated = models.BooleanField(default=False)
    
    assigned_department = models.CharField(max_length=100, blank=True, default="On-Board Housekeeping / OBHS")
    assigned_to = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_grievances')
    
    attachment = models.ImageField(upload_to='grievance_attachments/', blank=True, null=True)
    resolution_notes = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.tracking_id} - {self.subject} ({self.get_status_display()})"

    def save(self, *args, **kwargs):
        # Trigger AI analysis if priority not manually locked or on creation
        if not self.pk:
            ai_data = analyze_grievance_text(self.description, self.category)
            self.priority = ai_data['priority']
            self.urgency_score = ai_data['urgency_score']
            self.sentiment_label = ai_data['sentiment']
            self.is_ai_escalated = ai_data['is_critical']
            
            # Auto-assign department based on category
            dept_map = {
                GrievanceCategory.SECURITY: 'Railway Protection Force (RPF)',
                GrievanceCategory.MEDICAL: 'Railway Medical Rapid Response Unit',
                GrievanceCategory.CLEANLINESS: 'On-Board Housekeeping Staff (OBHS)',
                GrievanceCategory.ELECTRICAL: 'Electrical Maintenance & AC Crew',
                GrievanceCategory.CATERING: 'IRCTC Pantry & Catering Quality Cell',
                GrievanceCategory.STAFF_BEHAVIOR: 'Commercial Railway Division / TTE Vigilance',
                GrievanceCategory.DELAY_INFRA: 'Station Master & Control Room',
                GrievanceCategory.GENERAL: 'Rail Passenger Assistance Desk',
            }
            if not self.assigned_department or self.assigned_department == "On-Board Housekeeping / OBHS":
                self.assigned_department = dept_map.get(self.category, 'Rail Passenger Assistance Desk')
                
        super().save(*args, **kwargs)

class GrievanceComment(models.Model):
    grievance = models.ForeignKey(Grievance, on_delete=models.CASCADE, related_name='comments')
    author = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    author_name = models.CharField(max_length=100, blank=True)
    message = models.TextField()
    is_official_update = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"Comment on {self.grievance.tracking_id} by {self.author_name or 'User'}"

class GrievanceAuditLog(models.Model):
    grievance = models.ForeignKey(Grievance, on_delete=models.CASCADE, related_name='audit_logs')
    performed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    old_status = models.CharField(max_length=30)
    new_status = models.CharField(max_length=30)
    remarks = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"Audit {self.grievance.tracking_id}: {self.old_status} -> {self.new_status}"
