---
name: "model-selection"
description: "Determines which LLM model to use for each agent spawn based on a 5-layer resolution hierarchy, including user preferences, session directives, charter specifications, task-aware defaults, and a hardcoded fallback."
---
# Model Selection

> Determines which LLM model to use for each agent spawn.

## SCOPE

✅ THIS SKILL PRODUCES:
- A resolved `model` parameter for every `task` tool call
- Persistent model preferences in `.mesh/config.json`
- Spawn acknowledgments that include the resolved model

❌ THIS SKILL DOES NOT PRODUCE:
- Code, tests, or documentation
- Model performance benchmarks
- Cost reports or billing artifacts

## Context

Mercury Mesh supports 18+ models across three tiers (premium, standard, fast). The coordinator must select the right model for each agent spawn. Users can set persistent preferences that survive across sessions.

## 5-Layer Model Resolution Hierarchy

Resolution is **first-match-wins** — the highest layer with a value wins.

| Layer | Name | Source | Persistence |
|-------|------|--------|-------------|
| **0a** | Per-Agent Config | `.mesh/config.json` → `agentModelOverrides.{name}` | Persistent (survives sessions) |
| **0b** | Global Config | `.mesh/config.json` → `defaultModel` | Persistent (survives sessions) |
| **1** | Session Directive | User said "use X" in current session | Session-only |
| **2** | Charter Preference | Agent's `charter.md` → `## Model` section | Persistent (in charter) |
| **3** | Task-Aware Auto | `.mesh/config.json` → `modelRouting.taskTypes` | Computed per-spawn |
| **4** | Default | `.mesh/config.json` → `modelRouting.default`, then `defaultModel`, then omit model param | Configured fallback |

**Key principle:** Layer 0 (persistent config) beats everything. If the user said "always use opus" and it was saved to config.json, every agent gets opus regardless of role or task type. This is intentional — the user explicitly chose quality over cost.

## AGENT WORKFLOW

### On Session Start

1. READ `.mesh/config.json`
2. CHECK for `defaultModel` field — if present, this is the Layer 0 override for all spawns
3. CHECK for `agentModelOverrides` field — if present, these are per-agent Layer 0a overrides
4. STORE both values in session context for the duration

### On Every Agent Spawn

1. CHECK Layer 0a: Is there an `agentModelOverrides.{agentName}` in config.json? → Use it.
2. CHECK Layer 0b: Is there a `defaultModel` in config.json? → Use it.
3. CHECK Layer 1: Did the user give a session directive? → Use it.
4. CHECK Layer 2: Does the agent's charter have a `## Model` section? → Use it.
5. CHECK Layer 3: Read the active `config.json` → `modelRouting.taskTypes`:
  - Code (implementation, tests, refactoring, bug fixes) → `taskTypes.code`
  - Prompts, agent designs → `taskTypes.prompts` or `taskTypes.code`
  - Lead, architecture, reviewer, or security work → `taskTypes.lead`
  - Visual/design with image analysis → `taskTypes.visual`
  - Non-code (docs, planning, triage, changelogs) → `taskTypes.docs`
6. FALLBACK Layer 4: `modelRouting.default`, then `defaultModel`, then omit the model param
7. INCLUDE model in spawn acknowledgment: `🔧 {Name} ({resolved_model}) — {task}`

### When User Sets a Preference

**Trigger phrases:** "always use X", "use X for everything", "switch to X", "default to X"

1. VALIDATE the model ID against the catalog (18+ models)
2. WRITE `defaultModel` to the active `config.json` (merge, don't overwrite)
3. ACKNOWLEDGE: `✅ Model preference saved: {model} — all future sessions will use this until changed.`

**Per-agent trigger:** "use X for {agent}"

1. VALIDATE model ID
2. WRITE to `agentModelOverrides.{agent}` in the active `config.json`
3. ACKNOWLEDGE: `✅ {Agent} will always use {model} — saved to config.`

**Per-category trigger:** "use X for code" / "use X for docs" / "use X for lead reviews"

1. VALIDATE model ID
2. WRITE to the active `config.json` → `modelRouting.taskTypes.{category}`
3. ACKNOWLEDGE: `✅ {category} tasks now route to {model}.`

### When User Clears a Preference

**Trigger phrases:** "switch back to automatic", "clear model preference", "use default models"

1. REMOVE `defaultModel` from the active `config.json`
2. ACKNOWLEDGE: `✅ Model preference cleared — returning to automatic selection.`

### STOP

After resolving the model and including it in the spawn template, this skill is done. Do NOT:
- Generate model comparison reports
- Run benchmarks or speed tests
- Create new config files (only modify existing `config.json` in the active runtime root)
- Change the model after spawn (fallback chains handle runtime failures)

## Config Schema

The active `config.json` (`.mesh/config.json` or `.mesh/config.json`) model-related fields:

```json
{
  "version": 1,
  "modelRouting": {
    "default": "gpt-5.4",
    "taskTypes": {
      "code": "gpt-5.4",
      "prompts": "gpt-5.4",
      "docs": "gpt-5.4",
      "lead": "claude-opus-4.6",
      "visual": "claude-opus-4.6"
    },
    "fallbacks": {
      "premium": ["claude-opus-4.6", "gpt-5.4"],
      "standard": ["gpt-5.4"],
      "fast": ["gpt-5.4"]
    }
  }
}
```

- `modelRouting.default` — default model for task-aware routing when no category-specific route matches
- `modelRouting.taskTypes` — config-driven category routing for Layer 3
- `modelRouting.fallbacks` — ordered fallback lists per tier, filtered by `allowedModels` when present
- `defaultModel` and `agentModelOverrides` remain valid explicit overrides above task routing

## Fallback Chains

If a model is unavailable (rate limit, plan restriction), retry within the same tier:

```
Premium:  `modelRouting.fallbacks.premium[]`
Standard: `modelRouting.fallbacks.standard[]`
Fast:     `modelRouting.fallbacks.fast[]`
```

**Keep fallbacks inside the repo allowlist when `allowedModels` is active.** If no allowed fallback exists, omit the model parameter.
