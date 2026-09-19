import datetime
from django.shortcuts import render, redirect
from django.contrib.auth import login, logout, authenticate
from django.contrib.auth.models import User
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from rest_framework.views import APIView
from rest_framework import permissions, status

from apps.accounts.models import UserProfile, UserRole, DepartmentCode, UserSession
from apps.accounts.serializers import (
    UserProfileSerializer,
    LoginRequestSerializer,
    UserCreateSerializer,
    UserSessionSerializer,
)
from apps.accounts.auth_tokens import (
    issue_access_token,
    issue_refresh_token,
    decode_token,
    is_jti_blacklisted,
    blacklist_jti,
)
from apps.accounts.api_envelope import ApiResponse
from apps.accounts.permissions import (
    IsChiefController,
    IsSectionController,
    IsDepartmentalEngineer,
    IsAdminUser,
)


def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        return x_forwarded_for.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


# ============================================================================
# REST API Endpoints (SVC-AUTH)
# ============================================================================

class LoginAPIView(APIView):
    """
    FUNC-AUTH-001: User Login & Authentication
    POST /api/v1/auth/login/
    Validates credentials, checks lockout, issues RS256/HMAC JWT access token and
    sets httpOnly refresh_token cookie.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return ApiResponse.error(
                code='AUTH-001',
                message='Invalid request payload.',
                details=serializer.errors,
                status_code=status.HTTP_400_BAD_REQUEST
            )

        username = serializer.validated_data['username']
        password = serializer.validated_data['password']

        user = User.objects.filter(username=username).first()
        if not user or not user.is_active:
            return ApiResponse.error(
                code='AUTH-001',
                message='Invalid employee username or password.',
                status_code=status.HTTP_401_UNAUTHORIZED
            )

        profile, _ = UserProfile.objects.get_or_create(
            user=user,
            defaults={
                'employee_id': f"EMP-{user.id:04d}",
                'role': UserRole.DEPT_ENGINEER,
                'department_code': DepartmentCode.ENG,
                'division_code': 'DLI'
            }
        )

        # Check account lockout
        if profile.is_locked:
            minutes_left = int((profile.locked_until - timezone.now()).total_seconds() / 60) + 1
            return ApiResponse.error(
                code='AUTH-003',
                message=f'Account is locked due to excessive failed attempts. Try again in {minutes_left} minutes.',
                status_code=status.HTTP_403_FORBIDDEN
            )

        # Authenticate password (supports Argon2 / PBKDF2)
        if not user.check_password(password):
            profile.failed_login_attempts += 1
            if profile.failed_login_attempts >= 5:
                profile.locked_until = timezone.now() + datetime.timedelta(minutes=15)
                profile.save(update_fields=['failed_login_attempts', 'locked_until'])
                return ApiResponse.error(
                    code='AUTH-003',
                    message='Account has been locked for 15 minutes due to 5 consecutive failed attempts.',
                    status_code=status.HTTP_403_FORBIDDEN
                )
            profile.save(update_fields=['failed_login_attempts'])
            return ApiResponse.error(
                code='AUTH-001',
                message=f'Invalid credentials. {5 - profile.failed_login_attempts} attempts remaining before lockout.',
                status_code=status.HTTP_401_UNAUTHORIZED
            )

        # Reset failed attempts on success
        profile.failed_login_attempts = 0
        profile.last_login_at = timezone.now()
        profile.save(update_fields=['failed_login_attempts', 'last_login_at'])

        # Issue tokens
        ip_addr = get_client_ip(request)
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        access_token, access_payload, exp = issue_access_token(user)
        refresh_token, session = issue_refresh_token(user, ip_address=ip_addr, user_agent=user_agent)

        response = ApiResponse.success(
            data={
                'access_token': access_token,
                'token_type': 'Bearer',
                'expires_in': 900,
                'user': {
                    'id': user.id,
                    'employee_id': profile.employee_id,
                    'username': user.username,
                    'full_name': profile.full_name,
                    'role': profile.role,
                    'role_display': profile.get_role_display(),
                    'department_code': profile.department_code,
                    'department_display': profile.get_department_code_display(),
                    'division_code': profile.division_code,
                }
            },
            message='Authentication successful. Terminal session established.'
        )

        # Set httpOnly secure refresh cookie (7 days)
        response.set_cookie(
            key='refresh_token',
            value=refresh_token,
            max_age=7 * 24 * 3600,
            httponly=True,
            secure=False,  # Allow http in development
            samesite='Lax',
            path='/api/v1/auth/'
        )

        return response


class TokenRefreshAPIView(APIView):
    """
    FUNC-AUTH-002: Token Refresh Rotation
    POST /api/v1/auth/refresh/
    Extracts refresh_token cookie, validates, revokes old refresh token (anti-replay),
    and issues a new access token and rotated refresh cookie.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        token = request.COOKIES.get('refresh_token') or request.data.get('refresh_token')
        if not token:
            return ApiResponse.error(
                code='AUTH-002',
                message='Refresh token not provided in cookie or payload.',
                status_code=status.HTTP_400_BAD_REQUEST
            )

        try:
            payload = decode_token(token)
        except Exception:
            return ApiResponse.error(
                code='AUTH-002',
                message='Refresh token is invalid or expired.',
                status_code=status.HTTP_401_UNAUTHORIZED
            )

        jti = payload.get('jti')
        user_id = payload.get('user_id')

        # Check blacklist
        if is_jti_blacklisted(jti):
            # Token reuse attack detected: revoke all sessions for this user
            UserSession.objects.filter(user_id=user_id).update(is_revoked=True)
            return ApiResponse.error(
                code='AUTH-004',
                message='Revoked token reuse detected. All active sessions terminated.',
                status_code=status.HTTP_401_UNAUTHORIZED
            )

        user = User.objects.filter(id=user_id, is_active=True).first()
        if not user:
            return ApiResponse.error(
                code='AUTH-001',
                message='User account no longer active.',
                status_code=status.HTTP_401_UNAUTHORIZED
            )

        # Blacklist used refresh token
        blacklist_jti(jti, remaining_seconds=7 * 24 * 3600)

        # Issue new tokens
        ip_addr = get_client_ip(request)
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        new_access_token, _, _ = issue_access_token(user)
        new_refresh_token, _ = issue_refresh_token(user, ip_address=ip_addr, user_agent=user_agent)

        response = ApiResponse.success(
            data={
                'access_token': new_access_token,
                'token_type': 'Bearer',
                'expires_in': 900
            },
            message='Access token rotated successfully.'
        )

        response.set_cookie(
            key='refresh_token',
            value=new_refresh_token,
            max_age=7 * 24 * 3600,
            httponly=True,
            secure=False,
            samesite='Lax',
            path='/api/v1/auth/'
        )
        return response


