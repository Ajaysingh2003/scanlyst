# Scanlyst Backend

Scanlyst is an async FastAPI service for read-only website security, SEO/AEO,
performance, accessibility, compliance, domain, monitoring, and operational
scans. It provides user accounts, project ownership, project API keys, Dodo Payments
plans, asynchronous ARQ workers, signed webhooks, report exports, and public
status/report links.

This document is the backend handoff: it explains the system, API surface,
security model, and the normal request-to-result workflow.

## 1. Architecture

```text
Client / dashboard / API consumer
              |
              v
       FastAPI API (:8000)
        |       |       |
      Auth   PostgreSQL  Redis
        |               |
        +--------> ARQ worker
                         |
                    Scanner suite
```

- **FastAPI** exposes versioned REST endpoints under `/api/v1`.
- **PostgreSQL** stores users, projects, API keys, scans, findings, scanner
  progress, billing state, uptime samples, incidents, reports, and integrations.
- **Redis** provides rate-limit counters and the ARQ job queue.
- **ARQ worker** executes scans, scheduled scans, uptime checks, and browser-based
  active tests outside the API process.
- **Alembic** manages database migrations.
- **Playwright** is used only by explicitly authorized active XSS, authentication,
  and tenant-isolation jobs; normal scans remain passive.

The API is intentionally read-only against target websites. It does not modify
target databases, deploy code, submit arbitrary business data, or perform DDoS
flooding.

## 2. Local setup

### Requirements

- Docker Desktop and Docker Compose
- A configured `AUTH_JWT_SECRET` with at least 32 random characters
- PostgreSQL and Redis, provided by Compose by default

Start the complete stack:

```bash
cp .env.example .env
# Set AUTH_JWT_SECRET and any provider values required for testing.
docker compose up --build
```

Services:

| Service | Purpose | Default |
|---|---|---|
| `api` | FastAPI and OpenAPI | `http://localhost:8000` |
| `worker` | ARQ scan/monitoring jobs | internal |
| `migrator` | Alembic migrations | one-shot |
| `db` | PostgreSQL 16 | `localhost:5432` |
| `redis` | Redis 7 | `localhost:6379` |

Run a migration manually:

```bash
docker compose up -d db redis
docker compose run --rm migrator alembic upgrade head
```

Useful URLs:

- Health: `GET http://localhost:8000/health`
- OpenAPI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## 3. Configuration

Settings are loaded from environment variables and `.env` through
`app/core/config.py`. Important values:

```env
APP_NAME=Scanlyst
DATABASE_URL=postgresql+asyncpg://Scanlyst:Scanlyst@db:5432/Scanlyst
REDIS_URL=redis://redis:6379/0
AUTH_JWT_SECRET=replace-with-32-plus-random-characters
AUTH_ACCESS_TOKEN_MINUTES=15
AUTH_REFRESH_TOKEN_DAYS=30
AUTH_EMAIL_VERIFICATION_REQUIRED=true
AUTH_FRONTEND_URL=http://localhost:3000

API_KEY_ENABLED=true
API_KEYS=
RATE_LIMIT_ENABLED=true
RATE_LIMIT_REQUESTS=60
RATE_LIMIT_WINDOW_SECONDS=60
TRUST_PROXY_HEADERS=false

SCANNER_TIMEOUT_SECONDS=25
SCANNER_CONCURRENCY=8
USER_AGENT=Scanlyst/1.0 (+https://your-domain.example)
```

Optional providers:

