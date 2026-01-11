# OIDC Integration Guide

Complete guide for integrating with UniAuth using OpenID Connect (OIDC).

## Quick Start

UniAuth is a fully OIDC-compliant Identity Provider. This means you can use any standard OIDC client library to integrate with it.

### Prerequisites

1. Register your application in the [Developer Console](https://auth.yourdomain.com/developer)
2. Obtain your `client_id` and `client_secret`
3. Configure redirect URIs

---

## Discovery

UniAuth provides automatic discovery via the standard OIDC endpoint:

```
GET /.well-known/openid-configuration
```

**Example Response:**
```json
{
  "issuer": "https://auth.yourdomain.com",
  "authorization_endpoint": "https://auth.yourdomain.com/oauth2/authorize",
  "token_endpoint": "https://auth.yourdomain.com/api/v1/oauth2/token",
  "userinfo_endpoint": "https://auth.yourdomain.com/api/v1/oauth2/userinfo",
  "scopes_supported": ["openid", "profile", "email", "phone"],
  "response_types_supported": ["code"],
  "grant_types_supported": ["authorization_code", "client_credentials", "refresh_token"],
  "id_token_signing_alg_values_supported": ["RS256"],
  "claims_supported": ["sub", "iss", "aud", "exp", "iat", "email", "name", ...]
}
```

---

## Authorization Flow

### Step 1: Build Authorization URL

```
GET /oauth2/authorize
```

**Parameters:**
- `client_id` *(required)* - Your application's client ID
- `redirect_uri` *(required)* - Callback URL (must be pre-registered)
- `response_type` *(required)* - Must be `code`
- `scope` *(required)* - Space-separated scopes (include `openid` for OIDC)
- `state` *(recommended)* - Random string for CSRF protection
- `nonce` *(recommended)* - Random string for replay protection
- `code_challenge` *(required for public clients)* - PKCE challenge
- `code_challenge_method` *(optional)* - `S256` or `plain` (default: `S256`)

**Example:**
```
https://auth.yourdomain.com/oauth2/authorize?
  client_id=ua_abc123&
  redirect_uri=https://myapp.com/callback&
  response_type=code&
  scope=openid%20profile%20email&
  state=random_state_string&
  nonce=random_nonce_string&
  code_challenge=BASE64URL(SHA256(verifier))&
  code_challenge_method=S256
```

### Step 2: User Authorizes

User logs in and authorizes your application. They are redirected back to your `redirect_uri` with an authorization code:

```
https://myapp.com/callback?code=AUTH_CODE&state=random_state_string
```

### Step 3: Exchange Code for Tokens

```
POST /api/v1/oauth2/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&
code=AUTH_CODE&
redirect_uri=https://myapp.com/callback&
client_id=ua_abc123&
client_secret=SECRET&
code_verifier=ORIGINAL_VERIFIER
```

**Response:**
```json
{
  "access_token": "eyJhbGc...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "refresh_...",
  "id_token": "eyJhbGc...",
  "scope": "openid profile email"
}
```

---

## Token Validation

### ID Token Structure

The `id_token` is a JWT containing user identity claims:

```json
{
  "iss": "https://auth.yourdomain.com",
  "sub": "user_id_123",
  "aud": "ua_abc123",
  "exp": 1735084800,
  "iat": 1734998400,
  "nonce": "random_nonce_string",
  "auth_time": 1734998395,
  "email": "user@example.com",
  "email_verified": true,
  "name": "John Doe",
  "picture": "https://example.com/avatar.jpg"
}
```

### Validation Steps

1. **Verify signature** - Check JWT signature using the JWKS public key (fetch from `/.well-known/jwks.json`)
2. **Verify issuer** - `iss` must match your IdP
3. **Verify audience** - `aud` must match your `client_id`
4. **Verify expiration** - `exp` must be in the future
5. **Verify nonce** - Must match the nonce you sent

---

## UserInfo Endpoint

Get additional user information using the access token:

```
GET /api/v1/oauth2/userinfo
Authorization: Bearer ACCESS_TOKEN
```

**Response:**
```json
{
  "sub": "user_id_123",
  "email": "user@example.com",
  "email_verified": true,
  "phone_number": "+1234567890",
  "phone_verified": true,
  "name": "John Doe",
  "picture": "https://example.com/avatar.jpg",
  "updated_at": 1734998400
}
```

---

## Code Examples

### Node.js (with passport)

```javascript
import passport from 'passport';
import { Strategy as OpenIDStrategy } from 'passport-openidconnect';

passport.use(new OpenIDStrategy({
    issuer: 'https://auth.yourdomain.com',
    authorizationURL: 'https://auth.yourdomain.com/oauth2/authorize',
    tokenURL: 'https://auth.yourdomain.com/api/v1/oauth2/token',
    userInfoURL: 'https://auth.yourdomain.com/api/v1/oauth2/userinfo',
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: 'https://myapp.com/callback',
    scope: ['openid', 'profile', 'email']
  },
  (issuer, profile, done) => {
    return done(null, profile);
  }
));

// Routes
app.get('/auth/uniauth', passport.authenticate('openidconnect'));

app.get('/callback', 
  passport.authenticate('openidconnect', { failureRedirect: '/login' }),
  (req, res) => {
    res.redirect('/dashboard');
  }
);
```

### Python (with authlib)

```python
from authlib.integrations.flask_client import OAuth

oauth = OAuth(app)

uniauth = oauth.register(
    'uniauth',
    client_id='ua_abc123',
    client_secret='SECRET',
    server_metadata_url='https://auth.yourdomain.com/.well-known/openid-configuration',
    client_kwargs={'scope': 'openid profile email'}
)

@app.route('/login')
def login():
    redirect_uri = url_for('callback', _external=True)
    return uniauth.authorize_redirect(redirect_uri)

@app.route('/callback')
def callback():
    token = uniauth.authorize_access_token()
    user_info = uniauth.parse_id_token(token)
    
    # Access user info
    print(user_info['email'])
    print(user_info['name'])
    
    return redirect('/dashboard')
```

### cURL

```bash
# 1. Get authorization URL (open in browser)
https://auth.yourdomain.com/oauth2/authorize?client_id=ua_abc123&redirect_uri=...

# 2. Exchange code for tokens
curl -X POST https://auth.yourdomain.com/api/v1/oauth2/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code" \
  -d "code=AUTH_CODE" \
  -d "redirect_uri=https://myapp.com/callback" \
  -d "client_id=ua_abc123" \
  -d "client_secret=SECRET"

# 3. Get user info
curl -H "Authorization: Bearer ACCESS_TOKEN" \
  https://auth.yourdomain.com/api/v1/oauth2/userinfo
```

### Next.js (with NextAuth)

```typescript
import NextAuth from "next-auth"

export const authOptions = {
  providers: [
    {
      id: "uniauth",
      name: "UniAuth",
      type: "oauth",
      wellKnown: "https://auth.yourdomain.com/.well-known/openid-configuration",
      authorization: { params: { scope: "openid profile email" } },
      idToken: true,
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
        }
      },
      clientId: process.env.UNIAUTH_CLIENT_ID,
      clientSecret: process.env.UNIAUTH_CLIENT_SECRET,
    }
  ],
}

export default NextAuth(authOptions)
```

---

## Troubleshooting

### Common Issues

**Issue: "invalid_client" error**
- **Cause**: Incorrect `client_id` or `client_secret`
- **Solution**: Verify credentials in Developer Console

**Issue: "invalid_grant" error**
- **Cause**: Authorization code expired or already used
- **Solution**: Authorization codes are valid for 10 minutes and single-use only

**Issue: "redirect_uri mismatch"**
- **Cause**: Callback URL doesn't match registered URI
- **Solution**: URLs must match exactly (including protocol, domain, port, path)

**Issue: ID Token nonce mismatch**
- **Cause**: Nonce in token doesn't match session nonce
- **Solution**: Store nonce in session and verify after token exchange

**Issue: PKCE required**
- **Cause**: Public clients (SPA, Mobile) must use PKCE
- **Solution**: Generate code verifier and send code challenge

### Debug Tips

1. **Check Discovery Document**: Ensure all endpoints are correct
2. **Validate JWT**: Use [jwt.io](https://jwt.io) to decode tokens
3. **Check Logs**: Review application logs in Developer Console
4. **Test with cURL**: Isolate issues by testing directly with cURL

---

## FAQ

### Do I need to use OIDC?

No. You can use plain OAuth2 if you only need authorization. Use OIDC when you need user authentication and identity information.

### What's the difference between access_token and id_token?

- **access_token**: Used to access APIs (UserInfo, Resource Server)
- **id_token**: Contains user identity claims (authentication proof)

### How do I refresh tokens?

```bash
curl -X POST https://auth.yourdomain.com/api/v1/oauth2/token \
  -d "grant_type=refresh_token" \
  -d "refresh_token=REFRESH_TOKEN" \
  -d "client_id=ua_abc123" \
  -d "client_secret=SECRET"
```

### Can I use PKCE with confidential clients?

Yes, but it's optional. It's required for public clients (SPA, mobile apps).

### How long do tokens last?

- **Access Token**: 1 hour
- **ID Token**: 24 hours
- **Refresh Token**: 30 days (configurable)

### Is logout supported?

Yes. Revoke refresh tokens via the API or use session management in your application.

---

## Security Best Practices

1. **Always use HTTPS** in production
2. **Use strong state and nonce** values (crypto-random)
3. **Validate all tokens** before trusting claims
4. **Store secrets securely** (environment variables, secret managers)
5. **Use PKCE** for all public clients
6. **Implement CSRF protection** with state parameter
7. **Set proper redirect URI** whitelist

---

## Support

- **Documentation**: https://docs.yourdomain.com
- **Developer Console**: https://auth.yourdomain.com/developer
- **API Status**: https://status.yourdomain.com
