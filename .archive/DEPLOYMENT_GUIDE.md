# 🚀 Deployment Guide: Subdomains & CRM Integration

This guide walks you through deploying PolicyWallet with the new multi-subdomain architecture (`app`, `agent`, `admin`) and Brevo CRM integration.

## 1. Environment Variables
Ensure these new variables are set in your Vercel Project Settings (and `.env` for local dev):

```env
# --- CORE ---
# Database (Postgres/Prisma)
DATABASE_URL=postgresql://user:password@host:port/db?sslmode=require

# Authentication (NextAuth)
AUTH_SECRET=generate_with_openssl_rand_base64_32
NEXTAUTH_URL=https://app.policywallet.gr  # Base URL for the main app

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# --- INTELLIGENCE ---
# AI / Gemini
GEMINI_API_KEY=AIzaSy...

# --- INTEGRATIONS ---
# Brevo (Email Marketing / CRM)
BREVO_API_KEY=xkeysib-...
SENDER_EMAIL=noreply@policywallet.gr
BREVO_LIST_ID_USERS=2   # ID of the list for policyholders
BREVO_LIST_ID_AGENTS=3  # ID of the list for agents

# Payments (Stripe)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Storage (Optional - Defaults to local /public/uploads)
# STORAGE_BUCKET=your-bucket-name
# GOOGLE_APPLICATION_CREDENTIALS=base64_encoded_json_key

# Throttling / Rate Limiting (Upstash Redis)
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

## 2. Database Setup (Production)
Vercel does not automatically migrate your production database. You must run migrations manually or during the build.

**Option A: Manual Migration (Recommended for first deploy)**
Run this from your local machine, pointing to your production database URL:
```bash
# In your local .env, set DATABASE_URL=postgresql://user:password@prod-host...
npx prisma migrate deploy
```

**Option B: Build Command Override**
In Vercel -> Settings -> General -> Build & Development Settings:
- Build Command: `npx prisma migrate deploy && next build`

## 3. DNS Configuration (Cloudflare)
You need to point all three subdomains to your Vercel deployment.

| Type  | Name    | Value                      | Proxy Status |
| :---  | :---    | :---                       | :---         |
| CNAME | `app`   | `policy-wallet.vercel.app` | Proxied (Orange Cloud) |
| CNAME | `agent` | `policy-wallet.vercel.app` | Proxied (Orange Cloud) |
| CNAME | `admin` | `policy-wallet.vercel.app` | Proxied (Orange Cloud) |

*Replace `policy-wallet.vercel.app` with your actual Vercel project domain.*

## 3. Vercel Domain Configuration
1. Go to your Vercel Project Dashboard -> **Settings** -> **Domains**.
2. Add the following domains:
   - `app.policywallet.gr`
   - `agent.policywallet.gr`
   - `admin.policywallet.gr`

## 4. How It Works
- **Middleware Routing**: The application checks the request hostname.
  - Requests to `app.policywallet.gr` are internally treated as Policyholder traffic.
  - Requests to `agent.policywallet.gr` are routed to the Agent Dashboard.
- **Brevo Sync**: When a user signs up (via Google or Email), the `createUser` event in `auth.ts` triggers.
  - It checks the user's role.
  - It pushes the contact + attributes (Role, Signup Date) to the configured Brevo List ID.

## 5. Testing
1. **DNS Propagation**: Use `nslookup app.policywallet.gr` to verify it points to Vercel.
2. **Access**: Open `https://agent.policywallet.gr`. You should be redirected dynamically to `/dashboard` (after login).
3. **CRM**: Register a new account. Check your Brevo Contacts list to confirm the user appears.
