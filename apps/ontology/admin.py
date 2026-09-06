from django.contrib import admin
from .models import OntologyGraph, SemanticViolation


@admin.register(OntologyGraph)
class OntologyGraphAdmin(admin.ModelAdmin):
    list_display = ('version_tag', 'total_classes', 'total_properties', 'total_individuals', 'is_active', 'compiled_at')
    list_filter = ('is_active',)
    search_fields = ('version_tag', 'owl_file_hash')


@admin.register(SemanticViolation)
class SemanticViolationAdmin(admin.ModelAdmin):
    list_display = ('rule_identifier', 'violation_type', 'severity', 'block_id', 'resolved', 'created_at')
    list_filter = ('violation_type', 'severity', 'resolved')
    search_fields = ('rule_identifier', 'block_id', 'explanation_narrative')
