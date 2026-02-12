# 🤖 AI Prompt: OAuth2 / OIDC Provider Integration

> Copy everything below the line and paste into your AI coding assistant.
>
> 复制下方分割线以下的全部内容，粘贴到你的 AI 编程助手中。

---

You are an expert developer specializing in OAuth2 and OpenID Connect. Help me integrate UniAuth as my application's OAuth2/OIDC provider.

## Project Context

- **UniAuth Server URL**: `YOUR_UNIAUTH_URL` (e.g. `https://auth.55387.xyz`)
- **Client ID**: `YOUR_CLIENT_ID`
- **Client Secret**: `YOUR_CLIENT_SECRET`
- **Redirect URI**: `YOUR_REDIRECT_URI`

## OIDC Discovery

UniAuth supports OpenID Connect Discovery. Your app can auto-configure by fetching:

```
GET YOUR_UNIAUTH_URL/.well-known/openid-configuration
```

Response includes:
```json
{
  "issuer": "YOUR_UNIAUTH_URL",
  "authorization_endpoint": "YOUR_UNIAUTH_URL/api/v1/oauth2/authorize",
  "token_endpoint": "YOUR_UNIAUTH_URL/api/v1/oauth2/token",
  "userinfo_endpoint": "YOUR_UNIAUTH_URL/api/v1/oidc/userinfo",
  "jwks_uri": "YOUR_UNIAUTH_URL/.well-known/jwks.json",
  "introspection_endpoint": "YOUR_UNIAUTH_URL/api/v1/oauth2/introspect",
  "response_types_supported": ["code"],
  "grant_types_supported": ["authorization_code", "client_credentials", "refresh_token"],
  "subject_types_supported": ["public"],
  "id_token_signing_alg_values_supported": ["RS256"],
  "scopes_supported": ["openid", "profile", "email", "phone"]
}
```

## API Endpoints

### 1. Authorization Code Flow

**Step 1: Redirect user to authorize**
```
GET YOUR_UNIAUTH_URL/api/v1/oauth2/authorize
  ?client_id=YOUR_CLIENT_ID
  &redirect_uri=YOUR_REDIRECT_URI
  &response_type=code
  &scope=openid profile email
  &state=random_csrf_state
  &code_challenge=BASE64URL_CHALLENGE     # PKCE (recommended)
  &code_challenge_method=S256
```

**Step 2: Exchange code for tokens**
```http
POST YOUR_UNIAUTH_URL/api/v1/oauth2/token
Content-Type: application/json

{
  "grant_type": "authorization_code",
  "client_id": "YOUR_CLIENT_ID",
  "client_secret": "YOUR_CLIENT_SECRET",
  "code": "AUTHORIZATION_CODE",
  "redirect_uri": "YOUR_REDIRECT_URI",
  "code_verifier": "PKCE_VERIFIER"
}
```

Response:
```json
{
  "access_token": "eyJ...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "eyJ...",
  "id_token": "eyJ..."
}
```

### 2. Client Credentials Flow (Machine-to-Machine)

```http
POST YOUR_UNIAUTH_URL/api/v1/oauth2/token
Content-Type: application/json

{
  "grant_type": "client_credentials",
  "client_id": "YOUR_CLIENT_ID",
  "client_secret": "YOUR_CLIENT_SECRET",
  "scope": "read write"
}
```

### 3. Token Introspection (RFC 7662)

```http
POST YOUR_UNIAUTH_URL/api/v1/oauth2/introspect
Authorization: Basic BASE64(client_id:client_secret)
Content-Type: application/json

{ "token": "ACCESS_TOKEN" }
```

### 4. UserInfo Endpoint

```http
GET YOUR_UNIAUTH_URL/api/v1/oidc/userinfo
Authorization: Bearer ACCESS_TOKEN
```

### 5. JWKS (for local JWT verification)

```
GET YOUR_UNIAUTH_URL/.well-known/jwks.json
```

## Using the Client SDK (Optional)

```bash
npm install @55387.ai/uniauth-client
```

```typescript
import { UniAuthClient } from '@55387.ai/uniauth-client';

const client = new UniAuthClient({
  baseUrl: 'YOUR_UNIAUTH_URL',
  clientId: 'YOUR_CLIENT_ID',
});

// Start OAuth2 flow with PKCE
const authUrl = await client.startOAuth2Flow({
  redirectUri: 'YOUR_REDIRECT_URI',
  scope: 'openid profile email',
  usePKCE: true,
});
window.location.href = authUrl;

// On callback page — exchange code for tokens
const tokens = await client.exchangeOAuth2Code(
  code,               // from URL query param
  'YOUR_REDIRECT_URI',
  'YOUR_CLIENT_SECRET' // optional, for confidential clients
);
```

## Requirements

1. **Authorization Code + PKCE**: Implement the full flow for browser-based apps (public clients). Always use PKCE.

2. **Client Credentials**: Implement M2M token acquisition for backend services that need to call UniAuth-protected APIs.

3. **Token Validation**: On your backend, validate tokens using either:
   - **Introspection endpoint** (recommended for most cases)
   - **JWKS-based local verification** (better performance, use JWKS endpoint)

4. **OIDC Discovery**: Auto-configure your app using the `.well-known/openid-configuration` endpoint instead of hardcoding URLs.

5. **State & CSRF**: Generate random `state` parameters and validate on callback.

6. **Token Storage**: Store access tokens securely. Refresh tokens before expiry.

7. **Environment Variables**:
```env
UNIAUTH_URL=YOUR_UNIAUTH_URL
UNIAUTH_CLIENT_ID=YOUR_CLIENT_ID
UNIAUTH_CLIENT_SECRET=YOUR_CLIENT_SECRET
UNIAUTH_REDIRECT_URI=YOUR_REDIRECT_URI
```

Generate the complete implementation for my target platform/framework.
