#!/bin/bash
# Deployment script for Retire-Portal
# Run this on the VPS from the retire-portal directory

set -e

echo "🚀 Starting deployment for Retire-Portal..."

# 1. Pull latest code
echo "📥 Pulling latest changes..."
git pull origin main

# 2. Ensure common library is up to date
if [ -d "../Retire-Common-Lib" ]; then
  echo "📦 Updating Retire-Common-Lib..."
  cd ../Retire-Common-Lib
  git pull origin main
  npm install
  npm run build
  cd -
else
  echo "⚠️  Retire-Common-Lib not found at ../Retire-Common-Lib"
  echo "   Please clone it first: git clone https://github.com/eappell/Retire-Common-Lib.git ../Retire-Common-Lib"
  exit 1
fi

# 3. Stop existing container
echo "🛑 Stopping existing container..."
docker compose -f docker-compose.portal.yml down

# 4. Rebuild and start
echo "🏗️  Building and starting container..."
docker compose -f docker-compose.portal.yml up -d --build

# 5. Show status
echo ""
echo "✅ Deployment complete!"
echo "📋 Container status:"
docker ps --filter "name=retire-portal" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""
echo "📝 View logs with: docker logs retire-portal -f"
