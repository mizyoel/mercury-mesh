---
name: "release-process"
description: "Step-by-step release checklist for Mercury Mesh — prevents v0.8.22-style disasters"
domain: "release-management"
confidence: "high"
source: "team-decision"
---

## Context

This is the **definitive release runbook** for Mercury Mesh. Born from the v0.8.22 release disaster (4-part semver mangled by npm, draft release never triggered publish, wrong NPM_TOKEN type, 6+ hours of broken `latest` dist-tag).

**Rule:** No agent releases Mercury Mesh without following this checklist. No exceptions. No improvisation.

---

## Pre-Release Validation

Before starting ANY release work, validate the following:

### 1. Version Number Validation

**Rule:** Only 3-part semver (major.minor.patch) or prerelease (major.minor.patch-tag.N) are valid. 4-part versions (0.8.21.4) are NOT valid semver and npm will mangle them.

```bash
# Check version is valid semver
node -p "require('semver').valid('0.8.22')"
# Output: '0.8.22' = valid
# Output: null = INVALID, STOP

# For prerelease versions
node -p "require('semver').valid('0.8.23-preview.1')"
# Output: '0.8.23-preview.1' = valid
```

**If `semver.valid()` returns `null`:** STOP. Fix the version. Do NOT proceed.

### 2. Publish Authentication Verification

**Rule:** Prefer **npm trusted publishing** from GitHub Actions via OIDC. Token-based publish is fallback only.

**Preferred path: trusted publishing**
1. Go to npmjs.com → Package Settings → Trusted publishing.
2. Add GitHub Actions publisher: owner `mizyoel`, repo `mercury-mesh`, workflow `publish.yml`.
3. Ensure `package.json` has `repository.url = https://github.com/mizyoel/mercury-mesh.git`.
4. Keep GitHub Actions permission `id-token: write` enabled in `publish.yml`.

**Fallback path: granular token**
- Use `NPM_TOKEN` only if trusted publishing is not configured yet.
- `NPM_TOKEN` must be a **granular write token with bypass 2FA enabled**.
- A normal user token with 2FA enforced will fail in CI with `EOTP`.
- Legacy token guidance from older runbooks is obsolete; npm now recommends trusted publishing first.

**If using a token that still requires OTP:** STOP. Replace it or switch the package to trusted publishing before retrying release automation.

### 3. Branch and Tag State

**Rule:** Release from `main` branch. Ensure clean state, no uncommitted changes, latest from origin.

```bash
# Ensure on main and clean
git checkout main
git pull origin main
git status  # Should show: "nothing to commit, working tree clean"

# Check tag doesn't already exist
git tag -l "v0.8.22"
# Output should be EMPTY. If tag exists, release already done or collision.
```

**If tag exists:** STOP. Either release was already done, or there's a collision. Investigate before proceeding.

### 4. Disable bump-build.mjs

**Rule:** `bump-build.mjs` is for dev builds ONLY. It must NOT run during release builds (it increments build numbers, creating 4-part versions).

```bash
# Set env var to skip bump-build.mjs
export SKIP_BUILD_BUMP=1

# Verify it's set
echo $SKIP_BUILD_BUMP
# Output: 1
```

**For Windows PowerShell:**
```powershell
$env:SKIP_BUILD_BUMP = "1"
```

**If not set:** `bump-build.mjs` will run and mutate versions. This causes disasters (see v0.8.22).

---

## Release Workflow

### Step 1: Version Bump

Update version in all 3 package.json files (root + both workspaces) in lockstep.

```bash
# Set target version (no 'v' prefix)
VERSION="0.8.22"

# Validate it's valid semver BEFORE proceeding
node -p "require('semver').valid('$VERSION')"
# Must output the version string, NOT null

# Update all 3 package.json files
npm version $VERSION --workspaces --include-workspace-root --no-git-tag-version

# Verify all 3 match
grep '"version"' package.json packages/Mercury Mesh-sdk/package.json packages/Mercury Mesh-cli/package.json
# All 3 should show: "version": "0.8.22"
```

**Checkpoint:** All 3 package.json files have identical versions. Run `semver.valid()` one more time to be sure.

### Step 2: Commit and Tag

```bash
# Commit version bump
git add package.json packages/Mercury Mesh-sdk/package.json packages/Mercury Mesh-cli/package.json
git commit -m "chore: bump version to $VERSION

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"

# Create tag (with 'v' prefix)
git tag -a "v$VERSION" -m "Release v$VERSION"

# Push commit and tag
git push origin main
git push origin "v$VERSION"
```

**Checkpoint:** Tag created and pushed. Verify with `git tag -l "v$VERSION"`.

### Step 3: Create GitHub Release

**CRITICAL:** Release must be **published**, NOT draft. Draft releases don't trigger `publish.yml` workflow.

```bash
# Create GitHub Release (NOT draft)
gh release create "v$VERSION" \
  --title "v$VERSION" \
  --notes "Release notes go here" \
  --latest

# Verify release is PUBLISHED (not draft)
gh release view "v$VERSION"
# Output should NOT contain "(draft)"
```

