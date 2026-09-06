from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth.models import User
from .models import UserProfile, UserRole, DepartmentCode


@receiver(post_save, sender=User)
def create_or_update_user_profile(sender, instance, created, **kwargs):
    if created:
        role = UserRole.ADMIN if instance.is_superuser else UserRole.DEPT_ENGINEER
        dept = DepartmentCode.OPERATIONS if instance.is_superuser else DepartmentCode.ENG
        emp_id = f"IR-{role[:3]}-{instance.id:04d}" if instance.id else f"IR-EMP-{instance.username[:6].upper()}"
        UserProfile.objects.create(
            user=instance,
            employee_id=emp_id,
            role=role,
            department_code=dept,
            division_code='DLI'
        )
    else:
        if hasattr(instance, 'profile'):
            instance.profile.save()
