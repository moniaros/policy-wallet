# Agent Experience — Pending Implementation Steps

> **Last updated**: 2026-03-17  
> **Context**: Improving the Insurance Agent experience and implementing incomplete sections  
> **Baseline commit**: Working tree as of 2026-03-17

---

## ✅ Completed

| # | Task | Files Modified |
|---|------|----------------|
| 1 | Added **Tasks** and **Activity** links to agent sidebar navigation | `app/(protected)/layout.tsx` |
| 2 | Created **Insights data layer** (server action with real DB queries) | `app/(protected)/insights/actions.ts` |
| 3 | Built **Insights Client Component** (premium analytics dashboard) | `app/(protected)/insights/InsightsClient.tsx` |
| 4 | Updated **Insights Page** to wire data to client component | `app/(protected)/insights/page.tsx` |
| 5 | Built **Activity Feed Server Action** to fetch events | `app/(protected)/activity/actions.ts` |
| 6 | Built **Activity Feed Client Component** to display timeline | `app/(protected)/activity/ActivityClient.tsx` |
| 7 | Updated **Activity Page** to wire data to client component | `app/(protected)/activity/page.tsx` |
| 8 | Upgraded **Agent Dashboard** to use DesktopDashboard and real stats | `app/(protected)/dashboard/page.tsx` |
| 9 | Polished Agent Portal design consistency (pw-page-shell, arc-btn, arc-card) | Multiple Agent Components |
| 10 | Added **i18n Coverage** for Insights and Activity | `el.ts`, `en.ts`, `InsightsClient.tsx`, `ActivityClient.tsx` |

---

## 🔧 Pending — Must Complete

🎉 All tasks completed!

---

---

## 📁 File Reference

### Existing Agent Files (for context)
| File | Purpose |
|------|---------|
| `app/(protected)/layout.tsx` | Protected shell with role-based navigation |
| `app/(protected)/dashboard/page.tsx` | Agent dashboard server component |
| `app/(protected)/dashboard/DashboardClient.tsx` | Dashboard client wrapper |
| `app/(protected)/customers/CustomersClient.tsx` | Customer directory |
| `app/(protected)/opportunities/OpportunitiesClient.tsx` | Opportunity pipeline |
| `app/(protected)/insights/page.tsx` | **PLACEHOLDER** — needs replacement |
| `app/(protected)/activity/page.tsx` | **PLACEHOLDER** — needs replacement |
| `app/(protected)/agent/settings/AgentSettingsClient.tsx` | Agent profile settings |
| `app/(protected)/tasks/page.tsx` | Action center (functional) |
| `app/(protected)/notifications/NotificationsClientPage.tsx` | Notification center (functional) |
| `components/agent/Dashboard.tsx` | Basic dashboard component (currently used) |
| `components/agent/DesktopDashboard.tsx` | Rich dashboard component (**unused**) |
| `components/agent/types.ts` | Shared agent type definitions |
| `app/(protected)/agent/actions.ts` | Agent server actions (CRUD) |

### New Files to Create
| File | Purpose |
|------|---------|
| `app/(protected)/insights/actions.ts` | ✅ Created — Insights data aggregation |
| `app/(protected)/insights/InsightsClient.tsx` | Analytics dashboard UI |
| `app/(protected)/activity/actions.ts` | Activity feed data query |
| `app/(protected)/activity/ActivityClient.tsx` | Activity timeline UI |

---

## 🎨 Design System Reference

| Token | Value | Usage |
|-------|-------|-------|
| `--pw-primary` | `#1fdc86` | Primary accent, CTAs |
| `--pw-border` | `rgba(0,0,0,0.12)` | Card borders |
| `--pw-radius-card` | `16px` | Card corners |
| `arc-card` | Utility class | Standard card container |
| `arc-btn arc-btn-primary` | Utility class | Primary action buttons |
| `pw-kicker` | Utility class | Section kicker text |
| `pw-pill` | Utility class | Status pills |
| Font stack | GT America → IBM Plex Sans → Inter | All text |

---

## Execution Order

```
Step 3 + 4 (Insights)  ──┐
                          ├──→  Step 9 (Polish)  ──→  Step 10 (i18n)
Step 5 + 6 + 7 (Activity) ┘
        │
        └──→  Step 8 (Dashboard upgrade)
```

Steps 3–4 and 5–7 can be done in parallel. Step 8 depends on the activity data layer from Step 5. Steps 9-10 are cleanup passes after core features are built.
