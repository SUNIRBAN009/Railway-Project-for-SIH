"""
URL configuration for railway_sih project.
Indian Railways AI Automatic Block Planning Platform (PS 26027).
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

from apps.core.metrics import prometheus_metrics_view
from apps.core.views import api_health_check_view
from apps.accounts import views as accounts_views

urlpatterns = [
    path('admin/', admin.site.urls),
    path('metrics', prometheus_metrics_view, name='prometheus_metrics'),
    path('api/v1/health/', api_health_check_view, name='api_health'),
    path('api/v1/auth/login/', accounts_views.LoginAPIView.as_view(), name='api_v1_login'),
    path('api/v1/auth/refresh/', accounts_views.TokenRefreshAPIView.as_view(), name='api_v1_refresh'),
    path('api/v1/auth/logout/', accounts_views.LogoutAPIView.as_view(), name='api_v1_logout'),
    path('api/v1/auth/me/', accounts_views.CurrentUserAPIView.as_view(), name='api_v1_me'),
    path('', include('apps.core.urls', namespace='core')),
    path('accounts/', include('apps.accounts.urls', namespace='accounts')),
    path('api/', include('apps.api.urls', namespace='api')),
    path('trains/', include('apps.trains.urls', namespace='trains_ui')),
    path('api/v1/trains/', include('apps.trains.urls', namespace='trains')),
    path('blocks/', include('apps.blocks.urls', namespace='blocks_ui')),
    path('api/v1/blocks/', include('apps.blocks.urls', namespace='blocks')),
    path('departments/', include('apps.departments.urls', namespace='departments_ui')),
    path('api/v1/departments/', include('apps.departments.urls', namespace='departments')),
    path('api/v1/ontology/', include('apps.ontology.urls', namespace='ontology')),
    path('api/v1/assets/', include('apps.assets.urls', namespace='assets')),
    path('api/v1/analytics/', include('apps.analytics.urls', namespace='analytics')),
    path('api/v1/notifications/', include('apps.notifications.urls', namespace='notifications')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
