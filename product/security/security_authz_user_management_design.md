# Tài liệu mô tả module Security, Authorization và User Management

**Phiên bản:** v1.0  
**Ngày tạo:** 2026-06-10  
**Mục đích:** Làm tài liệu nền tảng cho project base/boilerplate khi xây dựng hệ thống phần mềm có xác thực, phân quyền và quản lý người dùng.  
**Phạm vi áp dụng:** Backend Spring Boot/Spring Security, frontend web/mobile, hệ thống monolith, modular monolith hoặc microservices.  

---

## 1. Tổng quan

### 1.1. Mục tiêu tài liệu

Tài liệu này mô tả thiết kế chức năng, UI/UX, API, dữ liệu và định hướng triển khai cho ba nhóm module nền tảng:

1. **Security**: các cơ chế bảo vệ hệ thống như xác thực, quản lý phiên, token, mật khẩu, MFA, audit, kiểm soát truy cập và cấu hình bảo mật.
2. **Authorization/AuthZ**: mô hình phân quyền theo permission, role, scope và policy.
3. **User Management**: quản lý tài khoản người dùng, hồ sơ, vai trò, trạng thái, nhóm, tổ chức và lịch sử hoạt động.

Mục tiêu là tạo một boilerplate đủ an toàn, dễ mở rộng và có thể tái sử dụng cho nhiều dự án.

---

### 1.2. Nguyên tắc thiết kế

| Nguyên tắc | Mô tả |
|---|---|
| Secure by default | Mặc định yêu cầu xác thực, mặc định từ chối nếu thiếu quyền. |
| Deny by default | API không khai báo public hoặc permission thì không được truy cập. |
| Least privilege | User chỉ có quyền tối thiểu cần thiết để thực hiện công việc. |
| Permission-based | Không hard-code role trong business logic; dùng permission cụ thể. |
| Scope-aware | Không chỉ kiểm tra được phép làm gì, mà còn được phép làm trên dữ liệu nào. |
| Backend-enforced | Backend luôn kiểm tra quyền; frontend chỉ dùng quyền để ẩn/hiện UI. |
| Auditable | Mọi hành động nhạy cảm phải ghi audit log. |
| Extensible | Có thể mở rộng sang MFA, SSO, multi-tenant, ABAC/policy engine. |
| Developer-friendly | Có constants, annotation, seed data, migration, test và hướng dẫn rõ. |

---

### 1.3. Phạm vi module

```text
project-base
├── security
│   ├── authentication
│   ├── authorization
│   ├── session-management
│   ├── token-management
│   ├── password-policy
│   ├── mfa
│   ├── audit-security-events
│   └── security-settings
│
└── user-management
    ├── users
    ├── profiles
    ├── roles
    ├── permissions
    ├── groups / teams
    ├── organizations / tenants
    └── user-activity
```

---

## 2. Thuật ngữ

| Thuật ngữ | Ý nghĩa |
|---|---|
| Authentication/AuthN | Xác thực danh tính người dùng. |
| Authorization/AuthZ | Xác định người dùng được phép thực hiện hành động nào. |
| User | Tài khoản người dùng trong hệ thống. |
| Role | Vai trò, là tập hợp các permission. |
| Permission | Quyền thực hiện một hành động trên một resource. |
| Scope | Phạm vi dữ liệu mà permission được áp dụng. |
| Policy | Quy tắc kiểm tra quyền nâng cao dựa trên điều kiện nghiệp vụ. |
| Session | Phiên đăng nhập của user. |
| Access token | Token ngắn hạn dùng để gọi API. |
| Refresh token | Token dài hạn dùng để làm mới access token. |
| MFA | Multi-factor authentication, xác thực đa yếu tố. |
| Audit log | Nhật ký ghi nhận hành động quan trọng trong hệ thống. |
| Tenant | Đơn vị tổ chức độc lập trong hệ thống multi-tenant. |

---

## 3. Kiến trúc tổng thể

### 3.1. Kiến trúc xử lý request

```text
Client
  ↓
API Gateway / Load Balancer
  ↓
Spring Security Filter Chain
  ↓
Authentication Filter
  ↓
Security Context
  ↓
Method Security / @RequirePermission
  ↓
Permission Checker
  ↓
Service Layer
  ↓
Data Scope / Business Policy
  ↓
Repository / Database
```

---

### 3.2. Các lớp kiểm soát bảo mật

| Lớp | Trách nhiệm |
|---|---|
| HTTP Security Layer | Xác định API public, authenticated, CORS, CSRF, token/session. |
| Method Security Layer | Kiểm tra permission trước khi gọi controller/service method. |
| Service Policy Layer | Kiểm tra rule nghiệp vụ, data scope, object-level authorization. |
| Repository/Data Layer | Filter dữ liệu theo tenant, owner, team hoặc organization. |
| Audit Layer | Ghi nhận hành động nhạy cảm và sự kiện bảo mật. |

---

## 4. Module Security

## 4.1. Authentication

### 4.1.1. Chức năng cần có

| STT | Chức năng | Mục đích | Mức độ |
|---:|---|---|---|
| 1 | Đăng nhập email/password | Cho phép user truy cập hệ thống | Bắt buộc |
| 2 | Đăng xuất | Kết thúc phiên đăng nhập | Bắt buộc |
| 3 | Refresh token | Làm mới access token | Bắt buộc nếu dùng token |
| 4 | Đăng ký tài khoản | Cho phép self-signup | Tùy dự án |
| 5 | Mời user | Admin mời user vào hệ thống | Nên có |
| 6 | Xác minh email | Đảm bảo email thuộc về user | Bắt buộc |
| 7 | Quên mật khẩu | Cho phép khôi phục tài khoản | Bắt buộc |
| 8 | Đặt lại mật khẩu | Tạo mật khẩu mới qua reset token | Bắt buộc |
| 9 | Đổi mật khẩu | User tự đổi mật khẩu | Bắt buộc |
| 10 | MFA TOTP | Tăng bảo mật đăng nhập | Nên có |
| 11 | Backup codes | Khôi phục khi mất MFA device | Nên có |
| 12 | Passkey/WebAuthn | Passwordless/phishing-resistant login | Tùy dự án |
| 13 | SSO/OIDC | Đăng nhập qua Identity Provider | Tùy dự án |
| 14 | Session/device management | Xem và thu hồi phiên đăng nhập | Nên có |
| 15 | Account lock/throttling | Chống brute force | Bắt buộc |
| 16 | Security notification | Gửi cảnh báo khi có sự kiện bảo mật | Nên có |

