# PolicyWallet Mobile API Specification (v1)

## Overview
This document specifies the REST API endpoints required for the **Policyholder-only** mobile application. 

**Base URL:** `/api/v1`

---

## A) Authentication & Session

| Endpoint | Method | Path | Auth | Purpose | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Magic Link Req | `POST` | `/auth/magic-link/request` | None | Send login email | DONE |
| Logout | `POST` | `/auth/logout` | AT | Terminate session | DONE |
| User Profile | `GET` | `/me` | AT | Get current user info | DONE |
| Update Profile | `PATCH` | `/me` | AT | Update name, preferences | DONE |

---

## B) Account & Settings

| Endpoint | Method | Path | Auth | Purpose | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Subscription | `GET` | `/me/subscription` | AT | Current plan & usage | DONE |
| Referral Info | `GET` | `/me/referral` | AT | Code and credits | DONE |
| Credits | `GET` | `/me/credits` | AT | Transaction history | DONE |

---

## C) Policy Wallet

| Endpoint | Method | Path | Auth | Purpose | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| List Policies | `GET` | `/policies` | AT | All policies (with gaps count) | DONE |
| Create Policy | `POST` | `/policies` | AT | Manual add | DONE |
| Get Policy | `GET` | `/policies/:id` | AT | Detail with highlights/gaps | DONE |
| Update Policy | `PATCH` | `/policies/:id` | AT | Edit basic info | DONE |
| Delete Policy | `DELETE` | `/policies/:id` | AT | Soft delete | DONE |
| Upload Doc | `POST` | `/policies/:id/documents` | AT | Upload file | DONE |
| Delete Doc | `DELETE` | `/policies/:id/documents/:docId` | AT | Remove file | DONE |
| Wallet Pass | `GET` | `/policies/:id/wallet-pass` | AT | Get Pass Payload (Stub) | DONE |

---

## D) Sharing & Collaboration

| Endpoint | Method | Path | Auth | Purpose | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Create Invite | `POST` | `/invites` | AT | Share with agent | DONE |
| List Grants | `GET` | `/access-grants` | AT | Who has access | DONE |
| Revoke Access | `DELETE` | `/access-grants/:id` | AT | Revoke agent access | DONE |
| Audit Log | `GET` | `/activity-log` | AT | History of actions | DONE |

---

## E) Coverage Intelligence

| Endpoint | Method | Path | Auth | Purpose | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Review Job | `POST` | `/policies/:id/review` | AT | Trigger async gap detection | DONE |
| List Gaps | `GET` | `/policies/:id/gaps` | AT | Detail of detection | DONE |
| Acknowledge Gap | `PATCH` | `/gaps/:id/acknowledge` | AT | Confirm awareness | DONE |

---

## F) Questionnaires

| Endpoint | Method | Path | Auth | Purpose | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| List | `GET` | `/questionnaires` | AT | Assigned tasks | DONE |
| Get | `GET` | `/questionnaires/:id` | AT | Questions list | DONE |
| Submit | `POST` | `/questionnaires/:id/responses` | AT | Send answers | DONE |

---

## G) Notifications

| Endpoint | Method | Path | Auth | Purpose | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| History | `GET` | `/notifications` | AT | History list | DONE |
| Preferences | `GET/PATCH` | `/notifications/preferences` | AT | Get/Set settings | DONE |
| Device Token | `POST` | `/notifications/device-token` | AT | Register for Push | DONE |

---

## Implementation Rules
1. **Envelope**: All responses follow `{ "data": ..., "meta": { "request_id": "...", "language": "el" }, "error": null }`.
2. **Auth**: Uses standard NextAuth session. For mobile-to-web API access, ensure `Cookie` header or `Authorization` bearer token is passed.
3. **Consistency**: All creates/deletes log to `ActivityLog`.
4. **Ownership**: Every endpoint verifies `ownerUserId` against the authenticated user's ID.

---

## How to Test

Using Curl with a session cookie:
```bash
curl -X GET "http://localhost:3000/api/v1/policies" \
     -H "Cookie: authjs.session-token=YOUR_TOKEN" \
     -H "Accept: application/json"
```
