from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'defects-catalog', views.AssetDefectLogViewSet, basename='defect_catalog')

app_name = 'assets'

urlpatterns = [
    # Core Function Catalog Endpoints (FUNC-AST-001 through FUNC-AST-003)
    path('', views.TrackAssetListView.as_view(), name='asset_list'),
    path('defects/', views.AssetDefectCreateView.as_view(), name='defect_create'),
    path('maintenance-recommendations/', views.MaintenanceRecommendationsView.as_view(), name='maintenance_recommendations'),
    path('tqi/calculate/', views.TQICalculateView.as_view(), name='tqi_calculate'),
    path('<str:asset_tag_or_id>/', views.TrackAssetDetailView.as_view(), name='asset_detail'),
    path('', include(router.urls)),
]
