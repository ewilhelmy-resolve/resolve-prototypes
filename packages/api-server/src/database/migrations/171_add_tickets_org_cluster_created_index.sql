CREATE INDEX IF NOT EXISTS idx_tickets_org_cluster_created
  ON tickets(organization_id, cluster_id, created_at DESC);
