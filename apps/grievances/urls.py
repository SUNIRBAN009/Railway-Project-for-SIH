from django.urls import path
from . import views

app_name = 'grievances'

urlpatterns = [
    path('', views.grievance_list_view, name='list'),
    path('lodge/', views.lodge_grievance_view, name='lodge'),
    path('track/', views.track_grievance_view, name='track'),
    path('api/ai-preview/', views.ai_preview_api, name='ai_preview'),
    path('<str:tracking_id>/', views.grievance_detail_view, name='detail'),
]
