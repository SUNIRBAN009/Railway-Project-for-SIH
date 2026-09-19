from abc import ABC, abstractmethod
from typing import List
from apps.blocks.models import Block, BlockConflict, BlockStatus, ConflictType, ConflictSeverity
from apps.blocks.priority_scorer import PriorityScorer

class ResolutionStrategy(ABC):
    """
    Abstract base strategy for resolving block conflicts.
    """
    @abstractmethod
    def attempt_resolution(self, conflict: BlockConflict) -> bool:
        pass


class CoPossessionStrategy(ResolutionStrategy):
    """
    Attempts to merge compatible parallel blocks into a single Shadow-Block.
    Feature #98.
    """
    def attempt_resolution(self, conflict: BlockConflict) -> bool:
        if conflict.conflict_type != ConflictType.PARALLEL_BLOCK_COLLISION:
            return False

        # If it was already identified as shadow merge candidate during sweep
        if conflict.resolution_status == 'SHADOW_MERGED':
            return True 

        # If we reached here with UNRESOLVED, the sweep decided they were incompatible
        # (e.g. both ENG and TRD but on different non-shadowable work types).
        # We can fallback to another strategy for parallel conflicts.
        return False


class TimeSplitStrategy(ResolutionStrategy):
    """
    Attempts to split a block's time window if a high-priority train needs to pass.
    """
    def attempt_resolution(self, conflict: BlockConflict) -> bool:
        if conflict.conflict_type != ConflictType.TRAIN_PATH_COLLISION:
            return False

        # Only split if the train is PRESTIGE
        if conflict.severity == ConflictSeverity.CRITICAL:
            train_score = PriorityScorer.score_train('PRESTIGE')['score']
            block_score = PriorityScorer.score_block(conflict.block)['score']

            if train_score > block_score:
                conflict.resolution_status = 'AUTO_RESOLVED'
                conflict.resolution_notes = "TimeSplitStrategy applied: Block must yield to Prestige Train. Suggest splitting block window into two segments."
                conflict.save(update_fields=['resolution_status', 'resolution_notes'])
                return True
        return False


class DiversionStrategy(ResolutionStrategy):
    """
    Suggests rerouting freight/medium priority trains.
    """
    def attempt_resolution(self, conflict: BlockConflict) -> bool:
        if conflict.conflict_type == ConflictType.TRAIN_PATH_COLLISION:
            if conflict.severity in [ConflictSeverity.MEDIUM, ConflictSeverity.LOW]:
                train_type = 'FREIGHT' if conflict.severity == ConflictSeverity.MEDIUM else 'OTHER'
                train_score = PriorityScorer.score_train(train_type)['score']
                block_score = PriorityScorer.score_block(conflict.block)['score']

                if block_score > train_score:
                    conflict.resolution_status = 'AUTO_RESOLVED'
                    conflict.resolution_notes = "DiversionStrategy applied: Block priority is higher. Train path should be diverted via loop line."
                    conflict.save(update_fields=['resolution_status', 'resolution_notes'])
                    return True
        return False


class RescheduleStrategy(ResolutionStrategy):
    """
    Attempts to shift the block window to avoid conflict.
    Fallback strategy for both train and parallel block conflicts.
    """
    def attempt_resolution(self, conflict: BlockConflict) -> bool:
        if conflict.conflict_type == ConflictType.PARALLEL_BLOCK_COLLISION:
            conflict.resolution_status = 'AUTO_RESOLVED'
            conflict.resolution_notes = "RescheduleStrategy applied: Block should be rescheduled by +4 hours to avoid parallel maintenance collision."
            conflict.save(update_fields=['resolution_status', 'resolution_notes'])
            return True
        elif conflict.conflict_type == ConflictType.TRAIN_PATH_COLLISION:
            conflict.resolution_status = 'AUTO_RESOLVED'
            conflict.resolution_notes = "RescheduleStrategy applied: Block window must be shifted to avoid train path collision."
            conflict.save(update_fields=['resolution_status', 'resolution_notes'])
            return True
        return False


class ResolutionEngine:
    """
    Expert System Strategy Engine for Conflict Deconfliction.
    Iterates through strategies in priority order.
    """
    def __init__(self, block: Block):
        self.block = block
        self.strategies: List[ResolutionStrategy] = [
            CoPossessionStrategy(),
            TimeSplitStrategy(),
            DiversionStrategy(),
            RescheduleStrategy() # Fallback
        ]

    def resolve_conflicts(self):
        """
        Iterates over all UNRESOLVED conflicts for the block and attempts strategies.
        """
        unresolved_conflicts = BlockConflict.objects.filter(
            block=self.block, 
            resolution_status='UNRESOLVED'
        )

        resolved_count = 0
        for conflict in unresolved_conflicts:
            for strategy in self.strategies:
                if strategy.attempt_resolution(conflict):
                    resolved_count += 1
                    break  # Conflict handled by this strategy
        
        # Update block status if all conflicts are resolved
        total_unresolved = BlockConflict.objects.filter(block=self.block, resolution_status='UNRESOLVED').count()
        if total_unresolved == 0 and self.block.status == BlockStatus.CONFLICT_DETECTED:
            self.block.status = BlockStatus.COORDINATED
            self.block.save(update_fields=['status'])

        return {
            'block_id': str(self.block.id),
            'resolved_conflicts': resolved_count,
            'remaining_unresolved': total_unresolved
        }
