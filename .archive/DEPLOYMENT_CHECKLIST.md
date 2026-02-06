# 🚀 Production Deployment Checklist

## Pre-Deployment Checks

### 1. Environment Variables
Verify all required environment variables are set in your production environment:

- [ ] `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous key
- [ ] `DATABASE_URL` - PostgreSQL connection string (with pgbouncer)
- [ ] `DIRECT_URL` - Direct PostgreSQL connection string (for migrations)
- [ ] `AUTH_SECRET` - Random secret for session encryption (min 32 chars)
- [ ] `NEXTAUTH_URL` - Your production URL (e.g., https://app.policywallet.gr)
- [ ] `NODE_ENV=production`

#### Optional but Recommended:
- [ ] `BREVO_API_KEY` - For transactional emails
- [ ] `SENDER_EMAIL` - Email sender address
- [ ] `GEMINI_API_KEY` - For AI features
- [ ] `STRIPE_SECRET_KEY` - For payments
- [ ] `STRIPE_WEBHOOK_SECRET` - For Stripe webhooks
- [ ] `UPSTASH_REDIS_REST_URL` - For rate limiting
- [ ] `UPSTASH_REDIS_REST_TOKEN` - Redis authentication

### 2. Database Setup
- [ ] Run Prisma migrations: `npx prisma migrate deploy`
- [ ] Verify database connection works
- [ ] Check that all tables are created
- [ ] Seed initial data if needed: `npm run seed`

### 3. Supabase Configuration
- [ ] Email authentication is enabled in Supabase dashboard
- [ ] Redirect URLs are configured:
  - [ ] `https://your-domain.com/auth/callback`
  - [ ] `https://your-domain.com/auth/handover`
  - [ ] `http://localhost:3000/auth/callback` (for local testing)
- [ ] Email templates are configured (optional)
- [ ] RLS policies are set up if using Supabase storage:
  ```sql
  -- Run this in Supabase SQL Editor if uploads fail
  INSERT INTO storage.buckets (id, name, public) VALUES ('policies', 'policies', true) ON CONFLICT (id) DO NOTHING;
  CREATE POLICY "Allow authenticated uploads" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'policies');
  CREATE POLICY "Allow authenticated reads" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'policies');
  ```

### 4. Code Quality
- [ ] All TypeScript errors resolved: `npm run type-check`
- [ ] Build succeeds: `npm run build`
- [ ] No critical lint errors: `npm run lint`
- [ ] All tests pass (if you have tests): `npm test`

### 5. Security Review
- [ ] All API routes have authentication checks
- [ ] Sensitive data is not exposed in client components
- [ ] CORS is properly configured
- [ ] Rate limiting is enabled (Upstash Redis)
- [ ] CSP headers are configured in `next.config.ts`

## Deployment Steps

### Step 1: Commit and Push Changes
```bash
git add .
git commit -m "Fix: Resolve redirect loop by migrating to Supabase auth"
git push origin main
```

### Step 2: Deploy to Production
Choose your deployment platform:

#### Vercel
```bash
vercel --prod
```
Or push to your connected Git repository

#### Other Platforms
Follow your platform's deployment process

### Step 3: Run Database Migrations
```bash
# If using Vercel or similar
npx prisma migrate deploy

# Or connect to production database and run
DATABASE_URL="your_production_db_url" npx prisma migrate deploy
```

### Step 4: Verify Deployment
- [ ] Application loads without errors
- [ ] Health check endpoint works (if you have one)
- [ ] Static assets load correctly

## Post-Deployment Testing

### Authentication Flow
- [ ] Can access signup page: `/auth/signup`
- [ ] Can create new account
- [ ] Receive verification email (if email verification enabled)
- [ ] Can sign in: `/auth/signin`
- [ ] Session persists after page refresh
- [ ] Can sign out successfully

### Protected Routes
- [ ] `/wallet` loads without redirect loop ✨ (PRIMARY FIX)
- [ ] `/dashboard` loads for agents
- [ ] `/customers` loads for agents
- [ ] `/opportunities` loads for agents
- [ ] `/account` loads for all users
- [ ] `/tasks` loads correctly
- [ ] `/notifications` loads correctly

### API Endpoints
Test critical API routes:
- [ ] `GET /api/v1/me` - Returns current user
- [ ] `GET /api/v1/policies` - Returns user policies
- [ ] `POST /api/v1/policies` - Can create policy
- [ ] `GET /api/v1/notifications` - Returns notifications

### User Experience
- [ ] Navigation works smoothly
- [ ] User avatar/name displays correctly
- [ ] Role-based navigation shows correct items
- [ ] Forms submit successfully
- [ ] Error messages display properly
- [ ] Loading states work correctly

## Rollback Plan

If issues occur:

### Quick Rollback
```bash
# Revert to previous deployment
vercel rollback  # or your platform's rollback command
```

### Manual Rollback
```bash
# Revert the commit
git revert HEAD
git push origin main
```

## Monitoring

After deployment, monitor:
- [ ] Error logs for authentication issues
- [ ] Server response times
- [ ] Database connection pool usage
- [ ] API error rates
- [ ] User signup/login success rates

### Recommended Tools
- Vercel Analytics (if using Vercel)
- Sentry for error tracking
- LogRocket for session replay
- Supabase dashboard for auth metrics

## Known Issues & Workarounds

### Issue: Users stuck in redirect loop
**Status**: ✅ FIXED in this deployment
**Cause**: Dual authentication systems (NextAuth + Supabase)
**Solution**: Migrated to Supabase-only authentication

### Issue: Email verification not working
**Workaround**: Check `DISABLE_SUPABASE_EMAILS.md` for configuration
**Solution**: Ensure Brevo API key is set and email templates configured

## Success Criteria

Deployment is successful when:
- ✅ No redirect loops on any protected route
- ✅ Users can sign up and sign in
- ✅ All protected pages load correctly
- ✅ API routes return expected data
- ✅ No critical errors in logs
- ✅ Database queries execute successfully

## Post-Deployment Tasks

Within 24 hours:
- [ ] Monitor error logs
- [ ] Check user signup/login metrics
- [ ] Verify email delivery
- [ ] Test on different browsers
- [ ] Test on mobile devices

Within 1 week:
- [ ] Migrate remaining NextAuth files (see REDIRECT_LOOP_FIX.md)
- [ ] Remove NextAuth dependencies completely
- [ ] Update documentation
- [ ] Train team on new auth flow

## Support Contacts

- **Supabase Support**: https://supabase.com/support
- **Vercel Support**: https://vercel.com/support
- **Database Issues**: Check your database provider's support

## Notes

- This deployment fixes the critical redirect loop issue
- Some files still use NextAuth but won't cause redirect loops
- Gradual migration to Supabase is recommended
- Keep this checklist updated with your specific requirements

---

**Last Updated**: 2026-01-12
**Version**: 1.0.0
**Deployment Type**: Critical Bug Fix (Redirect Loop)
