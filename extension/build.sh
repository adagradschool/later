#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "Building Later extension..."

# Clean dist directories
rm -rf dist/chrome/* dist/firefox/*

# Build Chrome
echo "Building Chrome extension..."
cp -r src/* dist/chrome/
cp manifests/chrome.json dist/chrome/manifest.json

# Build Firefox
echo "Building Firefox extension..."
cp -r src/* dist/firefox/
cp manifests/firefox.json dist/firefox/manifest.json

echo "Done! Extensions built in dist/chrome and dist/firefox"
