from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'alerts', views.DispatchAlertViewSet, basename='alert')

app_name = 'notifications'

urlpatterns = [
    path('', include(router.urls)),
]
