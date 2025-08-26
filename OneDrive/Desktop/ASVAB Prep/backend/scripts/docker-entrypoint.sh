#!/bin/sh
set -e

echo "🎖️  ASVAB Prep Backend - Military Excellence Deployment"
echo "Branch: ${DEPLOYMENT_BRANCH:-production}"
echo "Environment: ${NODE_ENV:-production}"
echo "Version: $(node -p "require('./package.json').version")"

# Wait for database to be ready
echo "⏳ Waiting for database connection..."
until npx prisma db push --accept-data-loss 2>/dev/null; do
  echo "Database is unavailable - sleeping"
  sleep 2
done

echo "✅ Database connection established"

# Run database migrations
echo "🔄 Running database migrations..."
npx prisma migrate deploy

# Seed production data if needed
if [ "$SEED_DATABASE" = "true" ]; then
  echo "🌱 Seeding database with military content..."
  npx prisma db seed
fi

# Generate Prisma client (in case it's missing)
echo "🔧 Ensuring Prisma client is generated..."
npx prisma generate

echo "🚀 Starting ASVAB Prep Backend..."
echo "Listening on port ${PORT:-3001}"
echo "Semper Fi! Ready for military excellence!"

# Execute the main command
exec "$@"