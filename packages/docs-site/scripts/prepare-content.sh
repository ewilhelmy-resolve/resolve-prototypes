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

# Clean previous content
rm -rf "$CONTENT_DIR"
mkdir -p "$CONTENT_DIR"

# Copy discover docs (auto-generated)
for dir in actors views journeys constraints generated; do
  if [ -d "$DISCOVER_DIR/$dir" ]; then
    cp -r "$DISCOVER_DIR/$dir" "$CONTENT_DIR/$dir"
  fi
done

# Copy README as index
if [ -f "$DISCOVER_DIR/README.md" ]; then
  cp "$DISCOVER_DIR/README.md" "$CONTENT_DIR/README.md"
fi

# Strip 'id:' from frontmatter to avoid Docusaurus duplicate ID collisions
find "$CONTENT_DIR" -name '*.md' -exec sed -i '' '/^id: /d' {} \;

# Escape curly braces outside frontmatter to prevent MDX expression evaluation
# Matches {word} patterns and escapes them as \{word\}
find "$CONTENT_DIR" -name '*.md' -exec sed -i '' 's/{\([a-zA-Z_$][a-zA-Z0-9_$]*\)}/\\{\1\\}/g' {} \;

# Add category metadata for sidebar labels
echo '{"label": "Journeys", "position": 1}' > "$CONTENT_DIR/journeys/_category_.json"
echo '{"label": "Actors", "position": 2}' > "$CONTENT_DIR/actors/_category_.json"
echo '{"label": "Views", "position": 3}' > "$CONTENT_DIR/views/_category_.json"
echo '{"label": "Constraints", "position": 4}' > "$CONTENT_DIR/constraints/_category_.json"
echo '{"label": "Reports", "position": 5}' > "$CONTENT_DIR/generated/_category_.json"

echo "Content prepared in $CONTENT_DIR"
echo "  actors:      $(find "$CONTENT_DIR/actors" -name '*.md' | wc -l | tr -d ' ') files"
echo "  views:       $(find "$CONTENT_DIR/views" -name '*.md' | wc -l | tr -d ' ') files"
echo "  journeys:    $(find "$CONTENT_DIR/journeys" -name '*.md' | wc -l | tr -d ' ') files"
echo "  constraints: $(find "$CONTENT_DIR/constraints" -name '*.md' | wc -l | tr -d ' ') files"
echo "  reports:     $(find "$CONTENT_DIR/generated" -name '*.md' | wc -l | tr -d ' ') files"
