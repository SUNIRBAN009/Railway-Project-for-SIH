# 01-accounts-function-map.md

> **ফাইল ক্রম:** ২৬/৪৫  
> **সার্ভিস আইডি:** `SVC-AUTH` (`apps.accounts`)  
> **পূর্ববর্তী ফাইল:** [04-function-maps/00-function-id-registry.md](file:///c:/work%20pase/Railway-Project-for-SIH/docs/04-function-maps/00-function-id-registry.md)  
> **পরবর্তী ফাইল:** [04-function-maps/02-blocks-function-map.md](file:///c:/work%20pase/Railway-Project-for-SIH/docs/04-function-maps/02-blocks-function-map.md)  
> **সংযোগ ও উদ্দেশ্য:** এই ফাইলে আইডেন্টিটি, অ্যাক্সেস ম্যানেজমেন্ট ও রেলওয়ে আরব্যাক গভর্নেন্স সার্ভিসের (`SVC-AUTH`) আটটি ক্যানোনিকাল ফাংশনের ইনপুট/আউটপুট স্কিমা, ভ্যালিডেশন নিয়মাবলী, ডেটাবেস ট্রানজ্যাকশন ও এরর কোড বিশদভাবে সংজ্ঞায়িত করা হয়েছে। এতে জাজেস ডেমো প্রেজেন্টেশনের জন্য কুইক রোল-সুইচ (`Feature #122: Demo Role Accounts + Quick Switch`) এবং লিস্ট-প্রিভিলেজ সিকিউরিটি গার্ড (`Feature #112`) পূর্ণাঙ্গভাবে অন্তর্ভুক্ত।

---

## 1. Function Catalog

| Function ID | Function Name | HTTP Method | Path / Trigger | Input DTO | Output DTO | Target SLA |
|---|---|:---:|---|---|---|:---:|
| `FUNC-AUTH-001` | User Login & Authentication | `POST` | `/api/v1/auth/login/` | `LoginRequestDTO` | `AuthTokenResponseDTO` | p95 < 45ms |
| `FUNC-AUTH-002` | Token Refresh Rotation | `POST` | `/api/v1/auth/refresh/` | Cookie: `refresh_token` | `AccessTokenResponseDTO` | p95 < 25ms |
| `FUNC-AUTH-003` | Get Current User Context | `GET` | `/api/v1/auth/me/` | Bearer JWT Header | `UserProfileDTO` | p95 < 20ms |
| `FUNC-AUTH-004` | Session Logout & Invalidation | `POST` | `/api/v1/auth/logout/` | Cookie: `refresh_token` | `GenericSuccessResponseDTO` | p95 < 35ms |
| `FUNC-AUTH-005` | Administrative User Creation | `POST` | `/api/v1/users/` | `UserCreateRequestDTO` | `UserProfileDTO` | p95 < 80ms |
| `FUNC-AUTH-006` | Departmental User Listing | `GET` | `/api/v1/users/` | Query Parameters | `PaginatedUsersResponseDTO`| p95 < 55ms |
| `FUNC-AUTH-007` | User Profile & Password Update | `PATCH` | `/api/v1/users/{id}/` | `UserUpdateRequestDTO` | `UserProfileDTO` | p95 < 50ms |
| `FUNC-AUTH-008` | RBAC Evaluation & Demo Quick-Switch | `POST` | `/api/v1/auth/quick-role-switch/` | `RoleSwitchRequestDTO` | `AuthTokenResponseDTO` | p95 < 40ms |

---

## 2. Detailed Function Implementation Specifications

### `FUNC-AUTH-001`: User Login & Authentication
- **Controller Class:** `apps.accounts.views.LoginView` (subclass of `rest_framework.views.APIView`)
- **Authentication:** `AllowAny`
- **Rate Limit Policy:** 10 requests / 5 minutes per client IP (`ratelimit:auth:login:{ip}`)
- **Input Validation Rules (`LoginRequestDTO`):**
  - `username`: String, 3 to 50 characters, alphanumeric with optional underscores or dashes. Required.
  - `password`: String, 8 to 128 characters. Required.
- **Processing Logic:**
  1. PostgreSQL কুয়েরি: `SELECT * FROM accounts_user WHERE username = :username AND is_active = TRUE`.
  2. অ্যাকাউন্ট লকড কিনা চেক (`locked_until > CURRENT_TIMESTAMP`). লকড থাকলে এরর `AUTH-003` (HTTP 403 Forbidden)।
  3. Argon2id পাসওয়ার্ড হ্যাশ যাচাই (`argon2.PasswordHasher().verify(user.password_hash, password)`):
     - ভুল পাসওয়ার্ডে `failed_login_attempts` ইনক্রিমেন্ট। ৫ বার ভুল হলে `locked_until = NOW() + INTERVAL '15 minutes'`.
     - এরর `AUTH-001` (HTTP 401 Unauthorized)।
  4. সফল হলে `failed_login_attempts = 0` এবং `last_login_at = CURRENT_TIMESTAMP` আপডেট।
  5. RS256 প্রাইভেট কি দিয়ে ১৫-মিনিট মেয়াদি অ্যাক্সেস টোকেন (JWT claims: `user_id`, `role`, `department_code`, `division_code`) তৈরি।
  6. ৭-দিন মেয়াদি ক্রিপ্টোগ্রাফিক রিফ্রেশ টোকেন তৈরি ও `accounts_usersession` টেবিলে পারসিস্ট।
  7. ক্লায়েন্টে `refresh_token` একটি `httpOnly`, `Secure`, `SameSite=Lax` কুকি হিসেবে প্রেরণ।
  8. Redis চ্যানেল `events:accounts`-এ ইভেন্ট `accounts.user.logged_in` পাবলিশ।
- **Output JSON Envelope (HTTP 200):**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "Bearer",
    "expires_in": 900,
    "user": {
      "id": "c80918fa-01aa-472b-a19f-b9816e26027a",
      "employee_id": "ER-HWH-ENG-4921",
      "username": "mukherjee_sse_pway",
      "full_name": "S. Mukherjee",
      "role": "SENIOR_SECTION_ENGINEER",
      "department_code": "CIVIL_ENGG",
      "division_code": "HWH"
    }
  },
  "timestamp": "2026-09-18T21:12:00.000Z"
}
```

---

### `FUNC-AUTH-002`: Token Refresh Rotation
- **Controller Class:** `apps.accounts.views.TokenRefreshView`
- **Input:** HTTP Cookie `refresh_token`.
- **Processing Logic:**
  1. রিফ্রেশ টোকেনের RS256 সিগনেচার ও এক্সপায়ারি যাচাই।
  2. টোকেনের `jti` (JWT ID) Redis ব্ল্যাকলিস্ট `auth:blacklist:{jti}`-এ আছে কিনা পরীক্ষা। উপস্থিত থাকলে রি-ইউজ অ্যাটাক হিসেবে শনাক্ত করে ইউজারের সকল অ্যাক্টিভ সেশন বাতিল ও এরর `AUTH-004` (HTTP 401)।
  3. `accounts_usersession` টেবিলে সেশন সক্রিয় কিনা (`is_revoked = FALSE`) যাচাই।
  4. পুরানো রিফ্রেশ টোকেনের `jti` বাকি মেয়াদের জন্য Redis ব্ল্যাকলিস্টে যুক্তকরণ।
  5. নতুন ১৫-মিনিট মেয়াদি অ্যাক্সেস টোকেন ও নতুন রোটেটেড রিফ্রেশ টোকেন কুকি ইস্যু।
- **Output (HTTP 200):** নতুন `access_token` ও নতুন কুকি।

---

### `FUNC-AUTH-003`: Get Current User Context
- **Controller Class:** `apps.accounts.views.CurrentUserView`
- **Authentication:** `IsAuthenticated` (Bearer Token)
- **Processing Logic:**
  1. রিকোয়েস্টের JWT ক্লেইমস থেকে `user_id` নিষ্কাশন।
  2. Redis ক্যাশ `railway:auth:user:{user_id}` থেকে প্রোফাইল খোঁজা; ক্যাশ মিস হলে PostgreSQL থেকে প্রোফাইল ফেচ ও ১ ঘণ্টার জন্য ক্যাশে সেভ।
  3. ইউজারের আরব্যাক পারমিশন তালিকা এবং হোম ডিভিশন ও ডিপার্টমেন্ট অবজেক্ট রিটার্ন।
- **Output (HTTP 200):** পূর্ণ `UserProfileDTO` যাতে রয়েছে রোল, ডেসিগনেশন, ফোন ও পারমিশন অ্যারে।

---

### `FUNC-AUTH-004`: Session Logout & Invalidation
- **Controller Class:** `apps.accounts.views.LogoutView`
- **Authentication:** `IsAuthenticated`
- **Processing Logic:**
  1. কুকি থেকে রিফ্রেশ টোকেন এবং হেডার থেকে অ্যাক্সেস টোকেন গ্রহণ।
  2. উভয় টোকেন `jti` Redis ব্ল্যাকলিস্টে যুক্তকরণ (`EX = remaining_ttl`).
  3. PostgreSQL টেবিলে `accounts_usersession.is_revoked = TRUE` ও `revoked_at = CURRENT_TIMESTAMP` মার্ক।
  4. রেসপন্স হেডারে `refresh_token` কুকি ক্লিয়ার (`Max-Age=0`).
  5. ইভেন্ট `accounts.user.session_revoked` পাবলিশ।
- **Output (HTTP 200):** `{"success": true, "message": "Successfully logged out of Indian Railways Platform."}`.

---

### `FUNC-AUTH-005`: Administrative User Creation
- **Controller Class:** `apps.accounts.views.UserProvisionView`
- **Permissions:** `IsAuthenticated`, `IsAdminOrDRM`
- **Input Schema (`UserCreateRequestDTO`):**
```json
{
  "employee_id": "ER-HWH-SNT-1042",
  "username": "banerjee_je_signal",
  "email": "banerjee.je@er.railnet.gov.in",
  "password": "SecurePassword#2026",
  "full_name": "A. Banerjee",
  "role": "JUNIOR_ENGINEER",
  "department_code": "SIGNAL_TELECOM",
  "division_code": "HWH",
  "phone_number": "+91-9830112233"
}
```
- **Validation Rules:**
  - `employee_id` এবং `username` সিস্টেমে অনন্য (Unique) হতে হবে।
  - `role` অবশ্যই অনুমোদিত রোলের তালিকাভুক্ত হতে হবে (`CHIEF_CONTROLLER`, `SECTION_CONTROLLER`, `SSE`, `JE`, `GANG_LEADER`, `TRD_OPERATOR`).
- **Processing Logic:**
  1. Argon2id অ্যালগরিদমে পাসওয়ার্ড হ্যাশ জেনারেশন।
  2. ট্রানজ্যাকশন সহকারে `accounts_user` টেবিলে রো ইনসার্ট।
  3. অপরিবর্তনীয় অডিট ট্রেইলে (`SVC-ANL` `FUNC-ANL-006`) ইভেন্ট রেকর্ড: "USER_PROVISIONED by Admin".
- **Output (HTTP 201 Created):** তৈরি হওয়া ইউজারের `UserProfileDTO`।

---

### `FUNC-AUTH-006`: Departmental User Listing
- **Controller Class:** `apps.accounts.views.UserListView`
- **Permissions:** `IsAuthenticated`, `IsControllerOrEngineer`
- **Query Parameters:** `?department=CIVIL_ENGG&division=HWH&role=GANG_LEADER&page=1`
- **Processing Logic:**
  1. কুয়েরি প্যারামিটার ভ্যালিডেশন এবং পেজিনেশন লজিক (পেজ সাইজ ২৫)।
  2. B-tree ইনডেক্স ব্যবহার করে দ্রুত ইউজার তালিকা ফেচ।
- **Output (HTTP 200):** স্ট্যান্ডার্ড পেজিনেটেড ইউজার লিস্ট এনভেলপ।

---

### `FUNC-AUTH-007`: User Profile & Password Update
- **Controller Class:** `apps.accounts.views.UserUpdateView`
- **Permissions:** `IsAuthenticated` (Self অথবা Admin)
- **Processing Logic:**
  1. ইউজার নিজের মোবাইল ফোন, প্রেফার্ড ল্যাঙ্গুয়েজ (হিন্দি/বাংলা/ইংরেজি) আপডেট করতে পারে।
  2. পাসওয়ার্ড পরিবর্তনের ক্ষেত্রে বর্তমান পাসওয়ার্ড যাচাই বাধ্যতামূলক।
  3. পাসওয়ার্ড পরিবর্তিত হলে সকল পূর্ববর্তী অ্যাক্টিভ রিফ্রেশ সেশন স্বয়ংক্রিয়ভাবে ইনভ্যালিডেট হবে।
- **Output (HTTP 200):** আপডেটেড `UserProfileDTO`।

---

### `FUNC-AUTH-008`: RBAC Evaluation & Demo Quick-Switch (Feature #122)
- **Controller Class:** `apps.accounts.views.DemoRoleQuickSwitchView`
- **Purpose:** বিচারকদের সামনে বা প্রেজেন্টেশনে সাইন-আউট না করে এক ক্লিকে বিভিন্ন রেলওয়ে রোলে সুইচ করা (যেমন: চিফ কন্ট্রোলার থেকে সরাসরি সাইট গ্যাং লিডারে সুইচ)।
- **Permissions:** `IsAuthenticated` (অথবা ডেমো মোড সক্রিয় থাকলে যেকোনো সিডেড অ্যাকাউন্টে সুইচ)
- **Input Schema (`RoleSwitchRequestDTO`):**
```json
{
  "target_role": "CHIEF_CONTROLLER",
  "demo_station": "HWH"
}
```
- **Processing Logic:**
  1. ডেমো মোড ফ্ল্যাগ ভ্যালিডেশন (`DEMO_MODE_ACTIVE = True`).
  2. টার্গেট রোলের ডিফল্ট ডেমো অ্যাকাউন্ট সিলেক্ট (যেমন: চিফ কন্ট্রোলারের জন্য `hwh_chief_ctrl`)।
  3. তাৎক্ষণিকভাবে নতুন রোলের জন্য অনুমোদিত পারমিশন ও ফ্রন্টএন্ড ভিউ রাইটসসহ নতুন RS256 অ্যাক্সেস টোকেন তৈরি।
  4. ফ্রন্টএন্ড অ্যাপ ড্যাশবোর্ডকে রিলোড না করে রিঅ্যাক্ট স্টেট ও আরব্যাক মেন্যু আপডেট করে।
- **Output (HTTP 200):** নতুন রোল কনটেক্সট এবং সম্পূর্ণ `AuthTokenResponseDTO`।

---

## 3. Next File Dependency Note

> **পরবর্তী ফাইল:** [04-function-maps/02-blocks-function-map.md](file:///c:/work%20pase/Railway-Project-for-SIH/docs/04-function-maps/02-blocks-function-map.md)

`01-accounts-function-map.md` সফলভাবে সম্পূর্ণ হয়েছে। পরবর্তী ফাইল `02-blocks-function-map.md`-এ **`SVC-BLK` (`apps.blocks`)**-এর ১২টি এআই ব্লক প্ল্যানিং, পোস্টজিআইএস স্পেশিয়াল সুইপ ও কনফ্লিক্ট রেজোলিউশন ফাংশনের কার্যপ্রণালী সংজ্ঞায়িত করা রয়েছে।
