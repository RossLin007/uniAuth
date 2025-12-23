#!/bin/bash

# ============================================
# Database Migration Script
# 数据库迁移脚本
# ============================================
#
# This script applies pending migrations to the Supabase database.
# Run the SQL commands in the Supabase Dashboard SQL Editor or via CLI.
#
# Usage:
#   ./scripts/migrate.sh [migration_file]
#
# Examples:
#   ./scripts/migrate.sh                              # Apply all pending
#   ./scripts/migrate.sh 005_security_enhancements    # Apply specific

set -e

MIGRATIONS_DIR="./packages/server/migrations"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║             UniAuth Database Migration                     ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Check if SUPABASE_URL is set
if [ -z "$SUPABASE_URL" ]; then
    echo -e "${YELLOW}⚠ SUPABASE_URL not set. Loading from .env...${NC}"
    if [ -f .env ]; then
        export $(grep -v '^#' .env | xargs)
    fi
fi

# List migrations
echo "📋 Available migrations:"
echo ""
for file in "$MIGRATIONS_DIR"/*.sql; do
    if [ -f "$file" ]; then
        filename=$(basename "$file")
        echo "   - $filename"
    fi
done
echo ""

# If specific migration provided
if [ -n "$1" ]; then
    MIGRATION_FILE="$MIGRATIONS_DIR/$1.sql"
    if [ ! -f "$MIGRATION_FILE" ]; then
        MIGRATION_FILE="$MIGRATIONS_DIR/$1"
    fi
    
    if [ -f "$MIGRATION_FILE" ]; then
        echo -e "${GREEN}▶ Applying: $(basename $MIGRATION_FILE)${NC}"
        echo ""
        echo "SQL Content:"
        echo "----------------------------------------"
        cat "$MIGRATION_FILE"
        echo "----------------------------------------"
        echo ""
        echo -e "${YELLOW}⚠ Please copy the SQL above and run it in the Supabase Dashboard SQL Editor.${NC}"
        echo ""
        echo "Dashboard URL: ${SUPABASE_URL}/project/_/sql"
    else
        echo -e "${RED}✗ Migration file not found: $1${NC}"
        exit 1
    fi
else
    echo "To apply a specific migration, run:"
    echo ""
    echo "  ./scripts/migrate.sh 005_security_enhancements"
    echo ""
    echo "Or copy the SQL content and run it in Supabase Dashboard:"
    echo ""
    echo "  1. Open Supabase Dashboard"
    echo "  2. Go to SQL Editor"
    echo "  3. Paste the migration SQL"
    echo "  4. Click 'Run'"
fi

echo ""
echo "📌 Migration Status:"
echo ""
echo "   To check which migrations have been applied, run this query:"
echo ""
echo "   SELECT * FROM supabase_migrations.schema_migrations;"
echo ""
