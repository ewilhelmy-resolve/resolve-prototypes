const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { body, param, query, validationResult } = require('express-validator');
const authService = require('../services/authService');
const { authenticate } = require('../middleware/auth');
const { sanitizeHtml } = require('../utils/validation');

// Validation middleware
const validateUserCreation = [
    body('name')
        .isLength({ min: 1, max: 255 })
        .withMessage('Name is required and must be less than 255 characters'),
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Valid email is required'),
    body('role')
        .isIn(['tenant-admin', 'user'])
        .withMessage('Role must be either tenant-admin or user'),
    body('invite')
        .optional()
        .isBoolean()
        .withMessage('Invite must be a boolean')
];

const validateUserUpdate = [
    param('id')
        .isInt()
        .withMessage('User ID must be an integer'),
    body('name')
        .optional()
        .isLength({ min: 1, max: 255 })
        .withMessage('Name must be less than 255 characters'),
    body('role')
        .optional()
        .isIn(['tenant-admin', 'user'])
        .withMessage('Role must be either tenant-admin or user'),
    body('status')
        .optional()
        .isIn(['active', 'invited', 'disabled'])
        .withMessage('Invalid status value')
];

const validatePagination = [
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),
    query('pageSize')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Page size must be between 1 and 100'),
    query('q')
        .optional()
        .isLength({ max: 255 })
        .withMessage('Search query too long'),
    query('role')
        .optional()
        .custom(value => !value || ['tenant-admin', 'user'].includes(value))
        .withMessage('Invalid role filter'),
    query('status')
        .optional()
        .custom(value => !value || ['active', 'invited', 'disabled'].includes(value))
        .withMessage('Invalid status filter')
];

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ 
            error: 'Validation failed',
            details: errors.array()
        });
    }
    next();
};

const { requireTenantAdmin } = require('../middleware/auth');

