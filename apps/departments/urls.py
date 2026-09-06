from django.urls import path
from . import views

app_name = 'departments'

urlpatterns = [
    # SSR / HTML Dashboard Views
    path('', views.department_logistics_dashboard_view, name='dashboard'),
    path('logistics/', views.department_logistics_dashboard_view, name='logistics'),
    path('htmx/work-orders/<uuid:pk>/clearance/', views.htmx_quick_safety_signoff, name='htmx_clearance'),

    # REST API Endpoints (SVC-DEPT)
    path('gangs/', views.GangListCreateAPIView.as_view(), name='gangs'),
    path('equipment/', views.EquipmentListAPIView.as_view(), name='equipment'),
    path('work-orders/', views.WorkOrderListCreateAPIView.as_view(), name='work_orders'),
    path('work-orders/<uuid:pk>/clearance/', views.WorkOrderSafetyClearanceAPIView.as_view(), name='work_order_clearance'),
]
