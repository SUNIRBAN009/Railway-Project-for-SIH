"""
URL configuration for railway_sih project.
SIH Railway Management & Passenger Safety Platform (RailConnect AI / RailRakshak)
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('apps.core.urls', namespace='core')),
    path('accounts/', include('apps.accounts.urls', namespace='accounts')),
    path('grievances/', include('apps.grievances.urls', namespace='grievances')),
    path('trains/', include('apps.trains.urls', namespace='trains')),
    path('maintenance/', include('apps.maintenance.urls', namespace='maintenance')),
    path('emergency/', include('apps.emergency.urls', namespace='emergency')),
    path('api/', include('apps.api.urls', namespace='api')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