---

### 4.1.2. Login flow

```text
1. User nhập email/password.
2. Backend kiểm tra rate limit.
3. Tìm user theo email.
4. Nếu user không tồn tại hoặc password sai:
   - trả lỗi chung: "Email hoặc mật khẩu không đúng";
   - ghi security event;
   - tăng failed login counter nếu phù hợp.
5. Nếu user bị locked/suspended/deactivated:
   - từ chối đăng nhập;
   - ghi security event.
6. Nếu password đúng:
   - kiểm tra email verification policy;
   - kiểm tra MFA required.
7. Nếu cần MFA:
   - tạo MFA challenge;
   - chuyển user sang màn xác thực MFA.
8. Nếu thành công:
   - tạo session;
   - phát access token/refresh token hoặc secure cookie;
   - ghi audit login.
9. Redirect user về dashboard hoặc URL trước đó.
```

---

### 4.1.3. Forgot/reset password flow

```text
1. User nhập email tại màn Forgot Password.
2. Hệ thống luôn trả thông báo trung tính:
   "Nếu email tồn tại, hệ thống đã gửi hướng dẫn khôi phục."
3. Nếu email tồn tại:
   - tạo reset token một lần;
   - hash token trước khi lưu;
   - thiết lập thời gian hết hạn;
   - gửi email reset password.
4. User mở link reset password.
5. User nhập mật khẩu mới.
6. Backend kiểm tra password policy và blocklist.
7. Cập nhật password hash.
8. Revoke session/refresh token cũ.
9. Ghi security event.
10. Yêu cầu user đăng nhập lại.
```

---

### 4.1.4. Chính sách mật khẩu đề xuất

| Quy tắc | Đề xuất |
|---|---|
| Độ dài tối thiểu | 8-12 ký tự cho hệ thống thông thường; có thể cao hơn với hệ thống nhạy cảm. |
| Độ dài tối đa | Cho phép tối thiểu 64 ký tự. |
| Complexity | Không bắt buộc cứng chữ hoa/số/ký tự đặc biệt nếu đã có blocklist tốt. |
| Blocklist | Chặn mật khẩu phổ biến, đã bị lộ, chứa email/tên hệ thống. |
| Password manager | Cho phép paste/autofill. |
| Password expiry | Không bắt đổi định kỳ nếu không có dấu hiệu bị lộ. |
| Hashing | Argon2id, bcrypt hoặc scrypt; có salt; cấu hình cost phù hợp. |
| Reset token | One-time, có expiry, lưu dạng hash. |
| Sau reset | Revoke session cũ. |

---

## 4.2. Session và Token Management

### 4.2.1. Thành phần cần quản lý

| Thành phần | Mô tả |
|---|---|
| Access token | Token ngắn hạn để gọi API. |
| Refresh token | Token dài hạn để cấp lại access token. |
| Session id | Định danh phiên đăng nhập. |
| Device info | Browser, OS, device, IP, user agent. |
| Token revocation | Thu hồi token/session khi logout, đổi mật khẩu, disable user. |
| Token rotation | Mỗi lần refresh nên cấp refresh token mới và vô hiệu hóa token cũ. |

---

### 4.2.2. Cấu hình gợi ý

| Config | Giá trị đề xuất |
|---|---|
| Access token TTL | 5-15 phút |
| Refresh token TTL | 7-30 ngày tùy loại ứng dụng |
| Refresh token rotation | Bật |
| Password reset token TTL | 15-60 phút |
| Email verification token TTL | 24-72 giờ |
| Invite token TTL | 3-7 ngày |
| Session idle timeout | 15-60 phút với admin; dài hơn với user thường |
| Session absolute timeout | 8-24 giờ hoặc theo policy |
| Secure cookie | `HttpOnly`, `Secure`, `SameSite=Lax/Strict` nếu dùng cookie |

---

## 4.3. MFA

### 4.3.1. MFA methods

| Method | Mô tả | Mức độ |
|---|---|---|
| TOTP | Mã 6 số từ ứng dụng Authenticator | Nên có |
| Backup codes | Mã khôi phục dùng một lần | Nên có |
| Email OTP | Gửi mã qua email | Tùy dự án |
| SMS OTP | Gửi mã qua SMS | Không khuyến nghị làm mặc định |
| Passkey/WebAuthn | Phishing-resistant authentication | Tùy dự án/enterprise |

---

### 4.3.2. MFA setup flow

```text
1. User vào Security Settings.
2. Chọn Enable MFA.
3. Hệ thống hiển thị QR code và secret text.
4. User quét QR bằng Authenticator app.
5. User nhập mã OTP để xác nhận.
6. Hệ thống lưu MFA factor.
7. Hệ thống sinh backup codes.
8. User xác nhận đã lưu backup codes.
9. Ghi audit/security event.
```

---

## 4.4. Audit và Security Events

### 4.4.1. Các sự kiện cần ghi nhận

| Nhóm | Sự kiện |
|---|---|
| Authentication | login success, login failed, logout, refresh token, password reset requested, password changed |
| MFA | enable MFA, disable MFA, verify failed, backup code used, reset MFA |
| User Management | create user, update user, disable user, delete user, invite user |
| Authorization | assign role, remove role, update role, update permission |
| Session | revoke session, revoke all sessions |
| Security | account locked, suspicious login, access denied |

---

### 4.4.2. Trường dữ liệu audit log

