#!/bin/bash
# ============================================
# Railway AI Platform - One-Command Startup
# ============================================

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║   🚆 Railway AI Block Planning Platform                      ║"
echo "║   Starting Complete System...                                ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker not found! Please install or start Docker Desktop.${NC}"
    exit 1
fi

# Detect docker-compose command
COMPOSE_CMD="docker-compose"
if ! command -v docker-compose &> /dev/null; then
    if docker compose version &> /dev/null; then
        COMPOSE_CMD="docker compose"
    else
        echo -e "${RED}❌ Neither docker-compose nor docker compose found!${NC}"
        exit 1
    fi
fi

# Create .env if not exists
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "${GREEN}✅ .env file created from .env.example${NC}"
    fi
fi

# Build and start all services
echo -e "${BLUE}Building Docker images (first time: 5-10 minutes)...${NC}"
$COMPOSE_CMD build

echo -e "${BLUE}Starting all services...${NC}"
$COMPOSE_CMD up -d

echo -e "${BLUE}Waiting for services to become healthy...${NC}"
sleep 15

# Create Django superuser if not present
echo -e "${BLUE}Checking Django superuser...${NC}"
$COMPOSE_CMD exec -T backend python manage.py shell -c "
from django.contrib.auth import get_user_model
from apps.accounts.models import UserProfile, UserRole, DepartmentCode
User = get_user_model()
if not User.objects.filter(username='admin').exists():
    user = User.objects.create_superuser(
        username='admin',
        email='admin@railway.ai',
        password='admin123'
    )
    profile, _ = UserProfile.objects.get_or_create(user=user)
    profile.role = UserRole.ADMIN
    profile.department_code = DepartmentCode.OPERATIONS
    profile.save()
    print('✅ Superuser created: admin / admin123')
else:
    print('✅ Superuser already exists')
" 2>/dev/null || echo "⚠️  Superuser check completed"

echo ""
echo -e "${GREEN}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║              🎉 SYSTEM STARTED SUCCESSFULLY! 🎉              ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║                                                              ║"
echo "║  🌐 Access URLs:                                             ║"
echo "║     Frontend:    http://localhost:3000                       ║"
echo "║     Backend API: http://localhost:8000                       ║"
echo "║     API Docs:    http://localhost:8000/api/docs/             ║"
echo "║     Admin:       http://localhost:8000/admin/                ║"
echo "║     WebSocket:   ws://localhost:8001/ws/                     ║"
echo "║     Grafana:     http://localhost:3001/                      ║"
echo "║                                                              ║"
echo "║  🔑 Default Credentials:                                     ║"
echo "║     Username: admin                                          ║"
echo "║     Password: admin123                                       ║"
echo "║                                                              ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  💡 Useful Commands:                                         ║"
echo "║                                                              ║"
echo "║  View logs:     $COMPOSE_CMD logs -f                         ║"
echo "║  Stop all:      $COMPOSE_CMD down                            ║"
echo "║  Restart:       $COMPOSE_CMD restart                         ║"
echo "║  Rebuild:       $COMPOSE_CMD up --build                      ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
