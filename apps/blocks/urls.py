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
    path('<str:pk>/', views.BlockDetailAPIView.as_view(), name='api_block_detail'),
    path('<str:pk>/validate/', views.BlockValidateAPIView.as_view(), name='api_block_validate'),
    path('<str:pk>/combined-recommendation/', views.BlockCombinedRecommendationAPIView.as_view(), name='api_block_combined_recommendation'),
    path('<str:pk>/sanction/', views.BlockSanctionAPIView.as_view(), name='api_block_sanction'),
    path('<str:pk>/activate/', views.BlockActivateAPIView.as_view(), name='api_block_activate'),
    path('<str:pk>/complete/', views.BlockCompleteAPIView.as_view(), name='api_block_complete'),
    path('<str:pk>/cancel/', views.BlockCancelAPIView.as_view(), name='api_block_cancel'),
]
