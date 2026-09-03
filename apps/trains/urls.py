from django.urls import path
from . import views

app_name = 'trains'

urlpatterns = [
    path('', views.train_list_view, name='list'),
    path('live-status/', views.live_status_view, name='live_status'),
    path('station-board/', views.station_board_view, name='station_board'),
    path('<str:train_number>/', views.train_detail_view, name='detail'),
]
