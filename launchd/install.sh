#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLIST_NAME="com.later.daemon.plist"
PLIST_SRC="$SCRIPT_DIR/$PLIST_NAME"
PLIST_DEST="$HOME/Library/LaunchAgents/$PLIST_NAME"

echo "Installing Later daemon..."

# Create log directory
mkdir -p "$HOME/.later"

# Stop existing service if running
if launchctl list | grep -q "com.later.daemon"; then
    echo "Stopping existing service..."
    launchctl unload "$PLIST_DEST" 2>/dev/null || true
fi

# Copy plist to LaunchAgents
echo "Copying plist to ~/Library/LaunchAgents/"
cp "$PLIST_SRC" "$PLIST_DEST"

# Load the service
echo "Loading service..."
launchctl load "$PLIST_DEST"

echo "Done! Later daemon is now running."
echo "Logs: ~/.later/daemon.log"
echo "Errors: ~/.later/daemon.error.log"
