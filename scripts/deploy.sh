#!/bin/bash
# Deployment script for Vercel
# This runs database migrations before starting the server

set -e

echo "🔧 ProctorAI Deployment Starting..."

# Check required environment variables
if [ -z "$DATABASE_URL" ]; then
  echo "❌ Error: DATABASE_URL is not set"
  exit 1
fi

if [ -z "$CLERK_PUBLISHABLE_KEY" ] || [ -z "$CLERK_SECRET_KEY" ]; then
  echo "❌ Error: Clerk keys are not set"
  exit 1
fi

echo "✅ Environment variables validated"

# Run database migrations
echo "🗄️  Running database migrations..."
cd lib/db
pnpm run push || {
  echo "❌ Database migration failed. Make sure your Neon database is properly configured."
  exit 1
}
cd ../..

echo "✅ Database migrations complete"
echo "🚀 Build completed successfully!"
