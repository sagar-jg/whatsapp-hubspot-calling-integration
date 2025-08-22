#!/bin/bash

# ==============================================
# WhatsApp HubSpot Calling Integration Setup
# ==============================================

set -e  # Exit on any error

echo "🚀 Setting up WhatsApp HubSpot Calling Integration..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    echo "   Visit: https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt "18" ]; then
    echo "❌ Node.js version 18 or higher is required. Current version: $(node --version)"
    exit 1
fi

echo "✅ Node.js $(node --version) detected"

# Check if Redis is running (optional)
if command -v redis-cli &> /dev/null; then
    if redis-cli ping &> /dev/null; then
        echo "✅ Redis is running"
    else
        echo "⚠️  Redis is installed but not running. Start it with: redis-server"
    fi
else
    echo "⚠️  Redis is not installed. Install it for session management."
    echo "   macOS: brew install redis"
    echo "   Ubuntu: sudo apt-get install redis-server"
fi

# Create environment files if they don't exist
echo "📝 Setting up environment files..."

if [ ! -f ".env" ]; then
    cp .env.example .env
    echo "✅ Created .env file from template"
    echo "⚠️  Please edit .env with your actual configuration values"
else
    echo "✅ .env file already exists"
fi

if [ ! -f "frontend/.env" ]; then
    cp frontend/.env.example frontend/.env
    echo "✅ Created frontend/.env file from template"
else
    echo "✅ Frontend .env file already exists"
fi

# Install dependencies
echo "📦 Installing dependencies..."

echo "   Installing root dependencies..."
npm install

echo "   Installing backend dependencies..."
cd backend && npm install && cd ..

echo "   Installing frontend dependencies..."
cd frontend && npm install && cd ..

echo "   Installing test dependencies..."
cd tests && npm install && cd ..

# Setup HubSpot SDK
echo "🔗 Setting up HubSpot Calling Extensions SDK..."
if [ ! -d "hubspot-sdk" ]; then
    npm run setup-hubspot-sdk
    echo "✅ HubSpot SDK cloned successfully"
else
    echo "✅ HubSpot SDK directory already exists"
fi

# Create logs directory
echo "📁 Creating logs directory..."
mkdir -p backend/logs
echo "✅ Logs directory created"

# Install Playwright browsers for E2E testing
echo "🎭 Installing Playwright browsers..."
cd tests && npm run install-browsers && cd ..
echo "✅ Playwright browsers installed"

# Create SSL directory for development (optional)
echo "🔒 Setting up SSL directory..."
mkdir -p ssl
echo "✅ SSL directory created"

echo ""
echo "🎉 Setup complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Edit .env files with your actual configuration values"
echo "   2. Set up your Twilio account and WhatsApp Business API"
echo "   3. Create a HubSpot developer app"
echo "   4. Start Redis: redis-server"
echo "   5. Run the application: npm run dev"
echo ""
echo "📚 Documentation:"
echo "   - Twilio WhatsApp: https://www.twilio.com/docs/whatsapp"
echo "   - HubSpot Apps: https://developers.hubspot.com/"
echo "   - Project README: ./README.md"
echo ""
echo "🆘 Need help? Check the documentation or create an issue on GitHub."