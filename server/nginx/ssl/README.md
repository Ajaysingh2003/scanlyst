# Cloudflare Origin SSL Certificates

This directory stores the SSL certificates used by Nginx to encrypt traffic between **Cloudflare Edge** and your **Origin Server**.

## Files
- `origin.crt`: The SSL Certificate (PEM format).
- `origin.key`: The Private Key.

> An initial self-signed fallback certificate has been generated so Nginx can start immediately.

---

## How to use Cloudflare Origin CA (Recommended for "Full (Strict)" SSL)

1. Open the [Cloudflare Dashboard](https://dash.cloudflare.com).
2. Select your domain (`scanlyst.dev`).
3. Navigate to **SSL/TLS** > **Origin Server**.
4. Click **Create Certificate**.
   - Keep default settings (RSA 2048, hostnames: `*.scanlyst.dev`, `scanlyst.dev`).
   - Choose validity (e.g. 15 years).
   - Click **Create**.
5. Copy the **Origin Certificate** contents and paste into `server/nginx/ssl/origin.crt` (replace existing content).
6. Copy the **Private Key** contents and paste into `server/nginx/ssl/origin.key` (replace existing content).
7. In Cloudflare Dashboard, go to **SSL/TLS** > **Overview** and set the encryption mode to **Full (strict)**.
8. Reload Nginx:
   ```bash
   docker compose exec nginx nginx -s reload
   ```
