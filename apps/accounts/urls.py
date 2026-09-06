from django.urls import path
from . import views

app_name = 'accounts'

urlpatterns = [
    # Server-Side Rendered (HTMX + Alpine.js + Tailwind) Pages
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('profile/', views.profile_view, name='profile'),
    path('demo-switch/<str:role_name>/', views.demo_role_switch, name='demo_switch'),

    # REST API Endpoints (SVC-AUTH)
    path('api/v1/auth/login/', views.LoginAPIView.as_view(), name='api_login'),
    path('api/v1/auth/refresh/', views.TokenRefreshAPIView.as_view(), name='api_refresh'),
    path('api/v1/auth/logout/', views.LogoutAPIView.as_view(), name='api_logout'),
    path('api/v1/auth/me/', views.CurrentUserAPIView.as_view(), name='api_me'),
    path('api/v1/users/', views.UserDirectoryAPIView.as_view(), name='api_users'),
]
