import uuid
from rest_framework import serializers
from apps.ontology.models import OntologyGraph, SemanticViolation


class ReasoningTriggerSerializer(serializers.Serializer):
    block_id = serializers.CharField(required=True, help_text="UUID or block_code of the proposed block")
    validate_train_paths = serializers.BooleanField(default=True, required=False)


class SemanticViolationSerializer(serializers.ModelSerializer):
    class Meta:
        model = SemanticViolation
        fields = [
            'id',
            'block_id',
            'rule_identifier',
            'violation_type',
            'severity',
            'explanation_narrative',
            'involved_owl_individuals',
            'resolved',
            'created_at',
        ]
        read_only_fields = fields


class OntologyGraphSerializer(serializers.ModelSerializer):
    class Meta:
        model = OntologyGraph
        fields = [
            'id',
            'version_tag',
            'owl_file_hash',
            'total_classes',
            'total_properties',
            'total_individuals',
            'is_active',
            'compiled_at',
        ]
        read_only_fields = fields
