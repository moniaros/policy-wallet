# PW-PROVENANCE-01 — the guard inventory

One row per guard shipped by this series. A guard enumerates its universe from the filesystem or the
database schema, and ships with a committed probe fixture proven to turn it red. **A guard without a
probe is not a guard.**

| Guard | Universe it enumerates | Probe | What it would have caught |
|---|---|---|---|
| `ropa-tags-complete` (`tests/unit/ropa-tags-complete.test.ts`) | Every model in `prisma/schema.prisma`, filtered to those holding personal data by the same detector `erasure-covers-personal-data.test.ts` uses — a `@relation` to User under any name, or one of seven plain subject columns. 57 required, 30 explicitly exempt with a written reason. | 5 fixtures: an untagged personal-data model · Art. 9 columns under a non-consent basis · a value outside the vocabulary · a tag missing required keys · `unclear` accepted. Plus a real-tree demonstration: removing `PolicyholderProfile`'s tag fails 2 assertions. | A migration adding a table with a `userId` and no recorded purpose or lawful basis — which is how the Art. 30 gap arose in the first place. Also catches an Art. 9 column list that names a field the model no longer has, and a stale exemption for a model that was deleted. |
