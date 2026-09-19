from django.urls import path
from . import views

app_name = 'demo'

urlpatterns = [
    path('master-data/', views.MasterDataAPIView.as_view(), name='master_data'),
    path('geojson/', views.GeoJsonAPIView.as_view(), name='geojson'),
    path('seed/', views.SeedMasterDataAPIView.as_view(), name='seed'),
    path('verify-loading/', views.VerifyMasterDataLoadingAPIView.as_view(), name='verify_loading'),
    path('validate-block/', views.ValidateBlockAPIView.as_view(), name='validate_block'),
    path('blocks/', views.DemoBlockListAPIView.as_view(), name='demo_blocks'),
    path('generate/blocks/', views.GenerateBlocksAPIView.as_view(), name='generate_blocks'),
    path('generate/defects/', views.GenerateDefectsAPIView.as_view(), name='generate_defects'),
    path('generate/telemetry/', views.GenerateTelemetryAPIView.as_view(), name='generate_telemetry'),
    path('inject-conflict/', views.InjectConflictAPIView.as_view(), name='inject_conflict'),
    path('controller/status/', views.DemoControllerStatusAPIView.as_view(), name='controller_status'),
]



