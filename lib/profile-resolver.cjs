"use strict";

// ─── Profile Resolver ──────────────────────────────────────────────────
// Maps a complexity scan result to a recommended configuration profile
// and generates human-readable recommendation summaries.

/**
 * Configuration profiles keyed by complexity band.
 */
const PROFILES = {
  light: {
    orgMode: false,
    nervousSystem: { enabled: true, embeddingProvider: "tfidf" },
    ghostWings: { enabled: true, autoMaterialize: true },
    vanguard: { enabled: true },
  },
  medium: {
    orgMode: true,
    nervousSystem: { enabled: true, embeddingProvider: "tfidf" },
    ghostWings: { enabled: true, autoMaterialize: true },
    vanguard: { enabled: true },
  },
  heavy: {
    orgMode: true,
    nervousSystem: { enabled: true, embeddingProvider: "tfidf" },
    ghostWings: { enabled: true, autoMaterialize: true },
    orgConfig: { maxParallelismPerDepartment: 3 },
    vanguard: { enabled: true },
  },
  experimental: {
    orgMode: true,
    nervousSystem: { enabled: true, embeddingProvider: "tfidf" },
    ghostWings: { enabled: true, autoMaterialize: true },
    vanguard: { enabled: true },
  },
};

/**
 * Human-readable labels for each profile band.
 */
const PROFILE_LABELS = {
  light:        "SOLO / LOW-CEREMONY REPOSITORY",
  medium:       "MEDIUM TEAM REPOSITORY",
  heavy:        "MULTI-STREAM / HIGH-COORDINATION REPOSITORY",
  experimental: "INNOVATION / R&D ENVIRONMENT",
};

/**
 * High-impact settings that warrant explicit Commander confirmation.
 * Each entry has: key (config path), label (operational wording), dangerLevel.
 */
const HIGH_IMPACT_SETTINGS = [
  {
    key: "nervousSystem.enabled",
    label: "Enable the Nervous System (semantic routing + adaptive mesh)?",
    dangerLevel: "low",
  },
  {
    key: "ghostWings",
    label: "Allow the Mesh to detect gaps and form Ghost Wings?",
    dangerLevel: "low",
  },
  {
    key: "ghostWings.autoMaterialize",
    label: "When the Mesh detects an unclaimed domain, should it auto-form a Ghost Wing, or wait for your approval?",
    dangerLevel: "high",
  },
  {
    key: "orgMode",
    label: "Coordinate work as a structured multi-department formation?",
    dangerLevel: "medium",
  },
  {
    key: "vanguard.enabled",
    label: "Allow the Mesh to propose and stage autonomous innovation experiments?",
    dangerLevel: "high",
  },
];



/**
 * Resolve a scan result into a recommended configuration profile.
 *
 * @param {{ profile: string, confidence: string, signals: object, reasons: string[] }} scanResult
 * @returns {{ profile: string, label: string, config: object, highImpactOverrides: object[] }}
 */
function resolveRecommendedProfile(scanResult) {
  const { profile } = scanResult;
  const config = JSON.parse(JSON.stringify(PROFILES[profile] || PROFILES.light));
  const label = PROFILE_LABELS[profile] || PROFILE_LABELS.light;

  // Determine which high-impact settings differ from conservative baseline
  const highImpactOverrides = [];
  for (const setting of HIGH_IMPACT_SETTINGS) {
    const recommended = getNestedValue(config, setting.key);
    const conservative = getConservativeValue(setting.key);
    if (recommended !== conservative) {
      highImpactOverrides.push({
        ...setting,
        recommended,
        conservative,
      });
    }
  }

  return { profile, label, config, highImpactOverrides };
}

/**
 * Build the full config object from a resolved profile, applying any Commander overrides.
 *
 * @param {{ config: object }} resolved — from resolveRecommendedProfile
 * @param {object} overrides — Commander choices (e.g., { vanguard: true })
 * @returns {object} — Full config ready to write
 */
