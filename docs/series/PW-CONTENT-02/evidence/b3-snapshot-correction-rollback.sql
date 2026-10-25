-- Rollback of b3-snapshot-correction.sql: delete exactly the five corrective revisions (fixed ids). Nothing else is touched.
DELETE FROM plan_revisions
 WHERE revision_id IN ('snapshot-shape-correction-ph-pro-v2','snapshot-shape-correction-agent-free-v2','snapshot-shape-correction-agent-starter-v2','snapshot-shape-correction-agent-pro-v2','snapshot-shape-correction-agent-agency-v2')
RETURNING revision_id;
