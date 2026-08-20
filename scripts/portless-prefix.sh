#!/bin/sh
BRANCH=$(git branch --show-current 2>/dev/null)
PREFIX=$(echo "$BRANCH" | grep -oE '^[A-Za-z]+-[0-9]+' | tr '[:upper:]' '[:lower:]')
if [ -z "$PREFIX" ] && [ "$BRANCH" != "main" ] && [ "$BRANCH" != "master" ] && [ -n "$BRANCH" ]; then
  PREFIX=$(echo "$BRANCH" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9-]/-/g; s/--*/-/g; s/^-//; s/-$//')
fi
[ -n "$PREFIX" ] && printf '%s.' "$PREFIX"
