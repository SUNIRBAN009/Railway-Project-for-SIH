from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'kpi', views.CorridorDailyKPIViewSet, basename='kpi')

app_name = 'analytics'

urlpatterns = [
    path('', include(router.urls)),
]
