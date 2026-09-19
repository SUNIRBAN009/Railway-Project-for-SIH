#!/usr/bin/env bash
# ============================================
# Railway AI Platform - Unix/Linux/macOS Shutdown
# ============================================

set -e

echo ""
echo "============================================================"
echo "   Railway AI Block Planning Platform - Shutdown Engine    "
echo "============================================================"
echo ""

if command -v docker &>/dev/null; then
    echo "Stopping all multi-container services..."
    if docker compose version &>/dev/null; then
        docker compose down
    else
        docker-compose down
    fi
else
    echo "[ERROR] Docker not found in PATH."
    exit 1
fi

echo ""
echo "============================================================"
echo "         ALL PLATFORM SERVICES STOPPED CLEANLY!             "
echo "============================================================"
echo "  To restart anytime, run:  ./scripts/start.sh"
echo "============================================================"
echo ""
