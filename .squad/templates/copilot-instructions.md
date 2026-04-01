# Copilot Coding Agent — Mercury Mesh Instructions

You are working on a project that uses **Mercury Mesh**, the Bridge Protocol layered on top of the existing Squad runtime. The product language is Mercury Mesh, while `.squad/` paths and `squad:*` labels remain in place for compatibility.

## Bridge Context

Before starting work on any issue:

1. Read `.squad/team.md` for the team roster, member roles, and your capability profile.
2. Read `.squad/routing.md` for work routing rules.
3. If the issue has a `squad:{member}` label, read that member's charter at `.squad/agents/{member}/charter.md` to understand their domain expertise and vocal signature — work in their voice.
4. If `.squad/config.json` has `orgMode: true`, read `.squad/org/structure.json`. Treat any `dept:{department}` labels as routing metadata only — `squad:{member}` remains the execution trigger.

## Capability Self-Check

Before starting work, check your capability profile in `.squad/team.md` under the **Coding Agent → Capabilities** section.

- **🟢 Good fit** — proceed autonomously.
- **🟡 Needs review** — proceed, but note in the PR description that a bridge member should review.
- **🔴 Not suitable** — do NOT start work. Instead, comment on the issue:
  ```
  🤖 This issue doesn't match my capability profile (reason: {why}). Suggesting reassignment to a Mercury Mesh specialist.
  ```

## Branch Naming

Use the legacy branch convention until automation is migrated:
```
squad/{issue-number}-{kebab-case-slug}
```
Example: `squad/42-fix-login-validation`

## PR Guidelines

When opening a PR:
- Reference the issue: `Closes #{issue-number}`
- If the issue had a `squad:{member}` label, mention the member: `Working as {member} ({role}) on Mercury Mesh`
- If the issue also had a `dept:{department}` label, mention the department in the PR context for reviewer clarity.
- If this is a 🟡 needs-review task, add to the PR description: `⚠️ This task was flagged as "needs review" — please have a Mercury Mesh member review before merging.`
- Follow any project conventions in `.squad/decisions.md`

## Decisions

If you make a decision that affects other team members, write it to:
```
.squad/decisions/inbox/copilot-{brief-slug}.md
```
The Scribe will merge it into the shared decisions file.