function buildConfig(resolved, overrides = {}) {
  const profile = resolved.config;

  const base = {
    version: 2,
    orgMode: profile.orgMode,
    halted: false,
    orgConfig: {
      autonomyMode: "delegated",
      crossDeptStrategy: "contract-first",
      escalationBehavior: "advisory",
      maxParallelismPerDepartment: 3,
      claimLeaseMinutes: 30,
      heartbeatMinutes: 15,
      requeueExpiredClaims: true,
      ...(profile.orgConfig || {}),
    },
    missionControl: {
      breakWorkIntoMissions: true,
      defaultRoadmapDepth: 4,
      headerStyle: "ascii-art",
      reportStyle: "ascii-command-deck",
      showRoadmapInReplies: true,
      telemetryCadence: "per-batch",
      requiredFields: ["mission", "status", "next", "risks"],
    },
    humanTiers: { tier1: [], tier2: [], tier3: [] },
    onboarding: { defaultPhase: "shadow", autoPromoteThreshold: false },
    nervousSystem: {
      enabled: profile.nervousSystem.enabled,
      embeddingProvider: profile.nervousSystem.embeddingProvider,
      embeddingModel: null,
      embeddingEndpoint: null,
      embeddingAppName: "Mercury Mesh",
      embeddingAppUrl: null,
      gravimetry: {
        minimumGravity: 0.15,
        airbridgeThreshold: 0.70,
        airbridgeMinShare: 0.20,
      },
      autonomic: {
        pulseMs: 30000,
        contextDecayMinutes: 60,
        applyCorrections: true,
      },
      ghostWings: {
        enabled: profile.ghostWings.enabled,
        autoMaterialize: profile.ghostWings.autoMaterialize,
        solidificationThreshold: 3,
        dissolutionThreshold: 2,
        maxLifespanHours: 72,
        coalescence: {
          enabled: true,
          autoCoalesce: false,
          autoThreshold: 0.65,
          flagThreshold: 0.35,
        },
      },
      constellation: {
        enabled: true,
        provider: "json",
        ragMaxEntries: 5,
        ragMinSimilarity: 0.15,
      },
      peers: {
        enabled: false,
        heartbeatOnPulse: true,
        syncOnPulse: false,
        heartbeatTTLMinutes: 30,
      },
    },
    vanguard: {
      enabled: profile.vanguard.enabled,
      outrider: {
        scanIntervalHours: 24,
        minimumAdjacencyScore: 0.40,
        maxCandidates: 20,
      },
      skunkworks: {
        maxConcurrentExperiments: 2,
        tokenBudgetPerExperiment: 50000,
        maxLifespanHours: 168,
      },
      horizonDeck: {
        maxStagedItems: 10,
        decayDays: 30,
        decayWarningDays: 7,
      },
      speculativeSortie: {
        minimumAdjacencyScore: 0.55,
        idleThresholdMinutes: 120,
        cadence: null,
        autoApprove: false,
        maxDraftsPerCycle: 2,
      },
      genesis: {
        cooldownHours: 48,
      },
    },
  };

  // Apply Commander overrides
  if (overrides.orgMode !== undefined) base.orgMode = overrides.orgMode;
  if (overrides.nervousSystem !== undefined) base.nervousSystem.enabled = overrides.nervousSystem;
  if (overrides.vanguard !== undefined) base.vanguard.enabled = overrides.vanguard;
  if (overrides.autoMaterialize !== undefined) {
    base.nervousSystem.ghostWings.autoMaterialize = overrides.autoMaterialize;
  }

  return base;
}

/**
 * Format a recommendation summary for CLI display (plain text, no ANSI).
 */
function formatRecommendationSummary(scanResult, resolved) {
  const lines = [];
  lines.push(`HULL PROFILE DETECTED :: ${resolved.label}`);
  lines.push(`CONFIDENCE            :: ${scanResult.confidence.toUpperCase()}`);
  lines.push("");
  lines.push("RECOMMENDED POSTURE");

  const cfg = resolved.config;
  lines.push(`  orgMode                 ${cfg.orgMode ? "ENABLE" : "KEEP OFF"}`);
  lines.push(`  nervousSystem           ${cfg.nervousSystem.enabled ? "ENABLE" : "KEEP OFF"}`);
  lines.push(`  ghostWings              ${cfg.ghostWings.enabled ? "ENABLE" : "KEEP OFF"}`);
  lines.push(`  autoMaterialize         ${cfg.ghostWings.autoMaterialize ? "ENABLE" : "KEEP MANUAL"}`);
  lines.push(`  vanguard                ${cfg.vanguard.enabled ? "ENABLE" : "KEEP OFF"}`);

  if (scanResult.reasons.length > 0) {
    lines.push("");
    lines.push("SIGNALS");
    for (const reason of scanResult.reasons) {
      lines.push(`  - ${reason}`);
    }
  }

  return lines.join("\n");
}

// ─── Helpers ───────────────────────────────────────────────────────────

function getNestedValue(obj, keyPath) {
  const parts = keyPath.split(".");
  let current = obj;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = current[part];
  }
  // For boolean leaves, return the value; for objects, return whether it's truthy
  if (typeof current === "object" && current !== null) {
    return current.enabled !== undefined ? current.enabled : true;
  }
  return current;
}

function getConservativeValue(key) {
  // Conservative baseline: everything off / manual
  const conservative = {
    "nervousSystem.enabled": false,
    "ghostWings": false,
    "ghostWings.autoMaterialize": true,
    "orgMode": false,
    "vanguard.enabled": true,
  };
  return conservative[key] !== undefined ? conservative[key] : false;
}

module.exports = {
  PROFILES,
  PROFILE_LABELS,
  HIGH_IMPACT_SETTINGS,
  resolveRecommendedProfile,
  buildConfig,
  formatRecommendationSummary,
};