function createUsersRouter(db) {
    const router = express.Router();

    // All routes require authentication
    router.use(authenticate);

    // Get list of users in tenant (tenant-admin only)
    router.get('/api/tenants/:tenantId/users',
        requireTenantAdmin,
        validatePagination,
        handleValidationErrors,
        async (req, res) => {
        try {
            const { tenantId } = req.params;
            
            // Verify tenant access
            if (tenantId !== req.tenantId) {
                return res.status(403).json({ error: 'Access denied to this tenant' });
            }

            const { 
                q = '', 
                role = null, 
                status = null, 
                page = 1, 
                pageSize = 20, 
                sort = 'created_at:desc' 
            } = req.query;

            // Parse sort parameter
            const [sortField, sortDir] = sort.split(':');
            const validSortFields = ['name', 'email', 'role', 'status', 'last_login_at', 'created_at'];
            const orderBy = validSortFields.includes(sortField) ? sortField : 'created_at';
            const orderDir = sortDir === 'asc' ? 'ASC' : 'DESC';

            // Build query
            let whereClause = 'WHERE tenant_id = $1';
            const queryParams = [tenantId];
            let paramCount = 1;

            // Add search filter
            if (q) {
                paramCount++;
                whereClause += ` AND (full_name ILIKE $${paramCount} OR email ILIKE $${paramCount})`;
                queryParams.push(`%${q}%`);
            }

            // Add role filter
            if (role) {
                paramCount++;
                whereClause += ` AND role = $${paramCount}`;
                queryParams.push(role);
            }

            // Add status filter
            if (status) {
                paramCount++;
                whereClause += ` AND status = $${paramCount}`;
                queryParams.push(status);
            }

            // Get total count
            const countQuery = `SELECT COUNT(*) FROM users ${whereClause}`;
            const countResult = await db.query(countQuery, queryParams);
            const total = parseInt(countResult.rows[0].count);

            // Get paginated results
            const offset = (page - 1) * pageSize;
            paramCount++;
            const limitParam = paramCount;
            paramCount++;
            const offsetParam = paramCount;

            const dataQuery = `
                SELECT 
                    id, 
                    email, 
                    full_name as name, 
                    role, 
                    status, 
                    last_login_at, 
                    created_at, 
                    updated_at
                FROM users 
                ${whereClause}
                ORDER BY ${orderBy} ${orderDir}
                LIMIT $${limitParam} OFFSET $${offsetParam}
            `;

            queryParams.push(pageSize, offset);
            const result = await db.query(dataQuery, queryParams);

            res.json({
                data: result.rows.map(user => ({
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    status: user.status,
                    lastLoginAt: user.last_login_at,
                    createdAt: user.created_at,
                    updatedAt: user.updated_at
                })),
                page: parseInt(page),
                pageSize: parseInt(pageSize),
                total
            });

        } catch (error) {
            console.error('[USERS API] List users error:', error);
            res.status(500).json({ error: 'Failed to retrieve users' });
        }
    });

    // Create new user (tenant-admin only)
    router.post('/api/tenants/:tenantId/users',
        requireTenantAdmin,
        validateUserCreation,
        handleValidationErrors,
        async (req, res) => {
        try {
            const { tenantId } = req.params;
            
            // Verify tenant access
            if (tenantId !== req.tenantId) {
                return res.status(403).json({ error: 'Access denied to this tenant' });
            }

            const { name, email, role, invite = true } = req.body;

            // Check if user already exists in this tenant
            const existing = await db.query(
                'SELECT id FROM users WHERE email = $1 AND tenant_id = $2',
                [email, tenantId]
            );

            if (existing.rows.length > 0) {
                return res.status(409).json({ 
                    error: 'User already exists in this tenant' 
                });
            }

            // Generate temporary password for invited users
            const tempPassword = crypto.randomBytes(16).toString('hex');
            const hashedPassword = await bcrypt.hash(tempPassword, 10);

            // Create user
            const result = await db.query(
                `INSERT INTO users (
                    email, password, full_name, tenant_id, role, status, invited_at, invited_by
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
                RETURNING id, email, full_name as name, role, status, created_at`,
                [
                    email, 
                    hashedPassword, 
                    name, 
                    tenantId, 
                    role, 
                    invite ? 'invited' : 'active',
                    invite ? new Date() : null,
                    req.session.userId
                ]
            );

            const newUser = result.rows[0];
            let resetLink = null;

            // Generate password reset link for invited users
            if (invite) {
                const resetToken = crypto.randomBytes(32).toString('hex');
                const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

                await db.query(
                    `INSERT INTO password_reset_tokens (user_id, token, expires_at) 
                     VALUES ($1, $2, $3)`,
                    [newUser.id, resetToken, expiresAt]
                );

                // Generate reset link
                const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
                resetLink = `${baseUrl}/auth/reset?token=${resetToken}`;
            }

            res.status(201).json({
                user: {
                    id: newUser.id,
                    name: newUser.name,
                    email: newUser.email,
                    role: newUser.role,
                    status: newUser.status,
                    createdAt: newUser.created_at
                },
                resetLink
            });

        } catch (error) {
            console.error('[USERS API] Create user error:', error);
            res.status(500).json({ error: 'Failed to create user' });
        }
    });

    // Update user (tenant-admin only)
    router.patch('/api/tenants/:tenantId/users/:id',
        requireTenantAdmin,
        validateUserUpdate,
        handleValidationErrors,
        async (req, res) => {
        try {
            const { tenantId, id } = req.params;
            
            // Verify tenant access
            if (tenantId !== req.tenantId) {
                return res.status(403).json({ error: 'Access denied to this tenant' });
            }

            // Check if user exists in tenant
            const userCheck = await db.query(
                'SELECT id, role FROM users WHERE id = $1 AND tenant_id = $2',
                [id, tenantId]
            );

            if (userCheck.rows.length === 0) {
                return res.status(404).json({ error: 'User not found' });
            }

            const { name, role, status } = req.body;
            const updates = [];
            const values = [];
            let paramCount = 0;

            if (name !== undefined) {
                paramCount++;
                updates.push(`full_name = $${paramCount}`);
                values.push(name);
            }

            if (role !== undefined) {
                // Prevent removing admin role from last admin
                if (userCheck.rows[0].role === 'tenant-admin' && role !== 'tenant-admin') {
                    const adminCount = await db.query(
                        'SELECT COUNT(*) FROM users WHERE tenant_id = $1 AND role = $2 AND status = $3 AND id != $4',
                        [tenantId, 'tenant-admin', 'active', id]
                    );
                    
                    if (parseInt(adminCount.rows[0].count) === 0) {
                        return res.status(400).json({ 
                            error: 'Cannot remove admin role from the last tenant admin' 
                        });
                    }
                }
                
                paramCount++;
                updates.push(`role = $${paramCount}`);
                values.push(role);
            }

            if (status !== undefined) {
                paramCount++;
                updates.push(`status = $${paramCount}`);
                values.push(status);
            }

            if (updates.length === 0) {
                return res.status(400).json({ error: 'No fields to update' });
            }

            paramCount++;
            values.push(id);
            paramCount++;
            values.push(tenantId);

            const updateQuery = `
                UPDATE users 
                SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
                WHERE id = $${paramCount - 1} AND tenant_id = $${paramCount}
                RETURNING id, email, full_name as name, role, status, updated_at
            `;

            const result = await db.query(updateQuery, values);

            res.json({
                user: {
                    id: result.rows[0].id,
                    name: result.rows[0].name,
                    email: result.rows[0].email,
                    role: result.rows[0].role,
                    status: result.rows[0].status,
                    updatedAt: result.rows[0].updated_at
                }
            });

        } catch (error) {
            console.error('[USERS API] Update user error:', error);
            res.status(500).json({ error: 'Failed to update user' });
        }
    });

    // Delete user (tenant-admin only)
    router.delete('/api/tenants/:tenantId/users/:id',
        requireTenantAdmin,
        async (req, res) => {
        try {
            const { tenantId, id } = req.params;
            
            // Verify tenant access
            if (tenantId !== req.tenantId) {
                return res.status(403).json({ error: 'Access denied to this tenant' });
            }

            // Prevent self-deletion
            if (parseInt(id) === req.session.userId) {
                return res.status(400).json({ error: 'Cannot delete your own account' });
            }

            // Check if user exists and get their role
            const userCheck = await db.query(
                'SELECT role FROM users WHERE id = $1 AND tenant_id = $2',
                [id, tenantId]
            );

            if (userCheck.rows.length === 0) {
                return res.status(404).json({ error: 'User not found' });
            }

            // Prevent deleting last admin
            if (userCheck.rows[0].role === 'tenant-admin') {
                const adminCount = await db.query(
                    'SELECT COUNT(*) FROM users WHERE tenant_id = $1 AND role = $2 AND status = $3 AND id != $4',
                    [tenantId, 'tenant-admin', 'active', id]
                );
                
                if (parseInt(adminCount.rows[0].count) === 0) {
                    return res.status(400).json({ 
                        error: 'Cannot delete the last tenant admin' 
                    });
                }
            }

            // First, clear any references to this user in invited_by
            await db.query(
                'UPDATE users SET invited_by = NULL WHERE invited_by = $1',
                [id]
            );
            
            // Delete user
            const deleteResult = await db.query(
                'DELETE FROM users WHERE id = $1 AND tenant_id = $2 RETURNING id',
                [id, tenantId]
            );

            if (deleteResult.rows.length === 0) {
                return res.status(404).json({ error: 'User not found or already deleted' });
            }

            res.json({ ok: true });

        } catch (error) {
            console.error('[USERS API] Delete user error:', error);
            res.status(500).json({ error: 'Failed to delete user' });
        }
    });

    // Generate password reset link (tenant-admin only)
    router.post('/api/tenants/:tenantId/users/:id/reset-password',
        requireTenantAdmin,
        async (req, res) => {
        try {
            const { tenantId, id } = req.params;
            
            // Verify tenant access
            if (tenantId !== req.tenantId) {
                return res.status(403).json({ error: 'Access denied to this tenant' });
            }

            // Check if user exists in tenant
            const userCheck = await db.query(
                'SELECT email FROM users WHERE id = $1 AND tenant_id = $2',
                [id, tenantId]
            );

            if (userCheck.rows.length === 0) {
                return res.status(404).json({ error: 'User not found' });
            }

            // Generate reset token
            const resetToken = crypto.randomBytes(32).toString('hex');
            const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours

            // Invalidate any existing tokens
            await db.query(
                'UPDATE password_reset_tokens SET used = true WHERE user_id = $1 AND used = false',
                [id]
            );

            // Create new token
            await db.query(
                `INSERT INTO password_reset_tokens (user_id, token, expires_at) 
                 VALUES ($1, $2, $3)`,
                [id, resetToken, expiresAt]
            );

            // Generate reset link
            const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
            const resetLink = `${baseUrl}/auth/reset?token=${resetToken}`;

            res.json({
                resetLink,
                expiresAt: expiresAt.toISOString()
            });

        } catch (error) {
            console.error('[USERS API] Password reset error:', error);
            res.status(500).json({ error: 'Failed to generate password reset link' });
        }
    });

    return router;
}

module.exports = createUsersRouter;