**If output contains `(draft)`:** STOP. Delete the release and recreate without `--draft` flag.

```bash
# If you accidentally created a draft, fix it:
gh release edit "v$VERSION" --draft=false
```

**Checkpoint:** Release is published (NOT draft). The `release: published` event fired and triggered `publish.yml`.

### Step 4: Monitor Workflow

The `publish.yml` workflow should start automatically within 10 seconds of release creation.

```bash
# Watch workflow runs
gh run list --workflow=publish.yml --limit 1

# Get detailed status
gh run view --log
```

**Expected flow:**
1. `publish-sdk` job runs → publishes `@mizyoel/mercury-mesh-sdk`
2. Verify step runs with retry loop (up to 5 attempts, 15s interval) to confirm SDK on npm registry
3. `publish-cli` job runs → publishes `@mizyoel/mercury-mesh-cli`
4. Verify step runs with retry loop to confirm CLI on npm registry

**If workflow fails:** Check the logs. Common issues:
- EOTP error = token requires OTP; use trusted publishing or a granular write token with bypass 2FA enabled
- Verify step timeout = npm propagation delay (retry loop should handle this, but propagation can take up to 2 minutes in rare cases)
- Version mismatch = package.json version doesn't match tag

**Checkpoint:** Both jobs succeeded. Workflow shows green checkmarks.

### Step 5: Verify npm Publication

Manually verify both packages are on npm with correct `latest` dist-tag.

```bash
# Check SDK
npm view @mizyoel/mercury-mesh-sdk version
# Output: 0.8.22

npm dist-tag ls @mizyoel/mercury-mesh-sdk
# Output should show: latest: 0.8.22

# Check CLI
npm view @mizyoel/mercury-mesh-cli version
# Output: 0.8.22

npm dist-tag ls @mizyoel/mercury-mesh-cli
# Output should show: latest: 0.8.22
```

**If versions don't match:** Something went wrong. Check workflow logs. DO NOT proceed with GitHub Release announcement until npm is correct.

**Checkpoint:** Both packages show correct version. `latest` dist-tags point to the new version.

### Step 6: Test Installation

Verify packages can be installed from npm (real-world smoke test).

```bash
# Create temp directory
mkdir /tmp/Mercury Mesh-release-test && cd /tmp/Mercury Mesh-release-test

# Test SDK installation
npm init -y
npm install @mizyoel/mercury-mesh-sdk
node -p "require('@mizyoel/mercury-mesh-sdk/package.json').version"
# Output: 0.8.22

# Test CLI installation
npm install -g @mizyoel/mercury-mesh-cli
mercury-mesh --version
# Output: 0.8.22

# Test CLI upgrade path
npm install -g @mizyoel/mercury-mesh-cli@latest
mercury-mesh --version
# Output: 0.8.22

# Cleanup
cd -
npm install -g @mizyoel/mercury-mesh-cli
mercury-mesh --version
# Output: 0.8.22

# Test CLI upgrade path
npm install -g @mizyoel/mercury-mesh-cli@latest
mercury-mesh --version
```

**If installation fails:** npm registry issue or package metadata corruption. DO NOT announce release until this works.

**Checkpoint:** Both packages install cleanly. Versions match.

### Step 7: Sync dev to Next Preview

After main release, sync dev to the next preview version.

```bash
# Checkout dev
git checkout dev
git pull origin dev

# Bump to next preview version (e.g., 0.8.23-preview.1)
NEXT_VERSION="0.8.23-preview.1"

# Validate semver
node -p "require('semver').valid('$NEXT_VERSION')"
# Must output the version string, NOT null

# Update all 3 package.json files
npm version $NEXT_VERSION --workspaces --include-workspace-root --no-git-tag-version

# Commit
git add package.json packages/Mercury Mesh-sdk/package.json packages/Mercury Mesh-cli/package.json
git commit -m "chore: bump dev to $NEXT_VERSION

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"

# Push
git push origin dev
```

**Checkpoint:** dev branch now shows next preview version. Future dev builds will publish to `@preview` dist-tag.

---

## Manual Publish (Fallback)

If `publish.yml` workflow fails or needs to be bypassed, use `workflow_dispatch` to manually trigger publish.

```bash
# Trigger manual publish
gh workflow run publish.yml -f version="0.8.22"

# Monitor the run
gh run watch
```

**Rule:** Only use this if automated publish failed. Always investigate why automation failed and fix it for next release.

---

## Rollback Procedure

If a release is broken and needs to be rolled back:

### 1. Unpublish from npm (Nuclear Option)

**WARNING:** npm unpublish is time-limited (24 hours) and leaves the version slot burned. Only use if version is critically broken.

```bash
# Unpublish (requires npm owner privileges)
npm unpublish @mizyoel/mercury-mesh-sdk@0.8.22
npm unpublish @mizyoel/mercury-mesh-cli@0.8.22
```

### 2. Deprecate on npm (Preferred)

**Preferred approach:** Mark version as deprecated, publish a hotfix.

