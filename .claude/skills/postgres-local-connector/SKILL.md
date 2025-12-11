---
name: postgres-db-connector
description: 'Connect to local PostgreSQL Docker container and execute queries. Use when needing to query the onboarding database (DB: onboarding, User: rita). Auto-discovers container via docker ps'
allowed-tools: Bash, Read, Write, Grep
version: 1.0.0
---

# PostgreSQL Database Connector

## Overview
This skill enables Claude to connect to and query your local PostgreSQL Docker container running the Rita onboarding database. It automatically discovers the container, establishes connections, and executes SQL queries safely.

## Database Configuration
- **Database**: onboarding
- **User**: rita
- **Password**: rita
- **Container Detection**: Automatic via `docker ps`

## When to Use This Skill
- Querying data from the onboarding database
- Inspecting database schema and tables
- Debugging data issues in the Rita application
- Extracting data for analysis or reporting

## Core Workflow

### 1. Discover PostgreSQL Container
```bash
docker ps --filter "name=postgres" --format "table {{.Names}}\t{{.Ports}}"
```

This finds the running PostgreSQL container and extracts the port mapping. Expected format:
- Container name typically contains "postgres"
- Ports shown as `0.0.0.0:5432->5432/tcp`

### 2. Extract Connection Details
From the Docker output:
- **Host**: localhost (or 127.0.0.1)
- **Port**: Extract from `0.0.0.0:PORT->5432/tcp` (use the HOST port, not 5432)
- **Database**: onboarding
- **User**: rita
- **Password**: rita

### 3. Connect and Query
Use `psql` client with the extracted credentials:

```bash
PGPASSWORD="rita" psql \
  -h localhost \
  -p PORT_FROM_DOCKER \
  -U rita \
  -d onboarding \
  -c "SELECT version();"
```

### 4. Execute Queries
Once connected, execute your SQL queries in the same manner.

## Common Queries

### List All Tables
```bash
PGPASSWORD="rita" psql \
  -h localhost \
  -p PORT \
  -U rita \
  -d onboarding \
  -c "\dt"
```

### Get Table Schema
```bash
PGPASSWORD="rita" psql \
  -h localhost \
  -p PORT \
  -U rita \
  -d onboarding \
  -c "\d+ table_name"
```

### Query Data
```bash
PGPASSWORD="rita" psql \
  -h localhost \
  -p PORT \
  -U rita \
  -d onboarding \
  -c "SELECT * FROM table_name LIMIT 10;"
```

### Export Query Results to CSV
```bash
PGPASSWORD="rita" psql \
  -h localhost \
  -p PORT \
  -U rita \
  -d onboarding \
  -c "COPY (SELECT * FROM table_name) TO STDOUT WITH CSV HEADER;" \
  > output.csv
```

## Step-by-Step Connection Process

### Step 1: Check Docker Status
```bash
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

Verify:
- PostgreSQL container is running
- Status shows "Up" (not exited)
- Port mapping is visible

### Step 2: Parse Container Port
Look for output like:
```
NAMES              STATUS          PORTS
myapp-postgres-1   Up 2 hours      0.0.0.0:5432->5432/tcp
```

Extract the HOST port (left side of `->` mapping, after `:`). In this example: `5432`

### Step 3: Test Connection
```bash
PGPASSWORD="rita" psql -h localhost -p 5432 -U rita -d onboarding -c "SELECT 1;"
```

A successful connection returns: `?column?` with value `1`

### Step 4: Execute Your Query
Once connection is verified, run your actual SQL queries using the same connection parameters.

## Error Handling

### Container Not Found
If `docker ps` doesn't show a postgres container:
```bash
docker ps -a  # Show all containers, including stopped ones
```

Then check Docker daemon status:
```bash
docker info
```

### Connection Refused
- Verify port mapping matches what Docker reports
- Check if PostgreSQL service is healthy: `docker ps -a | grep postgres`
- Inspect logs: `docker logs container_name --tail=20`

### Authentication Failed
- Verify credentials (user: rita, password: rita, database: onboarding)
- Check if container environment variables are set correctly
- Restart container if needed: `docker restart container_name`

### Port Already in Use
If port 5432 is already bound to another service:
- Find what's using it: `lsof -i :5432`
- Either stop that service or use the mapped port Docker assigned

## Security Notes

- **Password in Environment**: Using `PGPASSWORD` environment variable is safe for local development
- **Production**: Never hardcode credentials; use environment variables or secrets management
- **SQL Injection**: Always validate/sanitize user inputs before executing queries
- **Backup**: Never execute destructive queries without confirming first

## Example Workflows

### Example 1: List All Tables and Row Counts
```bash
# 1. Find container and port
docker ps --filter "name=postgres" --format "{{.Ports}}" | grep -oP '\d+(?=->5432)'

# 2. Get table info
PGPASSWORD="rita" psql \
  -h localhost \
  -p 5432 \
  -U rita \
  -d onboarding \
  -c "SELECT tablename FROM pg_tables WHERE schemaname='public';"

# 3. Get row counts
PGPASSWORD="rita" psql \
  -h localhost \
  -p 5432 \
  -U rita \
  -d onboarding \
  -c "SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size FROM pg_tables WHERE schemaname='public' ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;"
```

### Example 2: Inspect Specific Table
```bash
# Get table structure and first few rows
PGPASSWORD="rita" psql \
  -h localhost \
  -p 5432 \
  -U rita \
  -d onboarding \
  -c "\d+ users; SELECT * FROM users LIMIT 5;"
```

### Example 3: Run Custom Query and Save Results
```bash
# Execute query and save to file
PGPASSWORD="rita" psql \
  -h localhost \
  -p 5432 \
  -U rita \
  -d onboarding \
  -c "YOUR_SQL_QUERY_HERE" \
  > query_results.txt
```

## Prerequisites

- Docker daemon running (`docker ps` should work)
- PostgreSQL container running with port exposed
- `psql` client installed locally (usually comes with PostgreSQL)
- Environment: Local development only

## Testing Your Connection

After setting up, verify everything works:

```bash
# 1. Check Docker
docker version

# 2. Find postgres container
docker ps | grep postgres

# 3. Test connection
PGPASSWORD="rita" psql -h localhost -p 5432 -U rita -d onboarding -c "SELECT now();"
```

If you see the current timestamp, you're connected!

## Troubleshooting Checklist

- [ ] Docker daemon is running (`docker ps` works without errors)
- [ ] PostgreSQL container is running (`docker ps | grep postgres` shows "Up")
- [ ] Port mapping is correct (visible in `docker ps` output)
- [ ] Credentials are correct (rita/rita/onboarding)
- [ ] `psql` client is installed (`which psql` shows a path)
- [ ] Network connectivity to localhost is working
- [ ] No firewall blocking port 5432
