from django.urls import path
from . import views

app_name = 'api'

urlpatterns = [
    path('docs/', views.api_docs_view, name='docs'),
    path('analytics/summary/', views.AnalyticsSummaryAPIView.as_view(), name='analytics_summary'),
]
