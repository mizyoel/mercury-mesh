# Copilot Coding Agent — Mercury Mesh Instructions

You are working on a project that uses **Mercury Mesh**, the Bridge Protocol layered on top of the existing Mercury Mesh runtime. The preferred runtime root is `.mesh/`, while `.mesh/` paths and `mesh:*` labels remain supported as compatibility aliases.

## Bridge Context

Before starting work on any issue:

1. Read `.mesh/team.md` when present; otherwise read `.mesh/team.md` for the team roster, member roles, and your capability profile.
2. Read `.mesh/routing.md` when present; otherwise read `.mesh/routing.md` for work routing rules.
3. If the issue has a `mesh:{member}` or `mesh:{member}` label, read that member's charter from the active runtime root to understand their domain expertise and vocal signature — work in their voice.
4. If the active runtime config has `orgMode: true`, read the matching `org/structure.json`. Treat any `dept:{department}` labels as routing metadata only — `mesh:{member}` is the primary execution trigger, while `mesh:{member}` remains compatible.

## Capability Self-Check

Before starting work, check your capability profile in the active runtime roster (`.mesh/team.md` or `.mesh/team.md`) under the **Coding Agent → Capabilities** section.

- **🟢 Good fit** — proceed autonomously.
- **🟡 Needs review** — proceed, but note in the PR description that a bridge member should review.
- **🔴 Not suitable** — do NOT start work. Instead, comment on the issue:
  ```
  🤖 This issue doesn't match my capability profile (reason: {why}). Suggesting reassignment to a Mercury Mesh specialist.
  ```

## Branch Naming

Preferred convention:
```
mesh/{issue-number}-{kebab-case-slug}
```
Example: `mesh/42-fix-login-validation`

The legacy form `mesh/{issue-number}-{slug}` remains compatible and will continue to work during the migration phase.

## PR Guidelines

When opening a PR:
- Reference the issue: `Closes #{issue-number}`
- If the issue had a `mesh:{member}` or `mesh:{member}` label, mention the member: `Working as {member} ({role}) on Mercury Mesh`
- If the issue also had a `dept:{department}` label, mention the department in the PR context for reviewer clarity.
- If this is a 🟡 needs-review task, add to the PR description: `⚠️ This task was flagged as "needs review" — please have a Mercury Mesh member review before merging.`
- Follow any project conventions in the active decisions ledger: `.mesh/decisions.md` when present, otherwise `.mesh/decisions.md`

## Decisions

If you make a decision that affects other team members, write it to:
```
.mesh/decisions/inbox/copilot-{brief-slug}.md
```
If the repo still runs the legacy runtime root, use the equivalent `.mesh/decisions/inbox/` path instead. The Scribe will merge it into the shared decisions file.
