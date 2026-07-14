-- Targeted repair (fix/date-parsing-integrity): policy 1651622 (Ethniki
-- Full Health). The extracted dates were correct in acordData ("22-05-2024"
-- / "22-05-2025") but the columns took the upload-day placeholder because
-- the old parser could not read DD-MM-YYYY. One row, guarded by number.
UPDATE "policies"
SET "start_date" = '2024-05-22 00:00:00',
    "end_date"   = '2025-05-22 00:00:00'
WHERE "policy_id" = 'cmrj2guby000111c36paclzjm'
  AND "policy_number" = '1651622';