| Field | Ý nghĩa |
|---|---|
| `id` | ID log |
| `actor_user_id` | Ai thực hiện |
| `action` | Hành động |
| `resource_type` | Loại đối tượng bị tác động |
| `resource_id` | ID đối tượng |
| `before_data` | Dữ liệu trước thay đổi |
| `after_data` | Dữ liệu sau thay đổi |
| `ip_address` | IP |
| `user_agent` | Trình duyệt/thiết bị |
| `tenant_id` | Tenant liên quan |
| `created_at` | Thời điểm ghi nhận |

---

# 5. Module Authorization/AuthZ

## 5.1. Mô hình phân quyền

Mô hình mặc định đề xuất:

```text
User
  └── UserRole
       └── Role
            └── RolePermission
                 └── Permission
```

Với hệ thống có scope:

```text
RolePermission
  ├── Permission
  ├── Scope
  └── Conditions
```

---

## 5.2. Permission naming convention

### 5.2.1. Format cơ bản

```text
<resource>:<action>
```

Ví dụ:

```text
users:read
users:create
users:update
users:delete
roles:update
audit_logs:read
```

### 5.2.2. Format khuyến nghị cho hệ thống nhiều module

```text
<module>.<resource>:<action>
```

Ví dụ:

```text
iam.users:read
iam.users:create
iam.users:assign-role
iam.roles:update
security.audit_logs:read
sales.orders:approve
finance.invoices:export
```

---

## 5.3. Action chuẩn

| Action | Ý nghĩa |
|---|---|
| `read` | Xem dữ liệu, bao gồm list/detail/search/dropdown. |
| `create` | Tạo mới dữ liệu. |
| `update` | Cập nhật dữ liệu. |
| `delete` | Xóa dữ liệu. |
| `approve` | Phê duyệt. |
| `reject` | Từ chối. |
| `cancel` | Hủy nghiệp vụ. |
| `export` | Xuất dữ liệu. |
| `import` | Nhập dữ liệu. |
| `assign` | Gán đối tượng, ví dụ gán role. |
| `execute` | Thực thi job/task/action đặc biệt. |
| `manage` | Quyền quản trị tổng hợp; nên hạn chế dùng. |

---

## 5.4. Scope phân quyền dữ liệu

| Scope | Ý nghĩa |
|---|---|
| `own` | Chỉ dữ liệu của chính user. |
| `team` | Dữ liệu của team/nhóm. |
| `department` | Dữ liệu của phòng ban. |
| `tenant` | Dữ liệu trong tenant/tổ chức. |
| `all` | Toàn hệ thống. |

Ví dụ:

| Role | Permission | Scope | Ý nghĩa |
|---|---|---|---|
| Member | `iam.users:read` | `own` | Chỉ xem chính mình |
| Manager | `iam.users:read` | `team` | Xem user trong team |
| Tenant Admin | `iam.users:read` | `tenant` | Xem user trong tenant |
| Super Admin | `iam.users:read` | `all` | Xem toàn hệ thống |

---

## 5.5. Permission catalog

Permission catalog là danh mục quyền chuẩn do hệ thống định nghĩa. Admin có thể gán permission vào role, nhưng không nên tự tạo permission tùy ý trong production nếu permission đó không gắn với code/API thật.

| Field | Mô tả |
|---|---|
| `code` | Mã permission, ví dụ `iam.users:read` |
| `name` | Tên hiển thị |
| `description` | Mô tả quyền |
| `module` | Module sở hữu permission |
| `resource` | Resource được tác động |
| `action` | Hành động |
| `risk_level` | Low/Medium/High/Critical |
| `status` | Active/Deprecated/Removed |
| `is_system` | Quyền hệ thống hay custom |

---

## 5.6. Permission seed mặc định

```text
iam.users:read
iam.users:create
iam.users:update
iam.users:delete
iam.users:invite
iam.users:export
iam.users:assign-role
iam.users:reset-password
iam.users:reset-mfa
iam.users:revoke-session

iam.roles:read
iam.roles:create
iam.roles:update
iam.roles:delete

iam.permissions:read

iam.groups:read
iam.groups:create
iam.groups:update
iam.groups:delete

security.audit_logs:read
security.audit_logs:export

system.settings:read
system.settings:update
```

---

## 5.7. Role seed mặc định

| Role | Mô tả | Quyền điển hình |
|---|---|---|
| Super Admin | Quản trị toàn hệ thống | Toàn quyền |
| Tenant Admin | Quản trị trong tenant | User, role, group, audit trong tenant |
| User Manager | Quản lý người dùng | Read/create/update/invite user |
| Auditor | Chỉ xem và kiểm tra | Read user, read role, read audit log |
| Member | Người dùng thông thường | Own profile, own security settings |

---

## 5.8. Mapping API với permission

| Method | Endpoint | Permission | Scope |
|---|---|---|---|
| GET | `/api/users` | `iam.users:read` | team/tenant/all |
| GET | `/api/users/{id}` | `iam.users:read` | own/team/tenant/all |
| POST | `/api/users` | `iam.users:create` | tenant/all |
| POST | `/api/users/invite` | `iam.users:invite` | tenant/all |
| PUT | `/api/users/{id}` | `iam.users:update` | own/team/tenant/all |
| DELETE | `/api/users/{id}` | `iam.users:delete` | tenant/all |
| POST | `/api/users/{id}/reset-password` | `iam.users:reset-password` | tenant/all |
| POST | `/api/users/{id}/reset-mfa` | `iam.users:reset-mfa` | tenant/all |
| POST | `/api/users/{id}/revoke-sessions` | `iam.users:revoke-session` | tenant/all |
| PUT | `/api/users/{id}/roles` | `iam.users:assign-role` | tenant/all |
| GET | `/api/roles` | `iam.roles:read` | tenant/all |
| POST | `/api/roles` | `iam.roles:create` | tenant/all |
| PUT | `/api/roles/{id}` | `iam.roles:update` | tenant/all |
| DELETE | `/api/roles/{id}` | `iam.roles:delete` | tenant/all |
| GET | `/api/permissions` | `iam.permissions:read` | all |
| GET | `/api/audit-logs` | `security.audit_logs:read` | tenant/all |

