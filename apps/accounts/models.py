import uuid
from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone


class UserRole(models.TextChoices):
    ADMIN = 'ADMIN', 'System Administrator'
    CHIEF_CONTROLLER = 'CHIEF_CONTROLLER', 'Chief Controller (COA)'
    SECTION_CONTROLLER = 'SECTION_CONTROLLER', 'Section Controller'
    DEPT_ENGINEER = 'DEPT_ENGINEER', 'Departmental Engineer (JE/SE)'
    SITE_SUPERVISOR = 'SITE_SUPERVISOR', 'Site Supervisor / Gang Leader'
    AUDITOR = 'AUDITOR', 'Operations & Safety Auditor'


class DepartmentCode(models.TextChoices):
    ENG = 'ENG', 'Engineering (Track & Civil P-Way)'
    TRD = 'TRD', 'Traction Distribution (Electrical & OHE)'
    SNT = 'SNT', 'Signal & Telecommunication'
    OPERATIONS = 'OPERATIONS', 'Operating & Traffic Control (COA)'
    SAFETY = 'SAFETY', 'Railway Safety Commissionerate'


class UserProfile(models.Model):
    """
    Extends standard Django User with Railway enterprise credentials,
    hierarchical role assignments, departmental isolation, and security lockouts.
    Authoritative reference: docs/03-service-blueprints/01-accounts.md
    """
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    employee_id = models.CharField(
        max_length=36,
        unique=True,
        db_index=True,
        default=uuid.uuid4,
        help_text="Official Indian Railways Personnel / HRMS ID (e.g., NR-ENG-4921, IR-COA-1001)"
    )
    role = models.CharField(
        max_length=30,
        choices=UserRole.choices,
        default=UserRole.DEPT_ENGINEER,
        db_index=True
    )
    department_code = models.CharField(
        max_length=20,
        choices=DepartmentCode.choices,
        default=DepartmentCode.ENG,
        db_index=True
    )
    division_code = models.CharField(
        max_length=10,
        default='DLI',
        help_text="Railway Division Code (e.g. DLI, HWH, KGP, ALD, MB)"
    )
    phone_number = models.CharField(max_length=20, blank=True)
    badge_number = models.CharField(max_length=50, blank=True, help_text="Official Station/Control Room Desk Tag")
    
    # Security, Lockout & Telemetry
    failed_login_attempts = models.PositiveIntegerField(default=0)
    locked_until = models.DateTimeField(null=True, blank=True)
    last_login_at = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['role', 'department_code']),
            models.Index(fields=['division_code']),
        ]

    def __str__(self):
        return f"[{self.employee_id}] {self.user.username} - {self.get_role_display()} ({self.get_department_code_display()})"

    @property
    def full_name(self):
        name = f"{self.user.first_name} {self.user.last_name}".strip()
        return name or self.user.username

    @property
    def is_locked(self):
        if self.locked_until and self.locked_until > timezone.now():
            return True
        return False

    @property
    def is_chief_controller(self):
        return self.role in [UserRole.CHIEF_CONTROLLER, UserRole.ADMIN]

    @property
    def is_section_controller(self):
        return self.role in [UserRole.SECTION_CONTROLLER, UserRole.CHIEF_CONTROLLER, UserRole.ADMIN]

    @property
    def is_dept_engineer(self):
        return self.role in [UserRole.DEPT_ENGINEER, UserRole.ADMIN]

    @property
    def is_controller(self):
        return self.role in [UserRole.CHIEF_CONTROLLER, UserRole.SECTION_CONTROLLER, UserRole.ADMIN]

    @property
    def can_approve_blocks(self):
        return self.role in [UserRole.CHIEF_CONTROLLER, UserRole.SECTION_CONTROLLER, UserRole.ADMIN]

    @property
    def can_request_blocks(self):
        return self.role in [UserRole.DEPT_ENGINEER, UserRole.SITE_SUPERVISOR, UserRole.ADMIN]


class UserSession(models.Model):
    """
    Tracks active refresh tokens and user sessions for real-time revocation,
    JTI blacklisting, and cryptographic session auditing.
    Authoritative reference: docs/03-service-blueprints/01-accounts.md (Section 3.1)
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sessions')
    session_jti = models.CharField(max_length=64, unique=True, db_index=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=255, blank=True)
    expires_at = models.DateTimeField()
    is_revoked = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'is_revoked']),
        ]

    def __str__(self):
        status = "REVOKED" if self.is_revoked else "ACTIVE"
        return f"Session {self.session_jti[:8]}... ({self.user.username}) - {status}"

    @property
    def is_expired(self):
        return timezone.now() >= self.expires_at

    @property
    def is_valid(self):
        return not self.is_revoked and not self.is_expired

    def revoke(self):
        self.is_revoked = True
        self.save(update_fields=['is_revoked'])
