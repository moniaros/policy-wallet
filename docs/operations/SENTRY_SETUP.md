# 🔍 Sentry Setup Guide

**Status**: ✅ Installed and Configured  
**Date**: January 22, 2026

---

## 📦 What Was Installed

### Package
- `@sentry/nextjs` - Official Sentry SDK for Next.js

### Configuration Files Created
1. `instrumentation-client.ts` - Client-side error tracking (Next 16 loads this automatically; the older `sentry.client.config.ts` convention is NOT read and was deleted)
2. `sentry.server.config.ts` - Server-side error tracking
3. `sentry.edge.config.ts` - Edge runtime error tracking
4. `instrumentation.ts` - Server initialization
5. `next.config.ts` - Updated with Sentry integration
6. `.env.example` - Updated with Sentry variables

---

## 🚀 Getting Started

### Step 1: Create a Sentry Account

1. Go to [sentry.io](https://sentry.io)
2. Sign up for a free account
3. Create a new project:
   - Platform: **Next.js**
   - Project name: **PolicyWallet** (or your preferred name)

### Step 2: Get Your DSN

After creating the project, Sentry will show you a **DSN** (Data Source Name). It looks like:
```
https://abc123def456@o123456.ingest.sentry.io/7890123
```

### Step 3: Configure Environment Variables

Add these to your `.env` file:

```env
# Sentry Configuration
NEXT_PUBLIC_SENTRY_DSN="https://your-dsn@sentry.io/project-id"
SENTRY_ORG="your-organization-slug"
SENTRY_PROJECT="your-project-slug"
SENTRY_AUTH_TOKEN="your-auth-token"
```

**Where to find these values:**
- `NEXT_PUBLIC_SENTRY_DSN`: Project Settings → Client Keys (DSN)
- `SENTRY_ORG`: Organization Settings → General Settings → Organization Slug
- `SENTRY_PROJECT`: Project Settings → General Settings → Project Slug
- `SENTRY_AUTH_TOKEN`: User Settings → Auth Tokens → Create New Token
  - Scopes needed: `project:read`, `project:releases`, `org:read`

### Step 4: Test the Integration

#### Development Testing

In development, errors are logged to console but NOT sent to Sentry (to avoid noise).

To test, temporarily comment out this line in `instrumentation-client.ts`:
```typescript
// return null; // Don't send to Sentry in development
```

Then create a test error:

```typescript
// In any component or page
<button onClick={() => {
  throw new Error('Test Sentry Error')
}}>
  Test Error Tracking
</button>
```

Click the button and check your Sentry dashboard!

#### Production Testing

In production, all errors are automatically sent to Sentry.

---

## 📊 What Sentry Tracks

### Automatically Tracked:
- ✅ Unhandled exceptions
- ✅ Promise rejections
- ✅ API route errors
- ✅ Server-side errors
- ✅ Client-side errors
- ✅ Performance metrics (10% sample rate in production)
- ✅ Session replays (10% of sessions, 100% of error sessions)

### Ignored Errors:
- Browser extension errors
- Network errors (can be noisy)
- Aborted requests
- Development environment errors

---

## 🎯 Features Configured

### 1. Error Tracking
All JavaScript errors are automatically captured with:
- Full stack traces
- User context
- Browser information
- Custom tags and context

### 2. Performance Monitoring
Tracks:
- Page load times
- API response times
- Database query performance
- Custom transactions

**Sample Rate**: 
- Development: 100% (for testing)
- Production: 10% (to manage quota)

### 3. Session Replay
Records user sessions when errors occur:
- 10% of all sessions
- 100% of sessions with errors

This helps you see exactly what the user was doing when an error occurred.

### 4. Source Maps
Automatically uploads source maps to Sentry for readable stack traces in production.

### 5. Release Tracking
Automatically tracks releases and associates errors with specific deployments.

---

## 🔧 Advanced Configuration

### Custom Error Tracking

```typescript
import * as Sentry from '@sentry/nextjs'

try {
  // Your code
} catch (error) {
  Sentry.captureException(error, {
    tags: {
      section: 'policy-upload',
      user_role: 'agent'
    },
    extra: {
      policyId: 'pol_123',
      fileName: 'policy.pdf'
    }
  })
}
```

### Custom Events

```typescript
Sentry.captureMessage('Policy uploaded successfully', {
  level: 'info',
  tags: {
    feature: 'policy-management'
  }
})
```

### User Context

```typescript
Sentry.setUser({
  id: user.id,
  email: user.email,
  username: user.name,
  role: user.role
})
```

### Custom Tags

```typescript
Sentry.setTag('page_locale', 'el')
Sentry.setTag('user_plan', 'premium')
```

### Breadcrumbs

```typescript
Sentry.addBreadcrumb({
  category: 'policy',
  message: 'User started policy upload',
  level: 'info'
})
```

---

## 📈 Monitoring Best Practices

### 1. Set Up Alerts

In Sentry dashboard:
1. Go to **Alerts** → **Create Alert**
2. Set up alerts for:
   - New issues
   - Regression (previously resolved issues)
   - High error rate
   - Performance degradation

### 2. Create Teams

Assign different teams to different parts of your app:
- Frontend team → Client-side errors
- Backend team → API errors
- DevOps team → Infrastructure errors

### 3. Use Releases

Tag your deployments:
```bash
# In your CI/CD pipeline
export SENTRY_RELEASE=$(git rev-parse HEAD)
```

This helps you:
- Track which errors came from which deployment
- See if a new release introduced errors
- Automatically resolve issues in new releases

### 4. Set Up Integrations

Connect Sentry with:
- **Slack**: Get notified of critical errors
- **GitHub**: Link errors to commits and PRs
- **Jira**: Create tickets from errors

---

## 🎨 Dashboard Setup

### Recommended Dashboards:

1. **Overview Dashboard**
   - Total errors (last 24h)
   - Error rate trend
   - Most common errors
   - Affected users

2. **Performance Dashboard**
   - Average page load time
   - Slowest transactions
   - Database query performance
   - API endpoint latency

3. **User Impact Dashboard**
   - Users affected by errors
   - Error-free sessions %
   - Session replay highlights

---

## 🔍 Debugging with Sentry

### Reading Stack Traces

Sentry provides:
- **Minified code** → Readable code (via source maps)
- **Line numbers** → Exact location of error
- **Variable values** → State when error occurred
- **User actions** → What user did before error

### Session Replay

1. Go to error in Sentry
2. Click "Replay" tab
3. Watch video of user session
4. See exactly what happened

### Breadcrumbs

Shows user's journey:
```
1. User navigated to /wallet
2. User clicked "Add Policy"
3. User uploaded file "policy.pdf"
4. API call to /api/v1/policies
5. ERROR: File validation failed
```

---

## 💰 Pricing & Quotas

### Free Tier Includes:
- 5,000 errors/month
- 10,000 performance transactions/month
- 50 session replays/month
- 1 user
- 30-day data retention

### Tips to Stay Within Free Tier:

1. **Filter Noise**: Ignore common errors (already configured)
2. **Sample Rate**: Use 10% sampling for performance (already configured)
3. **Development**: Don't send dev errors (already configured)
4. **Rate Limiting**: Set up rate limits in Sentry dashboard

### Upgrade When Needed:
- Team plan: $26/month (5 users)
- Business plan: $80/month (20 users)
- Enterprise: Custom pricing

---

## 🐛 Troubleshooting

### Errors Not Showing in Sentry?

1. **Check DSN**: Ensure `NEXT_PUBLIC_SENTRY_DSN` is set correctly
2. **Check Environment**: Development errors are not sent by default
3. **Check Network**: Ensure Sentry CDN is not blocked
4. **Check Console**: Look for Sentry initialization errors

### Source Maps Not Working?

1. **Check Auth Token**: Ensure `SENTRY_AUTH_TOKEN` has correct permissions
2. **Check Build**: Source maps are uploaded during build
3. **Check Release**: Ensure release name matches

### Too Many Errors?

1. **Add Filters**: Update `ignoreErrors` in `instrumentation-client.ts`
2. **Reduce Sample Rate**: Lower `tracesSampleRate`
3. **Set Up Rate Limiting**: In Sentry dashboard

---

## 📚 Resources

### Documentation:
- [Sentry Next.js Docs](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Sentry Performance](https://docs.sentry.io/product/performance/)
- [Session Replay](https://docs.sentry.io/product/session-replay/)

### Tutorials:
- [Getting Started with Sentry](https://docs.sentry.io/product/sentry-basics/)
- [Error Tracking Best Practices](https://blog.sentry.io/error-monitoring-best-practices/)

### Community:
- [Sentry Discord](https://discord.gg/sentry)
- [Sentry Forum](https://forum.sentry.io/)

---

## ✅ Verification Checklist

After setup, verify:

- [ ] Sentry account created
- [ ] Project created in Sentry
- [ ] DSN added to `.env`
- [ ] Organization and project slugs added
- [ ] Auth token created and added
- [ ] Test error sent successfully
- [ ] Error appears in Sentry dashboard
- [ ] Source maps are readable
- [ ] Alerts configured
- [ ] Team members invited (if applicable)

---

## 🎉 You're All Set!

Sentry is now monitoring your PolicyWallet application for:
- ✅ Errors and exceptions
- ✅ Performance issues
- ✅ User sessions
- ✅ Release tracking

**Next Steps:**
1. Create your Sentry account
2. Add environment variables
3. Deploy to production
4. Monitor your dashboard!

---

**Questions?** Check the [Sentry Documentation](https://docs.sentry.io/) or ask in their Discord!
