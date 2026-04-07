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
    ghostWings: { enabled: true, autoMaterialize: false },
    vanguard: { enabled: false },
  },
  medium: {
    orgMode: true,
    nervousSystem: { enabled: true, embeddingProvider: "tfidf" },
    ghostWings: { enabled: true, autoMaterialize: false },
    vanguard: { enabled: false },
  },
  heavy: {
    orgMode: true,
    nervousSystem: { enabled: true, embeddingProvider: "tfidf" },
    ghostWings: { enabled: true, autoMaterialize: false },
    orgConfig: { maxParallelismPerDepartment: 3 },
    vanguard: { enabled: false },
  },
  experimental: {
    orgMode: true,
    nervousSystem: { enabled: true, embeddingProvider: "tfidf" },
    ghostWings: { enabled: true, autoMaterialize: false },
    vanguard: { enabled: false },
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
  const base = {
    version: 2,
    halted: false,
    allowedModels: [],
    modelRouting: {
      taskTypes: {},
      fallbacks: {
        premium: [],
        standard: [],
        fast: [],
      },
    },
    humanTiers: { tier1: [], tier2: [], tier3: [] },
    onboarding: { defaultPhase: "shadow", autoPromoteThreshold: false },
  };

  // Apply profile config
  const profile = resolved.config;
  base.orgMode = profile.orgMode;
  base.nervousSystem = {
    enabled: profile.nervousSystem.enabled,
    embeddingProvider: profile.nervousSystem.embeddingProvider,
  };
  base.vanguard = { enabled: profile.vanguard.enabled };

  if (profile.orgConfig) {
    base.orgConfig = { ...profile.orgConfig };
  }

  // Apply Commander overrides
  if (overrides.orgMode !== undefined) base.orgMode = overrides.orgMode;
  if (overrides.nervousSystem !== undefined) base.nervousSystem.enabled = overrides.nervousSystem;
  if (overrides.vanguard !== undefined) base.vanguard.enabled = overrides.vanguard;
  if (overrides.autoMaterialize !== undefined) {
    base.ghostWings = { autoMaterialize: overrides.autoMaterialize };
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
    "ghostWings.autoMaterialize": false,
    "orgMode": false,
    "vanguard.enabled": false,
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
