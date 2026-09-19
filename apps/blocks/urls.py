from django.urls import path
from . import views

app_name = 'blocks'

urlpatterns = [
    # Server-Side Rendered (HTMX + Alpine.js + Leaflet) Views
    path('map/', views.corridor_map_view, name='map'),
    path('timeline/', views.timeline_gantt_view, name='timeline'),
    path('sanction/', views.sanction_dashboard_view, name='sanction'),
    path('propose/', views.proposal_form_view, name='propose'),
    path('htmx/precheck/', views.block_precheck_htmx, name='htmx_precheck'),

    # RESTful API Endpoints (SVC-BLK)
    path('corridors/', views.CorridorListAPIView.as_view(), name='api_corridor_list'),
    path('corridors/<str:identifier>/', views.CorridorDetailAPIView.as_view(), name='api_corridor_detail'),
    path('corridors/<str:identifier>/geojson/', views.CorridorGeoJSONAPIView.as_view(), name='api_corridor_geojson'),
    path('proposals/', views.BlockProposalCreateAPIView.as_view(), name='api_proposal_create'),
    path('recommendations/', views.CombinedRecommendationsListAPIView.as_view(), name='api_combined_recommendations'),
    path('', views.BlockListAPIView.as_view(), name='api_block_list'),
    path('<uuid:pk>/', views.BlockDetailAPIView.as_view(), name='api_block_detail'),
    path('<uuid:pk>/validate/', views.BlockValidateAPIView.as_view(), name='api_block_validate'),
    path('<uuid:pk>/combined-recommendation/', views.BlockCombinedRecommendationAPIView.as_view(), name='api_block_combined_recommendation'),
    path('<uuid:pk>/sanction/', views.BlockSanctionAPIView.as_view(), name='api_block_sanction'),
    path('<uuid:pk>/activate/', views.BlockActivateAPIView.as_view(), name='api_block_activate'),
    path('<uuid:pk>/complete/', views.BlockCompleteAPIView.as_view(), name='api_block_complete'),
    path('<uuid:pk>/cancel/', views.BlockCancelAPIView.as_view(), name='api_block_cancel'),
]
