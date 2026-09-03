from django.urls import path
from . import views

app_name = 'maintenance'

urlpatterns = [
    path('', views.maintenance_dashboard_view, name='dashboard'),
    path('log/', views.log_defect_view, name='log'),
    path('work-orders/', views.work_order_list_view, name='work_orders'),
    path('<str:report_id>/', views.defect_detail_view, name='detail'),
]