---

# 6. Module User Management

## 6.1. Chức năng chính

| STT | Chức năng | Mục đích | Mức độ |
|---:|---|---|---|
| 1 | Danh sách user | Quản lý toàn bộ người dùng | Bắt buộc |
| 2 | Tạo user | Admin tạo tài khoản | Bắt buộc |
| 3 | Mời user | Gửi email invite để user tự kích hoạt | Nên có |
| 4 | Xem chi tiết user | Xem hồ sơ, role, trạng thái, activity | Bắt buộc |
| 5 | Cập nhật user | Sửa thông tin cơ bản | Bắt buộc |
| 6 | Kích hoạt/vô hiệu hóa user | Quản lý vòng đời tài khoản | Bắt buộc |
| 7 | Khóa/mở khóa user | Xử lý rủi ro bảo mật | Nên có |
| 8 | Gán role | Cấp quyền cho user | Bắt buộc |
| 9 | Gán group/team | Quản lý theo nhóm | Nên có |
| 10 | Reset password | Admin hỗ trợ khôi phục tài khoản | Nên có |
| 11 | Reset MFA | Hỗ trợ user mất thiết bị MFA | Nên có |
| 12 | Revoke sessions | Đăng xuất user khỏi mọi thiết bị | Bắt buộc |
| 13 | Xem login history | Điều tra truy cập | Nên có |
| 14 | Import users | Tạo user hàng loạt | Tùy dự án |
| 15 | Export users | Xuất danh sách user | Tùy dự án |
| 16 | Impersonation | Support đăng nhập thay user | Tùy dự án, rủi ro cao |
| 17 | Preferences | Ngôn ngữ, timezone, notification | Nên có |
| 18 | Delete/anonymize user | Xóa hoặc ẩn danh dữ liệu | Tùy yêu cầu pháp lý |

---

## 6.2. Vòng đời tài khoản

```text
Invited
  → Pending Verification
  → Active
  → Password Reset Required
  → MFA Required
  → Locked
  → Suspended
  → Deactivated
  → Deleted / Anonymized
```

| Trạng thái | Ý nghĩa | Cho đăng nhập? |
|---|---|---|
| Invited | Đã được mời, chưa kích hoạt | Không |
| Pending Verification | Chưa xác minh email | Tùy policy |
| Active | Hoạt động bình thường | Có |
| Password Reset Required | Cần đổi mật khẩu | Có, nhưng redirect sang đổi mật khẩu |
| MFA Required | Cần setup MFA | Có, nhưng redirect sang setup MFA |
| Locked | Bị khóa do failed login/risk | Không |
| Suspended | Tạm ngưng bởi admin | Không |
| Deactivated | Không còn sử dụng | Không |
| Deleted | Đã xóa logic hoặc ẩn danh | Không |

---

## 6.3. User list UI

| Thành phần | Mô tả |
|---|---|
| Search | Tìm theo tên, email, username. |
| Filter | Status, role, group, organization, MFA enabled, last login. |
| Table columns | Avatar, name, email, role, status, last login, created date. |
| Bulk actions | Invite, activate, deactivate, assign role, export. |
| Row actions | View, edit, reset password, reset MFA, revoke session, deactivate. |
| Empty state | “Chưa có người dùng. Mời người dùng đầu tiên.” |
| Permission-aware UI | Chỉ hiển thị action nếu user hiện tại có quyền. |

---

## 6.4. User detail UI

| Tab | Nội dung |
|---|---|
| Overview | Thông tin cơ bản, status, role, tenant, last login. |
| Profile | Name, email, phone, avatar, language, timezone. |
| Roles & Permissions | Role đang có và permission hiệu lực. |
| Groups/Teams | Nhóm/phòng ban. |
| Security | MFA, passkey, active sessions, password last changed. |
| Activity | Login history, user activity. |
| Audit | Thay đổi liên quan đến user. |
| Danger Zone | Deactivate, delete/anonymize, revoke all sessions. |

---

## 6.5. Invite user flow

```text
1. Admin nhập email, role, group, tenant.
2. Backend kiểm tra admin có quyền invite và gán role không.
3. Tạo user trạng thái Invited hoặc tạo invitation record.
4. Gửi email invite.
5. User mở link invite.
6. User đặt mật khẩu hoặc đăng nhập bằng SSO.
7. User xác minh email.
8. User bật MFA nếu policy yêu cầu.
9. Chuyển trạng thái Active.
10. Ghi audit event.
```

---

## 6.6. Các thao tác nhạy cảm cần xác nhận

| Thao tác | Cần xác nhận? | Cần step-up auth? | Cần audit? |
|---|---:|---:|---:|
| Đổi email user | Có | Tùy dự án | Có |
| Gán role admin | Có | Có | Có |
| Disable user | Có | Không/Có | Có |
| Reset password | Có | Tùy dự án | Có |
| Reset MFA | Có | Có | Có |
| Revoke all sessions | Có | Không/Có | Có |
| Delete user | Có, nhập lại xác nhận | Có | Có |

---

# 7. Data Model đề xuất

## 7.1. Bảng lõi

| Bảng | Mục đích |
|---|---|
| `users` | Tài khoản người dùng. |
| `user_profiles` | Hồ sơ mở rộng. |
| `roles` | Vai trò. |
| `permissions` | Danh mục quyền. |
| `user_roles` | Mapping user-role. |
| `role_permissions` | Mapping role-permission-scope. |
| `groups` | Nhóm/team. |
| `user_groups` | Mapping user-group. |
| `organizations` / `tenants` | Tổ chức/tenant. |
| `sessions` | Phiên đăng nhập. |
| `refresh_tokens` | Token làm mới phiên. |
| `password_reset_tokens` | Token reset password. |
| `email_verification_tokens` | Token xác minh email. |
| `mfa_factors` | MFA method đã đăng ký. |
| `backup_codes` | Recovery codes. |
| `passkeys` | WebAuthn credentials. |
| `audit_logs` | Nhật ký hành động. |
| `security_events` | Sự kiện bảo mật. |

