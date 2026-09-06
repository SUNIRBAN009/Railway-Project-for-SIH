import logging
from celery import shared_task
from apps.blocks.models import Block
from apps.blocks.conflict_engine import ConflictDetector

logger = logging.getLogger(__name__)


@shared_task(queue='high', name='blocks.tasks.sweep_conflicts')
def sweep_conflicts_task(block_id: str):
    """
    FUNC-BLK-004: Asynchronous Celery Sweep-Line Conflict Detection Task.
    Executed automatically upon block creation or temporal modification.
    """
    try:
        block = Block.objects.get(id=block_id)
    except Block.DoesNotExist:
        logger.error(f"Block with ID {block_id} not found for conflict sweep.")
        return {'error': 'Block not found'}

    detector = ConflictDetector(block)
    results = detector.run_sweep()

    logger.info(
        f"Conflict sweep completed for {block.block_code}: "
        f"{results['total_conflicts']} conflicts, {results['shadow_opportunities']} shadow opportunities."
    )
    return results
