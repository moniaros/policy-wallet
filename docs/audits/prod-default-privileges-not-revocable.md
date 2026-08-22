# Prod default privileges: not revocable at our privilege level

Verified 2026-08-22, production (`cquudefwfwrmvpftuhyl`).

## What is there

`pg_default_acl` in schema `public` holds three entries owned by
**`supabase_admin`** — tables (`arwdDxtm`), sequences (`rwU`), functions (`X`) —
each granting `anon` and `authenticated`. A future table created in `public` by
`supabase_admin` would therefore be granted to both roles automatically.

The three entries owned by `postgres` grant only `postgres` and `service_role`
and are already correct.

## Why it was not changed

```
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon, authenticated;
-- ERROR: 42501: permission denied to change default privileges
```

The connection is `postgres`: `rolsuper = false`,
`pg_has_role(current_user,'supabase_admin','MEMBER') = false`. Only
`supabase_admin` can alter its own defaults, and no connection available to this
project can become it — **including the dashboard SQL editor, which runs as the
same `postgres` role**. This is not a permissions misconfiguration to work
around; it is a platform boundary.

## Why the exposure is nevertheless closed

Two independent controls sit in front of it, both verified by query/HTTP:

1. `has_schema_privilege('anon','public','USAGE') = false` (same for
   `authenticated`), and 0 current table/routine grants. Without schema USAGE a
   table grant is unreachable regardless of what the default ACL says.
2. PostgREST exposes only `graphql_public` — verified live against the prod API
   with the real publishable key: `PGRST106 — "Only the following schemas are
   exposed: graphql_public"`.

The `pwp` schema is the working proof of the same shape: 26 tables with RLS
enabled and **no policies**, USAGE false — and unreachable.

## What would change it

A Supabase support request, if the platform defaults are to be removed at all.
Dev (`lzqvtvjggylcujenlelh`) has **zero** default ACLs in `public`, so the two
projects genuinely differ here; worth asking Supabase which is the intended
state rather than assuming dev is right.

**Do not** re-attempt the ALTER from a normal connection — it will fail the same
way, and the failure looks like a missing grant rather than a platform boundary.
