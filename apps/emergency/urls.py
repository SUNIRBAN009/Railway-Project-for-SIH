from django.urls import path
from . import views

app_name = 'emergency'

urlpatterns = [
    path('trigger/', views.trigger_sos_view, name='trigger'),
    path('radar/', views.rpf_radar_view, name='radar'),
    path('helplines/', views.helpline_directory_view, name='helplines'),
    path('api/poll/', views.sos_ajax_poll, name='poll'),
    path('<str:alert_id>/', views.sos_detail_view, name='detail'),
]
