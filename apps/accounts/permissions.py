from functools import wraps
from django.shortcuts import redirect
from django.contrib import messages
from rest_framework import permissions
from apps.accounts.models import UserRole, DepartmentCode


class IsAdminUser(permissions.BasePermission):
    """
    Allows access only to System Administrators or superusers.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        profile = getattr(request.user, 'profile', None)
        if not profile:
            return request.user.is_superuser
        return (profile.role == UserRole.ADMIN) or request.user.is_superuser


class IsChiefController(permissions.BasePermission):
    """
    Allows access only to Chief Controllers (COA) and System Administrators.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        profile = getattr(request.user, 'profile', None)
        if not profile:
            return request.user.is_superuser
        return profile.role in [UserRole.CHIEF_CONTROLLER, UserRole.ADMIN] or request.user.is_superuser


class IsSectionController(permissions.BasePermission):
    """
    Allows access to Section Controllers, Chief Controllers, and Administrators.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        profile = getattr(request.user, 'profile', None)
        if not profile:
            return request.user.is_superuser
        return profile.role in [
            UserRole.SECTION_CONTROLLER,
            UserRole.CHIEF_CONTROLLER,
            UserRole.ADMIN
        ] or request.user.is_superuser


class IsDepartmentalEngineer(permissions.BasePermission):
    """
    Allows access to Departmental Engineers (ENG, TRD, SNT) and Administrators.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        profile = getattr(request.user, 'profile', None)
        if not profile:
            return request.user.is_superuser
        return profile.role in [
            UserRole.DEPT_ENGINEER,
            UserRole.SITE_SUPERVISOR,
            UserRole.ADMIN
        ] or request.user.is_superuser


class IsSiteSupervisor(permissions.BasePermission):
    """
    Allows access to Site Supervisors, Departmental Engineers, and Administrators.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        profile = getattr(request.user, 'profile', None)
        if not profile:
            return request.user.is_superuser
        return profile.role in [
            UserRole.SITE_SUPERVISOR,
            UserRole.DEPT_ENGINEER,
            UserRole.ADMIN
        ] or request.user.is_superuser


class IsAuditor(permissions.BasePermission):
    """
    Allows read-only audit inspection for Safety / Operations Auditors and Admins.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        profile = getattr(request.user, 'profile', None)
        if not profile:
            return request.user.is_superuser
        return profile.role in [
            UserRole.AUDITOR,
            UserRole.CHIEF_CONTROLLER,
            UserRole.ADMIN
        ] or request.user.is_superuser


class HasDepartment(permissions.BasePermission):
    """
    Dynamic permission checking if the user belongs to allowed department codes.
    """
    def __init__(self, allowed_departments):
        self.allowed_departments = allowed_departments

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.user.is_superuser:
            return True
        profile = getattr(request.user, 'profile', None)
        if not profile:
            return False
        return profile.department_code in self.allowed_departments


# ============================================================================
# Django Template View Decorators (for HTMX & SSR Pages)
# ============================================================================

def role_required(*allowed_roles):
    def decorator(view_func):
        @wraps(view_func)
        def _wrapped_view(request, *args, **kwargs):
            if not request.user.is_authenticated:
                messages.warning(request, "Please log in to access this operational terminal.")
                return redirect('accounts:login')

            profile = getattr(request.user, 'profile', None)
            if request.user.is_superuser or (profile and profile.role in allowed_roles):
                return view_func(request, *args, **kwargs)

            messages.error(request, f"Access denied. Required operational role: {', '.join(allowed_roles)}")
            return redirect('core:dashboard')
        return _wrapped_view
    return decorator


def controller_required(view_func):
    return role_required(UserRole.CHIEF_CONTROLLER, UserRole.SECTION_CONTROLLER, UserRole.ADMIN)(view_func)


def engineer_required(view_func):
    return role_required(UserRole.DEPT_ENGINEER, UserRole.SITE_SUPERVISOR, UserRole.ADMIN)(view_func)