```env
# Email
SMTP_HOST=
SMTP_PORT=587
SMTP_USERNAME=
SMTP_PASSWORD=
SMTP_FROM=

# OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:8000/api/v1/auth/google/callback
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_REDIRECT_URI=http://localhost:8000/api/v1/auth/github/callback

# Encrypted integration secrets
SUPABASE_ENCRYPTION_KEY=

# Dodo Payments
DODO_PAYMENTS_API_KEY=
DODO_PAYMENTS_WEBHOOK_SECRET=
DODO_PAYMENTS_ENVIRONMENT=test_mode
DODO_PAYMENTS_API_URL=
DODO_PRODUCT_STARTER_MONTHLY=
DODO_PRODUCT_STARTER_QUARTERLY=
DODO_PRODUCT_STARTER_ANNUAL=
DODO_PRODUCT_PRO_MONTHLY=
DODO_PRODUCT_PRO_QUARTERLY=
DODO_PRODUCT_PRO_ANNUAL=
DODO_PRODUCT_MAX_MONTHLY=
DODO_PRODUCT_MAX_QUARTERLY=
DODO_PRODUCT_MAX_ANNUAL=
DODO_PAYMENTS_SUCCESS_URL=http://localhost:7000/billing/success
DODO_PAYMENTS_CANCEL_URL=http://localhost:7000/billing/cancel
DODO_PAYMENTS_PORTAL_RETURN_URL=http://localhost:7000/dashboard

# Automated data retention (days)
RETENTION_ENABLED=true
RETENTION_SCAN_DAYS=365
RETENTION_AUTH_DAYS=30
RETENTION_PAYMENT_WEBHOOK_DAYS=180
RETENTION_MONITORING_DAYS=90
RETENTION_DISABLED_INTEGRATION_DAYS=30
```

Never commit `.env`, JWT secrets, Dodo Payments secrets, OAuth secrets, API keys, or
integration credentials. The API refuses to start when `AUTH_JWT_SECRET` is too
short.

The worker runs retention cleanup daily at 03:17 UTC. Completed and failed scans
include their findings, evidence, encrypted authenticated-scan options, and public
report links through database cascades. Active provider and Supabase connections
are retained until the user disconnects or deletes the project; secrets belonging
to disabled webhook/monitoring integrations are removed after the configured
grace period.

## 4. Authentication and credentials

There are two credential types:

1. **User session credentials**: short-lived access token plus rotating refresh
   token. Used by the dashboard and account/project routes.
2. **Project API keys**: long-lived integration credentials scoped to one project.
   The raw secret is returned only at creation time; only a hash is stored.

Send a user access token as:

```http
Authorization: Bearer <access_token>
```

Send an API key as either:

```http
x-api-key: <api_key>
Authorization: Bearer <api_key>
```

The API key middleware identifies the user/project owner and prevents a project
key from reading or creating scans for another project. Rate limiting uses the
API key or client IP and returns rate-limit headers.

### Account workflow

1. Register with `POST /api/v1/auth/register`.
2. Verify email with `POST /api/v1/auth/verify-email` when verification is enabled.
3. Login with `POST /api/v1/auth/login`.
4. Store the returned access/refresh tokens securely.
5. Refresh with `POST /api/v1/auth/refresh` before access expiry.
6. Call `GET /api/v1/auth/me` to identify the current user.
7. Logout with `POST /api/v1/auth/logout`.

For local testing only, set `AUTH_EMAIL_VERIFICATION_REQUIRED=false`.

### Auth endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/v1/auth/register` | Create email/password account |
| `POST` | `/api/v1/auth/verify-email` | Verify email token |
| `POST` | `/api/v1/auth/resend-verification` | Resend verification |
| `POST` | `/api/v1/auth/login` | Issue access/refresh tokens |
| `POST` | `/api/v1/auth/refresh` | Rotate refresh session |
| `POST` | `/api/v1/auth/logout` | Revoke refresh session |
| `POST` | `/api/v1/auth/forgot-password` | Start password reset |
| `POST` | `/api/v1/auth/reset-password` | Set a new password |
| `GET` | `/api/v1/auth/me` | Current user |
| `GET` | `/api/v1/auth/google` | Start Google OAuth |
| `GET` | `/api/v1/auth/google/callback` | Google callback |
| `GET` | `/api/v1/auth/github` | Start GitHub OAuth |
| `GET` | `/api/v1/auth/github/callback` | GitHub callback |
| `POST` | `/api/v1/auth/api-keys` | Create personal API key |
| `GET` | `/api/v1/auth/api-keys` | List personal keys |
| `DELETE` | `/api/v1/auth/api-keys/{key_id}` | Revoke personal key |

