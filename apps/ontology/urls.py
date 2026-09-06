from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'violations-catalog', views.SemanticViolationViewSet, basename='violation_catalog')

app_name = 'ontology'

urlpatterns = [
    # Core Function Map Endpoints (FUNC-ONTO-001 through FUNC-ONTO-004)
    path('reason/', views.OntologyReasoningTriggerView.as_view(), name='reason'),
    path('jobs/<str:job_id>/', views.OntologyJobStatusView.as_view(), name='job_status'),
    path('violations/', views.SemanticViolationListView.as_view(), name='violations'),
    path('graph/summary/', views.OntologyGraphSummaryView.as_view(), name='graph_summary'),
    path('', include(router.urls)),
]