class LogoutAPIView(APIView):
    """
    FUNC-AUTH-003: Session Logout & Invalidation
    POST /api/v1/auth/logout/
    Revokes refresh token JTI and access token, marks UserSession revoked,
    and clears cookie.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        # Invalidate refresh token cookie
        refresh_token = request.COOKIES.get('refresh_token') or request.data.get('refresh_token')
        if refresh_token:
            try:
                payload = decode_token(refresh_token, verify_exp=False)
                jti = payload.get('jti')
                if jti:
                    blacklist_jti(jti)
            except Exception:
                pass

        # Invalidate current access token if present in header
        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            access_token = auth_header.split(' ')[1]
            try:
                payload = decode_token(access_token, verify_exp=False)
                jti = payload.get('jti')
                if jti:
                    blacklist_jti(jti)
            except Exception:
                pass

        # Clear Django session if authenticated
        if request.user.is_authenticated:
            UserSession.objects.filter(user=request.user, is_revoked=False).update(is_revoked=True)
            logout(request)

        response = ApiResponse.success(message='Session terminated and security tokens revoked.')
        response.delete_cookie('refresh_token', path='/api/v1/auth/')
        return response


class CurrentUserAPIView(APIView):
    """
    FUNC-AUTH-004: Get Current User Context
    GET /api/v1/auth/me/
    Returns full profile, assigned division, role capabilities, and permissions.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        serializer = UserProfileSerializer(profile)
        
        # Operational capabilities
        capabilities = {
            'can_approve_blocks': profile.can_approve_blocks,
            'can_request_blocks': profile.can_request_blocks,
            'is_chief_controller': profile.is_chief_controller,
            'is_section_controller': profile.is_section_controller,
            'is_dept_engineer': profile.is_dept_engineer,
            'is_controller': profile.is_controller,
        }

        return ApiResponse.success(
            data={
                **serializer.data,
                'capabilities': capabilities
            }
        )


