# 🔧 Redirect Loop Fix - Production Authentication Issue

## Problem Summary

You were experiencing a **redirect loop** on production when accessing `/wallet` because the application was using **two different authentication systems simultaneously**:

1. **Supabase Auth** - Used in `middleware.ts` and some pages
2. **NextAuth** - Used in `(protected)/layout.tsx` and many API routes

### Why it worked on localhost but not production:
On localhost, you were likely logged into both systems. On production, you were only authenticated with Supabase, creating this loop:

```
/wallet → middleware (Supabase ✓) allows access 
       → layout (NextAuth ✗) redirects to /auth/signin 
       → middleware sees Supabase auth, redirects back to /wallet 
       → INFINITE LOOP
```

## Solution Implemented

We've **standardized on Supabase Auth** for the protected routes by:

1. ✅ Created a centralized auth helper (`lib/auth-helpers.ts`)
2. ✅ Updated `(protected)/layout.tsx` to use Supabase instead of NextAuth
3. ✅ Updated `(protected)/wallet/page.tsx` to use the new helper

## Files Changed

### New File
- `lib/auth-helpers.ts` - Centralized Supabase authentication helpers

### Modified Files
- `app/(protected)/layout.tsx` - Now uses Supabase auth
- `app/(protected)/wallet/page.tsx` - Now uses the auth helper

## ⚠️ Important: Remaining Work

There are still **many files using NextAuth** that need to be migrated to Supabase:

### API Routes (27 files)
- `app/api/v1/wallet/[id]/pass/route.ts`
- `app/api/v1/questionnaires/**/*.ts`
- `app/api/v1/policies/**/*.ts`
- `app/api/v1/notifications/**/*.ts`
- `app/api/v1/me/**/*.ts`
- `app/api/v1/auth/logout/route.ts`
- And more...

### Protected Pages (10+ files)
- `app/(protected)/dashboard/page.tsx`
- `app/(protected)/opportunities/page.tsx`
- `app/(protected)/customers/page.tsx`
- `app/(protected)/notifications/page.tsx`
- `app/(protected)/coverage-insights/page.tsx`
- And more...

### Server Actions (6+ files)
- `app/(protected)/wallet/actions.ts`
- `app/(protected)/tasks/actions.ts`
- `app/(protected)/agent/actions.ts`
- `app/(protected)/coverage-insights/actions.ts`
- `app/(protected)/notifications/actions.ts`
- `app/(protected)/account/actions.ts`

## Migration Strategy

### For Server Components (Pages)
Replace:
```typescript
import { auth } from "@/auth"

const session = await auth()
if (!session?.user) {
    redirect("/auth/signin")
}
const userId = session.user.id
```

With:
```typescript
import { getAuthenticatedUser } from "@/lib/auth-helpers"

const { dbUser } = await getAuthenticatedUser()
const userId = dbUser.id
```

### For API Routes
Replace:
```typescript
import { auth } from "@/auth"

const session = await auth()
if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}
```

With:
```typescript
import { getAuthenticatedUserOrNull } from "@/lib/auth-helpers"

const authResult = await getAuthenticatedUserOrNull()
if (!authResult) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}
const { dbUser } = authResult
```

### For Server Actions
Replace:
```typescript
import { auth } from "@/auth"

const session = await auth()
if (!session?.user) {
    throw new Error("Unauthorized")
}
```

With:
```typescript
import { getAuthenticatedUser } from "@/lib/auth-helpers"

const { dbUser } = await getAuthenticatedUser()
```

## Testing Checklist

After deploying to production:

- [ ] Can log in successfully
- [ ] Can access `/wallet` without redirect loop
- [ ] Can access other protected routes
- [ ] API routes return proper authentication errors
- [ ] User data displays correctly in the UI
- [ ] Logout works properly

## Environment Variables

Ensure these are set in production:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
DATABASE_URL=your_database_url
AUTH_SECRET=your_auth_secret
```

## Next Steps

1. **Deploy the current fix** - This will resolve the redirect loop for `/wallet`
2. **Test in production** - Verify the wallet page loads correctly
3. **Migrate remaining files** - Gradually update other routes to use Supabase auth
4. **Remove NextAuth** - Once all files are migrated, remove NextAuth dependencies

## Notes

- The middleware already uses Supabase, so no changes needed there
- The auth helper functions handle both redirect and non-redirect scenarios
- Database user lookup ensures consistency between Supabase and your database
