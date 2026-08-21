-- Rollback for the 2026-08-21 dev insurers alignment (dev <- prod).
--
-- One row, dev only: AXA, slug NULL, is_active = false, created 2026-04-15.
-- It predates the slug-keyed insurer catalogue (27 records, prod), so with a
-- NULL slug nothing in the catalogue can address it. AXA also left the Greek
-- market in 2021 (acquired by Generali), so it is not a gap in the reference
-- data — it is a leftover from the pre-catalogue seed.
--
-- Nothing referenced it: there are NO foreign keys onto public.insurers at all;
-- policies and proposals store `insurer_name` as free text.
INSERT INTO public.insurers (insurer_id, name, is_active, status, created_at, updated_at)
VALUES ('cmnzqpa2k0003nuu5uobl4rhp', 'AXA', false, 'active', '2026-04-15 07:39:29.468', now());
-- The original insurer_id is preserved above. It was
-- a seed-era cuid with no external references.
