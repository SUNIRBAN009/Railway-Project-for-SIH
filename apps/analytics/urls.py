"""
URL configuration for Operations Analytics & KPI Service (SVC-ANA).
Authoritative reference: docs/03-service-blueprints/07-analytics.md
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

app_name = 'analytics'

router = DefaultRouter()
router.register(r'kpi', views.CorridorDailyKPIViewSet, basename='kpi')

urlpatterns = [
    path('dashboard/summary/', views.DashboardSummaryView.as_view(), name='dashboard_summary'),
    path('corridors/comparison/', views.CorridorComparisonView.as_view(), name='corridor_comparison'),
    path('block-efficiency/', views.BlockEfficiencyListView.as_view(), name='block_efficiency'),
    path('reports/export/', views.ReportExportView.as_view(), name='report_export'),
    path('', include(router.urls)),
]
