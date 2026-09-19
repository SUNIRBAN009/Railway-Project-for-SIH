import logging
import os
from typing import Optional, Dict, Any
from django.conf import settings
import pybreaker

logger = logging.getLogger(__name__)

# Configure PyBreaker Circuit Breaker for External Gemini API Calls (DEC-004)
# 5 failures in 60s -> opens circuit for 120s
gemini_circuit_breaker = pybreaker.CircuitBreaker(
    fail_max=5,
    reset_timeout=120,
    name="GeminiAPIBreaker"
)


class ExplanationService:
    """
    Hybrid AI Explanation Service (Neural AI Layer).
    Translates complex Description Logic proofs and spatial-temporal conflicts
    into intuitive, human-understandable safety explanations in Bengali, Hindi, and English.
    
    Architecture Reference:
      - Primary: Google Gemini 1.5 Flash (via google.generativeai)
      - Circuit Breaker: PyBreaker with automatic open/half-open/closed state
      - Offline/Fallback: Rule-based domain-expert multilingual synthesis engine
    """

    @classmethod
    def get_gemini_client(cls):
        """Initializes and returns Gemini GenerativeModel client if API key is configured."""
        api_key = getattr(settings, 'GEMINI_API_KEY', '') or os.environ.get('GEMINI_API_KEY', '')
        if not api_key:
            return None
        try:
            import google.generativeai as genai
            genai.configure(api_key=api_key)
            return genai.GenerativeModel('gemini-1.5-flash')
        except Exception as e:
            logger.warning(f"Failed to initialize google.generativeai client: {e}")
            return None

    @classmethod
    def explain_semantic_violation(
        cls,
        violation_type: str,
        block_code: str,
        train_number: str = "12301",
        train_name: str = "Howrah Rajdhani",
        track_info: str = "KM 14.2 - 18.5 (NDLS-GZB)",
        language: str = "bn"
    ) -> str:
        """
        Generates natural language explanation for safety hazards detected by HermiT reasoner.
        Defaults to Bengali ('bn'), supports Hindi ('hi') and English ('en').
        """
        prompt = (
            f"You are the Chief Railway Safety AI Officer for Indian Railways (Mission RailBlock AI). "
            f"Explain to the Traffic Controller in {cls._get_lang_name(language)} why the following "
            f"maintenance block causes a critical safety hazard and must NOT be sanctioned:\n"
            f"- Hazard Type: {violation_type}\n"
            f"- Proposed Block Code: {block_code}\n"
            f"- Affected Train: {train_number} ({train_name})\n"
            f"- Location: {track_info}\n"
            f"Keep the explanation clear, actionable, under 3 sentences, and emphasize passenger safety."
        )

        try:
            return cls._call_gemini_with_breaker(prompt, language, violation_type, block_code, train_number, train_name, track_info)
        except Exception as exc:
            logger.info(f"Gemini API unavailable or circuit open ({exc}). Engaging domain-accurate fallback.")
            return cls._get_deterministic_fallback(violation_type, block_code, train_number, train_name, track_info, language)

    @classmethod
    @gemini_circuit_breaker
    def _call_gemini_with_breaker(
        cls,
        prompt: str,
        language: str,
        violation_type: str,
        block_code: str,
        train_number: str,
        train_name: str,
        track_info: str
    ) -> str:
        client = cls.get_gemini_client()
        if not client:
            raise RuntimeError("GEMINI_API_KEY not configured. Falling back to local synthesizer.")

        response = client.generate_content(prompt)
        if response and response.text:
            return response.text.strip()
        raise ValueError("Empty response from Gemini API.")

    @classmethod
    def _get_lang_name(cls, code: str) -> str:
        return {'bn': 'Bengali', 'hi': 'Hindi', 'en': 'English'}.get(code.lower(), 'Bengali')

    @classmethod
    def _get_deterministic_fallback(
        cls,
        violation_type: str,
        block_code: str,
        train_number: str,
        train_name: str,
        track_info: str,
        language: str
    ) -> str:
        """
        High-precision deterministic multilingual domain templates for offline and demo environments.
        Guarantees zero-downtime explainability even without internet or cloud LLM keys.
        """
        if language == 'bn':
            if 'STRANDED' in violation_type.upper() or 'OHE' in violation_type.upper():
                return (
                    f"⚠️ [সতর্কবার্তা - বিদ্যুৎ বিভ্রাট ঝুঁকি]: প্রস্তাবিত ব্লক '{block_code}'-এ OHE ২৫kV ক্যাটেনারি পাওয়ার কাট "
                    f"করা হলে {track_info} সেকশনে চলমান ইলেকট্রিক ট্রেন {train_number} ({train_name}) ট্র‍্যাকশন বিদ্যুৎ না পেয়ে মাঝপথে আটকে পড়বে। "
                    f"যাত্রী সুরক্ষা এবং মেইনলাইন জ্যাম এড়াতে ব্লকটি এই সময়ে মঞ্জুর করা যাবে না।"
                )
            elif 'CROSSOVER' in violation_type.upper() or 'DEADLOCK' in violation_type.upper():
                return (
                    f"⚠️ [সিগন্যাল ডেডলক ঝুঁকি]: ব্লক '{block_code}'-এর অধীনে পয়েন্ট ইন্টারলকিং সংযোগ বিচ্ছিন্ন করা হলে "
                    f"{track_info} এলাকায় ট্রেন {train_number} ({train_name})-এর জন্য কোনো বিকল্প সেফটি ফ্ল্যাঙ্ক রুট থাকবে না, "
                    f"যার ফলে স্টেশন নেক এলাকায় সম্পূর্ণ ট্র্যাফিক ডেডলক সৃষ্টি হবে।"
                )
            else:
                return (
                    f"⚠️ [নিরাপত্তা নিয়ম লঙ্ঘন]: প্রস্তাবিত ব্লক '{block_code}'-এর ফলে {track_info} এলাকায় "
                    f"ট্রেন {train_number} ({train_name})-এর চলাচলে গুরুতর বিঘ্ন ঘটবে। ট্র্যাফিক কন্ট্রোল অবিলম্বে সময়সূচী পর্যালোচনা করুন।"
                )

        elif language == 'hi':
            if 'STRANDED' in violation_type.upper() or 'OHE' in violation_type.upper():
                return (
                    f"⚠️ [सुरक्षा चेतावनी - बिजली कटौती]: ब्लॉक '{block_code}' के तहत OHE 25kV पावर कट से "
                    f"{track_info} खंड में इलेक्ट्रिक ट्रेन {train_number} ({train_name}) बीच रास्ते में रुक जाएगी। "
                    f"यात्री सुरक्षा को देखते हुए इस ब्लॉक को मंजूरी न दें।"
                )
            else:
                return (
                    f"⚠️ [सिग्नल इंटरलॉकिंग जोखिम]: ब्लॉक '{block_code}' से {track_info} में "
                    f"ट्रेन {train_number} के लिए सिग्नल रूट लॉक हो जाएगा जिससे परिचालन ठप होने का खतरा है।"
                )

        else: # English
            return (
                f"CRITICAL SAFETY HAZARD: Block '{block_code}' cuts 25kV OHE traction power in {track_info}, "
                f"which will strand electric locomotive {train_number} ({train_name}) without tractive power. "
                f"Block sanction is automatically blocked by Rule Engine."
            )
