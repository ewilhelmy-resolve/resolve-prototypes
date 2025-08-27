#!/bin/bash

echo "🚨 PRODUCTION FIX DEPLOYMENT SCRIPT"
echo "===================================="
echo ""
echo "This script applies critical fixes for:"
echo "1. PostgreSQL ON CONFLICT constraint error"
echo "2. Webhook traffic API memory overflow"
echo ""

# Check if we're in production
read -p "⚠️  Are you running this on the PRODUCTION server? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "Aborting. This script is for production deployment only."
    exit 1
fi

echo ""
echo "📝 Step 1: Backing up database..."
docker exec -it app-db-1 pg_dump -U postgres resolve_onboarding > backup_$(date +%Y%m%d_%H%M%S).sql

echo ""
echo "🔧 Step 2: Applying PostgreSQL constraint fix..."
docker exec -it app-db-1 psql -U postgres -d resolve_onboarding -c "ALTER TABLE admin_metrics ADD CONSTRAINT admin_metrics_metric_date_unique UNIQUE (metric_date);"

echo ""
echo "✅ Step 3: Server code has been updated with memory fixes"
echo "   - Limited response body size to 10KB in traffic capture"
echo "   - Limited API response bodies to 5KB per record"
echo ""

echo "🔄 Step 4: Restarting application..."
docker-compose restart app

echo ""
echo "✨ Deployment complete!"
echo ""
echo "Please monitor the logs with: docker-compose logs -f app"