# Release Checklist

发布检查清单 / Pre-release Verification Checklist

---

## 🔐 Security

- [ ] All dependencies audited (`pnpm audit`)
- [ ] No critical or high vulnerabilities
- [ ] Security headers configured (HSTS, CSP, X-Frame-Options)
- [ ] Rate limiting enabled and tested
- [ ] Client secrets are hashed (not plaintext)
- [ ] PKCE is working for public clients
- [ ] Verification code attempt limits working
- [ ] No hardcoded secrets in codebase
- [ ] .env files are in .gitignore

## 🧪 Testing

- [ ] All unit tests passing (`pnpm test`)
- [ ] All integration tests passing
- [ ] Test coverage >= 60%
- [ ] Manual testing of critical flows:
  - [ ] Phone login flow
  - [ ] Email login flow
  - [ ] Token refresh flow
  - [ ] OAuth2 authorization flow
  - [ ] PKCE flow

## 📊 Observability

- [ ] Structured logging working
- [ ] Request ID tracking working
- [ ] Health endpoints responding:
  - [ ] `/health` returns 200
  - [ ] `/health/ready` returns 200 (with DB connected)
  - [ ] `/metrics` returns Prometheus format
- [ ] Error tracking configured (Sentry DSN set)

## 🚀 Deployment

- [ ] Docker image builds successfully
- [ ] Docker health check passes
- [ ] Environment variables documented
- [ ] Required env vars set:
  - [ ] `JWT_SECRET` (32+ chars)
  - [ ] `SUPABASE_URL`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY`
  - [ ] SMS provider credentials
  - [ ] `UPSTASH_REDIS_URL` (optional)
  - [ ] `UPSTASH_REDIS_TOKEN` (optional)
- [ ] Database migrations applied
- [ ] Redis connection verified (if enabled)

## 📖 Documentation

- [ ] README updated
- [ ] CHANGELOG updated
- [ ] API docs accessible at `/docs`
- [ ] Developer guide updated
- [ ] Architecture docs updated
- [ ] SDK README updated

## 🔄 CI/CD

- [ ] GitHub Actions workflow passing
- [ ] Docker build in CI passing
- [ ] Automated tests in CI passing
- [ ] Security audit in CI passing

## 📦 Packages

- [ ] Server build successful (`pnpm build`)
- [ ] Client SDK build successful
- [ ] Server SDK build successful
- [ ] Type definitions generated
- [ ] No TypeScript errors

## 🔙 Rollback Plan

- [ ] Previous version docker image tagged
- [ ] Database rollback script ready (if needed)
- [ ] Monitoring alerts configured
- [ ] Incident response process documented

---

## Pre-deploy Commands

```bash
# 1. Run all tests
pnpm test

# 2. Run security audit
node scripts/security-audit.mjs

# 3. Build all packages
pnpm build

# 4. Build Docker image
docker build -t uniauth:latest .

# 5. Test Docker image locally
docker run --rm -p 3000:3000 --env-file .env uniauth:latest

# 6. Verify health
curl http://localhost:3000/health

# 7. Tag release
git tag v1.1.0
git push origin v1.1.0
```

---

## Post-deploy Verification

```bash
# 1. Health check
curl https://your-domain.com/health

# 2. Ready check
curl https://your-domain.com/health/ready

# 3. Version check
curl https://your-domain.com/version

# 4. API docs
open https://your-domain.com/docs

# 5. Test login flow
# (manual or automated E2E test)

# 6. Check logs for errors
# (in your logging platform)

# 7. Check metrics
curl https://your-domain.com/metrics
```

---

## Sign-off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Developer | | | |
| Reviewer | | | |
| QA | | | |
| DevOps | | | |

---

*Checklist version: 1.1.0*
*Last updated: 2025-12-22*