---

## 7.2. Bảng `users`

| Field | Kiểu gợi ý | Mô tả |
|---|---|---|
| `id` | UUID | ID user |
| `email` | varchar | Email đăng nhập |
| `username` | varchar | Username nếu có |
| `password_hash` | varchar | Hash mật khẩu; nullable nếu chỉ dùng SSO |
| `status` | enum/varchar | Trạng thái tài khoản |
| `email_verified_at` | timestamp | Thời điểm xác minh email |
| `password_changed_at` | timestamp | Thời điểm đổi mật khẩu |
| `last_login_at` | timestamp | Đăng nhập gần nhất |
| `last_login_ip` | varchar | IP đăng nhập gần nhất |
| `failed_login_count` | int | Số lần login sai |
| `locked_until` | timestamp | Khóa đến thời điểm nào |
| `mfa_enabled` | boolean | Có bật MFA không |
| `tenant_id` | UUID | Tenant nếu có |
| `created_at` | timestamp | Thời điểm tạo |
| `updated_at` | timestamp | Thời điểm cập nhật |
| `created_by` | UUID | Người tạo |
| `updated_by` | UUID | Người cập nhật |
| `deleted_at` | timestamp | Soft delete |

---

## 7.3. Bảng `permissions`

| Field | Kiểu gợi ý | Mô tả |
|---|---|---|
| `id` | UUID | ID permission |
| `code` | varchar unique | Mã permission |
| `name` | varchar | Tên hiển thị |
| `module` | varchar | Module |
| `resource` | varchar | Resource |
| `action` | varchar | Action |
| `description` | text | Mô tả |
| `risk_level` | enum/varchar | Low/Medium/High/Critical |
| `status` | enum/varchar | Active/Deprecated/Removed |
| `is_system` | boolean | Permission hệ thống |
| `introduced_version` | varchar | Version bắt đầu có |
| `deprecated_version` | varchar | Version deprecated |

---

## 7.4. Bảng `roles`

| Field | Kiểu gợi ý | Mô tả |
|---|---|---|
| `id` | UUID | ID role |
| `code` | varchar unique | Mã role |
| `name` | varchar | Tên hiển thị |
| `description` | text | Mô tả |
| `tenant_id` | UUID nullable | Tenant nếu role theo tenant |
| `is_system` | boolean | Role hệ thống |
| `status` | enum/varchar | Active/Inactive |

---

## 7.5. Bảng `role_permissions`

| Field | Kiểu gợi ý | Mô tả |
|---|---|---|
| `role_id` | UUID | Role |
| `permission_id` | UUID | Permission |
| `scope` | varchar | own/team/department/tenant/all |
| `conditions_json` | json/jsonb | Điều kiện nâng cao nếu có |

---

# 8. API Specification đề xuất

## 8.1. Auth APIs

| Method | Endpoint | Mục đích | Auth |
|---|---|---|---|
| POST | `/api/auth/register` | Đăng ký tài khoản | Public |
| POST | `/api/auth/login` | Đăng nhập | Public |
| POST | `/api/auth/logout` | Đăng xuất | Authenticated |
| POST | `/api/auth/refresh-token` | Làm mới token | Public/Auth tùy thiết kế |
| POST | `/api/auth/forgot-password` | Gửi email reset password | Public |
| POST | `/api/auth/reset-password` | Reset password | Public |
| POST | `/api/auth/change-password` | Đổi password | Authenticated |
| POST | `/api/auth/verify-email` | Xác minh email | Public |
| POST | `/api/auth/resend-verification` | Gửi lại email xác minh | Public/Auth |
| GET | `/api/auth/me` | Lấy user hiện tại | Authenticated |
| GET | `/api/auth/sessions` | Danh sách phiên | Authenticated |
| DELETE | `/api/auth/sessions/{id}` | Revoke một session | Authenticated |
| DELETE | `/api/auth/sessions` | Revoke toàn bộ session | Authenticated |

---

## 8.2. MFA APIs

| Method | Endpoint | Mục đích |
|---|---|---|
| POST | `/api/auth/mfa/totp/setup` | Tạo secret + QR code |
| POST | `/api/auth/mfa/totp/verify-setup` | Xác nhận setup TOTP |
| POST | `/api/auth/mfa/totp/verify` | Verify OTP khi login |
| POST | `/api/auth/mfa/backup-codes/regenerate` | Tạo lại backup codes |
| DELETE | `/api/auth/mfa/{factorId}` | Tắt MFA factor |
| POST | `/api/auth/mfa/recovery-code/verify` | Verify bằng recovery code |

---

## 8.3. User Management APIs

| Method | Endpoint | Mục đích | Permission |
|---|---|---|---|
| GET | `/api/users` | Danh sách user | `iam.users:read` |
| POST | `/api/users` | Tạo user | `iam.users:create` |
| POST | `/api/users/invite` | Mời user | `iam.users:invite` |
| GET | `/api/users/{id}` | Xem user | `iam.users:read` |
| PUT | `/api/users/{id}` | Cập nhật user | `iam.users:update` |
| PATCH | `/api/users/{id}/status` | Đổi trạng thái user | `iam.users:update` |
| DELETE | `/api/users/{id}` | Xóa user | `iam.users:delete` |
| PUT | `/api/users/{id}/roles` | Gán role | `iam.users:assign-role` |
| POST | `/api/users/{id}/reset-password` | Reset password | `iam.users:reset-password` |
| POST | `/api/users/{id}/reset-mfa` | Reset MFA | `iam.users:reset-mfa` |
| POST | `/api/users/{id}/revoke-sessions` | Revoke session | `iam.users:revoke-session` |
| GET | `/api/users/{id}/activity` | Xem hoạt động user | `iam.users:read` |

---

## 8.4. Role/Permission APIs

