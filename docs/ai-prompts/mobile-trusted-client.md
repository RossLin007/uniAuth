# 🤖 AI Prompt: Mobile / Trusted Client Integration

> Copy everything below the line and paste into your AI coding assistant.
>
> 复制下方分割线以下的全部内容，粘贴到你的 AI 编程助手中。

---

You are an expert mobile/native app developer. Help me integrate UniAuth authentication into my mobile or native application using the **Trusted Client API**.

The Trusted Client API allows server-to-server or privileged native apps to perform direct authentication (phone/email login) without browser redirects. This is ideal for mobile apps, desktop apps, and backend services.

## Project Context

- **UniAuth Server URL**: `YOUR_UNIAUTH_URL` (e.g. `https://auth.55387.xyz`)
- **Trusted Client ID**: `YOUR_CLIENT_ID`
- **Trusted Client Secret**: `YOUR_CLIENT_SECRET`

## Trusted Client API Reference

All Trusted Client endpoints require these headers:

```http
X-Client-Id: YOUR_CLIENT_ID
X-Client-Secret: YOUR_CLIENT_SECRET
Content-Type: application/json
```

### Phone Authentication

**Send SMS Code:**
```http
POST YOUR_UNIAUTH_URL/api/v1/trusted/phone/send-code

{
  "phone": "+8613800138000",
  "type": "login"
}
```
Response: `{ "success": true, "data": { "expires_in": 300, "retry_after": 60 } }`

**Verify Phone Code:**
```http
POST YOUR_UNIAUTH_URL/api/v1/trusted/phone/verify

{
  "phone": "+8613800138000",
  "code": "123456"
}
```
Response: `{ "success": true, "data": { "user": {...}, "access_token": "...", "refresh_token": "...", "expires_in": 3600 } }`

### Email Authentication

**Send Email Code:**
```http
POST YOUR_UNIAUTH_URL/api/v1/trusted/email/send-code

{
  "email": "user@example.com",
  "type": "login"
}
```

**Verify Email Code:**
```http
POST YOUR_UNIAUTH_URL/api/v1/trusted/email/verify

{
  "email": "user@example.com",
  "code": "123456"
}
```

**Email Password Login:**
```http
POST YOUR_UNIAUTH_URL/api/v1/trusted/email/login

{
  "email": "user@example.com",
  "password": "user_password"
}
```

### MFA Verification

When a login returns `mfa_required: true`, complete MFA:
```http
POST YOUR_UNIAUTH_URL/api/v1/trusted/mfa/verify

Headers: X-Client-Id, X-Client-Secret
{
  "mfa_token": "temporary_mfa_token",
  "code": "123456"
}
```

### Token Refresh

```http
POST YOUR_UNIAUTH_URL/api/v1/trusted/token/refresh

Headers: X-Client-Id, X-Client-Secret
{
  "refresh_token": "current_refresh_token"
}
```
Response: `{ "success": true, "data": { "access_token": "new_token", "refresh_token": "new_refresh", "expires_in": 3600 } }`

### Get User Info (with token)

```http
GET YOUR_UNIAUTH_URL/api/v1/user/me
Authorization: Bearer ACCESS_TOKEN
```
Response: `{ "success": true, "data": { "id": "...", "phone": "...", "email": "...", "nickname": "...", "avatar_url": "..." } }`

## Response Types

```typescript
// Successful login response
interface LoginResponse {
  success: true;
  data: {
    user: {
      id: string;
      phone: string | null;
      email: string | null;
      nickname: string | null;
      avatar_url: string | null;
    };
    access_token: string;
    refresh_token: string;
    expires_in: number;
    is_new_user: boolean;
    mfa_required?: boolean;
    mfa_token?: string;
    mfa_methods?: string[];
  };
}

// Error response
interface ErrorResponse {
  success: false;
  error: {
    code: string;    // e.g. 'INVALID_CODE', 'RATE_LIMITED'
    message: string; // Human-readable error
  };
}
```

## Requirements

1. **Auth Service Layer**: Create a service/manager class that encapsulates all Trusted Client API calls. Securely store `Client-Id` and `Client-Secret` in the app (use secure storage on mobile).

2. **Login Flow**:
   - Phone login: Send code → Verify code → Get tokens
   - Email login: Send code → Verify code, OR email + password login
   - Handle `mfa_required` response → prompt user for MFA code → verify

3. **Token Management**:
   - Store `access_token` and `refresh_token` in secure storage (Keychain on iOS, EncryptedSharedPreferences on Android)
   - Auto-refresh tokens before expiry using the refresh endpoint
   - Include `Authorization: Bearer <access_token>` in all API requests

4. **Error Handling**: Handle network errors, expired tokens, rate limiting, and invalid credentials gracefully. Display user-friendly error messages.

5. **UI/UX**:
   - Login screen with phone/email tabs
   - SMS/email code input with countdown timer
   - MFA code input when required
   - Loading states during API calls
   - Toast notifications for errors (no `alert()`)

6. **Security**:
   - Never log tokens or secrets
   - Use HTTPS for all API calls
   - Validate phone number format (E.164) before sending
   - Implement retry-after logic to respect rate limits

7. **i18n**: Support Chinese and English.

8. **Testing**: Include unit tests for the auth service layer.

Generate the complete implementation for my target platform (React Native / Flutter / Swift / Kotlin).
