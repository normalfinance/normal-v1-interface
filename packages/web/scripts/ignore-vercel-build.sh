#!/bin/bash

# Allow builds only on staging and master branches
if [ "$VERCEL_GIT_BRANCH" == "staging" ] || [ "$VERCEL_GIT_BRANCH" == "master" ]; then
  echo "✅ Proceeding with build on branch: $VERCEL_GIT_BRANCH"
  exit 1  # Do NOT ignore build
else
  echo "🚫 Skipping build on branch: $VERCEL_GIT_BRANCH"
  exit 0  # Ignore build
fi