| Method | Endpoint | Mục đích | Permission |
|---|---|---|---|
| GET | `/api/roles` | Danh sách role | `iam.roles:read` |
| POST | `/api/roles` | Tạo role | `iam.roles:create` |
| GET | `/api/roles/{id}` | Xem role | `iam.roles:read` |
| PUT | `/api/roles/{id}` | Sửa role | `iam.roles:update` |
| DELETE | `/api/roles/{id}` | Xóa role | `iam.roles:delete` |
| GET | `/api/permissions` | Danh sách permission | `iam.permissions:read` |
| PUT | `/api/roles/{id}/permissions` | Cập nhật quyền của role | `iam.roles:update` |
| GET | `/api/users/{id}/permissions` | Xem quyền hiệu lực của user | `iam.users:read` |

---

# 9. UI/UX Sitemap

```text
Public / Auth
├── Login
├── Register
├── Accept Invitation
├── Forgot Password
├── Reset Password
├── Verify Email
├── MFA Verification
└── SSO Callback / Error

User Area
├── My Profile
├── Security Settings
│   ├── Change Password
│   ├── MFA
│   ├── Passkeys
│   ├── Active Sessions
│   └── Login History
└── Preferences

Admin Area
├── Dashboard
├── User Management
│   ├── User List
│   ├── Create / Invite User
│   ├── User Detail
│   └── User Activity
├── Role Management
│   ├── Role List
│   ├── Role Detail
│   └── Permission Matrix
├── Permission Catalog
├── Groups / Teams
├── Organization / Tenant Settings
├── Audit Logs
└── Security Settings
```

---

# 10. UI/UX chi tiết

## 10.1. Login screen

| Thành phần | Mô tả |
|---|---|
| Email input | Validate format email. |
| Password input | Có show/hide password. |
| Remember me | Tùy policy; không bật với admin nếu rủi ro cao. |
| Forgot password | Link đến màn khôi phục mật khẩu. |
| Login button | Disable khi đang xử lý. |
| SSO buttons | Hiển thị theo cấu hình. |
| Error message | Thông báo chung, không tiết lộ email tồn tại. |

---

## 10.2. Role permission matrix

| Module | Resource | Read | Create | Update | Delete | Export | Special |
|---|---|---:|---:|---:|---:|---:|---|
| IAM | Users | ☑ | ☑ | ☑ | ☐ | ☑ | Invite, Reset MFA |
| IAM | Roles | ☑ | ☐ | ☐ | ☐ | - | Assign Permission |
| Security | Audit Logs | ☑ | - | - | - | ☑ | - |
| System | Settings | ☑ | - | ☑ | - | - | - |

Gợi ý filter:

```text
- Module
- Resource
- Risk level
- Only selected
- Only dangerous permissions
```

---

## 10.3. Security settings screen

| Section | Chức năng |
|---|---|
| Password | Đổi mật khẩu. |
| MFA | Bật/tắt TOTP, backup codes. |
| Passkeys | Thêm/xóa passkey nếu hỗ trợ. |
| Active sessions | Xem thiết bị đang đăng nhập, revoke session. |
| Login history | Lịch sử đăng nhập gần đây. |
| Security notifications | Cấu hình nhận email thông báo bảo mật. |

---

# 11. Triển khai với Spring Boot/Spring Security

## 11.1. Security configuration

```java
@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(
                    "/api/auth/login",
                    "/api/auth/register",
                    "/api/auth/refresh-token",
                    "/api/auth/forgot-password",
                    "/api/auth/reset-password",
                    "/actuator/health"
                ).permitAll()
                .anyRequest().authenticated()
            );

        return http.build();
    }
}
```

---

## 11.2. Permission constants

```java
public final class Permissions {

    private Permissions() {}

    public static final class Users {
        public static final String READ = "iam.users:read";
        public static final String CREATE = "iam.users:create";
        public static final String UPDATE = "iam.users:update";
        public static final String DELETE = "iam.users:delete";
        public static final String INVITE = "iam.users:invite";
        public static final String ASSIGN_ROLE = "iam.users:assign-role";
        public static final String RESET_PASSWORD = "iam.users:reset-password";
        public static final String RESET_MFA = "iam.users:reset-mfa";
        public static final String REVOKE_SESSION = "iam.users:revoke-session";
    }

    public static final class Roles {
        public static final String READ = "iam.roles:read";
        public static final String CREATE = "iam.roles:create";
        public static final String UPDATE = "iam.roles:update";
        public static final String DELETE = "iam.roles:delete";
    }

    public static final class AuditLogs {
        public static final String READ = "security.audit_logs:read";
        public static final String EXPORT = "security.audit_logs:export";
    }
}
```

---

## 11.3. Phương án đơn giản: dùng `@PreAuthorize`

```java
@RestController
@RequestMapping("/api/users")
public class UserController {

    @GetMapping
    @PreAuthorize("hasAuthority('iam.users:read')")
    public Page<UserResponse> searchUsers(UserSearchRequest request) {
        return userService.searchUsers(request);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('iam.users:create')")
    public UserResponse createUser(@RequestBody CreateUserRequest request) {
        return userService.createUser(request);
    }
}
```

Phương án này phù hợp cho dự án nhỏ, nhưng khi hệ thống lớn nên tránh rải string permission trong code.

---

## 11.4. Phương án khuyến nghị: custom `@RequirePermission`

```java
@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
public @interface RequirePermission {
    String value();
}
```

Ví dụ sử dụng:

```java
@RestController
@RequestMapping("/api/users")
public class UserController {

    @RequirePermission(Permissions.Users.READ)
    @GetMapping
    public Page<UserResponse> searchUsers(UserSearchRequest request) {
        return userService.searchUsers(request);
    }

    @RequirePermission(Permissions.Users.CREATE)
    @PostMapping
    public UserResponse createUser(@RequestBody CreateUserRequest request) {
        return userService.createUser(request);
    }

    @RequirePermission(Permissions.Users.ASSIGN_ROLE)
    @PutMapping("/{id}/roles")
    public void assignRoles(
        @PathVariable UUID id,
        @RequestBody AssignRoleRequest request
    ) {
        userService.assignRoles(id, request);
    }
}
```

