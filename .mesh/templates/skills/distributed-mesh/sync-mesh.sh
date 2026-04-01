#!/bin/bash
# sync-mesh.sh — Materialize remote mesh state locally
#
# Reads mesh.json, fetches remote meshes into local directories.
# Run before agent reads. No daemon. No service. ~40 lines.
#
# Usage: ./sync-mesh.sh [path-to-mesh.json]
#        ./sync-mesh.sh --init [path-to-mesh.json]
# Requires: jq (https://github.com/jqlang/jq), git, curl

set -euo pipefail

# Handle --init mode
if [ "${1:-}" = "--init" ]; then
  MESH_JSON="${2:-mesh.json}"
  
  if [ ! -f "$MESH_JSON" ]; then
    echo "❌ $MESH_JSON not found"
    exit 1
  fi
  
  echo "🚀 Initializing mesh state repository..."
  nodes=$(jq -r '.meshes | keys[]' "$MESH_JSON")
  
  # Create node directories with placeholder SUMMARY.md
  for node in $nodes; do
    if [ ! -d "$node" ]; then
      mkdir -p "$node"
      echo "  ✓ Created $node/"
    else
      echo "  • $node/ exists (skipped)"
    fi
    
    if [ ! -f "$node/SUMMARY.md" ]; then
      echo -e "# $node\n\n_No state published yet._" > "$node/SUMMARY.md"
      echo "  ✓ Created $node/SUMMARY.md"
    else
      echo "  • $node/SUMMARY.md exists (skipped)"
    fi
  done
  
  # Generate root README.md
  if [ ! -f "README.md" ]; then
    {
      echo "# Mercury Mesh State Repository"
      echo ""
      echo "This repository tracks published state from participating meshes."
      echo ""
      echo "## Participating Meshes"
      echo ""
      for node in $nodes; do
        zone=$(jq -r ".meshes.\"$node\".zone" "$MESH_JSON")
        echo "- **$node** (Zone: $zone)"
      done
      echo ""
      echo "Each mesh directory contains a \`SUMMARY.md\` with their latest published state."
      echo "State is synchronized using \`sync-mesh.sh\` or \`sync-mesh.ps1\`."
    } > README.md
    echo "  ✓ Created README.md"
  else
    echo "  • README.md exists (skipped)"
  fi
  
  echo ""
  echo "✅ Mesh state repository initialized"
  exit 0
fi

MESH_JSON="${1:-mesh.json}"

# Zone 2: Remote-trusted — git clone/pull
for node in $(jq -r '.meshes | to_entries[] | select(.value.zone == "remote-trusted") | .key' "$MESH_JSON"); do
  source=$(jq -r ".meshes.\"$node\".source" "$MESH_JSON")
  ref=$(jq -r ".meshes.\"$node\".ref // \"main\"" "$MESH_JSON")
  target=$(jq -r ".meshes.\"$node\".sync_to" "$MESH_JSON")

  if [ -d "$target/.git" ]; then
    git -C "$target" pull --rebase --quiet 2>/dev/null \
      || echo "⚠ $node: pull failed (using stale)"
  else
    mkdir -p "$(dirname "$target")"
    git clone --quiet --depth 1 --branch "$ref" "$source" "$target" 2>/dev/null \
      || echo "⚠ $node: clone failed (unavailable)"
  fi
done

# Zone 3: Remote-opaque — fetch published contracts
for node in $(jq -r '.meshes | to_entries[] | select(.value.zone == "remote-opaque") | .key' "$MESH_JSON"); do
  source=$(jq -r ".meshes.\"$node\".source" "$MESH_JSON")
  target=$(jq -r ".meshes.\"$node\".sync_to" "$MESH_JSON")
  auth=$(jq -r ".meshes.\"$node\".auth // \"\"" "$MESH_JSON")

  mkdir -p "$target"
  auth_flag=""
  if [ "$auth" = "bearer" ]; then
    token_var="$(echo "${node}" | tr '[:lower:]-' '[:upper:]_')_TOKEN"
    [ -n "${!token_var:-}" ] && auth_flag="--header \"Authorization: Bearer ${!token_var}\""
  fi

  eval curl --silent --fail $auth_flag "$source" -o "$target/SUMMARY.md" 2>/dev/null \
    || echo "# ${node} — unavailable ($(date))" > "$target/SUMMARY.md"
done

echo "✓ Mesh sync complete"
