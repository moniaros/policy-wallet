---
description: Run a standard security/correctness audit on an area and document it
---
Audit the area described here: $ARGUMENTS

Focus on this app's real risks: object-level authorization (can one user reach
another user's data — especially can an `agent` reach a policyholder they are NOT
connected to?), Prisma queries missing an ownership scope in their `where` clause,
server actions or routes missing an auth guard, and the comma-separated `roles`
string being checked with `.includes()` instead of `parseRoles()`.

Write findings to docs/audits/<short-kebab-name>.md as a table:
file/location | issue | role(s) affected | severity (critical/high/med) | suggested fix.
Separate security/correctness findings from UI/UX observations. Do not change any
code yet — this is read-only analysis. End by listing the criticals first.