The same auth routes are also mounted under `/api` without `/v1`.

## 5. Projects and project ownership

One user can own multiple projects. A project stores:

- `name` and generated `slug`
- `website_url`
- scan profile and notification settings
- one recurring schedule configuration
- project API keys
- optional Supabase connection

Project routes require a user access token:

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/v1/projects` | Create project |
| `GET` | `/api/v1/projects` | List owned projects |
| `GET` | `/api/v1/projects/{project_id}` | Read project |
| `PATCH` | `/api/v1/projects/{project_id}` | Update URLs/settings/schedule |
| `DELETE` | `/api/v1/projects/{project_id}` | Delete project |
| `GET` | `/api/v1/projects/{project_id}/overview` | Dashboard overview |
| `POST` | `/api/v1/projects/{project_id}/api-keys` | Create scoped key |
| `GET` | `/api/v1/projects/{project_id}/api-keys` | List scoped keys |
| `DELETE` | `/api/v1/projects/{project_id}/api-keys/{key_id}` | Revoke scoped key |

Example project-backed scan request:

```bash
curl -X POST http://localhost:8000/api/v1/scans \
  -H 'Authorization: Bearer <user-token-or-project-key>' \
  -H 'Content-Type: application/json' \
  -d '{"project_id":"PROJECT_UUID","environment":"staging"}'
```

When a project API key is used, the project is derived from the key and cannot
be overridden to another project.

## 6. Normal scan lifecycle

Normal scans are asynchronous:

1. Client submits `POST /api/v1/scans` with `url` or `project_id`.
2. API authenticates ownership and reserves a plan scan slot.
3. API creates a `queued` scan, progress record, and scanner-run records.
4. API enqueues `run_scan` in Redis and returns `202 Accepted`.
5. Worker changes the scan to `running` and executes scanners concurrently.
6. Each scanner-run records `running`, `completed`, or `failed` independently.
7. Findings are deduplicated, scored, persisted, and the scan becomes
   `completed` or `failed`.
8. Client polls `GET /api/v1/scans/{scan_id}` or listens on the scan websocket.

Scan endpoints:

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/v1/scans` | Queue normal scan |
| `GET` | `/api/v1/scans` | List accessible scans |
| `GET` | `/api/v1/scans/{scan_id}` | Scan status, progress, report, findings |
| `GET` | `/api/v1/scans/{scan_id}/findings` | Findings, optionally by severity |
| `WS` | `/api/v1/scans/{scan_id}/events` | Progress events |
| `GET` | `/api/v1/scans/projects/{project_id}/scan-history` | Compact project history |
| `GET` | `/api/v1/scans/{scan_id}/diff` | New/fixed/unchanged comparison |
| `GET` | `/api/v1/scans/{scan_id}/export` | Markdown/PDF export |
| `POST` | `/api/v1/scans/{scan_id}/share` | Create public report link |
| `DELETE` | `/api/v1/scans/{scan_id}/share/{link_id}` | Revoke share link |

The response contains `status`, `overall_score`, `progress`, `scanner_runs`,
`findings`, and a computed `report` with risk level, severity counts, category
scores, prioritized findings, and remediation prompts.

The default scanner registry covers security headers, TLS/HSTS, API key
exposure, CORS, SPF/DMARC/DKIM, cookies, debug endpoints, XSS surface, SRI,
mixed content, redirects, JWT, GraphQL, CSRF, CVE signals, IDOR signals, SEO,
AEO, performance, accessibility, file upload, compliance, exposed artifacts,
browser storage, input validation, and domain watchtower. Supabase is appended
only when the project has a Supabase connection.

## 7. Separate active security scans

Active testing never runs as part of a normal scan. Every active request requires
explicit `authorized: true`, should target a system the caller controls, and is
queued through the worker.

