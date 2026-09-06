from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'inventory', views.TrackAssetViewSet, basename='asset')
router.register(r'defects', views.AssetDefectLogViewSet, basename='defect')

app_name = 'assets'

urlpatterns = [
    path('', include(router.urls)),
]
