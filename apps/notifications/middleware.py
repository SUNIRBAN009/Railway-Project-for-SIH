"""
JWT Authentication Middleware for Daphne / Django Channels (TSK-P3-01-BE).
Authoritative reference: docs/03-service-blueprints/08-notifications.md
Extracts and validates JWT Bearer tokens from WebSocket query params or headers.
"""
import logging
from urllib.parse import parse_qs
from channels.middleware import BaseMiddleware
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser

logger = logging.getLogger(__name__)



@database_sync_to_async
def get_user_from_token(token_str: str):
    """
    Decodes JWT access token and loads authenticated User with profile.
    """
    try:
        from django.contrib.auth import get_user_model
        from django.contrib.auth.models import AnonymousUser
        from apps.accounts.auth_tokens import decode_token

        user_model = get_user_model()
        payload = decode_token(token_str, verify_exp=True)
        user_id = payload.get('user_id')
        if not user_id:
            return AnonymousUser()
        user = user_model.objects.select_related('profile').get(id=user_id, is_active=True)
        return user
    except Exception as exc:
        logger.debug("JWT WebSocket auth token verification error: %s", exc)
        from django.contrib.auth.models import AnonymousUser
        return AnonymousUser()



class JWTAuthMiddleware(BaseMiddleware):
    """
    ASGI middleware that authenticates WebSocket connections via:
    1. Query param: `?token=<jwt_access_token>`
    2. Header: `Authorization: Bearer <jwt_access_token>`
    3. Sec-WebSocket-Protocol subprotocol tokens
    """

    async def __call__(self, scope, receive, send):
        token = None

        # 1. Check query parameters
        query_string = scope.get('query_string', b'').decode('utf-8')
        if query_string:
            params = parse_qs(query_string)
            if 'token' in params and params['token']:
                token = params['token'][0]

        # 2. Check Authorization header
        if not token:
            headers = dict(scope.get('headers', []))
            auth_header = headers.get(b'authorization', b'').decode('utf-8')
            if auth_header.startswith('Bearer '):
                token = auth_header.split(' ', 1)[1].strip()

        # 3. Check Sec-WebSocket-Protocol
        if not token:
            headers = dict(scope.get('headers', []))
            sec_protocol = headers.get(b'sec-websocket-protocol', b'').decode('utf-8')
            if sec_protocol and sec_protocol.startswith('bearer.'):
                token = sec_protocol.replace('bearer.', '').strip()

        # 4. Resolve authenticated user or fall back to AnonymousUser
        if token:
            user = await get_user_from_token(token)
            scope['user'] = user
        elif 'user' not in scope:
            scope['user'] = AnonymousUser()

        return await super().__call__(scope, receive, send)
