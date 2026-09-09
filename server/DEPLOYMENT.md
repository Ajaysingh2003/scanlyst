# Scanlyst Production Deployment Guide (`api.scanlyst.dev`)

This guide covers deploying the Scanlyst FastAPI backend and Nginx reverse proxy in production behind **Cloudflare**.

---

## 1. Architecture Overview

```
[ Visitor / Client ]
         │
         ▼ (HTTPS)
[ Cloudflare Edge Network ]
  - Edge SSL/TLS Termination
  - DDoS Protection & WAF
  - Real Client IP forwarded via `CF-Connecting-IP`
         │
         ▼ (HTTPS / Port 443 with Origin CA or HTTP / Port 80)
[ VPS / Server: Nginx Reverse Proxy ]
  - Listens on 80 & 443
  - Restores real visitor IP from Cloudflare IP ranges
  - SSL Termination using Cloudflare Origin CA certificate
  - 50MB request limit & 300s timeout for long scans
  - WebSocket & SSE support
         │
         ▼ (Internal Docker Network `fastapi_backend:8000`)
[ FastAPI API Container (`api:8000`) ]
  - Multi-worker Uvicorn (`--workers 4`)
  - No public port exposure (internal only)
  - Rate limiting using real client IP
```

---

## 2. Cloudflare Setup

### Step 1: DNS Configuration
1. Log in to your [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. Select your domain `scanlyst.dev` and go to **DNS** -> **Records**.
3. Add an `A` record:
   - **Type**: `A`
   - **Name**: `api` (resolves to `api.scanlyst.dev`)
   - **IPv4 address**: `<YOUR_SERVER_PUBLIC_IP>`
   - **Proxy status**: **Proxied (Orange cloud ON)**
   - **TTL**: Auto

### Step 2: SSL/TLS Mode
1. Go to **SSL/TLS** -> **Overview**.
2. Set the encryption mode to **Full (strict)** (or **Full**).

### Step 3: Cloudflare Origin CA Certificate
Cloudflare provides free certificates signed by Cloudflare for your origin server valid for up to 15 years:
1. Go to **SSL/TLS** -> **Origin Server**.
2. Click **Create Certificate**.
3. Keep default settings:
   - Private key type: **RSA (2048)**
   - Hostnames: `*.scanlyst.dev`, `scanlyst.dev`
   - Certificate Validity: **15 years**
4. Click **Create**.
5. Save the generated files to the server:
   - Copy **Origin Certificate** content and overwrite `server/nginx/ssl/origin.crt`.
   - Copy **Private Key** content and overwrite `server/nginx/ssl/origin.key`.
   - Restrict permissions:
     ```bash
     chmod 600 server/nginx/ssl/origin.key
     chmod 644 server/nginx/ssl/origin.crt
     ```

> **Note**: A fallback self-signed certificate is already included in `server/nginx/ssl/` so Nginx boots immediately even before adding your Cloudflare Origin CA certificate.

---

## 3. Server Environment Setup

Create or update your `server/.env` file. A complete reference template is available at `server/.env.example`.

Key production variables:

```ini
# Domain & Proxy
TRUST_PROXY_HEADERS=true
AUTH_FRONTEND_URL=https://scanlyst.dev

# Database & Cache (Docker service names)
DATABASE_URL=postgresql+asyncpg://Scanlyst:Scanlyst@db:5432/Scanlyst
REDIS_URL=redis://redis:6379/0

# Security (must be >= 32 random characters)
AUTH_JWT_SECRET=your_super_secret_production_key_32_chars_min
API_KEY_ENABLED=true
API_KEYS=your_production_api_key

# OAuth Callbacks (matching api.scanlyst.dev)
GOOGLE_REDIRECT_URI=https://api.scanlyst.dev/api/v1/auth/google/callback
GITHUB_REDIRECT_URI=https://api.scanlyst.dev/api/v1/auth/github/callback

# Payments
DODO_PAYMENTS_ENVIRONMENT=live_mode
DODO_PAYMENTS_SUCCESS_URL=https://scanlyst.dev/billing/success
DODO_PAYMENTS_CANCEL_URL=https://scanlyst.dev/billing/cancel
DODO_PAYMENTS_PORTAL_RETURN_URL=https://scanlyst.dev/dashboard
```

---

## 4. Deploying with Docker Compose

### Start all services in production mode:
```bash
cd server
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

This will:
1. Start PostgreSQL (`db`) and Redis (`redis`) with automated health checks.
2. Run database migrations via Alembic (`migrator`).
3. Start ARQ background worker (`worker`).
4. Start FastAPI (`api`) with 4 Uvicorn workers and `--proxy-headers` (isolated from public WAN).
5. Start Nginx reverse proxy (`nginx`) exposing ports 80 and 443.

### Check service status:
```bash
docker compose ps
```

### View logs:
```bash
# Nginx access and error logs
docker compose logs -f nginx

# FastAPI backend logs
docker compose logs -f api

# Worker logs
docker compose logs -f worker
```

---

## 5. Verification

### Test Health Endpoint:
```bash
# Via public domain (Cloudflare -> Nginx -> FastAPI)
curl -I https://api.scanlyst.dev/health

# Expected response:
# HTTP/2 200
# ...
# {"status":"ok"}
```

### Verify Real Client IP Forwarding:
Check Nginx logs when visiting:
```bash
docker compose logs --tail=20 nginx
```
The client IP logged should be your true public IP, not Cloudflare's edge IP addresses.

---

## 6. Server Firewall (UFW) Recommendations

Only expose ports 22, 80, and 443 to the internet:
```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```
Because port `8000` is internal to the Docker network, direct outside access bypassing Cloudflare and Nginx is blocked.
