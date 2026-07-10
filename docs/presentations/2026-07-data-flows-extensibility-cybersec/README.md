# Deck — Data Flows, Extensibility & Cybersecurity Plan (July 2026)

12-slide technical deck (Greek) covering the platform's data flows, API extensibility, and the cybersecurity plan through GA. Built from the codebase state on 2026-07-10 (92 API routes: 62 user / 15 role / 11 public / 4 webhook; IDOR audit 2026-05-30; production on Vercel).

## Files

- `deck.html` — the deck itself (self-contained, light/dark themes). Open in a browser; scroll or arrow through the 12 slides.
- `architecture-dataflow.svg` — source of the layered architecture diagram (slide 02 and the Lucid doc below).

## Linked live assets

| Asset | Where |
|---|---|
| Lucidchart — System Architecture & Data Flows | https://lucid.app/lucidchart/445d2396-3a18-401b-aa24-42a9c777d07c/view |
| Lucidchart — Policy Upload & AI Analysis Sequence | https://lucid.app/lucidchart/1cc4282a-80cd-4ef3-af1b-0a887d018f84/view |
| Postman — "PolicyWallet API v1 — Integration Surface" collection | MONIAROS Team workspace (`ecababe4-0f7a-4a25-89ad-34793c6962ec`) |

## Slide map

1. Title
2. System architecture at a glance (layered diagram)
3. Data flow: PDF → AI extraction → gap analysis lifecycle
4. Data flow: roles & sharing (AccessGrant, CustomerRelationship)
5. Data map: which data reaches which third party (GDPR notes)
6. Extensibility: API-first surface (92 routes, CI-enforced policy inventory)
7. Extensibility: integration patterns today + planned (QStash, partner keys, OpenAPI)
8. Cybersec: defense-in-depth layers (edge / app / API / data)
9. Cybersec: identity, access & the IDOR audit
10. Cybersec: secure SDLC — guardrails as CI gates, runbooks, compliance evidence
11. Cybersec plan: launch-gating items vs. hardening backlog
12. Reference assets & repo docs
