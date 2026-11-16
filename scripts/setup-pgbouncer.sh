#!/bin/bash
# PgBouncer Quick Setup Script
# Run on your PostgreSQL server

set -e

echo "🚀 PgBouncer Setup for High Traffic"
echo "===================================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
  echo "❌ Please run as root (sudo)"
  exit 1
fi

# Install PgBouncer
echo "📦 Installing PgBouncer..."
apt-get update
apt-get install -y pgbouncer

# Backup existing config
if [ -f /etc/pgbouncer/pgbouncer.ini ]; then
  echo "💾 Backing up existing config..."
  cp /etc/pgbouncer/pgbouncer.ini /etc/pgbouncer/pgbouncer.ini.backup.$(date +%Y%m%d_%H%M%S)
fi

# Get database details
read -p "Database name [odds_launchpad]: " DB_NAME
DB_NAME=${DB_NAME:-odds_launchpad}

read -p "Database user [app]: " DB_USER
DB_USER=${DB_USER:-app}

read -sp "Database password: " DB_PASS
echo ""

read -p "PostgreSQL host [127.0.0.1]: " DB_HOST
DB_HOST=${DB_HOST:-127.0.0.1}

read -p "PostgreSQL port [5432]: " DB_PORT
DB_PORT=${DB_PORT:-5432}

read -p "Max client connections [10000]: " MAX_CLIENT
MAX_CLIENT=${MAX_CLIENT:-10000}

read -p "Default pool size [50]: " POOL_SIZE
POOL_SIZE=${POOL_SIZE:-50}

# Generate password hash
echo "🔐 Generating password hash..."
HASH=$(echo -n "${DB_PASS}${DB_USER}" | md5sum | awk '{print "md5"$1}')

# Create pgbouncer.ini
echo "📝 Creating pgbouncer.ini..."
cat > /etc/pgbouncer/pgbouncer.ini << EOF
[databases]
${DB_NAME} = host=${DB_HOST} port=${DB_PORT} dbname=${DB_NAME}

[pgbouncer]
listen_addr = 0.0.0.0
listen_port = 6432

auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt

pool_mode = transaction

max_client_conn = ${MAX_CLIENT}
default_pool_size = ${POOL_SIZE}
min_pool_size = 10
reserve_pool_size = 10
reserve_pool_timeout = 3

server_lifetime = 3600
server_idle_timeout = 600
client_idle_timeout = 0
query_timeout = 0
query_wait_timeout = 120

log_connections = 1
log_disconnections = 1
log_pooler_errors = 1
stats_period = 60

admin_users = postgres

ignore_startup_parameters = extra_float_digits,search_path

logfile = /var/log/postgresql/pgbouncer.log
pidfile = /var/run/postgresql/pgbouncer.pid

ignore_startup_parameters = extra_float_digits
EOF

# Create userlist.txt
echo "📝 Creating userlist.txt..."
cat > /etc/pgbouncer/userlist.txt << EOF
"${DB_USER}" "${HASH}"
EOF

# Set permissions
echo "🔒 Setting permissions..."
chown postgres:postgres /etc/pgbouncer/pgbouncer.ini
chown postgres:postgres /etc/pgbouncer/userlist.txt
chmod 640 /etc/pgbouncer/userlist.txt

# Create log directory if not exists
mkdir -p /var/log/postgresql
chown postgres:postgres /var/log/postgresql

# Start PgBouncer
echo "🚀 Starting PgBouncer..."
systemctl enable pgbouncer
systemctl restart pgbouncer

# Wait for startup
sleep 2

# Check status
if systemctl is-active --quiet pgbouncer; then
  echo ""
  echo "✅ PgBouncer installed and running!"
  echo ""
  echo "📊 Connection Details:"
  echo "   Host: $(hostname -I | awk '{print $1}')"
  echo "   Port: 6432"
  echo "   Database: ${DB_NAME}"
  echo "   User: ${DB_USER}"
  echo ""
  echo "🔗 Update your .env file:"
  echo "   DATABASE_URL=\"postgresql://${DB_USER}:${DB_PASS}@<host>:6432/${DB_NAME}?schema=public&connection_limit=100&pool_timeout=20\""
  echo ""
  echo "📈 Monitor PgBouncer:"
  echo "   sudo systemctl status pgbouncer"
  echo "   sudo journalctl -u pgbouncer -f"
  echo "   psql -h localhost -p 6432 -U postgres pgbouncer -c 'SHOW POOLS'"
  echo ""
  echo "📚 Full documentation: docs/PGBOUNCER_SETUP.md"
else
  echo ""
  echo "❌ PgBouncer failed to start"
  echo "Check logs: sudo journalctl -u pgbouncer -n 50"
  exit 1
fi
