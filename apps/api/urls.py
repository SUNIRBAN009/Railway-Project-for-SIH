from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'stations', views.StationViewSet, basename='station')
router.register(r'trains', views.TrainViewSet, basename='train')
router.register(r'grievances', views.GrievanceViewSet, basename='grievance')
router.register(r'defects', views.DefectReportViewSet, basename='defect')
router.register(r'work-orders', views.WorkOrderViewSet, basename='work-order')
router.register(r'sos', views.SOSAlertViewSet, basename='sos')
router.register(r'rpf-units', views.RPFUnitViewSet, basename='rpf-unit')

app_name = 'api'

urlpatterns = [
    path('docs/', views.api_docs_view, name='docs'),
    path('analytics/summary/', views.AnalyticsSummaryAPIView.as_view(), name='analytics_summary'),
    path('', include(router.urls)),
]
