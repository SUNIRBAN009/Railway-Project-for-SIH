from django.db import models
from django.contrib.auth.models import User

class UserRole(models.TextChoices):
    PASSENGER = 'PASSENGER', 'Passenger'
    STATION_MASTER = 'STATION_MASTER', 'Station Master'
    RPF_OFFICER = 'RPF_OFFICER', 'RPF Security Officer'
    MAINTENANCE_TECH = 'MAINTENANCE_TECH', 'Maintenance Engineer'
    ADMIN = 'ADMIN', 'Railway Administrator'

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    role = models.CharField(max_length=30, choices=UserRole.choices, default=UserRole.PASSENGER)
    phone_number = models.CharField(max_length=15, blank=True)
    badge_number = models.CharField(max_length=50, blank=True, help_text="Official ID for Railway staff")
    assigned_station = models.CharField(max_length=100, blank=True, help_text="Assigned Station Code/Name")
    assigned_division = models.CharField(max_length=100, blank=True, default="Northern Railway / Eastern Railway")
    emergency_contact = models.CharField(max_length=15, blank=True)
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username} ({self.get_role_display()})"

    @property
    def is_official(self):
        return self.role in [
            UserRole.STATION_MASTER,
            UserRole.RPF_OFFICER,
            UserRole.MAINTENANCE_TECH,
            UserRole.ADMIN
        ]