class UserDirectoryAPIView(APIView):
    """
    FUNC-AUTH-005 & FUNC-AUTH-006: User Directory Management
    GET /api/v1/users/ - List users with departmental & role filters
    POST /api/v1/users/ - Provision new railway operational user
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        qs = UserProfile.objects.select_related('user').all()

        dept = request.query_params.get('department')
        role = request.query_params.get('role')
        division = request.query_params.get('division')

        if dept:
            qs = qs.filter(department_code=dept.upper())
        if role:
            qs = qs.filter(role=role.upper())
        if division:
            qs = qs.filter(division_code=division.upper())

        serializer = UserProfileSerializer(qs[:50], many=True)
        return ApiResponse.success(data=serializer.data, extra={'total_records': qs.count()})

    def post(self, request):
        # Admin or Chief Controller required
        profile = getattr(request.user, 'profile', None)
        if not (request.user.is_superuser or (profile and profile.is_chief_controller)):
            return ApiResponse.error(
                code='AUTH-403',
                message='Only System Administrators and Chief Controllers can provision users.',
                status_code=status.HTTP_403_FORBIDDEN
            )

        serializer = UserCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return ApiResponse.error(
                code='AUTH-400',
                message='User creation validation failed.',
                details=serializer.errors,
                status_code=status.HTTP_400_BAD_REQUEST
            )

        new_profile = serializer.save()
        return ApiResponse.success(
            data=UserProfileSerializer(new_profile).data,
            message=f"Personnel record created for {new_profile.employee_id}.",
            status_code=status.HTTP_201_CREATED
        )


# ============================================================================
# Server-Side Rendered Views (HTMX + Alpine.js + Tailwind CSS)
# ============================================================================

def login_view(request):
    """
    Railway Operations Login Portal with HTMX validation & role tabs.
    """
    if request.user.is_authenticated:
        return redirect('core:dashboard')

    if request.method == 'POST':
        username = request.POST.get('username', '').strip()
        password = request.POST.get('password', '')

        user = authenticate(request, username=username, password=password)
        if user is not None:
            profile, _ = UserProfile.objects.get_or_create(user=user)
            if profile.is_locked:
                messages.error(request, "Account is currently locked. Please contact Division Controller.")
                return render(request, 'accounts/login.html', {'username': username})

            login(request, user)
            profile.failed_login_attempts = 0
            profile.last_login_at = timezone.now()
            profile.save(update_fields=['failed_login_attempts', 'last_login_at'])

            # Issue refresh token cookie
            _, session = issue_refresh_token(user, ip_address=get_client_ip(request), user_agent=request.META.get('HTTP_USER_AGENT', ''))
            
            messages.success(request, f"Welcome, {profile.full_name} ({profile.get_role_display()} - {profile.get_department_code_display()}).")
            
            # If request is HTMX, tell it to redirect
            if request.headers.get('HX-Request'):
                response = render(request, 'accounts/login_success_partial.html', {'profile': profile})
                response['HX-Redirect'] = '/dashboard/'
                return response

            next_url = request.GET.get('next', '/dashboard/')
            return redirect(next_url)
        else:
            messages.error(request, "Invalid Railway Personnel username or password.")
            if request.headers.get('HX-Request'):
                return render(request, 'accounts/login_error_partial.html', {'error': 'Invalid credentials.'})

    return render(request, 'accounts/login.html')


def logout_view(request):
    """
    Logs out user, revokes session, and redirects to home.
    """
    if request.user.is_authenticated:
        UserSession.objects.filter(user=request.user, is_revoked=False).update(is_revoked=True)
    logout(request)
    messages.info(request, "Operations terminal session closed successfully.")
    response = redirect('core:home')
    response.delete_cookie('refresh_token', path='/api/v1/auth/')
    return response


@login_required
def profile_view(request):
    """
    Operational User Profile & Active Sessions View.
    """
    profile, _ = UserProfile.objects.get_or_create(user=request.user)
    sessions = UserSession.objects.filter(user=request.user).order_by('-created_at')[:10]

    return render(request, 'accounts/profile.html', {
        'profile': profile,
        'sessions': sessions,
    })


def demo_role_switch(request, role_name):
    """
    1-Click Departmental Role Switcher for Hackathon / SIH PS 26027 Evaluation.
    Creates and authenticates authentic operational personas:
    - coa: Chief Controller (COA / Operations)
    - eng: Track Engineer (Civil / Track P-Way)
    - trd: OHE Engineer (Traction Distribution)
    - snt: Signal & Telecom Engineer
    - controller: Section Controller (Traffic)
    - admin: System Administrator
    """
    role_specs = {
        'coa': {
            'username': 'coa_delhi_chief',
            'first_name': 'Rajesh',
            'last_name': 'Verma',
            'employee_id': 'IR-COA-1001',
            'role': UserRole.CHIEF_CONTROLLER,
            'dept': DepartmentCode.OPERATIONS,
            'division': 'DLI',
            'badge': 'DESK-COA-NORTH-01',
            'title': 'Chief Controller (COA)'
        },
        'eng': {
            'username': 'eng_track_pway',
            'first_name': 'Amit',
            'last_name': 'Sharma',
            'employee_id': 'NR-ENG-4921',
            'role': UserRole.DEPT_ENGINEER,
            'dept': DepartmentCode.ENG,
            'division': 'DLI',
            'badge': 'JE-PWAY-TK-204',
            'title': 'Senior Section Engineer (Track / P-Way)'
        },
        'trd': {
            'username': 'trd_ohe_power',
            'first_name': 'Vikram',
            'last_name': 'Singh',
            'employee_id': 'NR-TRD-8842',
            'role': UserRole.DEPT_ENGINEER,
            'dept': DepartmentCode.TRD,
            'division': 'DLI',
            'badge': 'SSE-TRD-OHE-102',
            'title': 'Traction Distribution Engineer (OHE)'
        },
        'snt': {
            'username': 'snt_signal_telecom',
            'first_name': 'Pooja',
            'last_name': 'Mishra',
            'employee_id': 'NR-SNT-3319',
            'role': UserRole.DEPT_ENGINEER,
            'dept': DepartmentCode.SNT,
            'division': 'DLI',
            'badge': 'JE-SIGNAL-INTERLOCK-55',
            'title': 'Signal & Telecom Engineer'
        },
        'controller': {
            'username': 'sec_controller_dli',
            'first_name': 'Sunil',
            'last_name': 'Yadav',
            'employee_id': 'NR-OPS-2201',
            'role': UserRole.SECTION_CONTROLLER,
            'dept': DepartmentCode.OPERATIONS,
            'division': 'DLI',
            'badge': 'SEC-CTRL-DLI-MAIN',
            'title': 'Section Controller'
        },
        'admin': {
            'username': 'admin_sysops',
            'first_name': 'System',
            'last_name': 'Administrator',
            'employee_id': 'HQ-ADMIN-0001',
            'role': UserRole.ADMIN,
            'dept': DepartmentCode.OPERATIONS,
            'division': 'HQ',
            'badge': 'HQ-SYS-ROOT',
            'title': 'Railway System Administrator'
        }
    }

    spec = role_specs.get(role_name)
    if not spec:
        messages.error(request, "Unknown role profile requested.")
        return redirect('core:home')

    user, created = User.objects.get_or_create(
        username=spec['username'],
        defaults={
            'email': f"{spec['username']}@railways.gov.in",
            'first_name': spec['first_name'],
            'last_name': spec['last_name'],
            'is_staff': (spec['role'] == UserRole.ADMIN),
            'is_superuser': (spec['role'] == UserRole.ADMIN),
        }
    )

    if created:
        user.set_password('railway@123')
        user.save()

    profile, _ = UserProfile.objects.get_or_create(user=user)
    profile.employee_id = spec['employee_id']
    profile.role = spec['role']
    profile.department_code = spec['dept']
    profile.division_code = spec['division']
    profile.badge_number = spec['badge']
    profile.failed_login_attempts = 0
    profile.locked_until = None
    profile.last_login_at = timezone.now()
    profile.save()

    login(request, user)
    
    # Issue refresh token session
    issue_refresh_token(user, ip_address=get_client_ip(request), user_agent="SIH Evaluation Quick Switcher")

    messages.success(request, f"⚡ Switched into Role: {spec['title']} ({spec['dept']} Dept | {spec['division']} Div)")
    return redirect('core:dashboard')
