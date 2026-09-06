import datetime
from django.shortcuts import render, get_object_or_404
from django.db.models import Q
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework import permissions, status

from apps.accounts.api_envelope import ApiResponse
from apps.accounts.permissions import IsDepartmentalEngineer, engineer_required
from apps.departments.models import (
    Department,
    Gang,
    MaintenanceEquipment,
    WorkOrder,
    EquipmentType,
    EquipmentStatus,
    WorkOrderStatus,
)
from apps.blocks.models import Block, BlockStatus
from apps.departments.serializers import (
    DepartmentSerializer,
    GangListSerializer,
    GangCreateSerializer,
    MaintenanceEquipmentSerializer,
    WorkOrderCreateSerializer,
    WorkOrderDetailSerializer,
    SafetyClearanceRequestSerializer,
)


# ============================================================================
# REST API Controllers (SVC-DEPT)
# ============================================================================

class GangListCreateAPIView(APIView):
    """
    FUNC-DEPT-001: Query Gang Rosters & Availability
    FUNC-DEPT-002: Register Maintenance Gang Unit
    GET/POST /api/v1/departments/gangs/
    Authoritative reference: docs/04-function-maps/03-departments-function-map.md
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        dept_filter = request.GET.get('department', '').strip().upper()
        station_filter = request.GET.get('station', '').strip().upper()
        available_only = request.GET.get('available', '').strip().lower() in ('true', '1')
        search_query = request.GET.get('search', '').strip()

        gangs = Gang.objects.select_related('department', 'supervisor').all()

        if dept_filter:
            gangs = gangs.filter(department__code=dept_filter)

        if station_filter:
            gangs = gangs.filter(headquarters_station__iexact=station_filter)

        if available_only:
            # Active and not currently assigned to active/mobilizing work orders
            active_gang_ids = WorkOrder.objects.filter(
                status__in=[WorkOrderStatus.MOBILIZING, WorkOrderStatus.ON_SITE]
            ).values_list('gang_id', flat=True)
            gangs = gangs.filter(is_active=True).exclude(id__in=active_gang_ids)

        if search_query:
            gangs = gangs.filter(
                Q(gang_number__icontains=search_query) |
                Q(headquarters_station__icontains=search_query)
            )

        serializer = GangListSerializer(gangs, many=True)
        return ApiResponse.success(
            data={
                'count': gangs.count(),
                'gangs': serializer.data
            },
            message="Maintenance gang rosters retrieved successfully"
        )

    def post(self, request):
        serializer = GangCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return ApiResponse.error(
                code='DEPT-400',
                message="Invalid gang registration payload",
                errors=serializer.errors,
                http_status=status.HTTP_400_BAD_REQUEST
            )

        gang = serializer.save()
        return ApiResponse.success(
            data=GangListSerializer(gang).data,
            message=f"Maintenance Gang {gang.gang_number} registered successfully",
            http_status=status.HTTP_201_CREATED
        )


class EquipmentListAPIView(APIView):
    """
    FUNC-DEPT-003: Query Heavy Equipment Readiness
    GET /api/v1/departments/equipment/
    Authoritative reference: docs/04-function-maps/03-departments-function-map.md
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        eq_type = request.GET.get('type', '').strip()
        op_status = request.GET.get('status', '').strip().upper()
        dept_code = request.GET.get('department', '').strip().upper()
        fit_only = request.GET.get('fit_only', '').strip().lower() in ('true', '1')
        search_query = request.GET.get('search', '').strip()

        equipment = MaintenanceEquipment.objects.select_related('department').all()

        if eq_type:
            equipment = equipment.filter(equipment_type=eq_type)

        if op_status:
            equipment = equipment.filter(operational_status=op_status)

        if dept_code:
            equipment = equipment.filter(department__code=dept_code)

        if fit_only:
            today = timezone.now().date()
            equipment = equipment.filter(
                operational_status=EquipmentStatus.AVAILABLE,
                fitness_expiry_date__gte=today
            )

        if search_query:
            equipment = equipment.filter(
                Q(equipment_code__icontains=search_query) |
                Q(equipment_name__icontains=search_query) |
                Q(home_depot__icontains=search_query)
            )

        serializer = MaintenanceEquipmentSerializer(equipment, many=True)
        return ApiResponse.success(
            data={
                'count': equipment.count(),
                'equipment': serializer.data
            },
            message="Maintenance equipment readiness queried successfully"
        )


