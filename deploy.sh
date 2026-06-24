#!/bin/bash
# DawgHaus deploy/update script for OMV and Linux servers.
# Pulls latest code, refreshes images, restarts. Safe to run repeatedly.
#
# Usage: ./deploy.sh

set -e

cd "$(dirname "$0")"

echo ""
echo "========================================="
echo "  DawgHaus 🐺 — Deploy / Update"
echo "========================================="
echo ""

echo "[1/5] Stashing local changes (updater rewrites data/)..."
git stash --include-untracked 2>/dev/null && echo "      Stashed." || echo "      Nothing to stash."
echo ""

echo "[2/5] Pulling latest code..."
git pull
echo ""
echo "      Latest commits:"
git log --oneline -3 | sed 's/^/      /'
echo ""

echo "[3/5] Pulling base images..."
docker compose pull
echo ""

echo "[4/5] Recreating containers..."
# --force-recreate is required: nginx.conf is a single-file bind mount, and
# git pull replaces the file (new inode), so a plain restart keeps serving the
# OLD config. Recreating re-binds the mount to the current file.
docker compose up -d --force-recreate
echo ""

echo "[5/5] Status:"
docker compose ps
echo ""

echo "========================================="
echo "  DawgHaus is running on port 1889"
echo "  http://localhost:1889"
echo "========================================="
echo ""
echo "  Logs:   docker compose logs -f"
echo "  Bow down. 🐺"
echo ""
