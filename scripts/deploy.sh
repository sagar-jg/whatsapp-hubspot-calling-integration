#!/bin/bash

# ==============================================
# Production Deployment Script
# ==============================================

set -e  # Exit on any error

echo "🚀 Deploying WhatsApp HubSpot Calling Integration..."

# Configuration
IMAGE_NAME="whatsapp-hubspot-calling"
CONTAINER_NAME="whatsapp-calling-app"
NETWORK_NAME="whatsapp-calling-network"
REDIS_CONTAINER="whatsapp-calling-redis"

# Check if running as root (required for Docker)
if [ "$EUID" -ne 0 ]; then
    echo "❌ Please run this script with sudo or as root"
    exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "✅ Docker and Docker Compose detected"

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ .env file not found. Please create it from .env.example"
    exit 1
fi

echo "✅ Environment configuration found"

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose down --remove-orphans || true

# Remove old images
echo "🗑️  Removing old images..."
docker image prune -f || true

# Build and start services
echo "🏗️  Building and starting services..."
docker-compose up --build -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
sleep 30

# Check service health
echo "🔍 Checking service health..."
if docker-compose ps | grep -q "Up (healthy)"; then
    echo "✅ Services are healthy"
else
    echo "⚠️  Some services may not be healthy. Check logs:"
    echo "   docker-compose logs app"
fi

# Show running services
echo "📊 Running services:"
docker-compose ps

# Test the deployment
echo "🧪 Testing deployment..."
if curl -f http://localhost:3000/health > /dev/null 2>&1; then
    echo "✅ Health check passed"
else
    echo "❌ Health check failed"
    echo "📋 Check logs: docker-compose logs app"
    exit 1
fi

echo ""
echo "🎉 Deployment complete!"
echo ""
echo "📋 Service URLs:"
echo "   Application: http://localhost:3000"
echo "   Frontend: http://localhost (if using nginx)"
echo "   Health Check: http://localhost:3000/health"
echo ""
echo "📊 Management commands:"
echo "   View logs: docker-compose logs -f"
echo "   Stop services: docker-compose down"
echo "   Restart: docker-compose restart"
echo "   Update: git pull && ./scripts/deploy.sh"
echo ""
echo "🔧 Troubleshooting:"
echo "   - Check logs: docker-compose logs app"
echo "   - Check Redis: docker-compose logs redis"
echo "   - Restart services: docker-compose restart"
echo "   - Clean deployment: docker-compose down -v && ./scripts/deploy.sh"