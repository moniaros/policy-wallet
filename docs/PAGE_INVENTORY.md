# 🗺️ System Page Inventory

This document outlines all accessible pages for Policyholders, Agents, and Administrators within the PolicyWallet platform.

---

## 🟢 Public Pages
*(Accessible to all visitors)*

| Route | Description | 
| :--- | :--- |
| `/` | **Landing Page** - Product overview, features, and call-to-action. |
| `/auth/login` | **Sign In** - Secure login for all user roles. |
| `/auth/register` | **Sign Up** - Registration flow for new policyholders. |
| `/auth/forgot-password` | **Recovery** - Password reset flow. |

---

## 🔵 Policyholder Pages
*(For individual users managing their insurance)*

| Route | Main Feature | Description |
| :--- | :--- | :--- |
| `/wallet` | **My Wallet** | The primary dashboard. Displays a list of all active, expiring, and archived policies. |
| `/wallet/add` | **Add Policy** | "Frictionless" wizard to upload new policy documents. |
| `/wallet/[id]` | **Policy Details** | Detailed view of a specific policy (documents, coverage limits, etc.). |
| `/tasks` | **Coverage / Tasks** | *Currently mapped to "Coverage".* Lists action items and pending reviews. |
| `/coverage-insights` | **Gap Analysis** | AI-driven analysis of coverage gaps (e.g., "Missing Life Insurance"). |
| `/notifications` | **Notifications** | Alert center for renewals, updates, and system messages. |
| `/account` | **Account Settings** | Profile management, subscription/billing, and app preferences. |

---

## 🟣 Agent Pages
*(For insurance professionals managing clients)*

| Route | Main Feature | Description |
| :--- | :--- | :--- |
| `/dashboard` | **Agent Workspace** | High-level overview of business performance, daily tasks, and recent activity. |
| `/customers` | **Client List** | searchable directory of all managed policyholders. |
| `/customers/[id]` | **Client Profile 360** | Deep dive into a specific client's portfolio, risks, and history. |
| `/customers/invite` | **Invite Client** | Tool to send invitation emails to new clients. |
| `/opportunities` | **Pipeline** | CRM view of potential sales, renewals, and cross-sell opportunities. |
| `/insights` | **Market Insights** | Data analytics and portfolio trends. |
| `/activity` | **Activity Feed** | *Internal/Beta:* Log of all recent client interactions and uploads. |
| `/notifications` | **Notifications** | Alerts for client actions (e.g., "Client uploaded policy"). |
| `/account` | **Ageny Settings** | Professional profile, agency branding, and subscription settings. |

---

## 🔴 Admin Pages
*(For platform administrators)*

| Route | Main Feature | Description |
| :--- | :--- | :--- |
| `/admin/dashboard` | **System Status** | Platform health, total user stats, and revenue metrics. |
| `/admin/users` | **User Management** | CRUD operations for Users (ban/delete/promote). |
| `/admin/insurers` | **Insurer Database** | Manage the master list of insurance providers (logos, names). |
| `/admin/types` | **Insurance Types** | Manage user-facing insurance categories (Motor, Health, etc.). |
| `/account` | **Admin Profile** | Personal account settings for the admin user. |

---

## 🛠️ Internal / Utility Routes
*(Used by system, not directly navigated)*

| Route | Description |
| :--- | :--- |
| `/api/*` | Backend API endpoints. |
| `/onboarding` | *(Potential)* Post-signup wizard. |
