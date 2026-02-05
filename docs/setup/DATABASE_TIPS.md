# Database Development Tips

## Working with Local PostgreSQL via Docker

Since we're using Docker Compose for local development, here are useful commands to interact with the PostgreSQL database directly.

### Basic Database Access

**Connect to the database container:**
```bash
docker exec -it rita-chat-postgres-1 psql -U rita -d rita
```

**Run single commands without entering interactive mode:**
```bash
docker exec rita-chat-postgres-1 psql -U rita -d rita -c "COMMAND_HERE"
```

### Common Database Verification Commands

#### Table Structure & Metadata

**List all tables:**
```bash
docker exec rita-chat-postgres-1 psql -U rita -d rita -c "\dt"
```

**Describe a specific table:**
```bash
docker exec rita-chat-postgres-1 psql -U rita -d rita -c "\d organizations"
```

**View table with column details:**
```bash
docker exec rita-chat-postgres-1 psql -U rita -d rita -c "\d+ messages"
```

**List all indexes:**
```bash
docker exec rita-chat-postgres-1 psql -U rita -d rita -c "\di"
```

#### Row Level Security (RLS) Verification

**Check which tables have RLS enabled:**
```bash
docker exec rita-chat-postgres-1 psql -U rita -d rita -c "SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';"
```

**View all RLS policies:**
```bash
docker exec rita-chat-postgres-1 psql -U rita -d rita -c "SELECT schemaname, tablename, policyname, permissive FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename, policyname;"
```

**View policies for a specific table:**
```bash
docker exec rita-chat-postgres-1 psql -U rita -d rita -c "SELECT * FROM pg_policies WHERE tablename = 'messages';"
```

#### Data Inspection

**Count records in all tables:**
```bash
docker exec rita-chat-postgres-1 psql -U rita -d rita -c "
SELECT
  schemaname,
  tablename,
  n_tup_ins as inserts,
  n_tup_upd as updates,
  n_tup_del as deletes,
  n_live_tup as live_rows
FROM pg_stat_user_tables
ORDER BY tablename;
"
```

**Check migration history:**
```bash
docker exec rita-chat-postgres-1 psql -U rita -d rita -c "SELECT * FROM migration_history ORDER BY executed_at;"
```

**Sample data from a table:**
```bash
docker exec rita-chat-postgres-1 psql -U rita -d rita -c "SELECT * FROM organizations LIMIT 5;"
```

#### Database Performance & Health

**Check database size:**
```bash
docker exec rita-chat-postgres-1 psql -U rita -d rita -c "SELECT pg_size_pretty(pg_database_size('rita'));"
```

**View active connections:**
```bash
docker exec rita-chat-postgres-1 psql -U rita -d rita -c "SELECT pid, usename, application_name, client_addr, state FROM pg_stat_activity WHERE datname = 'rita';"
```

**Check table sizes:**
```bash
docker exec rita-chat-postgres-1 psql -U rita -d rita -c "
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
"
```

### Multi-Tenant Testing Commands

**Test RLS with session variables (simulates our middleware):**
```bash
docker exec rita-chat-postgres-1 psql -U rita -d rita -c "
SET app.current_user_id = '550e8400-e29b-41d4-a716-446655440000';
SET app.current_organization_id = '550e8400-e29b-41d4-a716-446655440001';
SELECT * FROM messages;
"
```

**Reset session variables:**
```bash
docker exec rita-chat-postgres-1 psql -U rita -d rita -c "
RESET app.current_user_id;
RESET app.current_organization_id;
"
```

### Backup and Restore

**Create a database backup:**
```bash
docker exec rita-chat-postgres-1 pg_dump -U rita rita > backup.sql
```

**Restore from backup:**
```bash
cat backup.sql | docker exec -i rita-chat-postgres-1 psql -U rita -d rita
```

### Development Workflow Tips

1. **After running migrations**, always verify with `\dt` and check RLS policies
2. **Before adding test data**, use session variables to test RLS isolation
3. **Use `EXPLAIN ANALYZE`** to check query performance with your indexes
4. **Check migration history** before creating new migrations to avoid conflicts

### Useful Aliases

Add these to your shell profile for faster database access:

```bash
# ~/.zshrc or ~/.bashrc
alias db-connect="docker exec -it rita-chat-postgres-1 psql -U rita -d rita"
alias db-tables="docker exec rita-chat-postgres-1 psql -U rita -d rita -c '\dt'"
alias db-policies="docker exec rita-chat-postgres-1 psql -U rita -d rita -c \"SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename;\""
```

### Troubleshooting

**If container name changes**, find the correct name:
```bash
docker ps | grep postgres
```

**If database seems slow**, check for missing indexes:
```bash
docker exec rita-chat-postgres-1 psql -U rita -d rita -c "
SELECT schemaname, tablename, seq_scan, seq_tup_read, idx_scan, idx_tup_fetch
FROM pg_stat_user_tables
WHERE seq_scan > idx_scan AND seq_tup_read > 1000;
"
```