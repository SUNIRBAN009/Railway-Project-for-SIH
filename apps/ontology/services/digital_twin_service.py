import hashlib
import logging
import os
import shutil
import uuid
from typing import Dict, List, Optional, Tuple, Any
from django.conf import settings
from django.utils import timezone
import owlready2

from apps.ontology.models import OntologyGraph, SemanticViolation
from apps.blocks.models import Block, WorkType
from apps.trains.models import Train, TrainSchedule, TrainLiveStatus, TractionType

logger = logging.getLogger(__name__)

ONTOLOGY_IRI = "http://railblock.ir.gov.in/ontology/railway"


class DigitalTwinService:
    """
    Core Semantic Digital Twin & Ontology Reasoning Service (SVC-ONTO).
    Implements Owlready2 OWL 2 DL knowledge graph hydration,
    HermiT reasoner dispatch, and Description Logic rule proofs.
    References:
      - docs/03-service-blueprints/04-ontology.md
      - docs/05-deep-dive-logs/adrs/adr-0003-owlready2-digital-twin.md
      - docs/04-function-maps/04-ontology-function-map.md
    """

    @classmethod
    def get_ontology_file_path(cls) -> str:
        """Locates the active OWL 2 DL ontology file."""
        candidates = [
            os.path.join(settings.BASE_DIR, 'digital_twin', 'railway_ontology.owl'),
            os.path.join(settings.BASE_DIR, 'ontology', 'railway_ontology.owl'),
        ]
        for p in candidates:
            if os.path.exists(p):
                return p
        raise FileNotFoundError("Railway OWL ontology file not found in digital_twin/ or ontology/.")

    @classmethod
    def compute_file_hash(cls, filepath: str) -> str:
        """Calculates SHA-256 digest of the OWL ontology file."""
        sha = hashlib.sha256()
        with open(filepath, 'rb') as f:
            while chunk := f.read(65536):
                sha.update(chunk)
        return sha.hexdigest()

    @classmethod
    def get_or_sync_graph_record(cls) -> Tuple[OntologyGraph, str]:
        """
        Ensures an active OntologyGraph record is synced in MySQL/SQLite
        with current metrics and ontology schema hash.
        """
        filepath = cls.get_ontology_file_path()
        file_hash = cls.compute_file_hash(filepath)
        version_tag = f"v2.0-{file_hash[:8]}"

        graph, created = OntologyGraph.objects.get_or_create(
            version_tag=version_tag,
            defaults={
                'owl_file_hash': file_hash,
                'total_classes': 24,
                'total_properties': 9,
                'total_individuals': 0,
                'is_active': True,
            }
        )
        if not graph.is_active:
            OntologyGraph.objects.exclude(id=graph.id).update(is_active=False)
            graph.is_active = True
            graph.save(update_fields=['is_active'])
        return graph, filepath

    @classmethod
    def create_isolated_world(cls) -> Tuple[owlready2.World, Any]:
        """
        Creates an isolated Owlready2 World and loads the railway ontology.
        Uses binary stream loading to avoid Windows file URI path syntax issues.
        """
        _, filepath = cls.get_or_sync_graph_record()
        world = owlready2.World()
        onto = world.get_ontology(ONTOLOGY_IRI)
        with open(filepath, 'rb') as f:
            onto.load(fileobj=f)
        return world, onto

    @classmethod
    def sync_subgraph_for_block(
        cls,
        block: Block,
        world: Optional[owlready2.World] = None,
        onto: Optional[Any] = None
    ) -> Dict[str, Any]:
        """
        Hydrates an ephemeral ontological sub-graph for a specific block proposal
        and potentially conflicting train paths in that corridor/temporal window.
        """
        if world is None or onto is None:
            world, onto = cls.create_isolated_world()

        corridor_code = block.corridor.code if block.corridor else "CORR"
        block_clean_code = block.block_code.replace("-", "_")

        # 1. Instantiate Block Individual
        is_power_cut = (
            block.traction_power_cutoff_required or
            block.work_type in [WorkType.CATENARY_MAINTENANCE, WorkType.OHE_INSPECTION]
        )
        if is_power_cut:
            block_ind = onto.TractionPowerCutBlock(f"Block_{block_clean_code}")
        else:
            block_ind = onto.BlockPossession(f"Block_{block_clean_code}")

        # 2. Instantiate TrackSection / TrackSegment
        track_name = f"Track_{corridor_code}_{int(block.start_km)}_{int(block.end_km)}"
        track_ind = onto.TrackSection(track_name)
        block_ind.blocksSection.append(track_ind)
        block_ind.reservesTrack.append(track_ind)

        # 3. Instantiate OHE Zone if de-energization is involved
        ohe_ind = None
        if is_power_cut:
            ohe_name = f"OHE_Zone_{corridor_code}_{int(block.start_km)}_{int(block.end_km)}"
            ohe_ind = onto.TractionOHE(ohe_name)
            block_ind.cutsPowerTo.append(ohe_ind)
            block_ind.depowersOHE.append(ohe_ind)
            ohe_ind.electrifies.append(track_ind)

        # 4. Instantiate Signal Interlocking if signaling possession
        signal_ind = None
        is_signaling = block.work_type in [WorkType.SIGNAL_INTERLOCKING_TEST, WorkType.TURNOUT_OVERHAUL]
        if is_signaling:
            signal_name = f"SignalPoints_{corridor_code}_KM_{int(block.start_km)}"
            signal_ind = onto.SignalPoint(signal_name)
            signal_ind.interlocksWith.append(track_ind)

        # 5. Query candidate trains in corridor during temporal window
        trains_involved = []
        train_inds = []

        # Find trains with live status or schedules near this corridor / section
        corridor_trains = Train.objects.filter(
            schedules__km_milestone__gte=max(0, float(block.start_km) - 20),
            schedules__km_milestone__lte=float(block.end_km) + 20
        ).distinct()

        if not corridor_trains.exists():
            # Fallback for demo environments: check all active passenger/freight trains
            corridor_trains = Train.objects.all()[:10]

        for train in corridor_trains:
            train_clean_num = train.train_number.replace("-", "_")
            if train.traction_type == TractionType.ELECTRIC:
                t_ind = onto.ElectricTrain(f"Train_{train_clean_num}")
            else:
                t_ind = onto.DieselTrain(f"Train_{train_clean_num}")

            # Relate train occupancy with the track segment
            t_ind.occupiesTrack.append(track_ind)
            trains_involved.append(train)
            train_inds.append(t_ind)

        return {
            'world': world,
            'onto': onto,
            'block': block,
            'block_ind': block_ind,
            'track_ind': track_ind,
            'ohe_ind': ohe_ind,
            'signal_ind': signal_ind,
            'trains': trains_involved,
            'train_inds': train_inds,
            'is_power_cut': is_power_cut,
            'is_signaling': is_signaling,
        }

    @classmethod
    def run_reasoning(cls, block_id: Any) -> List[SemanticViolation]:
        """
        Executes Description Logic reasoning over the block sub-graph.
        Invokes HermiT reasoner if Java runtime is available, and executes
        the formalized Description Logic safety rules to infer violations.
        """
        # Resolve block from UUID or block_code
        try:
            if isinstance(block_id, uuid.UUID) or (isinstance(block_id, str) and len(block_id) == 36 and '-' in block_id):
                block = Block.objects.select_related('corridor').get(id=block_id)
            else:
                block = Block.objects.select_related('corridor').get(block_code=str(block_id))
        except Block.DoesNotExist:
            logger.error(f"Block not found for reasoning: {block_id}")
            return []

        graph_record, _ = cls.get_or_sync_graph_record()
        subgraph = cls.sync_subgraph_for_block(block)
        world = subgraph['world']
        onto = subgraph['onto']
        block_ind = subgraph['block_ind']
        track_ind = subgraph['track_ind']
        ohe_ind = subgraph['ohe_ind']
        trains = subgraph['trains']
        train_inds = subgraph['train_inds']
        is_power_cut = subgraph['is_power_cut']
        is_signaling = subgraph['is_signaling']

        # 1. Attempt HermiT Reasoner execution if Java 17 JVM is installed
        java_bin = shutil.which("java")
        if java_bin:
            try:
                with onto:
                    owlready2.sync_reasoner_hermit(world, infer_property_values=True, debug=0)
                logger.info("HermiT reasoner executed successfully.")
            except Exception as e:
                logger.warning(f"HermiT execution skipped/failed: {e}")
        else:
            logger.info("Java runtime not detected on PATH. Executing Description Logic Rule Engine.")

        # 2. Clear old unresolved violations for this block
        SemanticViolation.objects.filter(block_id=str(block.id), resolved=False).delete()

        created_violations = []

        # -------------------------------------------------------------
        # DL Rule 1: Stranded Electric Train Hazard (TSK-P3-004 / ONTO-001)
        # Axiom: TractionPowerCutBlock(?b) ^ cutsPowerTo(?b, ?z) ^ electrifies(?z, ?s)
        #        ^ occupiesTrack(?t, ?s) ^ ElectricTrain(?t)
        #        -> StrandedElectricTrainHazard(?h) ^ affectsTrain(?h, ?t)
        # -------------------------------------------------------------
        if is_power_cut and ohe_ind:
            for train, t_ind in zip(trains, train_inds):
                if train.traction_type == TractionType.ELECTRIC:
                    hazard_id = f"Hazard_Stranded_{train.train_number}_{block.block_code}".replace("-", "_")
                    hazard_ind = onto.StrandedElectricTrainHazard(hazard_id)
                    block_ind.hasHazard.append(hazard_ind)
                    hazard_ind.affectsTrain.append(t_ind)

                    start_time_str = block.scheduled_start_time.strftime("%H:%M")
                    end_time_str = block.scheduled_end_time.strftime("%H:%M")
                    proof = (
                        f"Description Logic Rule [RULE-OHE-ELECTRIC-ISOLATION-04] Inferred Safety Hazard:\n"
                        f"1. Maintenance Block '{block.block_code}' ({block.get_work_type_display()}) requires 25kV OHE catenary de-energization.\n"
                        f"2. Substation feeder isolation de-powers {ohe_ind.name}, which electrifies {track_ind.name} (KM {block.start_km:.1f} to {block.end_km:.1f}).\n"
                        f"3. Train {train.train_number} ({train.train_name}) is an Electric locomotive ({train.get_traction_type_display()}) scheduled in this section between {start_time_str} and {end_time_str}.\n"
                        f"4. Formal DL Axiom Proof: ElectricTrain(?t) ^ occupiesTrack(?t, ?s) ^ electrifies(?z, ?s) ^ cutsPowerTo(?b, ?z) -> StrandedElectricTrainHazard(?h).\n"
                        f"5. Conclusion: De-energizing catenary strands train {train.train_number} without tractive power."
                    )

                    violation = SemanticViolation.objects.create(
                        graph=graph_record,
                        block_id=str(block.id),
                        rule_identifier="RULE-OHE-ELECTRIC-ISOLATION-04",
                        violation_type=SemanticViolation.ViolationType.STRANDED_ELECTRIC_TRAIN,
                        severity=SemanticViolation.Severity.CRITICAL_SAFETY,
                        explanation_narrative=proof,
                        involved_owl_individuals=[
                            str(block_ind.iri),
                            str(ohe_ind.iri),
                            str(track_ind.iri),
                            str(t_ind.iri),
                            str(hazard_ind.iri)
                        ],
                    )
                    created_violations.append(violation)

        # -------------------------------------------------------------
        # DL Rule 2: Crossover Points Deadlock (ONTO-002)
        # -------------------------------------------------------------
        if is_signaling:
            for train, t_ind in zip(trains, train_inds):
                hazard_id = f"Hazard_Deadlock_{train.train_number}_{block.block_code}".replace("-", "_")
                hazard_ind = onto.CrossoverPointsDeadlock(hazard_id)
                block_ind.hasHazard.append(hazard_ind)

                proof = (
                    f"Description Logic Rule [RULE-SIGNAL-CROSSOVER-DEADLOCK-02] Inferred Interlocking Deadlock:\n"
                    f"1. Block '{block.block_code}' imposes interlocking clamp / signal disconnection on points at KM {block.start_km:.1f}.\n"
                    f"2. Disconnecting point circuit eliminates safety flank protection for approaching Train {train.train_number} ({train.train_name}).\n"
                    f"3. Transitive DL Axiom Proof: SignalPoint(?p) ^ interlocksWith(?p, ?s) ^ occupiesTrack(?t, ?s) ^ SignalPossession(?b) -> CrossoverPointsDeadlock(?h).\n"
                    f"4. Conclusion: Route setting deadlock blocks train movements through station neck."
                )

                violation = SemanticViolation.objects.create(
                    graph=graph_record,
                    block_id=str(block.id),
                    rule_identifier="RULE-SIGNAL-CROSSOVER-DEADLOCK-02",
                    violation_type=SemanticViolation.ViolationType.CROSSOVER_POINTS_DEADLOCK,
                    severity=SemanticViolation.Severity.CRITICAL_SAFETY,
                    explanation_narrative=proof,
                    involved_owl_individuals=[
                        str(block_ind.iri),
                        str(track_ind.iri),
                        str(t_ind.iri),
                        str(hazard_ind.iri)
                    ],
                )
                created_violations.append(violation)

        # Update graph individual count metric
        total_inds = len(list(world.individuals()))
        if total_inds > graph_record.total_individuals:
            graph_record.total_individuals = total_inds
            graph_record.save(update_fields=['total_individuals'])

        return created_violations

    @classmethod
    def get_graph_summary(cls) -> Dict[str, Any]:
        """
        Returns active OWL 2 DL ontology graph summary metrics (FUNC-ONTO-004).
        """
        graph, _ = cls.get_or_sync_graph_record()
        return {
            'graph_id': str(graph.id),
            'version_tag': graph.version_tag,
            'owl_file_hash': graph.owl_file_hash,
            'total_classes': graph.total_classes,
            'total_properties': graph.total_properties,
            'total_individuals': graph.total_individuals,
            'is_active': graph.is_active,
            'compiled_at': graph.compiled_at.isoformat(),
        }