```bash
# Deprecate broken version
npm deprecate @mizyoel/mercury-mesh-sdk@0.8.22 "Broken release, use 0.8.22.1 instead"
npm deprecate @mizyoel/mercury-mesh-cli@0.8.22 "Broken release, use 0.8.22.1 instead"

# Publish hotfix version
# (Follow this runbook with version 0.8.22.1)
```

### 3. Delete GitHub Release and Tag

```bash
# Delete GitHub Release
gh release delete "v0.8.22" --yes

# Delete tag locally and remotely
git tag -d "v0.8.22"
git push origin --delete "v0.8.22"
```

### 4. Revert Commit on main

```bash
# Revert version bump commit
git checkout main
git revert HEAD
git push origin main
```

**Checkpoint:** Tag and release deleted. main branch reverted. npm packages deprecated or unpublished.

---

## Common Failure Modes

### EOTP Error (npm OTP Required)

**Symptom:** Workflow fails with `EOTP` error.  
**Root cause:** NPM_TOKEN is a User token with 2FA enabled. CI can't provide OTP.  
**Fix:** Either configure npm trusted publishing for `publish.yml`, or replace `NPM_TOKEN` with a granular write token that has bypass 2FA enabled.

### Verify Step 404 (npm Propagation Delay)

**Symptom:** Verify step fails with 404 even though publish succeeded.  
**Root cause:** npm registry propagation delay (5-30 seconds).  
**Fix:** Verify step now has retry loop (5 attempts, 15s interval). Should auto-resolve. If not, wait 2 minutes and re-run workflow.

### Version Mismatch (package.json ≠ tag)

**Symptom:** Verify step fails with "Package version (X) does not match target version (Y)".  
**Root cause:** package.json version doesn't match the tag version.  
**Fix:** Ensure all 3 package.json files were updated in Step 1. Re-run `npm version` if needed.

### 4-Part Version Mangled by npm

**Symptom:** Published version on npm doesn't match package.json (e.g., 0.8.21.4 became 0.8.2-1.4).  
**Root cause:** 4-part versions are NOT valid semver. npm's parser misinterprets them.  
**Fix:** NEVER use 4-part versions. Only 3-part (0.8.22) or prerelease (0.8.23-preview.1). Run `semver.valid()` before ANY commit.

### Draft Release Didn't Trigger Workflow

**Symptom:** Release created but `publish.yml` never ran.  
**Root cause:** Release was created as a draft. Draft releases don't emit `release: published` event.  
**Fix:** Edit release and change to published: `gh release edit "v$VERSION" --draft=false`. Workflow should trigger immediately.

---

## Validation Checklist

Before starting ANY release, confirm:

- [ ] Version is valid semver: `node -p "require('semver').valid('VERSION')"` returns the version string (NOT null)
- [ ] Publish auth is ready: npm trusted publishing is configured for `publish.yml`, or `NPM_TOKEN` is a granular write token with bypass 2FA enabled
- [ ] Branch is clean: `git status` shows "nothing to commit, working tree clean"
- [ ] Tag doesn't exist: `git tag -l "vVERSION"` returns empty
- [ ] `SKIP_BUILD_BUMP=1` is set: `echo $SKIP_BUILD_BUMP` returns `1`

Before creating GitHub Release:

- [ ] All 3 package.json files have matching versions: `grep '"version"' package.json packages/*/package.json`
- [ ] Commit is pushed: `git log origin/main..main` returns empty
- [ ] Tag is pushed: `git ls-remote --tags origin vVERSION` returns the tag SHA

After GitHub Release:

- [ ] Release is published (NOT draft): `gh release view "vVERSION"` output doesn't contain "(draft)"
- [ ] Workflow is running: `gh run list --workflow=publish.yml --limit 1` shows "in_progress"

After workflow completes:

- [ ] Both jobs succeeded: Workflow shows green checkmarks
- [ ] SDK on npm: `npm view @mizyoel/mercury-mesh-sdk version` returns correct version
- [ ] CLI on npm: `npm view @mizyoel/mercury-mesh-cli version` returns correct version
- [ ] `latest` tags correct: `npm dist-tag ls @mizyoel/mercury-mesh-sdk` shows `latest: VERSION`
- [ ] Packages install: `npm install -g @mizyoel/mercury-mesh-cli` succeeds
- [ ] Packages upgrade: `npm install -g @mizyoel/mercury-mesh-cli@latest` succeeds

After dev sync:

- [ ] dev branch has next preview version: `git show dev:package.json | grep version` shows next preview

---

## Post-Mortem Reference

This skill was created after the v0.8.22 release disaster. Full retrospective: `.mesh/decisions/inbox/keaton-v0822-retrospective.md`

**Key learnings:**
1. No release without a runbook = improvisation = disaster
2. Semver validation is mandatory — 4-part versions break npm
3. Publish auth mode matters — trusted publishing is preferred, and token fallback must bypass 2FA
4. Draft releases are a footgun — they don't trigger automation
5. Retry logic is essential — npm propagation takes time

**Never again.**
