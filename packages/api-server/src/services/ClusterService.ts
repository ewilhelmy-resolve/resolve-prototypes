import { pool } from '../config/database.js';
import type {
  Cluster,
  ClusterDetails,
  ClusterListItem,
  ClusterListQueryOptions,
  ClusterTicketsQueryOptions,
  PaginationInfo,
  Ticket
} from '../types/cluster.js';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export class ClusterService {
  /**
   * Get cluster details by ID with KB articles count
   */
  async getClusterDetails(
    clusterId: string,
    organizationId: string
  ): Promise<ClusterDetails | null> {
    const result = await pool.query<Cluster & { kb_articles_count: string }>(
      `SELECT
        c.*,
        COALESCE(COUNT(kb.id), 0)::text AS kb_articles_count
      FROM clusters c
      LEFT JOIN cluster_kb_links kb ON kb.cluster_id = c.id
      WHERE c.id = $1 AND c.organization_id = $2
      GROUP BY c.id`,
      [clusterId, organizationId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      ...row,
      kb_articles_count: parseInt(row.kb_articles_count, 10)
    };
  }

  /**
   * List all clusters for an organization with ticket counts
   */
  async getClusters(
    organizationId: string,
    options: ClusterListQueryOptions = {}
  ): Promise<ClusterListItem[]> {
    const sort = options.sort || 'recent';

    // Determine ORDER BY clause
    let orderBy: string;
    switch (sort) {
      case 'volume':
        orderBy = 'ticket_count DESC, c.created_at DESC';
        break;
      case 'automation':
        // Sort by auto_respond enabled, then by ticket count
        orderBy = "(c.config->>'auto_respond')::boolean DESC NULLS LAST, ticket_count DESC";
        break;
      case 'recent':
      default:
        orderBy = 'c.created_at DESC';
    }

    const result = await pool.query<ClusterListItem & { ticket_count: string; needs_response_count: string }>(
      `SELECT
        c.id,
        c.name,
        c.subcluster_name,
        c.kb_status,
        c.config,
        c.created_at,
        c.updated_at,
        COALESCE(COUNT(t.id), 0)::text AS ticket_count,
        COALESCE(COUNT(t.id) FILTER (WHERE t.rita_status = 'NEEDS_RESPONSE'), 0)::text AS needs_response_count
      FROM clusters c
      LEFT JOIN tickets t ON t.cluster_id = c.id
      WHERE c.organization_id = $1
      GROUP BY c.id
      ORDER BY ${orderBy}`,
      [organizationId]
    );

    return result.rows.map(row => ({
      ...row,
      ticket_count: parseInt(row.ticket_count, 10),
      needs_response_count: parseInt(row.needs_response_count, 10)
    }));
  }

  /**
   * Get paginated tickets for a cluster
   * Uses cursor-based pagination on created_at
   */
  async getClusterTickets(
    clusterId: string,
    organizationId: string,
    options: ClusterTicketsQueryOptions = {}
  ): Promise<{ tickets: Ticket[]; pagination: PaginationInfo }> {
    const limit = Math.min(options.limit || DEFAULT_LIMIT, MAX_LIMIT);
    const fetchLimit = limit + 1; // Fetch one extra to determine has_more

    // Map tab to rita_status
    let ritaStatusFilter: string | null = null;
    if (options.tab === 'needs_response') {
      ritaStatusFilter = 'NEEDS_RESPONSE';
    } else if (options.tab === 'completed') {
      ritaStatusFilter = 'COMPLETED';
    }

    // Build query
    const conditions: string[] = [
      'cluster_id = $1',
      'organization_id = $2'
    ];
    const values: any[] = [clusterId, organizationId];
    let paramIndex = 3;

    if (ritaStatusFilter) {
      conditions.push(`rita_status = $${paramIndex++}`);
      values.push(ritaStatusFilter);
    }

    if (options.cursor) {
      conditions.push(`created_at < $${paramIndex++}`);
      values.push(new Date(options.cursor));
    }

    values.push(fetchLimit);

    const query = `
      SELECT * FROM tickets
      WHERE ${conditions.join(' AND ')}
      ORDER BY created_at DESC
      LIMIT $${paramIndex}
    `;

    const result = await pool.query<Ticket>(query, values);
    const tickets = result.rows;

    // Determine pagination
    const hasMore = tickets.length > limit;
    if (hasMore) {
      tickets.pop(); // Remove the extra row
    }

    const nextCursor = hasMore && tickets.length > 0
      ? tickets[tickets.length - 1].created_at.toISOString()
      : null;

    return {
      tickets,
      pagination: {
        next_cursor: nextCursor,
        has_more: hasMore
      }
    };
  }

  /**
   * Check if cluster exists and belongs to organization
   */
  async clusterExists(clusterId: string, organizationId: string): Promise<boolean> {
    const result = await pool.query(
      'SELECT 1 FROM clusters WHERE id = $1 AND organization_id = $2',
      [clusterId, organizationId]
    );
    return result.rows.length > 0;
  }
}