| Method | Endpoint | Test |
|---|---|---|
| `POST` | `/api/v1/projects/{project_id}/security-scans/sql-injection` | SQLi probes |
| `POST` | `/api/v1/projects/{project_id}/security-scans/xss` | Playwright XSS |
| `POST` | `/api/v1/projects/{project_id}/security-scans/authentication` | Login/signup/reset/rate-limit flow |
| `POST` | `/api/v1/scans/security/{scan_type}` | Integration-based checks |

Supported extended types are `github_sast`, `dependencies`, `firebase`,
`tenant_isolation`, `audit_logging`, `ddos_resilience`, `mobile_api`, and
`hosting_security`.

Repository checks require a repository URL and may accept a scoped GitHub token.
Firebase/provider checks require their corresponding credentials. Tenant
isolation requires two distinct authorized test actors. DDoS is passive and does
not flood targets. Secrets are encrypted temporarily and removed from response
metadata.

Authentication-flow testing supports email, phone, username, or generic
identifier fields, OTP callbacks, Playwright steps, and a bounded brute-force
probe. The probe stops on rate-limit, CAPTCHA, lockout, or challenge signals and
never uses a real user account.

OTP routes:

- `GET /api/v1/otp-sessions/{session_id}`
- `POST /api/v1/otp-sessions/{session_id}/submit`

## 8. Robots crawl and URL-only checks

Robots crawl is a separate read-only endpoint:

- `POST /api/v1/scans/robots-crawl` with `{"url":"https://example.com"}`
- `GET /api/v1/scans/robots-crawl?url=https://example.com`

It fetches `robots.txt`, parses policy with a parser library, uses sitemap URLs
when available, otherwise performs a same-domain depth-two crawl capped at 50
HTML pages. It uses bounded concurrency and per-page timeouts. Missing policy,
blocked pages, and robots/meta conflicts are returned in the normal finding shape.

## 9. Supabase connection and scanner

One Supabase connection is allowed per project:

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/v1/projects/{project_id}/supabase` | Connect |
| `PUT` | `/api/v1/projects/{project_id}/supabase` | Replace |
| `GET` | `/api/v1/projects/{project_id}/supabase` | Read safe configuration status |
| `DELETE` | `/api/v1/projects/{project_id}/supabase` | Disconnect |

Store `project_url`, `anon_key`, and optional `service_role_key`. Keys are
encrypted at rest and never returned. The scanner checks frontend bundles for
leaked keys, unsafe anonymous access signals, Auth/Storage signals, and common
RLS/policy exposure patterns. Client credentials cannot prove every database
policy; findings must be confirmed in the Supabase dashboard or SQL editor.

## 10. Paid insights

Pro and Max projects can use competitor benchmarks and ROI insights:

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/v1/projects/{project_id}/benchmarks` | List competitor status/scores |
| `PUT` | `/api/v1/projects/{project_id}/benchmarks` | Save up to three URLs and queue audits |
| `GET` | `/api/v1/projects/{project_id}/roi` | Read ROI profile/calculation |
| `PUT` | `/api/v1/projects/{project_id}/roi` | Save traffic, order value, conversion, LCP inputs |

Starter users receive `402 Payment Required` from these endpoints. Competitor
audits are stored as benchmark scans and excluded from normal project history.
ROI is a directional estimate, not a financial guarantee. The current model
uses LCP delay to estimate conversion loss and multiplies it by monthly sessions,
conversion rate, and average order value.

## 11. Billing and plan enforcement

