from django.urls import path
from . import views

app_name = 'trains'

urlpatterns = [
    # SSR / HTML Dashboard Views
    path('', views.train_operations_dashboard_view, name='dashboard'),
    path('live-status/', views.train_operations_dashboard_view, name='live_status'),
    path('htmx/simulate-delay/', views.htmx_simulate_delay_view, name='htmx_simulate_delay'),
    path('<str:train_number>/detail/', views.train_detail_view, name='detail'),

    # REST API Endpoints (SVC-TRN)
    path('catalog/', views.TrainMasterListAPIView.as_view(), name='catalog'),
    path('live/', views.TrainLiveStatusListAPIView.as_view(), name='live_positions'),
    path('simulate-delay/', views.DelayCascadeSimulationAPIView.as_view(), name='simulate_delay'),
    path('ingest/', views.IngestCOAFeedAPIView.as_view(), name='ingest_feed'),
    path('<str:train_number>/schedule/', views.TrainScheduleDetailAPIView.as_view(), name='schedule_detail'),
]
