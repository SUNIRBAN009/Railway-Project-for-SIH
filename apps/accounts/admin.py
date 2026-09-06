from django.contrib import admin
from .models import UserProfile, UserSession


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('employee_id', 'user', 'role', 'department_code', 'division_code', 'phone_number', 'last_login_at', 'created_at')
    list_filter = ('role', 'department_code', 'division_code')
    search_fields = ('employee_id', 'user__username', 'user__email', 'phone_number', 'badge_number')
    ordering = ('-created_at',)


@admin.register(UserSession)
class UserSessionAdmin(admin.ModelAdmin):
    list_display = ('session_jti', 'user', 'ip_address', 'expires_at', 'is_revoked', 'created_at')
    list_filter = ('is_revoked',)
    search_fields = ('session_jti', 'user__username', 'ip_address')
    ordering = ('-created_at',)
