import express from 'express';
import { authenticateUser } from '../middleware/auth.js';
import { AuthenticatedRequest } from '../types/express.js';
import { pool } from '../config/database.js';

const router = express.Router();

// Get user's organizations
router.get('/', authenticateUser, async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const result = await pool.query(`
      SELECT
        o.id,
        o.name,
        om.role,
        om.joined_at,
        (o.id = up.active_organization_id) as is_active
      FROM organizations o
      JOIN organization_members om ON o.id = om.organization_id
      JOIN user_profiles up ON up.user_id = om.user_id
      WHERE om.user_id = $1
      ORDER BY om.joined_at ASC
    `, [authReq.user.id]);

    res.json({ organizations: result.rows });
  } catch (error) {
    console.error('Error fetching organizations:', error);
    res.status(500).json({ error: 'Failed to fetch organizations' });
  }
});

// Switch active organization
router.post('/switch', authenticateUser, async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const { organizationId } = req.body;

    if (!organizationId) {
      return res.status(400).json({ error: 'Organization ID is required' });
    }

    // Verify user is a member of the target organization
    const membershipCheck = await pool.query(
      'SELECT role FROM organization_members WHERE organization_id = $1 AND user_id = $2',
      [organizationId, authReq.user.id]
    );

    if (membershipCheck.rows.length === 0) {
      return res.status(403).json({ error: 'You are not a member of this organization' });
    }

    // Update user's active organization
    await pool.query(
      'UPDATE user_profiles SET active_organization_id = $1 WHERE user_id = $2',
      [organizationId, authReq.user.id]
    );

    // Log the organization switch for audit trail
    await pool.query(`
      INSERT INTO audit_logs (organization_id, user_id, action, resource_type, resource_id, metadata)
      VALUES ($1, $2, 'switch_organization', 'organization', $1, $3)
    `, [
      organizationId,
      authReq.user.id,
      JSON.stringify({
        from_organization_id: authReq.user.activeOrganizationId,
        to_organization_id: organizationId
      })
    ]);

    res.json({
      success: true,
      activeOrganizationId: organizationId,
      message: 'Active organization switched successfully'
    });
  } catch (error) {
    console.error('Error switching organization:', error);
    res.status(500).json({ error: 'Failed to switch organization' });
  }
});

// Create new organization
router.post('/create', authenticateUser, async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const { name } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Organization name is required' });
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Create the organization
      const orgResult = await client.query(
        'INSERT INTO organizations (name) VALUES ($1) RETURNING id, name, created_at',
        [name.trim()]
      );
      const organization = orgResult.rows[0];

      // Add user as owner
      await client.query(
        'INSERT INTO organization_members (organization_id, user_id, role) VALUES ($1, $2, $3)',
        [organization.id, authReq.user.id, 'owner']
      );

      // Log organization creation
      await client.query(`
        INSERT INTO audit_logs (organization_id, user_id, action, resource_type, resource_id)
        VALUES ($1, $2, 'create_organization', 'organization', $1)
      `, [organization.id, authReq.user.id]);

      await client.query('COMMIT');

      res.status(201).json({
        organization,
        message: 'Organization created successfully'
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error creating organization:', error);
    res.status(500).json({ error: 'Failed to create organization' });
  }
});

// Get organization details (for active organization)
router.get('/current', authenticateUser, async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const result = await pool.query(`
      SELECT
        o.id,
        o.name,
        o.created_at,
        om.role as user_role,
        (SELECT COUNT(*) FROM organization_members WHERE organization_id = o.id) as member_count
      FROM organizations o
      JOIN organization_members om ON o.id = om.organization_id
      WHERE o.id = $1 AND om.user_id = $2
    `, [authReq.user.activeOrganizationId, authReq.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    res.json({ organization: result.rows[0] });
  } catch (error) {
    console.error('Error fetching current organization:', error);
    res.status(500).json({ error: 'Failed to fetch organization details' });
  }
});

export default router;