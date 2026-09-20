# S0 — Compromised Firebase service-account key

**2026-09-12 · target b9255578 · incident OPEN (owner containment outstanding).** Treat the key as compromised. No credential was tested, printed, sent to a service, or used to inspect production.

## Scope — code-verified and locally measured

- Artifact: `docs/architecture/policy-wallet-c0980-firebase-adminsdk-fbsvc-7647dfa5b2.json`.
- Project: `policy-wallet-c0980`.
- Service account: `firebase-adminsdk-fbsvc@policy-wallet-c0980.iam.gserviceaccount.com`.
- Key identifier (not key material): `7647dfa5b2da600114001de7b98581c615b35459`.
- Present in **both supplied commits / 2 checked**: `b9255578` and `d6afd586`. The latter was inspected as a local Git object, not as a running production deployment.
- Present at the original path in **1,414 / 1,608 target-ancestry commit snapshots**. Across the fetched local refs before the preservation stash: **1,452 / 1,650 snapshots**. A commit containing the file is different from a commit modifying it: **one path-changing commit**, `0dc95fd` (2026-03-26), was found. Counts concern this exact path in reachable local history, not inaccessible forks, GitHub caches, renamed copies or every remote ref.
- Metadata-only JSON inspection and `git cat-file --batch-check` established presence without displaying blob contents. Guard output contains file names and reason labels only.

## What it can do — distinguish capability from unknown IAM grants

Possession enables signing as this service account and obtaining credentials subject to its effective IAM permissions. Its name does not prove its actual roles. Firebase documents the Admin SDK account family and associated service roles, but production role bindings, inherited/resource grants, key status and past use were **not inspected**. Do not reduce the risk to push alone or assert database-admin access without that evidence. [Firebase service-account guide](https://firebase.google.com/support/guides/service-accounts)

The code-confirmed consumer is `lib/services/push.service.ts:52`: it reads `FCM_CLIENT_EMAIL` and `FCM_PRIVATE_KEY`, signs a JWT for the Firebase Messaging scope and exchanges it at Google's token endpoint, then sends to the `FCM_PROJECT_ID` project. It does not import this JSON file. `lib/env.ts:57` also declares `GOOGLE_APPLICATION_CREDENTIALS`; no proof that it points to this artifact was found. Configured deployments, developer machines and external consumers remain **unavailable** under the no-production-access boundary.

## Owner action — exact containment and replacement

1. Open Firebase console → project **policy-wallet-c0980** → **Project settings → Service accounts**. Confirm the account above; open its Google Cloud IAM **Keys** page and identify the exposed key ID. Generate a replacement only if this account still needs a long-lived key; keep any downloaded JSON outside the repository. Creating a new key alone does not revoke the old one. [Firebase Admin setup](https://firebase.google.com/docs/admin/setup)
2. Contain existing tokens as well as the persistent key: disable the affected account or apply an appropriate deny policy if immediate blocking is required. This affects all workloads using that identity. Replace the secret at every authorised consumer; disable/delete the exposed key. Do not re-enable the identity until Google's prescribed token-expiry wait is satisfied (normally at least 60 minutes; longer with extended token lifetime). [Google compromised-credential response](https://docs.cloud.google.com/docs/security/compromised-credentials)
3. Update `FCM_PRIVATE_KEY` in every deployment/secret store using the old key; retain `FCM_CLIENT_EMAIL`/`FCM_PROJECT_ID` only if the identity/project are unchanged. Redeploy/restart consumers so stale environment values and cached access tokens are discarded. Update any ADC path or external automation separately. Do **not** send a push or email to verify during this programme.
4. Owner reviews IAM grants, other keys, token-creator bindings, audit logs and usage/billing since exposure; records containment time and outcome without pasting secrets. Check collaborators, clones, CI artifacts and downloaded copies. Those are incident-response tasks, not actions this audit executed. [Google response procedure](https://docs.cloud.google.com/docs/security/compromised-credentials)

**What breaks:** configured FCM sending using the old key loses new token issuance after revocation; cached tokens have separate lifetime. Disabling the whole identity interrupts all its workloads, including unknown external consumers. No JSON import was found, so deleting this repository file does not itself change the code's environment-based signing path. Brevo email and Supabase auth use separate credentials; no dependency on this key was found in those paths. No deployment availability or current FCM configuration is claimed.

## Repository containment — completed locally, not deployed

- Removed the artifact with `git rm` (deletion staged; original b9255578/history still contain it).
- Added service-account filename patterns to `.gitignore`; existing `*.pem` rule retained, with p12/pfx ignores added.
- Added `scripts/audit-private-material.mjs`: enumerates **all indexed blobs plus tracked working files**, no location allowlist, and rejects service-account JSON signatures, PEM files/envelopes, private-key envelopes, PGP/PuTTY private material. Reads blobs in batches, never echoes matches; incomplete scans fail closed. Symlinks are not followed outside the tree; submodules fail closed. Arbitrarily encrypted/encoded secrets are not claimed detectable by a text-format guard.
- Every CI job runs the audit before dependency installation, and the production deploy fires only on a CI-green commit. It is deliberately NOT a `prebuild` hook: the guard needs a git index, and the Vercel build runs on an uploaded tree with no `.git`, where the guard fails closed (exit 2) and would fail every production build — verified 2026-09-20 by running it outside a repository. An explicit `--revision COMMIT` scans committed snapshots. Index scanning prevents an unstaged edit/deletion from hiding a staged secret.
- **Red first:** guard exit 1 against the real b9255578 artifact in both index/worktree, before removal. Output reported only the file and three classification reasons.
- **Green after removal:** exit 0, 8,691 blob/file observations before staging new guard files. Probe suite: **5 / 5 tests passed** initially; synthetic envelopes are assembled by a reusable probe fixture, contain no real key, and tests assert the sentinel never appears in output. Final counts/checks are recorded in LOCAL-EVIDENCE.md.
- No history rewrite, force push, production secret change, deployment, or real dispatch performed. Owner containment is still required even after a future clean build.

## History options — require explicit approval

| Option | Cost / consequence |
|---|---|
| Revoke now, retain history, commit removal/guard | Lowest repository disruption; old bytes remain in clones/history. Rotation is mandatory. Does not satisfy a requirement to expunge stored key material. |
| Targeted history removal across affected branches/tags using git-filter-repo, then coordinated force push | Rewrites affected commit identities, invalidates SHA-based evidence links/signatures, requires collaborator re-clone/reset and PR coordination. This series' PR/deploy/SHA ledger must retain a mapping. Platform caches/PR refs/forks need separate handling; rewrite cannot recall downloaded copies. |
| Fresh clean repository with curated history | Highest workflow cost: repository links, integrations, branch protection and evidence references need migration; old repository/copies still need retention/access decisions. |

Recommendation: owner containment immediately; decide history treatment separately after capturing non-secret incident evidence and inventorying consumers. **No history option is approved or executed here.**

## Workspace provenance

The supplied target was fetched and NEW-UI fast-forwarded from f6bb47e to b9255578. Pre-existing tracked/untracked changes were preserved in stash **4b9b5c34b31cc2893e071faae183dd709d4ed59b**, not discarded or blindly reapplied over the newer tree. Audit comparison files were restored under suffixed names, including `PRODUCT-TRUTH-f6bb47e.md`. No new worktree was created.
