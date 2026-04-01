# Org Autonomy Runtime Spec

This spec defines the first minimal runtime for concurrent, semi-autonomous departments in Org Mode.

## Design Goal

Departments should work concurrently and with local initiative, while remaining inside Mercury Mesh's coordinator-led control plane.

The coordinator remains the global control plane.
Department leads act as local schedulers inside an approved authority envelope.
Department members execute leased work packets in parallel.

## Core Principle

**Autonomy is delegated, not sovereign.**

- The coordinator still owns spawning, synthesis, and escalation.
- Department leads may decompose and prioritize local work.
- Members may claim queued work only within department scope.
- Human tiers, E-Stop, and lifecycle status always override department autonomy.

## Required Runtime Files

When `orgMode: true`, create:

```text
.mesh/org/
  structure.json
  contracts/
    {contract-name}.md
  {department-id}/
    charter.md
    backlog.md
    state.json
```

## structure.json Schema

Each department entry should include:

- `id`
- `name`
- `lead`
- `members`
- `domain`
- `routingKeywords`
- `leadStyle`
- `authority.canDecideLocally`
- `authority.mustEscalate`
- `runtime.autonomyMode`
- `runtime.maxParallelism`
- `runtime.claimLeaseMinutes`
- `runtime.heartbeatMinutes`
- `runtime.backlogPath`
- `runtime.statePath`
- `runtime.contracts`

## Work Item Lifecycle

Every backlog item moves through these states:

1. `queued`
2. `claimed`
3. `in_progress`
4. `blocked`
5. `review`
6. `done`

Each claimed item must record:

- `workItemId`
- `claimedBy`
- `claimedAt`
- `leaseExpiresAt`
- `status`
- `dependsOn`
- `outputs`

## Claim And Lease Protocol

- A member may claim only work that is in its department domain and not already claimed.
- Claims expire after `claimLeaseMinutes`.
- Expired claims are re-queued by Ralph or the coordinator if `requeueExpiredClaims` is true.
- Members must heartbeat before lease expiry when long-running work is still active.
- Shadow agents may inspect backlog items but may not claim execution work.

## Department Scheduler Loop

The minimal autonomous loop is:

1. Coordinator routes a mission to the relevant department lead.
2. Lead decomposes it into work packets and writes them to `backlog.md`.
3. Coordinator spawns eligible members against independent packets.
4. Members execute in parallel under lease.
5. Lead reviews probationary or blocked outputs.
6. Scribe records outcomes; Ralph requeues stale work.

This preserves the coordinator's spawn ownership while allowing local department initiative.

## Cross-Department Work

Cross-department work is **contract-first**.

- Before departments run in parallel, define an interface contract in `.mesh/org/contracts/`.
- Contracts define producer, consumer, inputs, outputs, invariants, and version.
- Departments may proceed concurrently against the current contract version.
- Contract changes trigger a lead alignment round.

## Local Authority

Department leads may decide locally on:

- internal decomposition
- packet assignment
- implementation conventions inside the department
- test strategy inside the department

Department leads must escalate:

- architecture changes affecting another department
- contract changes
- compute policy exceptions
- roster changes
- destructive actions outside department scope

## Safety Gates

Autonomy is suspended when:

- `halted: true`
- `.mesh/HALT` exists
- the user lacks required human tier
- the acting agent is `shadow`
- department parallelism limit is reached
- required contract or dependency is unresolved

## Minimal Rollout

Phase 1 in this repo implements:

- org runtime config defaults
- a structure template with runtime fields
- department backlog and state templates
- contract template
- coordinator rules for delegated department scheduling

Future phases can add:

- automated claim reconciliation
- department heartbeats
- Ralph-driven backlog pickup cycles
- metrics and compute budgeting per department
