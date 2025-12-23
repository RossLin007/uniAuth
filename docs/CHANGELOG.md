# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2025-12-22

### 📱 Multi-Provider SMS Support

- **Twilio Integration**: Added Twilio SMS provider for international numbers
  - Supports 180+ countries with reliable delivery
  - Both standard SMS API and Verify API supported
  - Messaging Service SID support for production
- **Smart Routing**: Automatic provider selection based on phone country code
  - China (+86) → Tencent Cloud SMS (cost-effective)
  - International → Twilio (better coverage)
- **Flexible Configuration**: Choose provider via `SMS_PROVIDER` env variable
  - `auto`: Smart routing based on phone number (recommended)
  - `twilio`: Use Twilio for all SMS
  - `tencent`: Use Tencent for all SMS
- **Graceful Fallback**: Falls back to available provider if primary not configured

### 📧 Email Verification

- **Email Service**: Complete email sending service using nodemailer
  - Beautiful HTML email templates with bilingual support
  - Support for verification codes, password reset, and welcome emails
  - Fallback to console logging in development mode
- **Email Verification Flow**: Full email verification implementation
  - `POST /api/v1/auth/email/send-code` - Send verification code
  - `POST /api/v1/auth/email/verify-code` - Verify code and mark email as verified
  - Rate limiting (60 seconds between sends)
  - 5-minute code expiration with max 5 attempts
- **SMTP Configuration**: Uses existing SMTP settings from environment

### Configuration Changes

New environment variables:
```env
SMS_PROVIDER=auto  # 'auto' | 'twilio' | 'tencent'
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+15551234567
TWILIO_MESSAGING_SERVICE_SID=MGxxxxx  # Optional
TWILIO_VERIFY_SERVICE_SID=VAxxxxx     # Optional

# SMTP (for email verification)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_user
SMTP_PASS=your_password
SMTP_FROM=noreply@example.com
```

---

## [1.1.0] - 2025-12-22

### 🔒 Security Enhancements

- **Client Secret Encryption**: Added bcrypt hashing for OAuth2 client secrets
- **PKCE Support**: Implemented Proof Key for Code Exchange for public clients
- **Verification Code Limits**: Added attempt limits (5 attempts, 15-minute lockout)
- **Rate Limiting**: Implemented Redis-backed rate limiting middleware
  - General API: 100 requests/minute
  - Auth endpoints: 10 requests/minute
  - Send code: 1 request/minute
- **Security Headers**: Added HSTS, CSP, X-Frame-Options, X-Content-Type-Options

### 📊 Observability

- **Structured Logging**: JSON-formatted logs with request ID tracking
- **Prometheus Metrics**: `/metrics` endpoint with HTTP, auth, OAuth2, cache metrics
- **Enhanced Health Checks**:
  - `/health` - Simple liveness check
  - `/health/live` - Kubernetes liveness probe
  - `/health/ready` - Deep dependency check (DB + Redis)
  - `/version` - Version information

### 🚀 High Availability

- **Docker Support**: Multi-stage Dockerfile with optimized production image
- **Redis Integration**: Upstash Redis support for caching and rate limiting
- **Database Resilience**: Added connection timeout and retry logic
- **Graceful Shutdown**: SIGTERM/SIGINT handling with cleanup

### 📦 SDK Improvements

- **Request Retry**: Automatic retry with exponential backoff
- **PKCE Client**: Full PKCE support for OAuth2 flows
- **Email Login**: Added email verification code login
- **Better Error Handling**: Structured error objects with codes

### 📖 Documentation

- **Swagger UI**: Interactive API documentation at `/docs`
- **OpenAPI 3.0**: Full API specification at `/docs/openapi.json`

### 🧪 Testing

- **Unit Tests**: 63 tests covering crypto, rate limiting, logging, metrics, OAuth2
- **Integration Tests**: API endpoint testing with security header validation
- **CI/CD**: GitHub Actions workflow for lint, test, build, security audit

### 🗃️ Database Changes

- Added `code_challenge` and `code_challenge_method` columns to `oauth_authorization_codes`
- Added `client_secret_hash` and `is_public` columns to `applications`
- Created `oauth_scopes`, `ip_blacklist`, `rate_limit_entries` tables
- Enhanced `audit_logs` with `event_category` and `risk_level`

### Breaking Changes

- OAuth2 token endpoint now supports PKCE (public clients MUST use PKCE)
- Client secrets should be migrated to hashed format

### Migration Guide

1. Run database migration `005_security_enhancements.sql`
2. Set up Upstash Redis (optional but recommended)
3. Configure new environment variables:
   - `UPSTASH_REDIS_URL`
   - `UPSTASH_REDIS_TOKEN`
   - `LOG_LEVEL`
   - `RATE_LIMIT_ENABLED`
4. Migrate existing client secrets to hashed format

---

## [1.0.0] - 2025-12-21

### Initial Release

- Phone verification code login
- Email/password login
- JWT token management with rotation
- OAuth2 Provider functionality
- Multi-device session management
- Audit logging
- TypeScript SDK (client & server)
- i18n support (Chinese & English)
- Responsive UI components
