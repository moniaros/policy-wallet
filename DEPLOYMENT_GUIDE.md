# 🚀 Deployment Guide: Subdomains & CRM Integration

This guide walks you through deploying PolicyWallet with the new multi-subdomain architecture (`app`, `agent`, `admin`) and Brevo CRM integration.

## 1. Environment Variables
Ensure these new variables are set in your Vercel Project Settings (and `.env` for local dev):

```env
# Brevo (Email Marketing / CRM)
BREVO_API_KEY=xkeysib-...
SENDER_EMAIL=noreply@policywallet.gr
BREVO_LIST_ID_USERS=2   # ID of the list for policyholders
BREVO_LIST_ID_AGENTS=3  # ID of the list for agents

# Auth Cookie (Must be root domain to share sessions or wildcard)
# AUTH_COOKIE_DOMAIN=.policywallet.gr  # Optional, if you want shared login state
```

## 2. DNS Configuration (Cloudflare)
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