class WorkOrderListCreateAPIView(APIView):
    """
    FUNC-DEPT-004: Issue Departmental Work Order
    GET /api/v1/departments/work-orders/
    POST /api/v1/departments/work-orders/
    Authoritative reference: docs/04-function-maps/03-departments-function-map.md
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        block_id = request.GET.get('block_id', '').strip()
        dept_code = request.GET.get('department', '').strip().upper()
        status_filter = request.GET.get('status', '').strip().upper()

        work_orders = WorkOrder.objects.select_related(
            'block', 'block__corridor', 'department', 'gang', 'equipment', 'safety_certified_by'
        ).all()

        if block_id:
            work_orders = work_orders.filter(block_id=block_id)

        if dept_code:
            work_orders = work_orders.filter(department__code=dept_code)

        if status_filter:
            work_orders = work_orders.filter(status=status_filter)

        serializer = WorkOrderDetailSerializer(work_orders, many=True)
        return ApiResponse.success(
            data={
                'count': work_orders.count(),
                'work_orders': serializer.data
            },
            message="Departmental work orders retrieved"
        )

    def post(self, request):
        serializer = WorkOrderCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return ApiResponse.error(
                code='DEPT-400',
                message="Work order validation failed",
                errors=serializer.errors,
                http_status=status.HTTP_400_BAD_REQUEST
            )

        validated = serializer.validated_data
        block = Block.objects.get(id=validated['block_id'])
        gang = Gang.objects.get(id=validated['gang_id'])
        equipment = None
        if validated.get('equipment_id'):
            equipment = MaintenanceEquipment.objects.get(id=validated['equipment_id'])

        # Generate unique order number: WO-YYYYMMDD-[DEPT]-[SEQ]
        today_str = timezone.now().strftime('%Y%m%d')
        dept_code = gang.department.code
        daily_count = WorkOrder.objects.filter(
            order_number__startswith=f"WO-{today_str}-{dept_code}"
        ).count() + 1
        order_number = f"WO-{today_str}-{dept_code}-{daily_count:03d}"

        work_order = WorkOrder.objects.create(
            order_number=order_number,
            block=block,
            department=gang.department,
            gang=gang,
            equipment=equipment,
            planned_work_scope=validated['planned_work_scope'],
            target_metric_units=validated['target_metric_units'],
            status=WorkOrderStatus.PENDING
        )

        # Lock equipment reservation
        if equipment:
            equipment.operational_status = EquipmentStatus.ASSIGNED
            equipment.save(update_fields=['operational_status'])

        return ApiResponse.success(
            data=WorkOrderDetailSerializer(work_order).data,
            message=f"Work Order {order_number} successfully issued for Block {block.block_code}",
            http_status=status.HTTP_201_CREATED
        )


class WorkOrderSafetyClearanceAPIView(APIView):
    """
    FUNC-DEPT-005: Sign Track Safety Clearance
    PATCH /api/v1/departments/work-orders/{id}/clearance/
    Authoritative reference: docs/04-function-maps/03-departments-function-map.md
    """
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk):
        work_order = get_object_or_404(
            WorkOrder.objects.select_related('block', 'equipment', 'gang', 'department'),
            id=pk
        )

        serializer = SafetyClearanceRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return ApiResponse.error(
                code='DEPT-400',
                message="Safety clearance checklist validation failed",
                errors=serializer.errors,
                http_status=status.HTTP_400_BAD_REQUEST
            )

        data = serializer.validated_data
        work_order.status = WorkOrderStatus.SAFETY_CLEARANCE_SIGNED
        work_order.safety_clearance_timestamp = timezone.now()
        work_order.safety_certified_by = request.user
        work_order.ballast_profile_verified = data.get('ballast_profile_verified', True)
        work_order.track_gauge_checked = data.get('track_gauge_checked', True)
        if data.get('actual_metric_units'):
            work_order.actual_metric_units = data['actual_metric_units']
        if data.get('remarks'):
            work_order.safety_remarks = data['remarks']
        work_order.save()

        # Release equipment status back to AVAILABLE
        if work_order.equipment:
            work_order.equipment.operational_status = EquipmentStatus.AVAILABLE
            work_order.equipment.save(update_fields=['operational_status'])

        # Check if all sibling work orders for the parent block have signed safety clearances
        all_block_orders = WorkOrder.objects.filter(block=work_order.block)
        total_orders = all_block_orders.count()
        cleared_orders = all_block_orders.filter(status=WorkOrderStatus.SAFETY_CLEARANCE_SIGNED).count()
        all_cleared = (total_orders > 0 and total_orders == cleared_orders)

        return ApiResponse.success(
            data={
                'work_order': WorkOrderDetailSerializer(work_order).data,
                'all_block_orders_cleared': all_cleared,
                'block_code': work_order.block.block_code,
                'cleared_orders_count': cleared_orders,
                'total_orders_count': total_orders,
            },
            message=f"Safety clearance successfully signed for {work_order.order_number}"
        )


# ============================================================================
# SSR Django Template & HTMX Views
# ============================================================================

def department_logistics_dashboard_view(request):
    """
    Departmental Logistics Management Dashboard (SVC-DEPT).
    SSR + Alpine.js + HTMX
    """
    # Seed baseline departments if missing
    departments = Department.objects.all()
    if departments.count() == 0:
        _seed_baseline_logistics()
        departments = Department.objects.all()

    gangs = Gang.objects.select_related('department', 'supervisor').all()
    equipment = MaintenanceEquipment.objects.select_related('department').all()
    all_work_orders = WorkOrder.objects.select_related(
        'block', 'department', 'gang', 'equipment', 'safety_certified_by'
    )
    work_orders = all_work_orders.order_by('-created_at')[:20]

    # Metrics
    total_crews = gangs.count()
    active_crew_count = gangs.filter(is_active=True).count()
    total_machines = equipment.count()
    available_machines = equipment.filter(operational_status=EquipmentStatus.AVAILABLE).count()
    active_orders_count = all_work_orders.filter(
        status__in=[WorkOrderStatus.MOBILIZING, WorkOrderStatus.ON_SITE, WorkOrderStatus.PENDING]
    ).count()

    sanctioned_blocks = Block.objects.filter(
        status__in=[BlockStatus.SANCTIONED, BlockStatus.COORDINATED, BlockStatus.ACTIVE]
    )

    return render(request, 'departments/logistics_dashboard.html', {
        'departments': departments,
        'gangs': gangs,
        'equipment': equipment,
        'work_orders': work_orders,
        'sanctioned_blocks': sanctioned_blocks,
        'total_crews': total_crews,
        'active_crew_count': active_crew_count,
        'total_machines': total_machines,
        'available_machines': available_machines,
        'active_orders_count': active_orders_count,
        'equipment_types': EquipmentType.choices,
    })


def htmx_quick_safety_signoff(request, pk):
    """
    1-Click Quick Safety Clearance Sign-Off via HTMX.
    """
    work_order = get_object_or_404(WorkOrder, id=pk)
    work_order.status = WorkOrderStatus.SAFETY_CLEARANCE_SIGNED
    work_order.safety_clearance_timestamp = timezone.now()
    work_order.ballast_profile_verified = True
    work_order.track_gauge_checked = True
    work_order.safety_remarks = "Field safety clearance verified via Mobile Terminal."
    if request.user.is_authenticated:
        work_order.safety_certified_by = request.user
    work_order.save()

    if work_order.equipment:
        work_order.equipment.operational_status = EquipmentStatus.AVAILABLE
        work_order.equipment.save(update_fields=['operational_status'])

    return render(request, 'departments/partials/work_order_row.html', {
        'wo': work_order
    })


def _seed_baseline_logistics():
    """Seeds baseline departments, gangs, and machinery for Delhi Division."""
    eng, _ = Department.objects.get_or_create(
        code='ENG',
        defaults={
            'name': 'Civil Engineering & Permanent Way',
            'headquarters_division': 'DLI',
            'contact_email': 'eng.delhi@railnet.gov.in',
            'escalation_phone': '011-23341001',
        }
    )
    trd, _ = Department.objects.get_or_create(
        code='TRD',
        defaults={
            'name': 'Traction Distribution (25kV OHE)',
            'headquarters_division': 'DLI',
            'contact_email': 'trd.delhi@railnet.gov.in',
            'escalation_phone': '011-23341002',
        }
    )
    snt, _ = Department.objects.get_or_create(
        code='SNT',
        defaults={
            'name': 'Signal & Telecommunication',
            'headquarters_division': 'DLI',
            'contact_email': 'snt.delhi@railnet.gov.in',
            'escalation_phone': '011-23341003',
        }
    )

    # Gangs
    Gang.objects.get_or_create(
        gang_number='GANG-ENG-NDLS-01',
        defaults={
            'department': eng,
            'headquarters_station': 'NDLS',
            'crew_strength': 14,
            'assigned_section_start_km': 0.0,
            'assigned_section_end_km': 28.5,
            'is_active': True,
        }
    )
    Gang.objects.get_or_create(
        gang_number='GANG-TRD-GZB-02',
        defaults={
            'department': trd,
            'headquarters_station': 'GZB',
            'crew_strength': 10,
            'assigned_section_start_km': 10.0,
            'assigned_section_end_km': 60.0,
            'is_active': True,
        }
    )
    Gang.objects.get_or_create(
        gang_number='GANG-SNT-ALJN-03',
        defaults={
            'department': snt,
            'headquarters_station': 'ALJN',
            'crew_strength': 8,
            'assigned_section_start_km': 100.0,
            'assigned_section_end_km': 160.0,
            'is_active': True,
        }
    )

    # Equipment
    today = timezone.now().date()
    valid_expiry = today + datetime.timedelta(days=90)
    MaintenanceEquipment.objects.get_or_create(
        equipment_code='CSM-9021',
        defaults={
            'equipment_name': '09-32 CSM Continuous Track Tamper',
            'equipment_type': EquipmentType.TRACK_TAMPER_CSM,
            'department': eng,
            'home_depot': 'TKD',
            'current_location_km': 14.5,
            'operational_status': EquipmentStatus.AVAILABLE,
            'fitness_expiry_date': valid_expiry,
        }
    )
    MaintenanceEquipment.objects.get_or_create(
        equipment_code='BCM-8044',
        defaults={
            'equipment_name': 'RM-80 Ballast Cleaning Machine',
            'equipment_type': EquipmentType.BALLAST_CLEANER_BCM,
            'department': eng,
            'home_depot': 'GZB',
            'current_location_km': 28.5,
            'operational_status': EquipmentStatus.AVAILABLE,
            'fitness_expiry_date': valid_expiry,
        }
    )
    MaintenanceEquipment.objects.get_or_create(
        equipment_code='TW-TRD-102',
        defaults={
            'equipment_name': '8-Wheeler OHE Inspection Tower Wagon',
            'equipment_type': EquipmentType.OHE_TOWER_WAGON,
            'department': trd,
            'home_depot': 'GZB',
            'current_location_km': 28.5,
            'operational_status': EquipmentStatus.AVAILABLE,
            'fitness_expiry_date': valid_expiry,
        }
    )
