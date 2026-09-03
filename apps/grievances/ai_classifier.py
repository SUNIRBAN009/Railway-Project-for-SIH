"""
AI-assisted Grievance Classifier & Priority Scoring Module.
Analyzes passenger complaint text for:
1. Category Detection (Security, Medical, Cleanliness, Electrical, Catering, Staff Behavior, Delay)
2. Priority Urgency Scoring (Critical, High, Medium, Low)
3. Sentiment Polarity (Extremely Negative, Negative, Neutral)
4. SLA Resolution Target
"""

import re

CRITICAL_KEYWORDS = [
    'harass', 'harassment', 'theft', 'stolen', 'robbery', 'robbed', 'fight',
    'medical', 'heart attack', 'bleed', 'unconscious', 'fainted', 'child lost',
    'emergency', 'fire', 'smoke', 'spark', 'short circuit', 'gas leak', 'molest',
    'assault', 'weapon', 'police', 'rpf', 'danger', 'accident', 'life threat'
]

HIGH_KEYWORDS = [
    'ac not working', 'ac dead', 'ac failed', 'no cooling', 'severe heat',
    'water empty', 'no water', 'overflow', 'choked toilet', 'broken window',
    'broken berth', 'cockroach', 'rats', 'food poisoning', 'spoiled food',
    'expired food', 'rude tt', 'bribery', 'overcharging', 'extortion'
]

MEDIUM_KEYWORDS = [
    'dirty coach', 'garbage', 'dustbin full', 'charging point', 'fan slow',
    'light flickering', 'bedroll dirty', 'blanket smell', 'delay update',
    'announcement', 'pantry boy', 'curtain missing', 'cleaning required'
]

def analyze_grievance_text(text: str, category_override: str = None) -> dict:
    if not text:
        return {
            'suggested_category': category_override or 'OTHER',
            'priority': 'LOW',
            'urgency_score': 20,
            'sentiment': 'Neutral',
            'is_critical': False,
            'recommended_sla_hours': 24,
            'detected_keywords': []
        }

    lower_text = text.lower()
    detected_keywords = []

    # Check Critical
    for kw in CRITICAL_KEYWORDS:
        if kw in lower_text:
            detected_keywords.append(kw)

    # Check High
    for kw in HIGH_KEYWORDS:
        if kw in lower_text:
            detected_keywords.append(kw)

    # Check Medium
    for kw in MEDIUM_KEYWORDS:
        if kw in lower_text:
            detected_keywords.append(kw)

    # Determine Priority & Urgency Score
    if any(kw in lower_text for kw in CRITICAL_KEYWORDS):
        priority = 'CRITICAL'
        urgency_score = 95
        is_critical = True
        sla_hours = 0.5  # 30 mins
        sentiment = 'Urgent / High Distress'
    elif any(kw in lower_text for kw in HIGH_KEYWORDS):
        priority = 'HIGH'
        urgency_score = 75
        is_critical = False
        sla_hours = 2.0  # 2 hours
        sentiment = 'Strongly Negative'
    elif any(kw in lower_text for kw in MEDIUM_KEYWORDS):
        priority = 'MEDIUM'
        urgency_score = 50
        is_critical = False
        sla_hours = 6.0  # 6 hours
        sentiment = 'Negative'
    else:
        priority = 'LOW'
        urgency_score = 25
        is_critical = False
        sla_hours = 24.0  # 24 hours
        sentiment = 'Mildly Dissatisfied'

    # Suggest Category if not provided or if clear match
    suggested_category = category_override
    if not suggested_category or suggested_category == 'OTHER':
        if any(w in lower_text for w in ['thief', 'stolen', 'robbery', 'fight', 'harass', 'assault', 'security', 'rpf']):
            suggested_category = 'SECURITY'
        elif any(w in lower_text for w in ['medical', 'doctor', 'faint', 'bleed', 'pregnant', 'medicine', 'pain']):
            suggested_category = 'MEDICAL'
        elif any(w in lower_text for w in ['clean', 'dirty', 'toilet', 'garbage', 'cockroach', 'smell', 'washroom']):
            suggested_category = 'CLEANLINESS'
        elif any(w in lower_text for w in ['ac', 'fan', 'light', 'charging', 'switch', 'spark', 'electrical']):
            suggested_category = 'ELECTRICAL'
        elif any(w in lower_text for w in ['food', 'meal', 'catering', 'pantry', 'tea', 'water bottle', 'taste', 'stale']):
            suggested_category = 'CATERING'
        elif any(w in lower_text for w in ['tte', 'conductor', 'bribe', 'behavior', 'staff', 'officer']):
            suggested_category = 'STAFF_BEHAVIOR'
        else:
            suggested_category = category_override or 'GENERAL'

    return {
        'suggested_category': suggested_category,
        'priority': priority,
        'urgency_score': urgency_score,
        'sentiment': sentiment,
        'is_critical': is_critical,
        'recommended_sla_hours': sla_hours,
        'detected_keywords': detected_keywords[:5]
    }
