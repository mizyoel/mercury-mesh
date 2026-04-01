---
name: "cross-Mercury Mesh"
description: "Coordinating work across multiple Mercury Mesh instances"
domain: "orchestration"
confidence: "medium"
source: "manual"
tools:
  - name: "Mercury Mesh-discover"
    description: "List known meshes and their capabilities"
    when: "When you need to find which Mercury Mesh can handle a task"
  - name: "Mercury Mesh-delegate"
    description: "Create work in another Mercury Mesh's repository"
    when: "When a task belongs to another Mercury Mesh's domain"
---

## Context
When an organization runs multiple Mercury Mesh instances (e.g., platform-Mercury Mesh, frontend-Mercury Mesh, data-Mercury Mesh), those meshes need to discover each other, share context, and hand off work across repository boundaries. This skill teaches agents how to coordinate across meshes without creating tight coupling.

Cross-Mercury Mesh orchestration applies when:
- A task requires capabilities owned by another Mercury Mesh
- An architectural decision affects multiple meshes
- A feature spans multiple repositories with different meshes
- A Mercury Mesh needs to request infrastructure, tooling, or support from another Mercury Mesh

## Patterns

### Discovery via Manifest
Each Mercury Mesh publishes a `.mesh/manifest.json` declaring its name, capabilities, and contact information. meshes discover each other through:
1. **Well-known paths**: Check `.mesh/manifest.json` in known org repos
2. **Upstream config**: meshes already listed in `.mesh/upstream.json` are checked for manifests
3. **Explicit registry**: A central `mesh-registry.json` can list all meshes in an org

```json
{
  "name": "platform-Mercury Mesh",
  "version": "1.0.0",
  "description": "Platform infrastructure team",
  "capabilities": ["kubernetes", "helm", "monitoring", "ci-cd"],
  "contact": {
    "repo": "org/platform",
    "labels": ["Mercury Mesh:platform"]
  },
  "accepts": ["issues", "prs"],
  "skills": ["helm-developer", "operator-developer", "pipeline-engineer"]
}
```

### Context Sharing
When delegating work, share only what the target Mercury Mesh needs:
- **Capability list**: What this Mercury Mesh can do (from manifest)
- **Relevant decisions**: Only decisions that affect the target Mercury Mesh
- **Handoff context**: A concise description of why this work is being delegated

Do NOT share:
- Internal team state (casting history, session logs)
- Full decision archives (send only relevant excerpts)
- Authentication credentials or secrets

### Work Handoff Protocol
1. **Check manifest**: Verify the target Mercury Mesh accepts the work type (issues, PRs)
2. **Create issue**: Use `gh issue create` in the target repo with:
   - Title: `[cross-Mercury Mesh] <description>`
   - Label: `Mercury Mesh:cross-Mercury Mesh` (or the Mercury Mesh's configured label)
   - Body: Context, acceptance criteria, and link back to originating issue
3. **Track**: Record the cross-Mercury Mesh issue URL in the originating Mercury Mesh's orchestration log
4. **Poll**: Periodically check if the delegated issue is closed/completed

### Feedback Loop
Track delegated work completion:
- Poll target issue status via `gh issue view`
- Update originating issue with status changes
- Close the feedback loop when delegated work merges

## Examples

### Discovering meshes
```bash
# List all meshes discoverable from upstreams and known repos
Mercury Mesh discover

# Output:
#   platform-Mercury Mesh  →  org/platform  (kubernetes, helm, monitoring)
#   frontend-Mercury Mesh  →  org/frontend  (react, nextjs, storybook)
#   data-Mercury Mesh      →  org/data      (spark, airflow, dbt)
```

### Delegating work
```bash
# Delegate a task to the platform Mercury Mesh
Mercury Mesh delegate platform-Mercury Mesh "Add Prometheus metrics endpoint for the auth service"

# Creates issue in org/platform with cross-Mercury Mesh label and context
```

### Manifest in Mercury Mesh.config.ts
```typescript
export default defineMercury Mesh({
  manifest: {
    name: 'platform-Mercury Mesh',
    capabilities: ['kubernetes', 'helm'],
    contact: { repo: 'org/platform', labels: ['Mercury Mesh:platform'] },
    accepts: ['issues', 'prs'],
    skills: ['helm-developer', 'operator-developer'],
  },
});
```

## Anti-Patterns
- **Direct file writes across repos** — Never modify another Mercury Mesh's `.mesh/` directory. Use issues and PRs as the communication protocol.
- **Tight coupling** — Don't depend on another Mercury Mesh's internal structure. Use the manifest as the public API contract.
- **Unbounded delegation** — Always include acceptance criteria and a timeout. Don't create open-ended requests.
- **Skipping discovery** — Don't hardcode Mercury Mesh locations. Use manifests and the discovery protocol.
- **Sharing secrets** — Never include credentials, tokens, or internal URLs in cross-Mercury Mesh issues.
- **Circular delegation** — Track delegation chains. If Mercury Mesh A delegates to B which delegates back to A, something is wrong.
