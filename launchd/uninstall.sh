#!/bin/bash
set -e

PLIST_NAME="com.later.daemon.plist"
PLIST_DEST="$HOME/Library/LaunchAgents/$PLIST_NAME"

echo "Uninstalling Later daemon..."

# Stop and unload the service
if launchctl list | grep -q "com.later.daemon"; then
    echo "Stopping service..."
    launchctl unload "$PLIST_DEST" 2>/dev/null || true
fi

# Remove plist
if [ -f "$PLIST_DEST" ]; then
    echo "Removing plist..."
    rm "$PLIST_DEST"
fi

echo "Done! Later daemon has been uninstalled."
echo "Note: Logs in ~/.later/ were kept."
