import express from 'express';
import { authenticateUser } from '../middleware/auth.js';
import { AuthenticatedRequest } from '../types/express.js';
import { withOrgContext } from '../config/database.js';
import axios from 'axios';

const router = express.Router();

// Send a new message (convenience method)
// Creates conversation automatically if conversationId not provided
// For explicit conversation management, use POST /api/conversations/:id/messages
router.post('/', authenticateUser, async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const { content, conversationId, document_ids = [] } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    const result = await withOrgContext(
      authReq.user.id,
      authReq.user.activeOrganizationId,
      async (client) => {
        let actualConversationId = conversationId;

        // If no conversationId provided, create a new conversation
        if (!conversationId) {
          const conversationResult = await client.query(`
            INSERT INTO conversations (organization_id, user_id, title)
            VALUES ($1, $2, $3)
            RETURNING id
          `, [
            authReq.user.activeOrganizationId,
            authReq.user.id,
            content.trim().substring(0, 50) + (content.trim().length > 50 ? '...' : '')
          ]);

          actualConversationId = conversationResult.rows[0].id;
        } else {
          // Verify the conversation exists and belongs to the organization AND user
          const convCheck = await client.query(
            'SELECT id FROM conversations WHERE id = $1 AND organization_id = $2 AND user_id = $3',
            [conversationId, authReq.user.activeOrganizationId, authReq.user.id]
          );

          if (convCheck.rows.length === 0) {
            throw new Error('Conversation not found or access denied');
          }
        }

        // Create message in database
        const messageResult = await client.query(`
          INSERT INTO messages (organization_id, conversation_id, user_id, message, role, status)
          VALUES ($1, $2, $3, $4, 'user', 'pending')
          RETURNING id, conversation_id, message, role, status, created_at
        `, [authReq.user.activeOrganizationId, actualConversationId, authReq.user.id, content.trim()]);

        const message = messageResult.rows[0];

        // Link documents if provided
        if (document_ids.length > 0) {
          const documentValues = document_ids.map((docId: string, index: number) =>
            `($${index * 2 + 1}, $${index * 2 + 2})`
          ).join(', ');

          const documentParams = document_ids.flatMap((docId: string) => [message.id, docId]);

          await client.query(`
            INSERT INTO message_documents (message_id, document_id)
            VALUES ${documentValues}
          `, documentParams);
        }

        return message;
      }
    );

    // Send webhook to external service
    try {
      const webhookPayload = {
        source: 'rita-chat',
        action: 'message_created',
        user_email: authReq.user.email,
        user_id: authReq.user.id,
        tenant_id: authReq.user.activeOrganizationId,
        conversation_id: result.conversation_id,
        customer_message: result.message,
        message_id: result.id,
        document_ids: document_ids,
        timestamp: result.created_at
      };

      const webhookResponse = await axios.post(process.env.AUTOMATION_WEBHOOK_URL!, webhookPayload, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.AUTOMATION_AUTH}`
        },
        timeout: 5000
      });

      // Update message status to sent
      await withOrgContext(
        authReq.user.id,
        authReq.user.activeOrganizationId,
        async (client) => {
          await client.query(
            'UPDATE messages SET status = $1, sent_at = NOW() WHERE id = $2',
            ['sent', result.id]
          );
        }
      );

      console.log(`📤 Webhook sent successfully for message ${result.id}`);

    } catch (webhookError) {
      console.error('Webhook error:', webhookError);

      // Update message status to failed
      await withOrgContext(
        authReq.user.id,
        authReq.user.activeOrganizationId,
        async (client) => {
          await client.query(`
            UPDATE messages
            SET status = $1, error_message = $2
            WHERE id = $3
          `, ['failed', (webhookError as Error).message, result.id]);
        }
      );
    }

    res.status(201).json({
      message: {
        ...result,
        document_ids: document_ids
      }
    });

  } catch (error) {
    console.error('Error creating message:', error);
    res.status(500).json({ error: 'Failed to create message' });
  }
});

// NOTE: GET /api/messages removed - use GET /api/conversations/:id/messages instead
// This promotes conversation-centric design and prevents UI confusion

// Get specific message
router.get('/:messageId', authenticateUser, async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const { messageId } = req.params;

    const result = await withOrgContext(
      authReq.user.id,
      authReq.user.activeOrganizationId,
      async (client) => {
        const messageResult = await client.query(`
          SELECT
            m.id,
            m.conversation_id,
            m.message,
            m.role,
            m.response_content,
            m.status,
            m.created_at,
            m.processed_at,
            m.error_message,
            up.email as user_email,
            c.title as conversation_title,
            COALESCE(
              json_agg(
                json_build_object(
                  'id', d.id,
                  'filename', d.file_name,
                  'file_size', d.file_size,
                  'storage_path', d.file_path
                )
              ) FILTER (WHERE d.id IS NOT NULL),
              '[]'
            ) as documents
          FROM messages m
          LEFT JOIN user_profiles up ON m.user_id = up.user_id
          LEFT JOIN conversations c ON m.conversation_id = c.id
          LEFT JOIN message_documents md ON m.id = md.message_id
          LEFT JOIN documents d ON md.document_id = d.id
          WHERE m.id = $1 AND m.organization_id = $2
          GROUP BY m.id, m.conversation_id, m.message, m.role, m.response_content, m.status, m.created_at, m.processed_at, m.error_message, up.email, c.title
        `, [messageId, authReq.user.activeOrganizationId]);

        if (messageResult.rows.length === 0) {
          return null;
        }

        return messageResult.rows[0];
      }
    );

    if (!result) {
      return res.status(404).json({ error: 'Message not found' });
    }

    res.json({ message: result });

  } catch (error) {
    console.error('Error fetching message:', error);
    res.status(500).json({ error: 'Failed to fetch message' });
  }
});

export default router;