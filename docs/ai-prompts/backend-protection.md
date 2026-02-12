# 🤖 AI Prompt: Backend API Protection

> Copy everything below the line and paste into your AI coding assistant.
>
> 复制下方分割线以下的全部内容，粘贴到你的 AI 编程助手中。

---

You are an expert Node.js/TypeScript backend developer. Help me protect my API routes using UniAuth token verification with the official `@55387.ai/uniauth-server` SDK.

## Project Context

- **UniAuth Server URL**: `YOUR_UNIAUTH_URL` (e.g. `https://auth.55387.xyz`)
- **Client ID**: `YOUR_CLIENT_ID`
- **Client Secret**: `YOUR_CLIENT_SECRET`
- **Framework**: Express / Hono / Next.js API Routes (choose based on my project)

## SDK Reference

### Installation

```bash
npm install @55387.ai/uniauth-server
```

### UniAuthServer Class

```typescript
import { UniAuthServer } from '@55387.ai/uniauth-server';

const auth = new UniAuthServer({
  baseUrl: 'YOUR_UNIAUTH_URL',
  clientId: 'YOUR_CLIENT_ID',
  clientSecret: 'YOUR_CLIENT_SECRET',
  jwtPublicKey: process.env.JWT_PUBLIC_KEY, // optional, for local verification
});
```

### Core Methods

```typescript
// Verify an access token (remote → introspection → local JWT fallback)
const payload = await auth.verifyToken(accessToken);
// Returns: TokenPayload { sub, iss, aud, iat, exp, scope, azp, phone, email }

// Token introspection (RFC 7662)
const result = await auth.introspectToken(token, 'access_token');
// Returns: IntrospectionResult { active, scope, client_id, sub, exp, ... }

// Check if token is active
const isActive = await auth.isTokenActive(token);

// Get user info by ID
const user = await auth.getUser(userId);
// Returns: UserInfo { id, phone, email, nickname, avatar_url, ... }

// Cache management
auth.clearCache();
auth.getCacheStats(); // { size, entries }
```

### Express Middleware

```typescript
import express from 'express';

const app = express();

// Protect all /api routes
app.use('/api/*', auth.middleware());

// Access user info in route handlers
app.get('/api/profile', (req, res) => {
  // req.authPayload — TokenPayload (always available)
  // req.user — UserInfo (fetched automatically, may be undefined)
  res.json({ user: req.user, payload: req.authPayload });
});
```

### Hono Middleware

```typescript
import { Hono } from 'hono';

const app = new Hono();

// Protect all /api routes
app.use('/api/*', auth.honoMiddleware());

// Access user info in route handlers
app.get('/api/profile', (c) => {
  const user = c.get('user');           // UserInfo
  const payload = c.get('authPayload'); // TokenPayload
  return c.json({ user, payload });
});
```

### Next.js API Route Protection

```typescript
// middleware.ts or in each API route
import { UniAuthServer } from '@55387.ai/uniauth-server';

const auth = new UniAuthServer({
  baseUrl: process.env.UNIAUTH_URL!,
  clientId: process.env.UNIAUTH_CLIENT_ID!,
  clientSecret: process.env.UNIAUTH_CLIENT_SECRET!,
});

export async function protectRoute(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }
  const payload = await auth.verifyToken(authHeader.substring(7));
  return payload; // Use in your handler
}
```

### Types

```typescript
interface TokenPayload {
  sub: string;       // User ID or Client ID (for M2M tokens)
  iss?: string;      // Issuer
  aud?: string | string[];
  iat: number;       // Issued at
  exp: number;       // Expiration
  scope?: string;    // Scopes (space-separated)
  azp?: string;      // Authorized party (client_id)
  phone?: string;
  email?: string;
}

interface UserInfo {
  id: string;
  phone?: string | null;
  email?: string | null;
  nickname?: string | null;
  avatar_url?: string | null;
  phone_verified?: boolean;
  email_verified?: boolean;
  created_at?: string;
  updated_at?: string;
}

// Error handling
import { ServerAuthError, ServerErrorCode } from '@55387.ai/uniauth-server';

try {
  await auth.verifyToken(token);
} catch (error) {
  if (error instanceof ServerAuthError) {
    // error.code: 'INVALID_TOKEN' | 'TOKEN_EXPIRED' | 'UNAUTHORIZED' | ...
    // error.statusCode: 401
    // error.message: human-readable message
  }
}
```

### Error Codes

| Code | Meaning |
|------|---------|
| `INVALID_TOKEN` | Token is malformed or invalid |
| `TOKEN_EXPIRED` | Token has expired |
| `VERIFICATION_FAILED` | Remote verification failed |
| `USER_NOT_FOUND` | User ID from token not found |
| `UNAUTHORIZED` | Missing or invalid Authorization header |
| `NO_PUBLIC_KEY` | JWT public key not configured for local verification |
| `NETWORK_ERROR` | Cannot reach UniAuth server |

## Requirements

1. **Middleware Setup**: Configure `UniAuthServer` and apply middleware to protect API routes.

2. **Public vs Protected**: Some routes should be public (e.g. health check, login). Apply middleware selectively.

3. **Error Handling**: Return proper JSON error responses with appropriate HTTP status codes. Never expose internal errors.

4. **M2M Support**: Handle both user tokens (`sub` = user ID) and machine-to-machine tokens (`sub` = client ID, no user info).

5. **CORS**: Configure CORS to allow requests from your frontend origin with `Authorization` header.

6. **Rate Limiting**: Add basic rate limiting to prevent abuse.

7. **Environment Variables**:
```env
UNIAUTH_URL=YOUR_UNIAUTH_URL
UNIAUTH_CLIENT_ID=YOUR_CLIENT_ID
UNIAUTH_CLIENT_SECRET=YOUR_CLIENT_SECRET
JWT_PUBLIC_KEY=optional_for_local_verification
```

8. **Testing**: Include unit tests using Vitest. Mock the `UniAuthServer` for testing.

Generate the complete implementation based on my project's framework.
