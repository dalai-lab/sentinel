#!/bin/bash
set -e

echo "=========================================="
echo " Sentinel Production Deployment Script    "
echo "=========================================="

echo "[1/2] Stopping existing containers..."
docker-compose down || true

echo "[2/2] Building and starting containers in detached mode..."
docker-compose up -d --build

echo "=========================================="
echo "✅ Deployment Complete!"
echo "Sentinel Dashboard is now running locally on port 3000."
echo "Nginx on your server should proxy port 80 to localhost:3000."
echo "View logs with: docker-compose logs -f"
echo "=========================================="
