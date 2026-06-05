---
name: "source-command-start"
description: "Re-orient at the start of a session from STATUS and audit docs"
---

# source-command-start

Use this skill when the user asks to run the migrated source command `start`.

## Command Template

Read docs/STATUS.md and skim docs/audits/*.md. In under one screen, tell me:
where we are (current phase), what's blocked, the top 3 ranked risks, and the
next 3 actions. Do NOT start new work or explore the wider repo until I confirm
the direction. If docs/STATUS.md doesn't exist yet, say so and offer to create it.
