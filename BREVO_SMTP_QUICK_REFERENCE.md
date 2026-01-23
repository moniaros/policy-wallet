# ⚡ Quick Reference: Brevo SMTP for Supabase

**Goal**: Send all emails from `noreply@policywallet.gr` instead of Supabase's domain

---

## 🎯 Quick Setup (5 Steps)

### 1. Get Brevo SMTP Credentials
```
Login to: https://app.brevo.com
Go to: SMTP & API → SMTP
Copy:
  - Server: smtp-relay.brevo.com
  - Port: 587
  - User: your-email@example.com
  - Password: [Generate new SMTP key]
```

### 2. Configure Supabase
```
Supabase Dashboard → Settings → Auth → SMTP Settings
Enable Custom SMTP: ✅

SMTP Host: smtp-relay.brevo.com
SMTP Port: 587
SMTP User: your-brevo-email
SMTP Password: your-smtp-key
Sender Email: noreply@policywallet.gr
Sender Name: PolicyWallet
Enable TLS: ✅

Click: Save
```

### 3. Verify Domain in Brevo
```
Brevo → Domains → Add Domain
Enter: policywallet.gr

Add DNS Records (provided by Brevo):
  TXT @ [verification code]
  TXT mail._domainkey [DKIM key]
  
Wait: Up to 48 hours
Click: Verify in Brevo
```

### 4. Update Email Templates
```
Supabase → Authentication → Email Templates
Update: Confirm Signup template
Use: Greek branded template (see BREVO_SMTP_SETUP.md)
Save: Template
```

### 5. Test
```
Supabase → Email Templates → Send Test Email
Check: Email from noreply@policywallet.gr ✅
Test: Signup flow
Verify: No emails from Supabase domain ✅
```

---

## 📋 DNS Records Needed

Add these to your domain registrar:

```dns
Type: TXT
Name: @
Value: [From Brevo - verification code]

Type: TXT
Name: mail._domainkey
Value: [From Brevo - DKIM key]

Type: MX (optional)
Name: @
Value: [From Brevo]
Priority: 10
```

---

## ✅ Verification

After setup, confirm:
- [ ] Test email received from `noreply@policywallet.gr`
- [ ] Signup sends email from correct domain
- [ ] Email has PolicyWallet branding
- [ ] Verification link works
- [ ] No emails from `noreply@mail.ap.supabase.io`

---

## 🐛 Common Issues

**Still getting Supabase emails?**
→ Wait 5-10 minutes, clear cache, try again

**SMTP authentication failed?**
→ Use SMTP key, not account password

**Domain not verifying?**
→ Wait 48 hours for DNS propagation

**Emails not delivered?**
→ Check Brevo → Statistics for errors

---

## 📚 Full Guide

See `BREVO_SMTP_SETUP.md` for:
- Detailed step-by-step instructions
- Email template examples
- Troubleshooting guide
- Security best practices
- Monitoring tips

---

**Time**: 30-60 minutes  
**Difficulty**: Intermediate  
**Result**: Professional branded emails ✨
