# 06-security.md

> **ফাইল ক্রম:** ১০/৪৫  
> **ডিরেক্টরি:** `01-tech-infra/`  
> **পূর্ববর্তী ফাইল:** `01-tech-infra/05-observability.md` (অডিট লগিং, ট্রেসিং, এরর অ্যালার্ট)  
> **পরবর্তী ফাইল:** `01-tech-infra/07-workers-consumers.md` (সেলিরি ওয়ার্কার সিকিউরিটি ও কনকারেন্সি)  
> **কন্টেন্ট সোর্স:** `RailBlock_Feature_Master_Plan_PS26027(1).xlsx` (১২২টি ফিচার, ১৫টি সেফটি স্যুট ফিচার, Feature #112 Spatial RBAC) এবং `ai-project-spec-generator (1).md`।  
> **ডাটাবেস ও নিরাপত্তা নীতি:** **PostgreSQL 15/16 + PostGIS 3.3** (নো MySQL), **Spatial RBAC (#112)**, **Cryptographic Digital Token (#71)** এবং **W3C/TLS 1.3 Security**।

---

## 1. STRIDE Threat Model & Railway Domain Mitigations

রেলওয়ের মতো মিশন-ক্রিটিকাল অবকাঠামোতে সাইবার বা লজিক্যাল ঝুঁকি প্রতিহত করতে STRIDE ফ্রেমওয়ার্ক অনুযায়ী নিরাপত্তা ব্যবস্থা বাস্তবায়িত:

| STRIDE Threat Category | Railway Specific Attack Vector | Severity | Potential Operational Impact | Mitigation Architecture in RailBlock AI |
|:---|:---|:---:|:---|:---|
| **Spoofing (পরিচয় জালিয়াতি)** | অননুমোদিত ব্যক্তি রেলওয়ে কন্ট্রোলার বা জে/এসএসই সেজে ফেক ব্লক অনুমোদন করা। | **Critical** | বিপরীত লাইনে ট্রেন ঢুকে মুখোমুখি সংঘর্ষ (Collision)। | • আর্গন২ (Argon2) হ্যাশিং + Stateless JWT (১৫ মি. মেয়াদ)।<br>• ডিজিটাল টোকেন হ্যান্ডওভার (#71) ক্রিপ্টোগ্রাফিক সাইন।<br>• কোনো উন্মুক্ত পাবলিক সেলফ-রেজিস্ট্রেশন নেই (অ্যাডমিন-প্রোভিশন্ড)। |
| **Tampering (ডেটা বিকৃতি)** | অনুমোদিত ব্লকের সময়সীমা বা চেইনেজ কিমি অবৈধভাবে পরিবর্তন করা। | **Critical** | লাইনে গ্যাং কাজ করা অবস্থায় ট্রেনের সিগন্যাল সবুজ (GREEN) হয়ে যাওয়া। | • PostgreSQL `block_audit_log` ইমিউটেবল ট্রায়াল।<br>• পোস্টজিআইএস লাইনস্ট্রিং ইন্টারসেকশন যাচাই।<br>• HermiT সিম্বলিক রিজনার দিয়ে রুল টেম্পারিং প্রতিরোধ। |
| **Repudiation (অস্বীকৃতি)** | কন্ট্রোলার বিপজ্জনক সেকশনে ব্লক অনুমোদন করে পরবর্তীতে দায় অস্বীকার করা। | **High** | দুর্ঘটনার পর প্রাতিষ্ঠানিক তদন্তে জবাবদিহিতা এড়ানো। | • ডিজিটাল সাইন ও অফিসিয়াল স্যাংশন অর্ডার PDF (#107)।<br>• প্রতিটা এপ্রুভালে অডিট লগে ইউজারের ইউজারনেম, টাইমস্ট্যাম্প ও আইপি স্থায়ী সংরক্ষণ। |
| **Information Disclosure (তথ্য ফাঁস)** | ভিভিআইপি ট্রেন বা সামরিক রসদবাহী ট্রেনের সুনির্দিষ্ট স্থান ও সময়সূচি ফাঁস। | **High** | জাতীয় নিরাপত্তা বিঘ্ন ও রেলওয়ের ট্রাফিকের তথ্য চুরি। | • ট্রানজিটে TLS 1.3 ও রেস্টে AES-256 এনক্রিপশন।<br>• সংবেদনশীল ফিল্ড মাস্কিং (`+91*****1234`)।<br>• রোলভিত্তিক পে-লোড ফিল্টারিং (JE কেবল নিজ বিভাগের ডেটা দেখে)। |
| **Denial of Service (DoS)** | বট বা স্ক্রিপ্ট দিয়ে হাজার হাজার ফেক ব্লক সাবমিট করে কন্ট্রোল রুমের সিস্টেম জ্যাম করা। | **High** | রিয়েল-টাইম কন্ট্রোল রুম ফ্রিজ হয়ে ট্রেনের অপারেশন স্থবির। | • Redis-ব্যাকড রেট লিমিটার (প্রতি ইউজারে সর্বোচ্চ ১০ ব্লক/মিনিট)।<br>• এনগিনক্স (Nginx) লেভেলে কানেকশন রেট থ্রটলিং। |
| **Elevation of Privilege (ক্ষমতার অপব্যবহার)**| সিভিল গ্যাং বা ট্র্যাকম্যান জে/এসএসই সেজে ওএইচই পাওয়ার লাইন কাটার পারমিট জারি করা। | **Critical** | ত্রুটিপূর্ণ পাওয়ার কাটে পুরো করিডোরের ইলেকট্রিক ট্রেন থমকে যাওয়া। | • **Spatial RBAC (Feature #112):** ডিভিশন ও বিভাগীয় পারমিশন গার্ড।<br>• LOTO (#74) ও PTW (#84) কেবলমাত্র সেফটি অফিসারের দ্বি-স্তরীয় যাচাইয়ে ইস্যু। |

---

## 2. Authentication Flow & Token Lifecycle

### 2.1 User Provisioning & Account Hierarchy
সিস্টেমে কোনো **পাবলিক সাইন-আপ নেই**। সমস্ত অ্যাকাউন্ট চিফ কন্ট্রোলার বা প্ল্যাটফর্ম অ্যাডমিনিস্ট্রেটর কর্তৃক প্রাক-অনুমোদিত হয়:

```text
[Chief Controller / Platform Admin]
       │
       ▼ (Creates User in PostgreSQL: accounts_user)
Assigns:
├── UUID Primary Key
├── Railway Staff ID (e.g., ENGG_HWH_JE_04)
├── Department: ENGG / TRD / SNT / OPERATIONS / SAFETY
├── Division: HOWRAH / SEALDAH / KHARAGPUR / ASANSOL
├── Assigned PostGIS Sections: ["HWH-BWN-L1", "HWH-KGP-MAIN"]
└── Cryptographically Secure One-Time Temporary Password
```

### 2.2 Login, Token Generation & Rotation Sequence

```text
┌─────────────┐     ┌────────────────────────────────────────┐     ┌────────────────────────┐
│ Client Web  │     │       Django Backend (DRF Auth)        │     │  Redis 7 Token Blacklist│
└──────┬──────┘     └───────────────────┬────────────────────┘     └───────────┬────────────┘
       │                                │                                      │
       │ 1. POST /api/v1/auth/login/    │                                      │
       │    {username, password}        │                                      │
       │───────────────────────────────►│                                      │
       │                                │ 2. Argon2 Password Hash Verify       │
       │                                │ 3. Check `is_active == True`         │
       │                                │ 4. Generate JWT Pair:                │
       │                                │    • Access Token (HS256, 15 Mins)   │
       │                                │    • Refresh Token (HS256, 7 Days)   │
       │                                │                                      │
       │ 5. Response:                   │                                      │
       │    • Access Token (JSON Body)  │                                      │
       │    • Refresh Token (httpOnly)  │                                      │
       │◄───────────────────────────────│                                      │
       │                                │                                      │
       │ [User performs authorized actions on dashboard...]                    │
       │                                │                                      │
       │ 6. Access Token Expires (401)  │                                      │
       │    POST /api/v1/auth/refresh/  │                                      │
       │───────────────────────────────►│                                      │
       │                                │ 7. Check Redis Blacklist:            │
       │                                │─────────────────────────────────────►│
       │                                │    Key: `railway:blacklist:{jti}`    │
       │                                │◄─────────────────────────────────────│
       │                                │ 8. Rotate Refresh Token & Issue New  │
       │ 9. New Access Token Returned   │                                      │
       │◄───────────────────────────────│                                      │
       │                                │                                      │
       │ 10. User Clicks Logout         │                                      │
       │     POST /api/v1/auth/logout/  │                                      │
       │───────────────────────────────►│ 11. Add Refresh Token JTI to Redis   │
       │                                │─────────────────────────────────────►│
       │                                │     (TTL = Remaining Token Life)     │
       │ 12. 200 OK (Cookie Cleared)    │                                      │
       │◄───────────────────────────────│                                      │
```

---

## 3. Spatial Role-Based Access Control (Spatial RBAC - Feature #112)

সাধারণ আরবিএসির সাথে স্থানিক (Spatial) বাউন্ডারি যুক্ত করে **Spatial RBAC** ডিজাইন করা হয়েছে। একজন ট্র্যাক ইঞ্জিনিয়ার কেবল তার অনুমোদিত পোস্টজিআইএস ডিভিশন ও সেকশনেই রিকোয়েস্ট তৈরি করতে পারেন:

### 3.1 Spatial RBAC Matrix

| User Role Code | Operational Scope | Can Submit Block? | Can Approve Normal Block? | Can Approve Combined (#98)? | Can Issue Digital Token (#71)? | Emergency Override (#79)? |
|:---|:---|:---:|:---:|:---:|:---:|:---:|
| **`ENGG_JE`** | Civil P-Way (Assigned Division) | ✅ (Own Dept & Section) | ❌ | ❌ | ❌ | ✅ (With Photo #82) |
| **`TRD_JE`** | Traction OHE (Assigned Division)| ✅ (Own Dept & Section) | ❌ | ❌ | ❌ | ✅ (With Photo #82) |
| **`SNT_JE`** | Signal & Telecom (Assigned Div) | ✅ (Own Dept & Section) | ❌ | ❌ | ❌ | ✅ (With Photo #82) |
| **`SSE`** | Section Engineer (Supervisor) | ✅ (Own Dept) | ✅ (Up to 2 Hours) | ❌ | ✅ | ✅ |
| **`SAFETY_OFFICER`**| Safety Suite Verifier | ❌ | ❌ | ❌ | ✅ (LOTO & PTW Verify) | ❌ |
| **`CHIEF_CONTROLLER`**| Division Control Room (COA) | ✅ (All Depts) | ✅ (Full Authority) | ✅ (Master Approver)| ✅ | ✅ (All Hands Red) |
| **`ADMIN`** | Platform Administrator | ✅ | ✅ | ✅ | ✅ | ✅ |

### 3.2 Spatial Boundary Enforcement Policy
```python
# apps/accounts/permissions.py
from rest_framework.permissions import BasePermission

class IsAuthorizedForSpatialSection(BasePermission):
    message = "You are not authorized to operate in this geographical Railway section."

    def has_object_permission(self, request, view, obj):
        user = request.user
        # Chief Controller has division-wide authority
        if user.role in ["CHIEF_CONTROLLER", "ADMIN"]:
            return True
            
        # Field engineers constrained to their assigned division & section
        target_section = getattr(obj, "section", None)
        if target_section and target_section.division != user.division:
            return False
            
        return target_section in user.authorized_sections.all()
```

---

## 4. Cryptographic Digital Token & Permissive Safety Gates

মাঠপর্যায়ে কাজ শুরুর পূর্বে প্রাণঘাতী দুর্ঘটনা শূন্যে নামিয়ে আনতে ৫টি ডিজিটাল পারমিশন গেট পার হতে হয়:

```
[Request Block] ──► [Gate 1: Weather Gate (#75)] ──► Wind < 50 km/h, Rain OK
                          │
                          ▼
                    [Gate 2: OHE Power Cut (#73)] ──► Substation Switch Confirmed
                          │
                          ▼
                    [Gate 3: LOTO Protocol (#74)] ──► Physical Padlock QR Verified
                          │
                          ▼
                    [Gate 4: Digital TBT (#83)]   ──► 100% Crew Headcount Signed
                          │
                          ▼
                    [Gate 5: Issue Token (#71)]   ──► Cryptographic SHA-256 Token Issued
```

### 4.1 Digital Token Cryptographic Verification (#71)
টোকেনটি কন্ট্রোলার ও ফিল্ড গ্যাং সুপারভাইজারের মধ্যে শেয়ার্ড ক্রিপ্টোগ্রাফিক কী দ্বারা সুরক্ষিত:

$$\text{TokenHash} = \text{HMAC-SHA256}(\text{BlockID} + \text{GangCode} + \text{HandoverTime}, \text{SecretKey})$$

- টোকেন কোডটি মোবাইলে অফলাইনেও কিউআর কোড বা আলফানিউমেরিক স্ট্রিং (যেমন: `TKN-HWH-SEC4-20260918-X99`) আকারে ভেরিফাই করা যায়।
- লাইন ক্লিয়ারেন্স সার্টিফিকেট (#80) জমা দেওয়ার আগ পর্যন্ত পোস্টজিআইএস ডেটাবেসে সংশ্লিষ্ট সেকশন সম্পূর্ণ **LOCKED (RED)** অবস্থায় থাকে।

---

## 5. Input Sanitization & Anti-Exploit Protections

| Threat Type | Primary Attack Mechanism | Protection Layer in RailBlock AI |
|:---|:---|:---|
| **SQL Injection (SQLi)** | ম্যালিশিয়াস চেইনেজ বা সেকশন কোড ইনজেকশন | Django ORM প্যারামিটারাইজড কোয়েরি এবং PostGIS স্ট্রিক্ট বাইন্ড ভ্যারিয়েবলস (কাঁচা SQL কনক্যাটেনেশন সম্পূর্ণ নিষিদ্ধ)। |
| **Cross-Site Scripting (XSS)** | ডিফেক্ট লগে ক্ষতিকর জাভাস্ক্রিপ্ট পেলোড ইনজেকশন | React-এর নেটিভ JSX অটো-এসকেপিং, CSP হেডার এবং DOMPurify ফিল্টারিং। |
| **CSRF Attacks** | অননুমোদিত সাইট থেকে ব্রাউজার কুকি রিইউজ | সমস্ত মিউটেটিং এপিআই-তে Bearer Token নির্ভরতা এবং সেমসাইট কুকি পলিসি (`SameSite=Strict`). |
| **Malicious File Uploads** | ক্র্যাক ফটো বা TBT রিপোর্টে ওয়েব-শেল আপলোড (#82) | `python-magic` দ্বারা প্রকৃত MIME টাইপ যাচাই (`image/jpeg`, `image/png`), সর্বোচ্চ ৫ MB সাইজ ক্যাপ এবং র্যান্ডম UUID ফাইলনেম। |

---

## 6. Secrets Management & Key Rotation Policy

- **Development:** `.env` ফাইলে সংরক্ষিত (গিট রিপোজিটরিতে কমিট করা সম্পূর্ণ নিষিদ্ধ; `.gitignore` দ্বারা সুরক্ষিত)।
- **Production:** ক্লাউড সিক্রেট স্টোর অথবা ডকার সিক্রেটস (এনক্রিপ্টেড এট রেস্ট)।
- **Key Rotation Schedule:**
  - `SECRET_KEY`: বার্ষিক রোটেশন।
  - `DATABASE_PASSWORD`: প্রতি ৯০ দিনে স্বয়ংক্রিয় রোটেশন।
  - `GEMINI_API_KEY`: প্রতি ৯০ দিনে রোটেশন।
  - `JWT_SIGNING_KEY`: প্রতি ১৮০ দিনে রোটেশন।

---

## 7. Data Protection & Encryption Standards

- **Data in Transit:** Nginx রিভার্স প্রক্সিতে **TLS 1.3 / HTTPS** বলবৎ। সমস্ত প্লেইন HTTP রিকোয়েস্ট স্বয়ংক্রিয়ভাবে HTTPS-এ রিডাইরেক্ট হয়। ওয়েবসকেটের জন্য নিরাপদ **WSS (WebSocket Secure)** সংযোগ।
- **Data at Rest:**
  - PostgreSQL ডেটাবেস ভলিউম (`postgres_data`) হোস্টে **AES-256 (LUKS/dm-crypt)** দ্বারা এনক্রিপ্টেড।
  - সংবেদনশীল পাসওয়ার্ড: **Argon2id** অ্যালগরিদম (মেমোরি কস্ট ১৯ MB, টাইম কস্ট ২ ইটারেশন)।
- **Immutable Audit Trail:** প্রতিটি ব্লক অনুমোদন, পরিমার্জন এবং ইমার্জেন্সি ওভাররাইডের জন্য আলাদা `block_audit_log` টেবিলে টাইমস্ট্যাম্প ও ইউজারের বিবরণ সংরক্ষিত থাকে, যা কখনো মুছে ফেলা যায় না (Append-Only)।

---

## 8. Traceability to Subsequent Specification Documents

| Target Document | Direct Security Dependency |
|:---|:---|
| **`01-tech-infra/07-workers-consumers.md`** | সেলিরি টাস্ক সিগনেচার ভ্যালিডেশন এবং সিকিউর ব্যাকগ্রাউন্ড এক্সিকিউশন। |
| **`03-service-blueprints/04-safety-compliance-service.md`** | ১৫টি সেফটি ফিচার, পারমিট-টু-ওয়ার্ক ও ডিজিটাল টোকেনের বিজনেস লজিক। |
| **`08-standards/00-coding-standards.md`** | সিকিউর কোডিং নির্দেশিকা, ইনপুট স্যানিটাইজেশন এবং এসকিউএলআই প্রিভেনশন রুলস। |
