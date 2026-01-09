# How to Disable Supabase Automatic Emails

## Important Configuration Steps

To ensure users receive ONLY ONE email (your branded Brevo email), you need to disable Supabase's automatic confirmation emails.

### Step 1: Disable Email Confirmations in Supabase

1. Go to **Supabase Dashboard**
2. Navigate to **Authentication** → **Settings**
3. Scroll to **Email Auth**
4. **UNCHECK** "Enable email confirmations"
5. Click **Save**

This will prevent Supabase from sending automatic verification emails.

### Step 2: Verify Email Template Settings

Even though auto-emails are disabled, ensure your templates are configured (for future use or manual triggers):

1. Go to **Authentication** → **Email Templates**
2. Keep the templates configured with your branding (from previous instructions)
3. These won't be used automatically, but good to have ready

### Current Flow

With the updated code:

1. ✅ User signs up
2. ✅ Supabase creates user account (but doesn't send email)
3. ✅ Your code sends ONE branded email via Brevo
4. ✅ Email contains verification button
5. ✅ User clicks button → Verifies → Can login

### Email Content

The single email users receive now includes:
- ✅ PolicyWallet branding
- ✅ Welcome message
- ✅ **Verification button** (Επαλήθευση Email)
- ✅ Alternative link (if button doesn't work)
- ✅ Next steps guidance
- ✅ Expiry notice (24 hours)
- ✅ Security notes

### Testing

After disabling Supabase emails:

1. Sign up with a new email
2. Verify you receive **ONLY ONE** email
3. Email should have the verification button
4. Click button → Should redirect to verification page
5. Should see success message
6. Should be able to login

### Troubleshooting

**If users still receive 2 emails:**
- Double-check "Enable email confirmations" is OFF in Supabase
- Wait a few minutes for settings to propagate
- Try with a fresh email address

**If verification link doesn't work:**
- Check that `/auth/verify` page exists
- Verify middleware allows public access to `/auth/verify`
- Check API route `/api/auth/verify/route.ts` is working

### Important Notes

- Users will receive ONLY the Brevo email
- No mention of "Supabase" anywhere
- Professional, branded experience
- Single source of truth for verification
