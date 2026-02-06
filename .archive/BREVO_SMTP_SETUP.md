# 📧 Configure Supabase to Use Brevo SMTP

**Problem**: Confirmation emails are sent from `noreply@mail.ap.supabase.io`  
**Solution**: Configure Supabase to use Brevo's SMTP server  
**Result**: All emails sent from `noreply@policywallet.gr` with your branding

---

## 🎯 Solution Overview

Supabase allows you to use a custom SMTP server for all authentication emails. We'll configure it to use Brevo's SMTP service.

---

## 📋 Step-by-Step Configuration

### Step 1: Get Brevo SMTP Credentials

1. Log in to your **Brevo account** (https://app.brevo.com)
2. Go to **SMTP & API** → **SMTP**
3. You'll find your SMTP credentials:
   - **SMTP Server**: `smtp-relay.brevo.com`
   - **Port**: `587` (TLS) or `465` (SSL)
   - **Login**: Your Brevo account email
   - **Password**: Your SMTP key (not your login password!)

4. If you don't have an SMTP key:
   - Click **"Generate a new SMTP key"**
   - Copy and save it securely (you won't see it again!)

---

### Step 2: Configure Supabase SMTP Settings

1. Go to your **Supabase Dashboard**
2. Navigate to **Settings** → **Auth** (or **Project Settings** → **Auth**)
3. Scroll down to **SMTP Settings**
4. Click **"Enable Custom SMTP"**

5. Fill in the following details:

```
SMTP Host: smtp-relay.brevo.com
SMTP Port: 587
SMTP User: your-brevo-email@example.com
SMTP Password: your-smtp-key-here
Sender Email: noreply@policywallet.gr
Sender Name: PolicyWallet
```

6. **Enable TLS**: ✅ (checked)
7. Click **Save**

---

### Step 3: Verify Domain in Brevo

To send from `noreply@policywallet.gr`, you need to verify the domain:

1. In **Brevo**, go to **Senders, Domains & Dedicated IPs** → **Domains**
2. Click **"Add a Domain"**
3. Enter: `policywallet.gr`
4. Brevo will provide DNS records to add:

**Add these DNS records to your domain:**

```
Type: TXT
Name: @
Value: [Brevo verification code]

Type: TXT  
Name: mail._domainkey
Value: [DKIM key from Brevo]

Type: MX (optional, for better deliverability)
Name: @
Value: [Brevo MX record]
Priority: 10
```

5. After adding DNS records, click **"Verify"** in Brevo
6. Wait for verification (can take up to 48 hours, usually faster)

---

### Step 4: Configure Email Templates in Supabase

Now that Supabase uses your SMTP, customize the email templates:

1. In **Supabase Dashboard**, go to **Authentication** → **Email Templates**

2. **Confirm Signup Template**:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Επιβεβαίωση Email - PolicyWallet</title>
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5; margin: 0; padding: 0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); padding: 40px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">PolicyWallet</h1>
              <p style="color: #e0f2fe; margin: 10px 0 0 0; font-size: 14px;">Η Ψηφιακή σας Ασφαλιστική Θήκη</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="color: #1e293b; margin: 0 0 20px 0; font-size: 24px;">Επιβεβαίωση Email</h2>
              
              <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Καλώς ήρθατε στο PolicyWallet! Παρακαλούμε επιβεβαιώστε τη διεύθυνση email σας για να ενεργοποιήσετε τον λογαριασμό σας.
              </p>
              
              <!-- Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="{{ .ConfirmationURL }}" style="display: inline-block; background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                      Επιβεβαίωση Email
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
                Εάν το κουμπί δεν λειτουργεί, αντιγράψτε και επικολλήστε τον παρακάτω σύνδεσμο στον browser σας:
              </p>
              
              <p style="color: #0ea5e9; font-size: 12px; word-break: break-all; margin: 10px 0 0 0;">
                {{ .ConfirmationURL }}
              </p>
              
              <div style="margin-top: 30px; padding-top: 30px; border-top: 1px solid #e2e8f0;">
                <p style="color: #64748b; font-size: 13px; line-height: 1.6; margin: 0;">
                  <strong>Σημείωση:</strong> Ο σύνδεσμος λήγει σε 24 ώρες. Εάν δεν ζητήσατε αυτό το email, μπορείτε να το αγνοήσετε με ασφάλεια.
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="color: #64748b; font-size: 13px; margin: 0 0 10px 0;">
                © 2026 PolicyWallet. Όλα τα δικαιώματα κατοχυρωμένα.
              </p>
              <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                Αυτό είναι ένα αυτοματοποιημένο email. Παρακαλούμε μην απαντήσετε.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

3. **Magic Link Template** (for passwordless login):

```html
<!-- Similar structure, change heading to "Σύνδεσμος Σύνδεσης" and button text to "Σύνδεση" -->
```

4. **Reset Password Template**:

```html
<!-- Similar structure, change heading to "Επαναφορά Κωδικού" and button text to "Επαναφορά Κωδικού" -->
```

---

### Step 5: Test the Configuration

1. **Test Email Sending**:
   - In Supabase Dashboard, go to **Authentication** → **Email Templates**
   - Click **"Send test email"** on any template
   - Check that you receive it from `noreply@policywallet.gr`

2. **Test Signup Flow**:
   ```bash
   # In your app
   1. Sign up with a new email
   2. Check email inbox
   3. Verify sender is "noreply@policywallet.gr"
   4. Click confirmation link
   5. Verify it works
   ```

---

## 🔧 Update Your Application Code

Since Supabase now handles all emails, you can simplify your signup code:

### Option 1: Remove Brevo Welcome Email (Recommended)

Update `app/auth/actions.ts`:

```typescript
export async function registerUser(formData: FormData) {
  // ... existing code ...
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXTAUTH_URL}/auth/callback`,
      data: {
        name,
        preferred_language: preferredLanguage,
      },
    },
  })

  // ❌ REMOVE THIS - Supabase now sends the email
  // await sendWelcomeEmail(email, name, preferredLanguage)
  
  // ... rest of code ...
}
```

### Option 2: Keep Brevo for Additional Emails

If you want to send a separate welcome email (in addition to verification):

```typescript
// Keep the Brevo email, but make it clear it's supplementary
await sendWelcomeEmail(email, name, preferredLanguage)
```

Update the Brevo email template to say:
> "Θα λάβετε επίσης ένα email επιβεβαίωσης. Παρακαλούμε ελέγξτε τα εισερχόμενά σας."

---

## 📊 Verification Checklist

After configuration:

- [ ] SMTP settings saved in Supabase
- [ ] Domain verified in Brevo
- [ ] DNS records added and verified
- [ ] Email templates updated in Supabase
- [ ] Test email sent successfully
- [ ] Test signup flow works
- [ ] Emails received from `noreply@policywallet.gr`
- [ ] Email branding matches PolicyWallet
- [ ] Links in emails work correctly
- [ ] No emails from `noreply@mail.ap.supabase.io`

---

## 🐛 Troubleshooting

### Issue: Still receiving emails from Supabase domain
**Solution**: 
- Verify SMTP settings are saved
- Check "Enable Custom SMTP" is ON
- Wait 5-10 minutes for changes to propagate
- Clear browser cache and test again

### Issue: Emails not being delivered
**Solutions**:
1. Check Brevo SMTP credentials are correct
2. Verify domain in Brevo is verified (green checkmark)
3. Check DNS records are properly configured
4. Look at Brevo → Statistics → Email Activity for errors
5. Check spam folder

### Issue: "SMTP authentication failed"
**Solutions**:
- Verify you're using SMTP key, not account password
- Regenerate SMTP key in Brevo if needed
- Check username is your Brevo account email
- Ensure no extra spaces in credentials

### Issue: Domain not verifying in Brevo
**Solutions**:
- Wait up to 48 hours for DNS propagation
- Use DNS checker tool to verify records are live
- Ensure DNS records are added to root domain
- Contact Brevo support if still failing after 48h

---

## 🎨 Email Template Variables

Available variables in Supabase email templates:

- `{{ .ConfirmationURL }}` - Email confirmation link
- `{{ .Token }}` - Verification token
- `{{ .TokenHash }}` - Hashed token
- `{{ .SiteURL }}` - Your site URL
- `{{ .Email }}` - User's email address

---

## 🔒 Security Best Practices

1. **SMTP Key Security**:
   - Never commit SMTP key to git
   - Use environment variables
   - Rotate keys periodically
   - Limit SMTP key permissions in Brevo

2. **Email Verification**:
   - Always require email verification
   - Set reasonable token expiry (24 hours)
   - Implement rate limiting on signup

3. **Domain Reputation**:
   - Monitor email bounce rates
   - Keep spam complaints low
   - Use SPF, DKIM, and DMARC records

---

## 📈 Monitoring

### Brevo Dashboard
- Monitor email delivery rates
- Check bounce and spam rates
- Review email activity logs
- Set up alerts for issues

### Supabase Dashboard
- Monitor authentication events
- Check user verification status
- Review email template performance

---

## 💰 Cost Considerations

**Brevo Free Tier**:
- 300 emails/day
- Unlimited contacts
- Sufficient for most startups

**Brevo Paid Plans** (if you exceed free tier):
- Lite: €25/month (10,000 emails/month)
- Premium: €65/month (20,000 emails/month)

---

## ✅ Success Criteria

Configuration is successful when:
- ✅ All emails come from `noreply@policywallet.gr`
- ✅ No emails from Supabase domain
- ✅ Email templates match your branding
- ✅ Verification links work correctly
- ✅ Email delivery rate >95%
- ✅ Users can complete signup flow

---

## 🎉 Benefits

After this configuration:
- ✅ **Professional branding** - All emails from your domain
- ✅ **Better deliverability** - Verified domain improves inbox placement
- ✅ **Consistent experience** - Single email provider
- ✅ **Full control** - Customize all email templates
- ✅ **Analytics** - Track email performance in Brevo
- ✅ **Compliance** - Easier GDPR compliance with single provider

---

## 📞 Support

**Brevo Support**: https://help.brevo.com  
**Supabase Support**: https://supabase.com/docs/guides/auth/auth-smtp

---

**Estimated Setup Time**: 30-60 minutes  
**DNS Propagation**: Up to 48 hours  
**Difficulty**: Intermediate

---

**Ready to configure?** Follow the steps above and you'll have professional, branded emails in no time! 🚀
