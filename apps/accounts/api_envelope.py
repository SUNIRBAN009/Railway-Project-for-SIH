from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone


class ApiResponse:
    """
    Standardized Enterprise API Response Envelope (PS 26027).
    Guarantees uniform schema:
      - success: bool
      - data / error: payload or error object
      - timestamp: ISO 8601 UTC
    """

    @staticmethod
    def success(data=None, message=None, status_code=status.HTTP_200_OK, extra=None, http_status=None):
        if http_status is not None:
            status_code = http_status
        payload = {
            'success': True,
            'timestamp': timezone.now().isoformat(),
        }
        if message:
            payload['message'] = message
        if data is not None:
            payload['data'] = data
        if extra:
            payload.update(extra)

        return Response(payload, status=status_code)

    @staticmethod
    def error(code, message, details=None, status_code=status.HTTP_400_BAD_REQUEST, errors=None, http_status=None):
        if errors is not None and details is None:
            details = errors
        if http_status is not None:
            status_code = http_status
        payload = {
            'success': False,
            'error': {
                'code': code,
                'message': message,
            },
            'timestamp': timezone.now().isoformat(),
        }
        if details is not None:
            payload['error']['details'] = details

        return Response(payload, status=status_code)

    @staticmethod
    def paginated(results, count, page, page_size, next_url=None, previous_url=None):
        return Response({
            'success': True,
            'count': count,
            'page': page,
            'page_size': page_size,
            'next': next_url,
            'previous': previous_url,
            'data': results,
            'timestamp': timezone.now().isoformat(),
        }, status=status.HTTP_200_OK)
