import uuid
from django.db import models


class OntologyGraph(models.Model):
    """
    Semantic Graph Versions and RDF Snapshots.
    Tracks OWL 2 DL ontology compilations and individual metrics.
    Reference: docs/03-service-blueprints/04-ontology.md
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    version_tag = models.CharField(max_length=50, unique=True, db_index=True)
    owl_file_hash = models.CharField(max_length=64)
    total_classes = models.PositiveIntegerField(default=0)
    total_properties = models.PositiveIntegerField(default=0)
    total_individuals = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    compiled_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ontology_graphs'
        ordering = ['-compiled_at']

    def __str__(self):
        return f"OntologyGraph {self.version_tag} ({'active' if self.is_active else 'inactive'})"


class SemanticViolation(models.Model):
    """
    Persisted semantic rule violations flagged by the OWL 2 DL reasoner.
    References:
      - docs/03-service-blueprints/04-ontology.md
      - docs/05-deep-dive-logs/contracts/03-ontology-contracts.md
    """
    class ViolationType(models.TextChoices):
        STRANDED_ELECTRIC_TRAIN = 'STRANDED_ELECTRIC_TRAIN', 'Stranded Electric Train'
        CROSSOVER_POINTS_DEADLOCK = 'CROSSOVER_POINTS_DEADLOCK', 'Crossover Points Deadlock'
        SIGNAL_OVERLAP_INVASION = 'SIGNAL_OVERLAP_INVASION', 'Signal Overlap Invasion'
        FEEDER_ISOLATION_CONCURRENCY = 'FEEDER_ISOLATION_CONCURRENCY', 'Feeder Isolation Concurrency'

    class Severity(models.TextChoices):
        CRITICAL_SAFETY = 'CRITICAL_SAFETY', 'Critical Safety'
        OPERATIONAL_IMPEDIMENT = 'OPERATIONAL_IMPEDIMENT', 'Operational Impediment'
        ADVISORY = 'ADVISORY', 'Advisory'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    graph = models.ForeignKey(
        OntologyGraph,
        on_delete=models.CASCADE,
        related_name='violations',
        null=True,
        blank=True
    )
    block_id = models.CharField(max_length=64, db_index=True)
    rule_identifier = models.CharField(max_length=80, db_index=True)
    violation_type = models.CharField(
        max_length=50,
        choices=ViolationType.choices,
        default=ViolationType.STRANDED_ELECTRIC_TRAIN
    )
    severity = models.CharField(
        max_length=30,
        choices=Severity.choices,
        default=Severity.CRITICAL_SAFETY
    )
    explanation_narrative = models.TextField(help_text="DL explanation narrative proof")
    involved_owl_individuals = models.JSONField(default=list)
    resolved = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'semantic_violations'
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.severity}] {self.rule_identifier}: {self.violation_type} on block {self.block_id}"
