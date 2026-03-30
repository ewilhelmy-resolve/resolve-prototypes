#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DOCS_SITE_DIR="$(dirname "$SCRIPT_DIR")"
REPO_ROOT="$(cd "$DOCS_SITE_DIR/../.." && pwd)"
CONTENT_DIR="$DOCS_SITE_DIR/content"
DISCOVER_DIR="$REPO_ROOT/docs/discover"

if [ ! -d "$DISCOVER_DIR" ]; then
  echo "Error: docs/discover/ not found. Run 'pnpm spec:build' first."
  exit 1
fi

# Portable sed -i: GNU uses -i, BSD/macOS uses -i ''
if sed --version 2>/dev/null | grep -q GNU; then
  SED_INPLACE=(sed -i)
else
  SED_INPLACE=(sed -i '')
fi

# Clean previous content
rm -rf "$CONTENT_DIR"
mkdir -p "$CONTENT_DIR"

# Copy discover docs (auto-generated)
DIRS=(actors views journeys constraints generated)
for dir in "${DIRS[@]}"; do
  if [ -d "$DISCOVER_DIR/$dir" ]; then
    cp -r "$DISCOVER_DIR/$dir" "$CONTENT_DIR/$dir"
  fi
done

# Copy README as index
if [ -f "$DISCOVER_DIR/README.md" ]; then
  cp "$DISCOVER_DIR/README.md" "$CONTENT_DIR/README.md"
fi

# Combined pass: strip 'id:' frontmatter (duplicate ID collisions) and
# escape {word} patterns (MDX expression evaluation)
find "$CONTENT_DIR" -name '*.md' -exec \
  "${SED_INPLACE[@]}" \
  -e '/^id: /d' \
  -e 's/{\([a-zA-Z_$][a-zA-Z0-9_$]*\)}/\\{\1\\}/g' \
  {} +

# Summary
echo "Content prepared in $CONTENT_DIR"
for dir in "${DIRS[@]}"; do
  if [ -d "$CONTENT_DIR/$dir" ]; then
    count=$(find "$CONTENT_DIR/$dir" -name '*.md' | wc -l | tr -d ' ')
    printf "  %-14s %s files\n" "$dir:" "$count"
  fi
done
