-- Spec v2 §10.1: an editable policy nickname («Το αμάξι της Μαρίας»). Owner-typed,
-- never extracted; NULL means the wallet shows the branch and asset identifier alone.
ALTER TABLE "policies" ADD COLUMN "nickname" TEXT;
