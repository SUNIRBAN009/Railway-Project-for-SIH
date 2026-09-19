import json
import logging
from celery import shared_task
from django.core.cache import cache
from django.conf import settings
from apps.ontology.services import DigitalTwinService

logger = logging.getLogger(__name__)


@shared_task(bind=True, queue='ontology', name='apps.ontology.tasks.run_hermit_reasoner')
def run_hermit_reasoner(self, job_id: str, block_id: str):
    """
    Dedicated Celery task executing HermiT / Description Logic reasoning
    over the proposed block and track infrastructure digital twin.
    Queued exclusively to the 'ontology' worker queue.
    References:
      - docs/03-service-blueprints/04-ontology.md
      - docs/04-function-maps/04-ontology-function-map.md
    """
    cache_key = f"ontology:job:{job_id}"
    cache.set(cache_key, {
        "status": "PROCESSING",
        "progress": 30,
        "job_id": job_id,
        "block_id": block_id
    }, timeout=3600)

    try:
        violations = DigitalTwinService.run_reasoning(block_id)
        result_data = {
            "status": "COMPLETED",
            "progress": 100,
            "job_id": job_id,
            "block_id": block_id,
            "violations_count": len(violations),
        }
        cache.set(cache_key, result_data, timeout=3600)

        # Broadcast event to Django Channels WebSocket for real-time COA Dashboard update
        try:
            from channels.layers import get_channel_layer
            from asgiref.sync import async_to_sync
            channel_layer = get_channel_layer()
            if channel_layer:
                async_to_sync(channel_layer.group_send)(
                    "corridor_all",
                    {
                        "type": "corridor_event",
                        "data": {
                            "event_type": "ONTOLOGY_REASONING_COMPLETED",
                            "job_id": job_id,
                            "block_id": block_id,
                            "violations_count": len(violations),
                            "hazards": [
                                {
                                    "rule": v.rule_identifier,
                                    "severity": v.severity,
                                    "type": v.violation_type,
                                    "narrative": v.explanation_narrative[:300] + "..." if len(v.explanation_narrative) > 300 else v.explanation_narrative,
                                } for v in violations
                            ]
                        }
                    }
                )
        except Exception as ch_err:
            logger.debug(f"Channels WebSocket broadcast non-fatal: {ch_err}")

        # Attempt to broadcast event to Redis pub/sub channel events:ontology
        try:
            import redis
            redis_url = getattr(settings, 'CELERY_BROKER_URL', 'redis://localhost:6379/0')
            r = redis.from_url(redis_url)
            event_payload = {
                "event_type": "ontology.reasoning.completed",
                "job_id": job_id,
                "block_id": block_id,
                "violations_count": len(violations),
            }
            r.publish('events:ontology', json.dumps(event_payload))
        except Exception as pub_err:
            logger.debug(f"Redis event publish skipped/non-fatal: {pub_err}")

        return result_data

    except Exception as exc:
        logger.exception(f"Reasoning job {job_id} failed: {exc}")
        failure_data = {
            "status": "FAILED",
            "progress": 100,
            "job_id": job_id,
            "block_id": block_id,
            "error": str(exc),
        }
        cache.set(cache_key, failure_data, timeout=3600)
        raise exc
