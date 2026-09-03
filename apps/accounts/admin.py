from django.contrib import admin
from .models import UserProfile

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'role', 'phone_number', 'badge_number', 'assigned_station', 'created_at')
    list_filter = ('role', 'assigned_station')
    search_fields = ('user__username', 'user__email', 'phone_number', 'badge_number')