---

## 11.5. PermissionChecker

```java
@Component("permissionChecker")
public class PermissionChecker {

    private final UserPermissionService userPermissionService;

    public PermissionChecker(UserPermissionService userPermissionService) {
        this.userPermissionService = userPermissionService;
    }

    public boolean has(Authentication authentication, String permission) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return false;
        }

        String userId = authentication.getName();
        return userPermissionService
            .getEffectivePermissions(userId)
            .contains(permission);
    }
}
```

---

## 11.6. Data scope check trong service

```java
@Service
public class UserService {

    private final DataScopeService dataScopeService;
    private final UserRepository userRepository;

    public Page<UserResponse> searchUsers(UserSearchRequest request) {
        CurrentUser currentUser = CurrentUserContext.get();

        DataScope scope = dataScopeService.getScope(
            currentUser.getId(),
            Permissions.Users.READ
        );

        return switch (scope) {
            case OWN -> userRepository.findByIdAsPage(
                currentUser.getId(),
                request.toPageable()
            );
            case TEAM -> userRepository.findByTeamId(
                currentUser.getTeamId(),
                request.toPageable()
            );
            case TENANT -> userRepository.findByTenantId(
                currentUser.getTenantId(),
                request.toPageable()
            );
            case ALL -> userRepository.searchAll(request.toPageable());
            default -> throw new AccessDeniedException("Access denied");
        };
    }

    public UserResponse updateUser(UUID targetUserId, UpdateUserRequest request) {
        CurrentUser currentUser = CurrentUserContext.get();

        boolean allowed = dataScopeService.canAccessUser(
            currentUser,
            Permissions.Users.UPDATE,
            targetUserId
        );

        if (!allowed) {
            throw new AccessDeniedException("Access denied");
        }

        // update logic
        return null;
    }
}
```

---

## 11.7. Nguyên tắc triển khai backend

```text
1. SecurityFilterChain chỉ xử lý public/authenticated routes và cấu hình bảo mật chung.
2. Permission chi tiết nên check ở method level hoặc custom annotation.
3. Không hard-code role kiểu ADMIN trong business logic.
4. Permission nên dùng constants để tránh typo.
5. Service layer phải check data scope/object-level access.
6. API protected không khai báo permission phải fail CI hoặc bị deny.
7. Khi role/permission thay đổi, cần clear permission cache.
8. Hành động nhạy cảm phải ghi audit log.
```

---

# 12. Quản lý permission khi API tăng nhiều

## 12.1. Không nên 1 API = 1 permission

Không nên:

```text
GET /api/users         -> get_users_api
POST /api/users        -> post_users_api
PUT /api/users/{id}    -> put_users_by_id_api
DELETE /api/users/{id} -> delete_users_by_id_api
```

Nên:

```text
GET /api/users         -> iam.users:read
GET /api/users/{id}    -> iam.users:read
POST /api/users        -> iam.users:create
PUT /api/users/{id}    -> iam.users:update
DELETE /api/users/{id} -> iam.users:delete
```

---

## 12.2. Khi nào tạo permission mới?

Tạo permission mới khi hành động có một trong các đặc điểm sau:

1. Rủi ro bảo mật khác biệt.
2. Nhóm người dùng được phép khác biệt.
3. Cần audit riêng.
4. Có quy trình phê duyệt riêng.
5. Có tác động nghiệp vụ quan trọng.

Ví dụ nên tách riêng:

```text
iam.users:assign-role
iam.users:reset-mfa
iam.users:export
security.audit_logs:export
system.settings:update
```

---

## 12.3. Permission sync

Nên có script đồng bộ permission từ code sang database:

```text
1. Scan permission constants hoặc annotation.
2. So sánh với bảng permissions.
3. Thêm permission mới.
4. Đánh dấu permission không còn dùng là deprecated.
5. Không xóa permission ngay.
6. Xuất report cho developer/admin review.
```

---

# 13. Cache permission

## 13.1. Cache key gợi ý

```text
user:{userId}:permissions
user:{userId}:scopes
role:{roleId}:permissions
```

## 13.2. Khi nào clear cache?

| Sự kiện | Hành động |
|---|---|
| Gán role cho user | Clear cache user |
| Gỡ role khỏi user | Clear cache user |
| Cập nhật permission của role | Clear cache tất cả user có role đó |
| Disable user | Clear cache + revoke session |
| Reset password | Revoke session |
| Reset MFA | Revoke session tùy policy |

---

# 14. Checklist bảo mật

## 14.1. Authentication checklist

- [ ] Password được hash bằng thuật toán phù hợp.
- [ ] Không lưu plain text password/token.
- [ ] Login có rate limit.
- [ ] Forgot password không tiết lộ email tồn tại.
- [ ] Reset token là one-time, có expiry, lưu dạng hash.
- [ ] Reset password revoke session cũ.
- [ ] Có audit login success/failed/logout.
- [ ] Có account lock/throttling.
- [ ] Có email verification.
- [ ] Có MFA cho role nhạy cảm.

---

## 14.2. Authorization checklist

- [ ] API protected yêu cầu authenticated.
- [ ] API nhạy cảm có permission cụ thể.
- [ ] Default deny nếu thiếu permission.
- [ ] Không hard-code role trong business logic.
- [ ] Backend enforce permission, không chỉ frontend.
- [ ] Service layer check object-level access/data scope.
- [ ] Có test case user thiếu quyền bị 403.
- [ ] Có audit thay đổi role/permission.
- [ ] Permission catalog có owner và version.

---

## 14.3. User Management checklist

- [ ] User CRUD hoạt động.
- [ ] Có trạng thái tài khoản rõ ràng.
- [ ] Disable user không đăng nhập được.
- [ ] Disable user có thể revoke session.
- [ ] Assign role kiểm tra quyền người thực hiện.
- [ ] Reset MFA cần audit.
- [ ] User list có search/filter/pagination.
- [ ] User detail hiển thị role, status, session, activity.
- [ ] Có audit khi cập nhật user.

