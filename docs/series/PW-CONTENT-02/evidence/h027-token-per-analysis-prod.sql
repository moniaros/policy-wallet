-- H-027 — tokens per completed analysis, per plan, and what each monthly budget allows at p95.
-- READ-ONLY. Run on PRODUCTION (Supabase SQL editor or psql). Writes nothing; no plan-row changes.
-- Window: the last 90 days. A "completed analysis" = a policy_analysis_runs row with status
-- completed / completed_with_warnings and a recorded actual_total_tokens.
-- Plan attribution: the plan of the user's most recent subscription created at or before the run;
-- no such subscription = the Free plan (the same fallback resolveUserEntitlements uses). A run started
-- by an agent is attributed to the agent's plan, which is the plan whose budget it draws on.
-- Caveat: a subscription cancelled and replaced is attributed by its created_at, not by its end date.
-- "analyses_at_p95" = floor(monthly_token_budget / p95): how many analyses a month the budget really allows
-- if every run costs as much as the 95th-percentile run. Compare with the published 5 / 50 / 150 / 400.

BEGIN READ ONLY;

WITH runs AS (
  SELECT r.analysis_run_id,
         r.user_id,
         r.created_at,
         r.actual_total_tokens AS tokens
  FROM policy_analysis_runs r
  WHERE r.status IN ('completed', 'completed_with_warnings')
    AND r.actual_total_tokens IS NOT NULL
    AND r.actual_total_tokens > 0
    AND r.created_at >= now() - interval '90 days'
),
attributed AS (
  SELECT runs.*,
         COALESCE(p.tier_key, p.name, 'free')                                              AS plan_key,
         COALESCE(p.display_name, 'Free')                                                  AS plan_display,
         COALESCE(
           NULLIF(p.entitlements -> 'limits' ->> 'monthlyTokenBudget', ''),
           NULLIF(p.entitlements ->> 'monthlyTokenBudget', '')
         )::numeric                                                                        AS monthly_budget
  FROM runs
  LEFT JOIN LATERAL (
    SELECT pl.*
    FROM subscriptions s
    JOIN plans pl ON pl.plan_id = s.plan_id
    WHERE s.user_id = runs.user_id
      AND s.created_at <= runs.created_at
    ORDER BY s.created_at DESC
    LIMIT 1
  ) p ON true
)
SELECT plan_key,
       plan_display,
       count(*)                                                        AS completed_analyses,
       percentile_cont(0.50) WITHIN GROUP (ORDER BY tokens)::bigint     AS p50_tokens,
       percentile_cont(0.95) WITHIN GROUP (ORDER BY tokens)::bigint     AS p95_tokens,
       max(tokens)                                                     AS max_tokens,
       max(monthly_budget)::bigint                                     AS monthly_token_budget,
       CASE
         WHEN max(monthly_budget) IS NULL THEN NULL
         ELSE floor(max(monthly_budget) / NULLIF(percentile_cont(0.95) WITHIN GROUP (ORDER BY tokens), 0))
       END                                                             AS analyses_at_p95,
       CASE
         WHEN max(monthly_budget) IS NULL THEN NULL
         ELSE floor(max(monthly_budget) / NULLIF(percentile_cont(0.50) WITHIN GROUP (ORDER BY tokens), 0))
       END                                                             AS analyses_at_p50
FROM attributed
GROUP BY plan_key, plan_display
ORDER BY plan_key;

ROLLBACK;
