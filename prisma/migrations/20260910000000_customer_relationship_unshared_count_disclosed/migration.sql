-- The customer's own decision to disclose that unshared policies EXIST.
--
-- Halt H-B2 asked whether an advisor should be told a customer holds policies
-- they have not shared. The answer taken was: the platform never says so on its
-- own, and the customer may choose to. Default false is therefore the whole
-- point of the column — an existing relationship discloses nothing until its
-- policyholder turns this on.
ALTER TABLE "customer_relationships"
    ADD COLUMN IF NOT EXISTS "unshared_count_disclosed" BOOLEAN NOT NULL DEFAULT false;
