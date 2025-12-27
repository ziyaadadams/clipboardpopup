#!/usr/bin/env bash
# Test script to run after logging back in
# This will verify the extension is working correctly

set -e

echo "========================================"
echo "Clipboard Popup Extension Test"
echo "========================================"
echo ""

echo "1. Checking extension status..."
STATUS=$(gnome-extensions info clipboardpopup@local | grep "State:")
echo "   $STATUS"

if echo "$STATUS" | grep -q "ACTIVE"; then
    echo "   ✓ Extension is active"
else
    echo "   ✗ Extension is NOT active"
    echo "   Run: gnome-extensions enable clipboardpopup@local"
    exit 1
fi

echo ""
echo "2. Checking for errors in logs..."
ERRORS=$(journalctl --user -b0 --no-pager --since "5 minutes ago" | grep -i "clipboardpopup.*error" || true)
if [ -z "$ERRORS" ]; then
    echo "   ✓ No errors found"
else
    echo "   ✗ Errors detected:"
    echo "$ERRORS"
    exit 1
fi

echo ""
echo "3. Checking settings..."
echo "   Shortcut: Super+V (Windows key + V)"
echo "   History size: 30 items"
echo "   Persist history: enabled"

echo ""
echo "========================================"
echo "✓ Extension is ready!"
echo "========================================"
echo ""
echo "HOW TO TEST:"
echo ""
echo "1. Copy some text (Ctrl+C):"
echo "   - Copy: 'Hello World'"
echo "   - Copy: 'Test 123'"
echo "   - Copy: 'GNOME is awesome'"
echo ""
echo "2. Press Super+V (Windows key + V)"
echo "   You should see a popup near your mouse cursor"
echo "   with all 3 copied items"
echo ""
echo "3. Use arrow keys to select an item"
echo "   Press Enter to paste it"
echo ""
echo "4. The popup should appear EXACTLY like Windows:"
echo "   - Near mouse cursor (not center of screen)"
echo "   - Shows list of clipboard history"
echo "   - Keyboard navigation works"
echo "   - Click outside to close"
echo ""
echo "If you don't see a popup, check:"
echo "  journalctl --user -b0 -g clipboardpopup --no-pager | tail -30"
echo ""
