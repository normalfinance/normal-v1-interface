#!/bin/bash

# Allow builds only on testnet and master branches
if [ "$VERCEL_GIT_BRANCH" == "testnet" ] || [ "$VERCEL_GIT_BRANCH" == "master" ] || [ "$VERCEL_GIT_BRANCH" == "develop" ]; then
  echo "✅ Proceeding with build on branch: $VERCEL_GIT_BRANCH"
  exit 1  # Do NOT ignore build
else
  echo "🚫 Skipping build on branch: $VERCEL_GIT_BRANCH"
  exit 0  # Ignore build
fi
