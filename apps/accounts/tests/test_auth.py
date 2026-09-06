import json
from django.test import TestCase, Client
from django.contrib.auth.models import User
from django.contrib.auth.hashers import make_password, check_password, identify_hasher
from django.urls import reverse
from django.utils import timezone

from apps.accounts.models import UserProfile, UserRole, DepartmentCode, UserSession
from apps.accounts.auth_tokens import (
    issue_access_token,
    issue_refresh_token,
    decode_token,
    blacklist_jti,
    is_jti_blacklisted,
)
from apps.accounts.api_envelope import ApiResponse
from apps.accounts.permissions import (
    IsChiefController,
    IsSectionController,
    IsDepartmentalEngineer,
    IsAdminUser,
)


class AuthTokenAndSessionTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='test_engineer_eng',
            password='Password@123',
            email='eng_test@railways.gov.in',
            first_name='Rohan',
            last_name='Verma'
        )
        self.profile = UserProfile.objects.filter(user=self.user).first()
        if not self.profile:
            self.profile = UserProfile.objects.create(
                user=self.user,
                employee_id='NR-ENG-1122',
                role=UserRole.DEPT_ENGINEER,
                department_code=DepartmentCode.ENG,
                division_code='DLI'
            )
        else:
            self.profile.employee_id = 'NR-ENG-1122'
            self.profile.role = UserRole.DEPT_ENGINEER
            self.profile.department_code = DepartmentCode.ENG
            self.profile.save()
        self.user.refresh_from_db()

    def test_password_hashing(self):
        """Verify password hashing meets security requirements."""
        hashed = make_password('SecureRailwayPassword!2026')
        self.assertTrue(check_password('SecureRailwayPassword!2026', hashed))
        self.assertFalse(check_password('WrongPassword', hashed))

    def test_user_profile_rbac_properties(self):
        """Verify role helper capabilities on UserProfile."""
        self.assertTrue(self.profile.can_request_blocks)
        self.assertFalse(self.profile.can_approve_blocks)
        self.assertTrue(self.profile.is_dept_engineer)
        self.assertFalse(self.profile.is_chief_controller)

        # Switch to Chief Controller
        self.profile.role = UserRole.CHIEF_CONTROLLER
        self.profile.save()
        self.assertTrue(self.profile.can_approve_blocks)
        self.assertTrue(self.profile.is_chief_controller)

    def test_jwt_access_token_generation_and_decode(self):
        """Verify RS256/HMAC access token contains required claims."""
        token, payload, exp = issue_access_token(self.user)
        self.assertIsNotNone(token)
        self.assertEqual(payload['username'], 'test_engineer_eng')
        self.assertEqual(payload['employee_id'], 'NR-ENG-1122')
        self.assertEqual(payload['role'], self.profile.role)

        decoded = decode_token(token)
        self.assertEqual(decoded['user_id'], self.user.id)
        self.assertEqual(decoded['token_type'], 'access')

    def test_refresh_token_and_session_creation(self):
        """Verify UserSession persistence upon issuing refresh token."""
        token, session = issue_refresh_token(
            self.user,
            ip_address='10.12.34.56',
            user_agent='TestRunner/1.0'
        )
        self.assertIsNotNone(token)
        self.assertEqual(session.user, self.user)
        self.assertEqual(session.ip_address, '10.12.34.56')
        self.assertFalse(session.is_revoked)
        self.assertTrue(session.is_valid)

    def test_session_revocation_and_blacklist(self):
        """Verify token blacklisting marks UserSession as revoked."""
        token, session = issue_refresh_token(self.user)
        jti = session.session_jti

        self.assertFalse(is_jti_blacklisted(jti))
        blacklist_jti(jti)
        self.assertTrue(is_jti_blacklisted(jti))

        session.refresh_from_db()
        self.assertTrue(session.is_revoked)
        self.assertFalse(session.is_valid)


class AuthAPIRouteTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username='coa_officer_delhi',
            password='RailwayPassword#2026',
            email='coa@railways.gov.in',
            first_name='Vikram',
            last_name='Mehta'
        )
        self.profile = UserProfile.objects.filter(user=self.user).first()
        if not self.profile:
            self.profile = UserProfile.objects.create(
                user=self.user,
                employee_id='IR-COA-9901',
                role=UserRole.CHIEF_CONTROLLER,
                department_code=DepartmentCode.OPERATIONS,
                division_code='DLI'
            )
        else:
            self.profile.employee_id = 'IR-COA-9901'
            self.profile.role = UserRole.CHIEF_CONTROLLER
            self.profile.department_code = DepartmentCode.OPERATIONS
            self.profile.save()

    def test_api_login_success(self):
        """FUNC-AUTH-001: POST /api/v1/auth/login/ returns 200 with JWT access token."""
        url = reverse('accounts:api_login')
        payload = {
            'username': 'coa_officer_delhi',
            'password': 'RailwayPassword#2026'
        }
        response = self.client.post(url, data=json.dumps(payload), content_type='application/json')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data['success'])
        self.assertIn('access_token', data['data'])
        self.assertEqual(data['data']['user']['employee_id'], 'IR-COA-9901')
        self.assertIn('refresh_token', response.cookies)

    def test_api_login_invalid_password(self):
        """FUNC-AUTH-001: Invalid password returns 401 and tracks failed attempts."""
        url = reverse('accounts:api_login')
        payload = {
            'username': 'coa_officer_delhi',
            'password': 'WrongPassword123'
        }
        response = self.client.post(url, data=json.dumps(payload), content_type='application/json')
        self.assertEqual(response.status_code, 401)
        data = response.json()
        self.assertFalse(data['success'])
        self.assertEqual(data['error']['code'], 'AUTH-001')

    def test_api_token_refresh_rotation(self):
        """FUNC-AUTH-002: POST /api/v1/auth/refresh/ rotates refresh token."""
        refresh_token, session = issue_refresh_token(self.user)
        self.client.cookies['refresh_token'] = refresh_token

        url = reverse('accounts:api_refresh')
        response = self.client.post(url, content_type='application/json')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data['success'])
        self.assertIn('access_token', data['data'])

        # Old session should now be revoked
        session.refresh_from_db()
        self.assertTrue(session.is_revoked)

    def test_api_logout_invalidates_session(self):
        """FUNC-AUTH-003: POST /api/v1/auth/logout/ clears tokens."""
        refresh_token, session = issue_refresh_token(self.user)
        self.client.cookies['refresh_token'] = refresh_token

        url = reverse('accounts:api_logout')
        response = self.client.post(url, content_type='application/json')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data['success'])

        session.refresh_from_db()
        self.assertTrue(session.is_revoked)


class RBACPermissionClassTests(TestCase):
    def setUp(self):
        self.engineer_user = User.objects.create_user(username='eng_user', password='pwd')
        p1, _ = UserProfile.objects.get_or_create(user=self.engineer_user)
        p1.role = UserRole.DEPT_ENGINEER
        p1.save()
        self.engineer_user.refresh_from_db()

        self.controller_user = User.objects.create_user(username='coa_user', password='pwd')
        p2, _ = UserProfile.objects.get_or_create(user=self.controller_user)
        p2.role = UserRole.CHIEF_CONTROLLER
        p2.save()
        self.controller_user.refresh_from_db()

        self.admin_user = User.objects.create_superuser(username='admin_user', password='pwd', email='admin@railways.gov.in')

    def test_chief_controller_permission(self):
        perm = IsChiefController()
        
        class FakeRequest:
            def __init__(self, user):
                self.user = user

        self.assertTrue(perm.has_permission(FakeRequest(self.controller_user), None))
        self.assertTrue(perm.has_permission(FakeRequest(self.admin_user), None))
        self.assertFalse(perm.has_permission(FakeRequest(self.engineer_user), None))

    def test_departmental_engineer_permission(self):
        perm = IsDepartmentalEngineer()

        class FakeRequest:
            def __init__(self, user):
                self.user = user

        self.assertTrue(perm.has_permission(FakeRequest(self.engineer_user), None))
        self.assertTrue(perm.has_permission(FakeRequest(self.admin_user), None))


class ApiResponseEnvelopeTests(TestCase):
    def test_success_envelope(self):
        res = ApiResponse.success(data={'test': 123}, message='Operation successful')
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data['success'])
        self.assertEqual(res.data['data']['test'], 123)
        self.assertIn('timestamp', res.data)

    def test_error_envelope(self):
        res = ApiResponse.error(code='TEST-001', message='Failure reason', status_code=400)
        self.assertEqual(res.status_code, 400)
        self.assertFalse(res.data['success'])
        self.assertEqual(res.data['error']['code'], 'TEST-001')
        self.assertEqual(res.data['error']['message'], 'Failure reason')