Dodo Payments is the source of subscription truth. The frontend cannot activate a plan.
Only verified, idempotently processed webhooks update billing state.

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/v1/billing/plans` | Public plan catalog |
| `GET` | `/api/v1/billing/account` | Current plan and usage |
| `POST` | `/api/v1/billing/checkout` | Create Dodo Payments checkout session |
| `POST` | `/api/v1/billing/portal` | Create Dodo Payments customer portal session |
| `POST` | `/api/v1/billing/webhook` | Receive verified Dodo Payments events |

Current defaults:

| Plan | Projects | Monthly scans | API keys |
|---|---:|---:|---:|
| Starter | 1 | 10 | 1 |
| Pro | 5 | 250 | 5 |
| Max | 25 | Unlimited | 25 |

Limits are checked server-side for project creation, API keys, scans, active
tests, and scheduled jobs. If no active Dodo Payments account exists, the safe default
is Starter.

## 12. Uptime, incidents, and reports

Uptime monitoring is independent of website scans and runs in the worker:

- `POST/GET /api/v1/projects/{project_id}/uptime`
- `GET /api/v1/projects/{project_id}/uptime/checks`
- `GET /api/v1/projects/{project_id}/uptime/incidents`
- `GET /api/v1/public/status/{status_token}`

The worker records response time and status, opens incidents after failures,
resolves them after recovery, and can send signed `uptime.down` and
`uptime.recovered` webhooks.

Reports support Markdown, PDF, JSON public views, expiry, revocation, and
shareable links:

- `GET /api/v1/scans/{scan_id}/export?format=markdown|pdf`
- `POST /api/v1/scans/{scan_id}/share`
- `GET /api/v1/public/reports/{share_token}?format=json|markdown|pdf`
- `DELETE /api/v1/scans/{scan_id}/share/{link_id}`

Public tokens are random, hashed at rest, optionally expiring, and revocable.
White-label branding is restricted to Max.

## 13. Scoring and findings

The strict benchmark applies confidence-weighted penalties:

| Severity | Penalty |
|---|---:|
| Critical | 40 |
| High | 25 |
| Medium | 14 |
| Low | 6 |
| Info | 1 |

Category scores use an exponential penalty curve. The overall score is the
category mean constrained by scanner coverage; a failed scanner costs coverage
points. Findings are deduplicated by scanner/title/evidence fingerprint while
retaining affected paths and instances.

Every finding includes evidence, remediation, confidence, and a provider-neutral
`remediation_prompt` that can be passed to any coding agent. Compliance results
are indicators, not legal certification.

## 14. Response and error conventions

Project and integration endpoints use:

```json
{
  "success": true,
  "message": "Projects retrieved successfully",
  "data": [],
  "meta": {
    "request_id": "uuid",
    "timestamp": "2026-08-25T10:00:00Z",
    "total": 0
  }
}
```

The request ID is also returned as `X-Request-ID`. Errors use FastAPI's detail
shape and appropriate HTTP statuses: `401` unauthenticated, `403` unauthorized,
`404` missing resource, `402` plan restriction, `409` conflict, `422` invalid
input, and `429` rate limit.

## 15. Database and operations

Inspect migration state:

```bash
docker compose run --rm migrator alembic current
docker compose run --rm migrator alembic history
```

Apply migrations:

```bash
docker compose run --rm migrator alembic upgrade head
```

The worker must be running for queued scans, schedules, uptime checks, active
Playwright jobs, and competitor benchmark jobs. If a scan remains `queued`,
check Redis connectivity and worker logs. If the API fails during startup,
verify `AUTH_JWT_SECRET`, `DATABASE_URL`, and `REDIS_URL` first.

The API uses Docker service names (`db`, `redis`) inside Compose. A local
development process outside Compose should use `localhost` values instead.

## 16. Recommended production checklist

- Use a managed PostgreSQL and Redis with backups and TLS.
- Generate unique secrets for JWT, encryption, API keys, OAuth, SMTP, and Dodo Payments.
- Set `TRUST_PROXY_HEADERS=true` only behind a trusted proxy.
- Restrict CORS and `AUTH_FRONTEND_URL` to the deployed frontend.
- Run API and worker as separate horizontally scalable services.
- Keep scanner concurrency and timeout limits bounded.
- Install Playwright Chromium only in worker images that run active browser tests.
- Configure Dodo Payments webhook signature verification and idempotency.
- Rotate API keys and revoke unused credentials.
- Monitor queue depth, failed scanner runs, rate-limit responses, and uptime incidents.
- Review active-test authorization logs before enabling production targets.
