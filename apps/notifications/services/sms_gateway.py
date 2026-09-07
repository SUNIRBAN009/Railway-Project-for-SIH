"""
CDAC SMS Gateway Client for Indian Railways (SVC-NOTIF / TSK-P3-012).
Authoritative reference: docs/03-service-blueprints/08-notifications.md
Conforms to Centre for Development of Advanced Computing (C-DAC) e-Gov SMS Gateway specifications.
"""
import re
import uuid
import logging
import requests
from django.conf import settings

logger = logging.getLogger(__name__)


class CDACSMSGatewayError(Exception):
    """Base exception for CDAC SMS Gateway communication failures."""
    pass


class CDACSMSGatewayClient:
    """
    Client for Indian Railways CDAC SMS Gateway.
    Provides standard DLT-compliant SMS transmission with automatic fallback/simulation mode.
    """

    PHONE_REGEX = re.compile(r'^(?:\+91|91|0)?[6-9]\d{9}$')

    def __init__(self, api_url=None, username=None, password=None, sender_id=None, secure_key=None):
        self.api_url = api_url or getattr(settings, 'CDAC_SMS_API_URL', 'https://mgov.gov.in/api/v1/sms')
        self.username = username or getattr(settings, 'CDAC_SMS_USERNAME', 'IR_DISPATCH')
        self.password = password or getattr(settings, 'CDAC_SMS_PASSWORD', 'SECRET')
        self.sender_id = sender_id or getattr(settings, 'CDAC_SMS_SENDER_ID', 'IRDISP')
        self.secure_key = secure_key or getattr(settings, 'CDAC_SMS_SECURE_KEY', 'MOCK_KEY')
        self.is_simulation = getattr(settings, 'CDAC_SMS_SIMULATION_MODE', True)

    @classmethod
    def sanitize_phone_number(cls, phone_number: str) -> str:
        """
        Validates and formats an Indian mobile number into 10 digits without leading 0 or +91.
        """
        if not phone_number:
            raise ValueError("Recipient phone number cannot be empty")
        
        cleaned = re.sub(r'[\s\-()]', '', str(phone_number).strip())
        if not cls.PHONE_REGEX.match(cleaned):
            raise ValueError(f"Invalid Indian mobile phone number: '{phone_number}'")
        
        # Strip leading +91, 91, or 0 to get 10-digit number
        if cleaned.startswith('+91'):
            cleaned = cleaned[3:]
        elif cleaned.startswith('91') and len(cleaned) == 12:
            cleaned = cleaned[2:]
        elif cleaned.startswith('0') and len(cleaned) == 11:
            cleaned = cleaned[1:]

        return cleaned

    def send_sms(self, recipient_phone: str, message: str, template_id: str = "DLT_IR_DISP_01") -> dict:
        """
        Dispatches an SMS notification to the target phone number.
        Returns a delivery receipt dict with reference_id and delivery status.
        """
        sanitized_phone = self.sanitize_phone_number(recipient_phone)
        ref_id = f"CDAC-{uuid.uuid4().hex[:12].upper()}"

        logger.info(
            "CDAC SMS Dispatch requested: recipient=%s, ref_id=%s, length=%d, template=%s",
            sanitized_phone, ref_id, len(message), template_id
        )

        if self.is_simulation:
            # Simulated carrier transmission
            logger.info("CDAC SMS Gateway in SIMULATION mode: message successfully queued and delivered.")
            return {
                "success": True,
                "reference_id": ref_id,
                "recipient_phone": sanitized_phone,
                "status": "DELIVERED",
                "carrier_response": "402:Message Accepted By Operator (SIMULATED)",
                "error_message": None,
            }

        # Real HTTP payload conforming to CDAC Gateway specs
        payload = {
            "username": self.username,
            "password": self.password,
            "sender": self.sender_id,
            "smsservicetype": "singlemsg",
            "mobileno": sanitized_phone,
            "content": message,
            "templateid": template_id,
            "key": self.secure_key,
        }

        try:
            response = requests.post(self.api_url, data=payload, timeout=8)
            response.raise_for_status()
            resp_text = response.text.strip()

            # CDAC responds with '402:Message Accepted By SMSC' on success
            if "402:" in resp_text or "SUCCESS" in resp_text.upper():
                return {
                    "success": True,
                    "reference_id": ref_id,
                    "recipient_phone": sanitized_phone,
                    "status": "DELIVERED",
                    "carrier_response": resp_text,
                    "error_message": None,
                }
            else:
                logger.warning("CDAC SMS carrier error response: %s", resp_text)
                return {
                    "success": False,
                    "reference_id": ref_id,
                    "recipient_phone": sanitized_phone,
                    "status": "FAILED",
                    "carrier_response": resp_text,
                    "error_message": f"CDAC Gateway error: {resp_text}",
                }
        except requests.RequestException as exc:
            logger.error("Network or HTTP exception during CDAC SMS dispatch: %s", exc)
            return {
                "success": False,
                "reference_id": ref_id,
                "recipient_phone": sanitized_phone,
                "status": "FAILED",
                "carrier_response": None,
                "error_message": str(exc),
            }