---

# 15. Test Strategy

## 15.1. Unit tests

| Nhóm | Nội dung test |
|---|---|
| Password policy | Password yếu, password hợp lệ, blocklist. |
| Token service | Generate, validate, expire, revoke. |
| Permission service | Resolve role-permission, cache, clear cache. |
| Data scope service | own/team/tenant/all. |

---

## 15.2. Integration tests

| Scenario | Kết quả kỳ vọng |
|---|---|
| User không login gọi API protected | 401 |
| User login nhưng thiếu permission | 403 |
| User có permission nhưng sai scope | 403 hoặc không thấy dữ liệu |
| User có permission và đúng scope | 200 |
| Disable user gọi API | 401/403 tùy thiết kế |
| Reset password token hết hạn | 400 |
| Assign role thành công | Audit log được ghi |

---

## 15.3. E2E tests

| Flow | Mục tiêu |
|---|---|
| Login/logout | Đảm bảo auth flow hoạt động. |
| Forgot/reset password | Đảm bảo recovery flow đúng và an toàn. |
| Invite user | Đảm bảo user kích hoạt được tài khoản. |
| Assign role | Đảm bảo quyền thay đổi đúng. |
| User thiếu quyền | UI ẩn action và backend trả 403. |
| Revoke session | User bị đăng xuất khỏi thiết bị tương ứng. |

---

# 16. Deliverables cho boilerplate

| Deliverable | Nội dung |
|---|---|
| Functional Spec | Mô tả chức năng auth, authz, user management. |
| API Spec | Danh sách API, request/response, permission mapping. |
| ERD | Users, roles, permissions, sessions, audit. |
| UI Flow | Login, reset password, MFA, user admin, role admin. |
| Permission Matrix | Danh sách permission và role mặc định. |
| Security Checklist | Checklist auth/authz/session/audit. |
| Seed Data | Role, permission, admin user ban đầu. |
| Migration Scripts | Tạo bảng và dữ liệu mặc định. |
| Test Cases | Unit, integration, e2e, negative cases. |
| Developer Guide | Cách thêm permission, API guard, data scope. |
| Admin Guide | Cách quản lý user, role, MFA, session. |

---

# 17. Những điểm không nên làm

| Không nên | Lý do |
|---|---|
| Chỉ check quyền ở frontend | User có thể gọi API trực tiếp. |
| Hard-code `ADMIN` trong business logic | Khó mở rộng role và permission. |
| 1 API = 1 permission | Permission phình to, admin khó quản lý. |
| Không có data scope | Dễ lỗi truy cập dữ liệu người khác. |
| Không audit thay đổi quyền | Không điều tra được sự cố. |
| Lưu refresh token plain text | DB lộ là mất session dài hạn. |
| Reset password nhưng không revoke session | Kẻ chiếm tài khoản vẫn giữ phiên cũ. |
| Thông báo email không tồn tại ở forgot password | Dễ user enumeration. |
| Xóa permission cũ ngay | Role cũ có thể bị lỗi. Nên deprecated trước. |
| Không test negative case | Dễ lọt quyền trái phép. |

---

# 18. Định hướng mở rộng

## 18.1. Multi-tenant

Khi hệ thống có nhiều tenant:

```text
User
  └── TenantMembership
       └── TenantRole
            └── Permission + Scope
```

Cần đảm bảo:

- Mọi bảng nghiệp vụ có `tenant_id` nếu dữ liệu thuộc tenant.
- Repository mặc định filter theo tenant.
- Super Admin có thể scope `all`, Tenant Admin chỉ scope `tenant`.
- Audit log ghi `tenant_id`.

---

## 18.2. ABAC/Policy-based Authorization

Khi RBAC + scope chưa đủ, có thể bổ sung policy:

```text
User được approve order nếu:
- có permission sales.orders:approve;
- order thuộc tenant của user;
- order amount <= approval_limit của user;
- order status = PENDING_APPROVAL.
```

Lúc này permission chỉ trả lời câu hỏi:

```text
User có loại quyền này không?
```

Policy trả lời câu hỏi:

```text
User có được thực hiện hành động này trên đối tượng cụ thể này trong ngữ cảnh này không?
```

---

## 18.3. SSO/OIDC

Có thể mở rộng authentication bằng OIDC:

```text
Client
  → Redirect to Identity Provider
  → User login at IdP
  → Callback to application
  → Validate ID token/access token
  → Map external identity to local user
  → Resolve local roles/permissions
```

Lưu ý:

- Không nên phụ thuộc hoàn toàn vào role từ IdP nếu hệ thống cần quyền nghiệp vụ chi tiết.
- Nên map group/claim từ IdP sang role nội bộ.
- Vẫn cần local audit log và session management.

---

# 19. Kết luận

Thiết kế đề xuất cho boilerplate:

```text
Authentication:
- Login/logout
- Forgot/reset password
- Email verification
- Session/token management
- MFA-ready

Authorization:
- Permission = <module>.<resource>:<action>
- Scope = own/team/department/tenant/all
- Role = tập permission + scope
- User = được gán role
- API = khai báo permission cần có
- Service = kiểm tra data scope/object-level policy

User Management:
- User CRUD
- Invite user
- Status lifecycle
- Role assignment
- Security settings
- Active sessions
- Audit log
```

Mô hình này đủ đơn giản để khởi đầu, nhưng vẫn mở rộng tốt khi hệ thống có nhiều API, nhiều module, nhiều tenant, yêu cầu bảo mật cao hoặc cần tích hợp SSO/MFA/ABAC trong tương lai.

---

# 20. Nguồn tham khảo

- Spring Security Reference Documentation - Method Security.
- Spring Security Reference Documentation - Authorization Architecture.
- OWASP Authorization Cheat Sheet.
- OWASP Authentication Cheat Sheet.
- OWASP Forgot Password Cheat Sheet.
- OWASP Top 10 Web Application Security Risks.
- NIST SP 800-63B Digital Identity Guidelines: Authentication and Lifecycle Management.
