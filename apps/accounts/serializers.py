from rest_framework import serializers
from django.contrib.auth.models import User
from apps.accounts.models import UserProfile, UserRole, DepartmentCode, UserSession


class UserProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    first_name = serializers.CharField(source='user.first_name', read_only=True)
    last_name = serializers.CharField(source='user.last_name', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    full_name = serializers.CharField(read_only=True)
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    department_display = serializers.CharField(source='get_department_code_display', read_only=True)

    class Meta:
        model = UserProfile
        fields = [
            'id',
            'username',
            'employee_id',
            'first_name',
            'last_name',
            'full_name',
            'email',
            'phone_number',
            'role',
            'role_display',
            'department_code',
            'department_display',
            'division_code',
            'badge_number',
            'last_login_at',
            'created_at',
        ]


class LoginRequestSerializer(serializers.Serializer):
    username = serializers.CharField(required=True, min_length=3, max_length=50)
    password = serializers.CharField(required=True, min_length=4, max_length=128, write_only=True)


class UserCreateSerializer(serializers.ModelSerializer):
    username = serializers.CharField(required=True, min_length=3, max_length=50)
    password = serializers.CharField(required=True, min_length=8, write_only=True)
    email = serializers.EmailField(required=True)
    first_name = serializers.CharField(required=True, max_length=50)
    last_name = serializers.CharField(required=True, max_length=50)
    employee_id = serializers.CharField(required=True, max_length=30)
    role = serializers.ChoiceField(choices=UserRole.choices, default=UserRole.DEPT_ENGINEER)
    department_code = serializers.ChoiceField(choices=DepartmentCode.choices, default=DepartmentCode.ENG)
    division_code = serializers.CharField(default='DLI', max_length=10)
    phone_number = serializers.CharField(required=False, allow_blank=True, max_length=20)

    class Meta:
        model = UserProfile
        fields = [
            'username',
            'password',
            'email',
            'first_name',
            'last_name',
            'employee_id',
            'role',
            'department_code',
            'division_code',
            'phone_number',
        ]

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name'],
        )
        profile = UserProfile.objects.create(
            user=user,
            employee_id=validated_data['employee_id'],
            role=validated_data.get('role', UserRole.DEPT_ENGINEER),
            department_code=validated_data.get('department_code', DepartmentCode.ENG),
            division_code=validated_data.get('division_code', 'DLI'),
            phone_number=validated_data.get('phone_number', ''),
        )
        return profile


class UserSessionSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = UserSession
        fields = [
            'id',
            'username',
            'session_jti',
            'ip_address',
            'user_agent',
            'expires_at',
            'is_revoked',
            'created_at',
        ]
