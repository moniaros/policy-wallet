#!/usr/bin/env bash
# Vercel env setup for the PolicyWallet demo/staging deploy.
#
# 1. Fill in the values below (leave a value empty to SKIP that variable).
# 2. Make sure the repo is linked to the target project:
#      npx vercel link --project policy-wallet --scope moniaros-projects
# 3. Run:  bash scripts/vercel-env-setup.sh
#
# Adds each non-empty var to BOTH production and preview (idempotent: it removes
# then re-adds, so re-running updates values). Do NOT commit this file with real
# secrets filled in.

set -u
TARGETS=(production preview)
VERCEL="npx -y vercel@latest"

set_env() {
  local name="$1" value="$2"
  if [ -z "$value" ]; then
    echo "· skip   $name (empty)"
    return
  fi
  for tgt in "${TARGETS[@]}"; do
    $VERCEL env rm "$name" "$tgt" -y >/dev/null 2>&1 || true
    if printf '%s' "$value" | $VERCEL env add "$name" "$tgt" >/dev/null 2>&1; then
      echo "✓ set    $name ($tgt)"
    else
      echo "✗ FAILED $name ($tgt)"
    fi
  done
}

# ── ALREADY SET by the assistant (AUTH_SECRET, CRON_SECRET, RATELIMIT_ALLOW_LOCAL,
#    AI_ANALYSIS_PARALLELISM, SENTRY_TRACES_SAMPLE_RATE). Leave commented unless
#    you want to rotate them. ──────────────────────────────────────────────────
# set_env "AUTH_SECRET"             "$(openssl rand -base64 32)"
# set_env "CRON_SECRET"             "$(openssl rand -base64 32)"

# ── REQUIRED — build fails without these ───────────────────────────────────────
set_env "NEXT_PUBLIC_SUPABASE_URL"       ""   # https://<project>.supabase.co
set_env "NEXT_PUBLIC_SUPABASE_ANON_KEY"  ""   # Supabase → API → anon public key
set_env "DIRECT_URL"                     ""   # Supabase direct conn (port 5432)
set_env "DATABASE_URL"                   ""   # same as DIRECT_URL is fine

# ── MONEY PATH (Stripe TEST mode) ──────────────────────────────────────────────
set_env "STRIPE_SECRET_KEY"                  ""   # sk_test_...
set_env "STRIPE_WEBHOOK_SECRET"              ""   # whsec_...
set_env "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY" ""   # pk_test_...

# ── AI — set a key, OR leave empty to use the mock provider (zero cost) ────────
set_env "GEMINI_API_KEY"          ""

# ── RECOMMENDED ────────────────────────────────────────────────────────────────
set_env "NEXTAUTH_URL"            ""   # https://policy-wallet.vercel.app
set_env "NEXT_PUBLIC_SENTRY_DSN"  ""   # your Sentry project DSN (optional)

# ── SCALE / PERFORMANCE (before real traffic) ─────────────────────────────────
set_env "POOLED_DATABASE_URL"        ""   # Supavisor pooler, port 6543, ?pgbouncer=true&connection_limit=10
set_env "UPSTASH_REDIS_REST_URL"     ""   # then remove RATELIMIT_ALLOW_LOCAL at scale
set_env "UPSTASH_REDIS_REST_TOKEN"   ""

# ── AI ANALYSIS QUEUE (optional — dormant until all 4 are set) ─────────────────
set_env "QSTASH_TOKEN"               ""
set_env "QSTASH_CURRENT_SIGNING_KEY" ""
set_env "QSTASH_NEXT_SIGNING_KEY"    ""
set_env "QSTASH_CALLBACK_BASE_URL"   ""   # stable URL, e.g. https://policy-wallet.vercel.app

# ── OPTIONAL FEATURES ──────────────────────────────────────────────────────────
set_env "BREVO_API_KEY"                   ""   # transactional email
set_env "SENDER_EMAIL"                    ""   # noreply@yourdomain.com
set_env "HUBSPOT_ACCESS_TOKEN"            ""   # waitlist → CRM
set_env "NEXT_PUBLIC_GA_MEASUREMENT_ID"   ""   # G-XXXXXXXXXX
set_env "AI_INCIDENT_SLACK_WEBHOOK_URL"   ""
set_env "AI_INCIDENT_PAGERDUTY_ROUTING_KEY" ""
set_env "AI_INCIDENT_PAGERDUTY_EVENT_URL" ""   # https://events.pagerduty.com/v2/enqueue
set_env "REVENUECAT_WEBHOOK_AUTH_VALUE"   ""

# ── PRE-REAL-TRAFFIC TOGGLES (leave empty for the demo) ────────────────────────
set_env "ENFORCE_EMAIL_VERIFICATION"  ""   # "1" to require verified email (off for demo)

echo
echo "Done. Review with:  $VERCEL env ls"
echo "Then redeploy:      $VERCEL deploy   (or push a commit / Redeploy in the dashboard)"
