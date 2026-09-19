# 01-common-payloads-and-algorithms.md

> **ফাইল ক্রম:** ৩৫/৪৫  
> **ডিরেক্টরি:** `05-deep-dive-logs/`  
> **সার্ভিস স্কোপ:** Shared Canonical DTOs, Spatial Geometry, Mathematical Algorithms & Cryptographic Primitives  
> **পূর্ববর্তী ফাইল:** [05-deep-dive-logs/00-readme.md](file:///c:/work%20pase/Railway-Project-for-SIH/docs/05-deep-dive-logs/00-readme.md) (Deep Dive Technical Logs & Specifications Index)  
> **পরবর্তী ফাইল:** [05-deep-dive-logs/02-error-code-registry.md](file:///c:/work%20pase/Railway-Project-for-SIH/docs/05-deep-dive-logs/02-error-code-registry.md) (Enterprise Railway Error Code Registry)  
> **সংযোগ ও উদ্দেশ্য:** এই ফাইলে প্ল্যাটফর্মের ক্যানোনিকাল শেয়ার্ড ডেটা ট্রান্সফার অবজেক্ট (DTOs), গাণিতিক সূত্রাবলী (Asset Availability Score, CoF×LoF Risk Matrix, Delay Cascade), চেইনেজ নরমালাইজেশন অ্যালগরিদম, PostgreSQL 15.6 + PostGIS 3.3 স্প্যাশিয়াল জিওমেট্রি কোয়েরি এবং ক্রিপ্টোগ্রাফিক ডিজিটাল টোকেন আর্কিটেকচার বিস্তারিতভাবে সংজ্ঞায়িত করা হয়েছে।

---

# Shared Payloads, Cryptographic Primitives & Core Optimization Algorithms (শেয়ার্ড পেলোড, ক্রিপ্টোগ্রাফিক প্রিমিটিভস ও কোর অপ্টিমাইজেশন অ্যালগরিদম)

## 1. Global API Response Envelopes (সার্বজনীন এপিআই রেসপন্স কাঠামো)

প্ল্যাটফর্মের ৮টি মাইক্রোসার্ভিস থেকে ফেরত পাঠানো সমস্ত সিঙ্ক্রোনাস এইচটিটিপি রেসপন্স বাধ্যতামূলকভাবে নিচে বর্ণিত তিনটি স্ট্যান্ডার্ড এনভেলপের যেকোনো একটির সাথে সামঞ্জস্যপূর্ণ হতে হবে। কোনো অ্যাড-হক আনস্ট্রাকচার্ড ডিকশনারি রেসপন্স অনুমোদিত নয়।

### ১.১ স্ট্যান্ডার্ড সাকসেস এনভেলপ (`ApiResponse<T>`)
```json
{
  "success": true,
  "data": {
    "block_id": "blk-7f8e9a2b-3c4d-5e6f-7a8b-9c0d1e2f3a4b",
    "status": "APPROVED",
    "section_code": "NDLS-GZB-UP",
    "start_km": 14.250,
    "end_km": 18.800,
    "scheduled_window": {
      "start_time": "2026-09-20T02:00:00.000Z",
      "end_time": "2026-09-20T05:30:00.000Z",
      "duration_minutes": 210
    },
    "deconfliction_score": 96.4,
    "safety_token": "TOK-BL-20260920-7F8E-ACD9"
  },
  "metadata": {
    "request_id": "req-9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "timestamp": "2026-09-18T21:30:00.123456Z",
    "execution_duration_ms": 16.4,
    "version": "v1"
  }
}
```

### ১.২ স্ট্যান্ডার্ড এরর এনভেলপ (`ApiErrorResponse`)
```json
{
  "success": false,
  "error": {
    "code": "BLK-003",
    "message": "Block possession request conflicts with higher-priority passenger train schedule.",
    "service": "SVC-BLK",
    "retryable": false,
    "details": [
      {
        "field": "scheduled_start_time",
        "issue": "Overlaps with Train 12424 (NDLS-DBRG Rajdhani Express) between KM 14.250 and 18.800.",
        "conflicting_train_no": "12424",
        "scheduled_arrival": "2026-09-20T02:45:00.000Z"
      }
    ],
    "help_url": "https://railblock.ir.gov.in/docs/errors/BLK-003"
  },
  "metadata": {
    "request_id": "req-9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "timestamp": "2026-09-18T21:30:00.123456Z",
    "execution_duration_ms": 9.1,
    "version": "v1"
  }
}
```

### ১.৩ স্ট্যান্ডার্ড পেজিনেটেড কালেকশন এনভেলপ (`PaginatedResponse<T>`)
```json
{
  "success": true,
  "data": [
    {
      "asset_uid": "AST-ENG-TK-4521",
      "department": "ENGG",
      "asset_type": "POINT_MACHINE",
      "chainage_km": 45.200,
      "risk_score": 18.0,
      "urgency_class": "P1_URGENT"
    }
  ],
  "pagination": {
    "page": 1,
    "page_size": 25,
    "total_records": 142,
    "total_pages": 6,
    "has_next": true,
    "has_previous": false
  },
  "metadata": {
    "request_id": "req-88912389-1123-4123-8822-192837192837",
    "timestamp": "2026-09-18T21:30:00.123456Z"
  }
}
```

---

## 2. Core Optimization & Analytical Algorithms (মূল অপ্টিমাইজেশন ও গাণিতিক সূত্রাবলী)

### ২.১ অ্যাসেট অ্যাভেইলেবিলিটি স্কোর অ্যালগরিদম (Asset Availability Score - Feature #50)

#### গাণিতিক সংজ্ঞা (Mathematical Formulation)
একটি রেলওয়ে ডিভিশন বা সেকশনে কোনো নির্দিষ্ট সময়কালে ($T_{\text{period}}$) ট্র্যাক ও সিগন্যালিং নেটওয়ার্কের উপলব্ধতার শতকরা হার:
$$A_{\text{avail}} = \left( 1 - \frac{\sum_{i=1}^{M} (L_i \times D_i)}{L_{\text{network}} \times T_{\text{period}}} \right) \times 100\%$$

যেখানে:
- $M$: নির্ধারিত সময়সীমার মধ্যে কার্যকরী সকল মেইনটেন্যান্স ব্লকের সংখ্যা।
- $L_i$: $i$-তম ব্লকের আওতাভুক্ত ট্র্যাকের দৈর্ঘ্য (কিলোমিটারে, $L_i = \text{end\_km}_i - \text{start\_km}_i$)।
- $D_i$: $i$-তম ব্লকে ট্র্যাক দখলের প্রকৃত সময়কাল (ঘণ্টায়)।
- $L_{\text{network}}$: সংশ্লিষ্ট ডিভিশন বা করিডোরের মোট রুট ট্র্যাক কিলোমিটার (যেমন: দিল্লি-কানপুর সেকশন = ৪৪০.৫ কিমি)।
- $T_{\text{period}}$: মূল্যায়নের সময়সীমা (যেমন: ৩০ দিনের জন্য $৩০ \times ২৪ = ৭২০$ ঘণ্টা)।

* **প্রাথমিক বেসলাইন (Manual Scheduling):** ৭৪.০% - ৭৮.৪%
* **এআই অপ্টিমাইজড লক্ষ্যমাত্রা (Smart Integrated Scheduling):** ৯৫.৩%+

#### পাইথন ইমপ্লিমেন্টেশন (`apps.analytics.services.availability_engine`)
```python
from decimal import Decimal
from typing import List
from dataclasses import dataclass

@dataclass
class PossessionRecord:
    block_id: str
    start_km: float
    end_km: float
    duration_hours: float

def compute_asset_availability_score(
    possessions: List[PossessionRecord],
    total_network_km: float,
    period_hours: float
) -> Decimal:
    """
    Computes Divisional Asset Availability Score (Feature #50).
    Ensures mathematical precision using Decimal arithmetic.
    """
    if total_network_km <= 0 or period_hours <= 0:
        raise ValueError("Network KM and Period Hours must be strictly positive.")

    total_capacity_km_hours = Decimal(str(total_network_km)) * Decimal(str(period_hours))
    total_downtime_km_hours = Decimal("0.000")

    for p in possessions:
        track_length = Decimal(str(max(0.0, p.end_km - p.start_km)))
        downtime = Decimal(str(max(0.0, p.duration_hours)))
        total_downtime_km_hours += (track_length * downtime)

    loss_ratio = total_downtime_km_hours / total_capacity_km_hours
    availability_percentage = (Decimal("1.0000") - loss_ratio) * Decimal("100.00")

    # Clamping between 0.00% and 100.00%
    clamped_score = max(Decimal("0.00"), min(Decimal("100.00"), availability_percentage))
    return round(clamped_score, 2)
```

---

### ২.২ রিস্ক ম্যাট্রিক্স ও ক্রিটিক্যালিটি র্যাঙ্কিং (CoF × LoF Matrix - Feature #92)

#### গাণিতিক সংজ্ঞা (Mathematical Matrix)
$$\text{Risk Score} = \text{Consequence of Failure (CoF)} \times \text{Likelihood of Failure (LoF)}$$

1. **Consequence of Failure ($\text{CoF} \in [1, 5]$):**
   * $\text{CoF} = 5$: গ্রুপ-এ গোল্ডেন করিডোর (যেমন: হাওড়া-নয়াদিল্লি, মুম্বাই-দিল্লি), গতিসীমা ১৩০-১৬০ কিমি/ঘণ্টা, রাজধানী/বন্দে ভারত রুট।
   * $\text{CoF} = 4$: গ্রুপ-বি ট্রাঙ্ক রুট, গতিসীমা ১১০-১৩০ কিমি/ঘণ্টা, প্রধান এক্সপ্রেস ও পণ্যবাহী করিডোর।
   * $\text{CoF} = 3$: প্রধান শাখা লাইন (Branch Lines), গতিসীমা ৯০-১১০ কিমি/ঘণ্টা।
   * $\text{CoF} = 2$: টার্মিনাল ইয়ার্ড ও শান্টিং নেক।
   * $\text{CoF} = 1$: লো-স্পিড সাইডিং লাইন ও মালগুদাম লাইন (< ৩০ কিমি/ঘণ্টা)।

2. **Likelihood of Failure ($\text{LoF} \in [1, 5]$):**
   $$\text{LoF} = \text{clamp}\left( \left\lceil w_1 \cdot \frac{\text{Age}}{\text{Design Life}} + w_2 \cdot \text{USFD Flaw Grade} + w_3 \cdot \text{GMT Traversed} \right\rceil, 1, 5 \right)$$
   যেখানে ওজন $w_1 = 0.35, w_2 = 0.45, w_3 = 0.20$।

#### প্রায়োরিটি অ্যাকশন লেভেল (Action Triage)
* **$\text{Risk Score} \ge 15$ (P1 - Urgent):** ৪৮ ঘণ্টার মধ্যে বাধ্যতামূলক জরুরি মেগা-ব্লক অনুমোদন।
* **$8 \le \text{Risk Score} < 15$ (P2 - Planned):** পরবর্তী ৭ দিনের রুটিন উইন্ডোতে অন্তর্ভুক্তকরণ।
* **$\text{Risk Score} < 8$ (P3 - Deferred):** পিরিওডিক মনিটরিং ও ৩০ দিনের সাইকেলে ট্র্যাকিং।

---

### ২.৩ চেইনেজ নরমালাইজেশন অ্যালগরিদম (Chainage Normalization Engine - Feature #87)

ভারতীয় রেলওয়েতে ইঞ্জিনিয়ারিং শাখা (TMS), সিগন্যালিং (SMMS) এবং ওএইচই (TDMS) বিভিন্ন বিন্যাসে কিলোমিটার পজিশন ইনপুট দেয় (যেমন: `KM 142/5-6`, `142+500`, `142/12`, `142.500`)। ইঞ্জিনিয়ারিং পার্সার এটিকে একটি প্রিসাইজ ফ্ল্যাট মিটারে কনভার্ট করে:

```python
import re
from typing import Optional

CHAINAGE_REGEX_PATTERNS = [
    # Match standard telegraph post: "142/5" or "142/5-6" -> 142 km + 5 telegraph posts (each ~100m)
    re.compile(r"^(?:KM\s*)?(\d+)[/](\d+)(?:-\d+)?$", re.IGNORECASE),
    # Match engineering offset: "142+500" or "KM 142+250"
    re.compile(r"^(?:KM\s*)?(\d+)\+(\d+(?:\.\d+)?)$", re.IGNORECASE),
    # Match pure decimal: "142.500" or "KM 142.5"
    re.compile(r"^(?:KM\s*)?(\d+(?:\.\d+)?)$", re.IGNORECASE),
]

def normalize_railway_chainage(raw_chainage: str) -> Optional[float]:
    """
    Normalizes diverse Indian Railways chainage notations to absolute float KM.
    Example:
      'KM 142/5'   -> 142.500
      '142+250'    -> 142.250
      'KM 45.800'  -> 45.800
    """
    cleaned = raw_chainage.strip().upper().replace(" ", "")
    
    # 1. Telegraph post notation (standard 100m/80m span approx)
    match_tp = CHAINAGE_REGEX_PATTERNS[0].match(cleaned)
    if match_tp:
        km = int(match_tp.group(1))
        tp = int(match_tp.group(2))
        # Standard IR Telegraph Post spacing: 100 meters per TP unit
        return round(km + (tp * 0.100), 3)

    # 2. Plus offset notation (142+500)
    match_plus = CHAINAGE_REGEX_PATTERNS[1].match(cleaned)
    if match_plus:
        km = int(match_plus.group(1))
        meters = float(match_plus.group(2))
        return round(km + (meters / 1000.0), 3)

    # 3. Direct decimal notation (142.50)
    match_dec = CHAINAGE_REGEX_PATTERNS[2].match(cleaned)
    if match_dec:
        return round(float(match_dec.group(1)), 3)

    return None
```

---

### ২.৪ টাইম-স্পেস সুইপ-লাইন কনফ্লিক্ট ডিটেকশন (Sweep-Line Corridor Engine)

#### সমস্যা বিশ্লেষণ (Complexity & Formulation)
ধরা যাক একটি লাইনে $N$ টি নির্ধারিত ট্র্যাফিক ব্লক এবং $M$ টি লাইভ ট্রেনের করিডোর উইন্ডো রয়েছে। প্রতিটি উইন্ডো একটি দ্বিমাত্রিক আয়তক্ষেত্র (Time: $[t_{\text{start}}, t_{\text{end}}]$, Space: $[k_{\text{start}}, k_{\text{end}}]$)।
ইন্টারভাল ট্রি (Interval Tree) এবং সুইপ-লাইন ব্যবহার করে $O((N + M) \log (N + M))$ সময়ে সকল সংঘাত ও ওভারল্যাপ শনাক্ত করা হয়।

```python
from dataclasses import dataclass
from datetime import datetime
from typing import List, Dict, Any

@dataclass
class CorridorEntity:
    uid: str
    kind: str  # 'BLOCK' or 'TRAIN'
    start_km: float
    end_km: float
    start_time: datetime
    end_time: datetime
    line_type: str  # 'UP', 'DOWN', 'BIDIRECTIONAL'
    priority: int   # 1=Rajdhani/Shatabdi, 2=Mail/Express, 3=Goods, 4=Maintenance Block

def detect_corridor_conflicts(
    target: CorridorEntity,
    active_corridors: List[CorridorEntity]
) -> List[Dict[str, Any]]:
    conflicts = []
    
    for candidate in active_corridors:
        if candidate.uid == target.uid:
            continue
        
        # 1. Line compatibility check
        line_overlap = (
            target.line_type == candidate.line_type or 
            target.line_type == 'BIDIRECTIONAL' or 
            candidate.line_type == 'BIDIRECTIONAL'
        )
        if not line_overlap:
            continue

        # 2. Temporal overlap check: max(s1, s2) < min(e1, e2)
        t_overlap_start = max(target.start_time, candidate.start_time)
        t_overlap_end = min(target.end_time, candidate.end_time)
        if t_overlap_start >= t_overlap_end:
            continue

        # 3. Spatial chainage overlap check: max(k1, k2) < min(k3, k4)
        k_overlap_start = max(target.start_km, candidate.start_km)
        k_overlap_end = min(target.end_km, candidate.end_km)
        if k_overlap_start >= k_overlap_end:
            continue

        # Conflict identified
        duration_minutes = (t_overlap_end - t_overlap_start).total_seconds() / 60.0
        severity = "CRITICAL" if (candidate.priority == 1 or target.priority == 1) else "HIGH"

        conflicts.append({
            "target_id": target.uid,
            "conflicting_id": candidate.uid,
            "conflicting_kind": candidate.kind,
            "severity": severity,
            "spatial_overlap_km": {
                "start": k_overlap_start,
                "end": k_overlap_end,
                "length_km": round(k_overlap_end - k_overlap_start, 3)
            },
            "temporal_overlap": {
                "start": t_overlap_start.isoformat(),
                "end": t_overlap_end.isoformat(),
                "duration_minutes": round(duration_minutes, 1)
            }
        })

    return conflicts
```

---

## 3. PostgreSQL 15.6 + PostGIS 3.3 Spatial Engine Specifications (স্প্যাশিয়াল ইঞ্জিন স্পেক্স)

সমস্ত জিওস্প্যাশিয়াল কোঅর্ডিনেট এবং ট্র্যাক জিওমেট্রি WGS 84 (`EPSG:4326`) কার্টোগ্রাফিক প্রোজেকশনে সংরক্ষিত।

### ৩.১ স্প্যাশিয়াল ডেটাবেস স্কিমা ও GiST ইনডেক্সিং
```sql
-- Track Corridors Table with MultiLineString Geometry
CREATE TABLE IF NOT EXISTS railway_corridors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    corridor_code VARCHAR(32) UNIQUE NOT NULL,
    section_name VARCHAR(128) NOT NULL,
    division_code VARCHAR(16) NOT NULL,
    start_km NUMERIC(8, 3) NOT NULL,
    end_km NUMERIC(8, 3) NOT NULL,
    track_geometry GEOMETRY(LineString, 4326) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- High-performance R-Tree Spatial Index (GiST)
CREATE INDEX idx_corridors_geom_gist ON railway_corridors USING GIST (track_geometry);
CREATE INDEX idx_corridors_km_range ON railway_corridors (start_km, end_km);
```

### ৩.২ ৫০-মিটার সেফটি বাফার ইন্টারসেকশন কোয়েরি (PostGIS Metric Buffer Query)
ব্লক কার্যক্রমে সুরক্ষা নিশ্চিত করতে লাইনের উভয় পাশে ৫০ মিটারের একটি পলিমরফিক সেফটি বাফার তৈরি করে নিকটবর্তী সক্রিয় লাইন বা অবকাঠামো ইন্টারসেক্ট করা হয়:

```sql
-- Identify all assets and adjacent tracks within 50 meters of maintenance work zone
SELECT 
    c.corridor_code,
    c.section_name,
    ST_AsGeoJSON(c.track_geometry) AS matched_geometry,
    ST_Distance(
        c.track_geometry::geography, 
        work_zone.geom::geography
    ) AS distance_meters
FROM railway_corridors c,
(
    -- Work zone Linestring cast to PostGIS Geography for accurate meter-based buffering
    SELECT ST_Buffer(
        ST_SetSRID(ST_MakeLine(ST_Point(77.2167, 28.6139), ST_Point(77.2345, 28.6250)), 4326)::geography,
        50.0 -- 50 meters safety buffer
    )::geometry AS geom
) AS work_zone
WHERE ST_DWithin(c.track_geometry::geography, work_zone.geom::geography, 50.0);
```

---

## 4. Train Delay Cascading & Propagation Calculation (Feature #115 & #27)

একটি সেকশনে মেগা-ব্লক চলাকালে বা গতিবিধিনিষেধ (TSR) আরোপিত হলে পেছনের ট্রেনগুলোর মধ্যে বিলম্ব ছড়িয়ে পড়ার সমীকরণ:

$$\Delta T_{\text{total}} = \Delta T_{\text{primary}} + \sum_{j=1}^{P} \max\left(0, H_{\text{min}} - \left(A_{j} - A_{j-1}\right) + S_{\text{buffer}}\right)$$

যেখানে:
- $\Delta T_{\text{primary}}$: প্রাথমিক ট্রেনের স্পিড রেস্ট্রিকশনজনিত লেট (যেমন: স্বাভাবিক ১৩০ কিমি/ঘণ্টা থেকে ৩০ কিমি/ঘণ্টায় নামানোর ফলে সৃষ্ট অতিরিক্ত সময়)।
- $H_{\text{min}}$: স্বয়ংক্রিয় সিগন্যালিং সিস্টেমের ন্যূনতম নিরাপদ হেডওয়ে ইন্টারভাল (সাধারণত ৪.৫ মিনিট)।
- $A_j$: $j$-তম ট্রেনের নির্ধারিত আগমন সময়।
- $S_{\text{buffer}}$: পরবর্তী জাংশন স্টেশনের অতিরিক্ত লুক-অ্যাহেড মার্জিন।
- $P$: একই সেকশনে ব্লকের পেছনের সারিবদ্ধ ট্রেনের মোট সংখ্যা।

---

## 5. Cryptographic Standards & Digital Safety Tokens (Feature #71 & #74)

সুরক্ষা নিশ্চিতে এবং আন-অথরাইজড ট্র্যাকে অনুপ্রবেশ রুখতে একটি ডিজিটাল ট্রিপল-লক অথেনটিকেশন ও টোকেন মেকানিজম বাস্তবায়িত হয়েছে:

| প্যারামিটার | প্রযুক্তি ও স্ট্যান্ডার্ড | ডোমেন উদ্দেশ্য ও নিরাপত্তা ভূমিকা |
|---|---|---|
| **Digital Section Token** | HMAC-SHA256 এককালীন ডাইনামিক কি | ব্লক শুরু ও সেকশন ক্লিয়ারেন্সে স্টেশন মাস্টার ও সেকশন ইনচার্জের দ্বিপাক্ষিক স্বীকৃতি (#71) |
| **LOTO Digital Handshake** | ECDSA P-256 কি-পেয়ার ডিজিটাল সাইন | ওএইচই কারেন্ট আইসোলেশন ও গ্রাউন্ডিং কনফার্মেশন (#73, #74) |
| **API Authentication** | RS256 (RSA 2048-bit with SHA-256) | এসিমেট্রিক জেডাব্লিউটি টোকেন সাইনিং; ৮টি সার্ভিসের মাঝে পাবলিক-কি শেয়ার্ড |
| **Access Token TTL** | ৯০০ সেকেন্ড (১৫ মিনিট) | টোকেন চুরির ঝুঁকি হ্রাস ও ক্ষণস্থায়ী অথরাইজেশন |
| **Password & PIN Hashing** | Argon2id (`time=3, memory=64MB, p=2`) | রেলওয়ে কন্ট্রোলার ও অ্যাডমিন ক্রেডেনশিয়ালস ব্রুট-ফোর্স প্রতিরোধ |
| **Database Encryption** | PostgreSQL pgcrypto / TDE (AES-256) | ডেটাবেস ব্যাকআপ ও রেস্ট এনক্রিপশন |
| **Data in Transit** | TLS 1.3 (ECDHE-RSA-AES256-GCM-SHA384) | ড্যাফনি ওয়েবসকেট ও এইচটিটিপিএস সুরক্ষিত চ্যানেল |
