#!/bin/bash
# Seed autopilot test data (clusters + tickets)
#
# Usage:
#   ./seed_autopilot_test_data.sh <organization_id>
#   ./seed_autopilot_test_data.sh 123e4567-e89b-12d3-a456-426614174000
#
# To find your org_id:
#   PGPASSWORD="rita" psql -h localhost -p 5432 -U rita -d onboarding -c "SELECT id, name FROM organizations;"

set -e

ORG_ID="$1"

if [ -z "$ORG_ID" ]; then
  echo "Usage: $0 <organization_id>"
  echo ""
  echo "To find your org_id, run:"
  echo '  PGPASSWORD="rita" psql -h localhost -p 5432 -U rita -d onboarding -c "SELECT id, name FROM organizations;"'
  exit 1
fi

# Validate UUID format (basic check)
if ! [[ "$ORG_ID" =~ ^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$ ]]; then
  echo "Error: Invalid UUID format for organization_id"
  exit 1
fi

echo "Seeding autopilot test data for organization: $ORG_ID"

PGPASSWORD="${PGPASSWORD:-rita}" psql \
  -h "${PGHOST:-localhost}" \
  -p "${PGPORT:-5432}" \
  -U "${PGUSER:-rita}" \
  -d "${PGDATABASE:-onboarding}" \
  -v org_id="$ORG_ID" \
  <<'EOSQL'

BEGIN;

-- Insert test clusters
INSERT INTO clusters (organization_id, external_cluster_id, name, subcluster_name, config, kb_status)
VALUES
  (:'org_id', 'cluster-1', 'Password Reset Issues', NULL, '{"auto_respond": false, "auto_populate": false}', 'FOUND'),
  (:'org_id', 'cluster-2', 'VPN Connectivity', 'Windows', '{"auto_respond": true, "auto_populate": false}', 'FOUND'),
  (:'org_id', 'cluster-3', 'VPN Connectivity', 'Mac', '{"auto_respond": false, "auto_populate": true}', 'PENDING'),
  (:'org_id', 'cluster-4', 'Email Access Problems', NULL, '{"auto_respond": false, "auto_populate": false}', 'GAP'),
  (:'org_id', 'cluster-5', 'Software Installation', 'Microsoft Office', '{"auto_respond": true, "auto_populate": true}', 'FOUND')
ON CONFLICT (organization_id, external_cluster_id) DO NOTHING;

-- Insert test tickets (using subquery to get cluster IDs)
INSERT INTO tickets (organization_id, cluster_id, external_id, subject, external_status, rita_status, cluster_text, source_metadata)
SELECT
  :'org_id',
  c.id,
  t.external_id,
  t.subject,
  t.external_status,
  t.rita_status,
  t.subject,
  t.source_metadata::jsonb
FROM (VALUES
  ('cluster-1', 'INC-1001', 'Cannot reset password via self-service portal', 'Open', 'NEEDS_RESPONSE', '{"priority": "high", "category": "password"}'),
  ('cluster-1', 'INC-1002', 'Password expired and locked out of account', 'Open', 'NEEDS_RESPONSE', '{"priority": "high", "category": "password"}'),
  ('cluster-1', 'INC-1003', 'Need to reset password for contractor account', 'Closed', 'COMPLETED', '{"priority": "medium", "category": "password"}'),
  ('cluster-2', 'INC-1004', 'VPN disconnects frequently on Windows 11', 'Open', 'NEEDS_RESPONSE', '{"priority": "medium", "category": "vpn"}'),
  ('cluster-2', 'INC-1005', 'Cannot connect to VPN after Windows update', 'In Progress', 'NEEDS_RESPONSE', '{"priority": "high", "category": "vpn"}'),
  ('cluster-2', 'INC-1006', 'VPN connection timeout on corporate network', 'Closed', 'COMPLETED', '{"priority": "low", "category": "vpn"}'),
  ('cluster-3', 'INC-1007', 'VPN client crashes on macOS Sonoma', 'Open', 'NEEDS_RESPONSE', '{"priority": "high", "category": "vpn"}'),
  ('cluster-3', 'INC-1008', 'Slow VPN speeds on MacBook Pro', 'Open', 'NEEDS_RESPONSE', '{"priority": "medium", "category": "vpn"}'),
  ('cluster-4', 'INC-1009', 'Cannot access shared mailbox', 'Open', 'NEEDS_RESPONSE', '{"priority": "medium", "category": "email"}'),
  ('cluster-4', 'INC-1010', 'Outlook not syncing on mobile device', 'Closed', 'COMPLETED', '{"priority": "low", "category": "email"}'),
  ('cluster-4', 'INC-1011', 'Email attachment size limit exceeded', 'Open', 'NEEDS_RESPONSE', '{"priority": "low", "category": "email"}'),
  ('cluster-5', 'INC-1012', 'Need Microsoft Office installed on new laptop', 'Closed', 'COMPLETED', '{"priority": "medium", "category": "software"}'),
  ('cluster-5', 'INC-1013', 'Office 365 activation failing', 'Open', 'NEEDS_RESPONSE', '{"priority": "high", "category": "software"}'),
  ('cluster-5', 'INC-1014', 'Request for Adobe Acrobat Pro license', 'In Progress', 'NEEDS_RESPONSE', '{"priority": "low", "category": "software"}'),
  ('cluster-5', 'INC-1015', 'Excel crashing when opening large files', 'Closed', 'COMPLETED', '{"priority": "medium", "category": "software"}')
) AS t(cluster_ext_id, external_id, subject, external_status, rita_status, source_metadata)
JOIN clusters c ON c.external_cluster_id = t.cluster_ext_id AND c.organization_id = :'org_id'
ON CONFLICT (organization_id, external_id) DO NOTHING;

COMMIT;

-- Show summary
SELECT 'Clusters' AS table_name, COUNT(*) AS count FROM clusters WHERE organization_id = :'org_id'
UNION ALL
SELECT 'Tickets', COUNT(*) FROM tickets WHERE organization_id = :'org_id';

EOSQL

echo "Done!"
