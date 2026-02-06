# Email Verification Fix - Complete Guide

## Problem Solved
The verification link in emails was pointing to `/auth/verify?email=...` which didn't exist, causing a 404 error.

## Solution Implemented

### 1. Created Verification Page (`/auth/verify`)
**File**: `app/auth/verify/page.tsx`

**Features**:
- Handles Supabase email verification tokens
- Beautiful loading, success, and error states
- Automatic redirect to login after successful verification
- Multilingual support (Greek/English)
- Premium animated UI

**How it works**:
1. User clicks verification link in email
2. Link contains `token_hash` and `type` parameters
3. Page calls `/api/auth/verify` endpoint
4. Supabase verifies the token
5. User sees success message
6. Auto-redirects to login page

### 2. Created Verification API Route
**File**: `app/api/auth/verify/route.ts`

**Purpose**: Server-side endpoint that communicates with Supabase to verify email tokens

**Process**:
```typescript
POST /api/auth/verify
Body: { token_hash, type: 'email' }
Response: { success: true/false, user?, error? }
```

### 3. Updated Registration Flow
**File**: `app/auth/actions.ts`

**Changes**:
- Set `emailRedirectTo` to `/auth/verify` (our custom page)
- Supabase sends verification email with link to our page
- Added branded welcome email via Brevo (informational only)
- Welcome email explains that Supabase will send verification link

**Email Strategy**:
1. **Supabase Email** (automatic): Contains actual verification link
2. **Brevo Email** (custom): Branded welcome message explaining to check for Supabase email

### 4. Updated Middleware
**File**: `middleware.ts`

**Changes**:
- Added `/auth/verify` to public routes
- Added `/auth/signup/confirmation` to public routes
- Users can access these pages without authentication

## Supabase Configuration Required

### Email Templates
You need to configure Supabase email templates in the Supabase Dashboard:

1. Go to **Authentication** → **Email Templates**
2. Select **Confirm signup** template
3. Update the template to match your branding

**Recommended Template**:
```html
<h2>Confirm your signup</h2>
<p>Follow this link to confirm your email:</p>
<p><a href="{{ .ConfirmationURL }}">Confirm your email</a></p>
```

### Email Settings
1. Go to **Authentication** → **Settings**
2. Ensure **Enable email confirmations** is ON
3. Set **Site URL** to your production URL (e.g., `https://app.policywallet.gr`)
4. Add redirect URLs:
   - `https://app.policywallet.gr/auth/verify`
   - `https://agent.policywallet.gr/auth/verify`
   - `http://localhost:3000/auth/verify` (for development)

## User Flow

### Complete Signup Journey
1. User fills signup form → Submits
2. **Server Action** (`registerUser`):
   - Creates Supabase Auth user
   - Creates local DB user record
   - Sends branded welcome email via Brevo
3. User sees **Confirmation Page** (`/auth/signup/confirmation`)
4. User receives **TWO emails**:
   - **Brevo Email**: Branded welcome, explains to check for verification email
   - **Supabase Email**: Contains actual verification link
5. User clicks verification link in Supabase email
6. Redirected to **Verification Page** (`/auth/verify`)
7. Page verifies token via API
8. Success → Auto-redirect to **Login Page** (`/auth/signin`)
9. User logs in → Access granted

## Files Created/Modified

### New Files
✅ `app/auth/verify/page.tsx` - Verification page with beautiful UI  
✅ `app/api/auth/verify/route.ts` - API endpoint for token verification

### Modified Files
✅ `app/auth/actions.ts` - Updated `emailRedirectTo` and email strategy  
✅ `middleware.ts` - Added public routes  

## Testing Checklist

### Local Testing
- [ ] Sign up with new email
- [ ] Check confirmation page appears
- [ ] Check Brevo welcome email received
- [ ] Check Supabase verification email received
- [ ] Click verification link
- [ ] Verify redirect to `/auth/verify`
- [ ] Verify success message appears
- [ ] Verify auto-redirect to login
- [ ] Log in successfully

### Production Testing
- [ ] Test on `app.policywallet.gr`
- [ ] Test on `agent.policywallet.gr`
- [ ] Verify emails from correct domain
- [ ] Check email deliverability
- [ ] Test expired token handling
- [ ] Test already-verified user

## Troubleshooting

### Issue: Verification link still 404
**Solution**: Ensure middleware includes `/auth/verify` in public routes

### Issue: "Invalid verification link"
**Solution**: Check that Supabase redirect URLs are configured correctly

### Issue: Token expired
**Solution**: Supabase tokens expire after 24 hours. User needs to request new verification email

### Issue: Not receiving Supabase email
**Solutions**:
1. Check Supabase email settings are enabled
2. Verify SMTP configuration in Supabase
3. Check spam folder
4. Verify email address is correct

### Issue: Receiving duplicate emails
**Expected**: This is intentional
- Brevo email = Branded welcome
- Supabase email = Verification link

## Environment Variables

Ensure these are set in production:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://lzqvtvjggylcujenlelh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Base URL (for email redirects)
NEXTAUTH_URL=https://app.policywallet.gr

# Brevo (for welcome emails)
BREVO_API_KEY=your_brevo_key
SENDER_EMAIL=noreply@policywallet.gr
```

## Security Considerations

1. **Token Validation**: Supabase handles token generation and validation
2. **Expiry**: Tokens expire after 24 hours
3. **One-time Use**: Tokens can only be used once
4. **HTTPS Only**: Verification links only work over HTTPS in production
5. **Rate Limiting**: Supabase has built-in rate limiting for verification requests

## Future Enhancements

1. **Resend Verification Email**: Add button to resend if not received
2. **Custom Supabase Template**: Fully branded Supabase email template
3. **Email Preference**: Let users choose email language before signup
4. **Verification Status**: Show verification status in user profile
5. **Email Change**: Handle email change verification flow

## Notes

- Supabase automatically sends verification emails
- Our Brevo email is supplementary (welcome message)
- Users MUST click Supabase link to verify
- Verification is required before login
- Unverified users cannot sign in

## Support

If users report issues:
1. Check Supabase Dashboard → Authentication → Users
2. Verify user's email confirmation status
3. Manually confirm email if needed (Admin action)
4. Check email logs in Brevo dashboard
5. Review Supabase email logs
