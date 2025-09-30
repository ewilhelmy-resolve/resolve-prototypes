import express from 'express';
import { authenticateUser } from '../middleware/auth.js';
import { AuthenticatedRequest } from '../types/express.js';
import { withOrgContext } from '../config/database.js';
import { WebhookService } from '../services/WebhookService.js';

const router = express.Router();
const webhookService = new WebhookService();

// Create a new conversation
router.post('/', authenticateUser, async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const { title } = req.body;

    if (!title || title.trim().length === 0) {
      return res.status(400).json({ error: 'Conversation title is required' });
    }

    const result = await withOrgContext(
      authReq.user.id,
      authReq.user.activeOrganizationId,
      async (client) => {
        const conversationResult = await client.query(`
          INSERT INTO conversations (organization_id, user_id, title)
          VALUES ($1, $2, $3)
          RETURNING id, title, created_at, updated_at
        `, [authReq.user.activeOrganizationId, authReq.user.id, title.trim()]);

        return conversationResult.rows[0];
      }
    );

    res.status(201).json({ conversation: result });

  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

// Get all conversations for the current organization
router.get('/', authenticateUser, async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await withOrgContext(
      authReq.user.id,
      authReq.user.activeOrganizationId,
      async (client) => {
        const conversationsResult = await client.query(`
          SELECT
            c.id,
            c.title,
            c.created_at,
            c.updated_at,
            up.email as user_email
          FROM conversations c
          LEFT JOIN user_profiles up ON c.user_id = up.user_id
          WHERE c.organization_id = $1 AND c.user_id = $2
          ORDER BY c.updated_at DESC
          LIMIT $3 OFFSET $4
        `, [authReq.user.activeOrganizationId, authReq.user.id, limit, offset]);

        const countResult = await client.query(
          'SELECT COUNT(*) as total FROM conversations WHERE organization_id = $1 AND user_id = $2',
          [authReq.user.activeOrganizationId, authReq.user.id]
        );

        return {
          conversations: conversationsResult.rows,
          total: parseInt(countResult.rows[0].total),
          limit,
          offset
        };
      }
    );

    res.json(result);

  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// Get all messages for a specific conversation
router.get('/:conversationId/messages', authenticateUser, async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const { conversationId } = req.params;
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await withOrgContext(
      authReq.user.id,
      authReq.user.activeOrganizationId,
      async (client) => {
        // First, verify the conversation belongs to the organization AND user
        const convCheck = await client.query(
          'SELECT id FROM conversations WHERE id = $1 AND organization_id = $2 AND user_id = $3',
          [conversationId, authReq.user.activeOrganizationId, authReq.user.id]
        );

        if (convCheck.rows.length === 0) {
          return null; // Will result in a 404
        }

        const messagesResult = await client.query(`
          SELECT
            m.id,
            m.message,
            m.role,
            m.response_content,
            m.status,
            m.created_at,
            m.processed_at,
            m.error_message,
            m.metadata,
            m.response_group_id,
            up.email as user_email,
            COALESCE(
              json_agg(
                json_build_object(
                  'id', d.id,
                  'filename', d.file_name,
                  'file_size', d.file_size
                )
              ) FILTER (WHERE d.id IS NOT NULL),
              '[]'
            ) as documents
          FROM messages m
          LEFT JOIN user_profiles up ON m.user_id = up.user_id
          LEFT JOIN message_documents md ON m.id = md.message_id
          LEFT JOIN documents d ON md.document_id = d.id
          WHERE m.conversation_id = $1 AND m.organization_id = $2
          GROUP BY m.id, m.message, m.role, m.response_content, m.status, m.created_at, m.processed_at, m.error_message, m.metadata, m.response_group_id, up.email
          ORDER BY m.created_at ASC, m.id ASC
          LIMIT $3 OFFSET $4
        `, [conversationId, authReq.user.activeOrganizationId, limit, offset]);

        return messagesResult.rows;
      }
    );

    if (result === null) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json({ messages: result });

  } catch (error) {
    console.error('Error fetching messages for conversation:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Add a message to a specific conversation
router.post('/:conversationId/messages', authenticateUser, async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const { conversationId } = req.params;
    const { content, document_ids = [] } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    const result = await withOrgContext(
      authReq.user.id,
      authReq.user.activeOrganizationId,
      async (client) => {
        // Verify the conversation exists and belongs to the organization AND user
        const convCheck = await client.query(
          'SELECT id FROM conversations WHERE id = $1 AND organization_id = $2 AND user_id = $3',
          [conversationId, authReq.user.activeOrganizationId, authReq.user.id]
        );

        if (convCheck.rows.length === 0) {
          throw new Error('Conversation not found or access denied');
        }

        // Fetch existing messages for transcript (before creating new message)
        const transcriptResult = await client.query(`
          SELECT role, message
          FROM messages
          WHERE conversation_id = $1 AND organization_id = $2
          ORDER BY created_at ASC, id ASC
        `, [conversationId, authReq.user.activeOrganizationId]);

        // Build transcript array from existing messages
        const transcript = transcriptResult.rows.map((row: any) => ({
          role: row.role,
          content: row.message
        }));

        // Create message in database
        const messageResult = await client.query(`
          INSERT INTO messages (organization_id, conversation_id, user_id, message, role, status)
          VALUES ($1, $2, $3, $4, 'user', 'pending')
          RETURNING id, conversation_id, message, role, status, created_at
        `, [authReq.user.activeOrganizationId, conversationId, authReq.user.id, content.trim()]);

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

        return { message, transcript };
      }
    );

    // Truncate transcript to 10,000 characters
    let truncatedTranscript = result.transcript;
    const transcriptJson = JSON.stringify(result.transcript);
    if (transcriptJson.length > 10000) {
      // If transcript is too long, truncate and try to keep complete messages
      let charCount = 2; // Account for []
      truncatedTranscript = [];
      for (const entry of result.transcript) {
        const entryJson = JSON.stringify(entry);
        if (charCount + entryJson.length + 1 <= 10000) { // +1 for comma
          truncatedTranscript.push(entry);
          charCount += entryJson.length + 1;
        } else {
          break;
        }
      }
    }

    // Send webhook to external service using WebhookService
    const webhookResponse = await webhookService.sendMessageEvent({
      organizationId: authReq.user.activeOrganizationId,
      userId: authReq.user.id,
      userEmail: authReq.user.email,
      conversationId: conversationId,
      messageId: result.message.id,
      customerMessage: result.message.message,
      documentIds: document_ids,
      createdAt: result.message.created_at,
      transcript: truncatedTranscript
    });

    // Update message status based on webhook response
    await withOrgContext(
      authReq.user.id,
      authReq.user.activeOrganizationId,
      async (client) => {
        if (webhookResponse.success) {
          await client.query(
            'UPDATE messages SET status = $1, sent_at = NOW() WHERE id = $2',
            ['sent', result.message.id]
          );
          console.log(`📤 Webhook sent successfully for message ${result.message.id}`);
        } else {
          await client.query(`
            UPDATE messages
            SET status = $1, error_message = $2
            WHERE id = $3
          `, ['failed', webhookResponse.error || 'Webhook failed', result.message.id]);
          console.error(`📤 Webhook failed for message ${result.message.id}:`, webhookResponse.error);
        }
      }
    );

    res.status(201).json({
      message: {
        ...result.message,
        document_ids: document_ids
      }
    });

  } catch (error) {
    console.error('Error creating message:', error);
    res.status(500).json({ error: 'Failed to create message' });
  }
});

// Update conversation title
router.patch('/:conversationId', authenticateUser, async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const { conversationId } = req.params;
    const { title } = req.body;

    if (!title || title.trim().length === 0) {
      return res.status(400).json({ error: 'Conversation title is required' });
    }

    const result = await withOrgContext(
      authReq.user.id,
      authReq.user.activeOrganizationId,
      async (client) => {
        // Verify the conversation exists and belongs to the organization AND user
        const convCheck = await client.query(
          'SELECT id FROM conversations WHERE id = $1 AND organization_id = $2 AND user_id = $3',
          [conversationId, authReq.user.activeOrganizationId, authReq.user.id]
        );

        if (convCheck.rows.length === 0) {
          return null; // Will result in a 404
        }

        // Update the conversation title
        const updateResult = await client.query(`
          UPDATE conversations
          SET title = $1, updated_at = NOW()
          WHERE id = $2 AND organization_id = $3 AND user_id = $4
          RETURNING id, title, created_at, updated_at
        `, [title.trim(), conversationId, authReq.user.activeOrganizationId, authReq.user.id]);

        return updateResult.rows[0];
      }
    );

    if (result === null) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json({ conversation: result });

  } catch (error) {
    console.error('Error updating conversation:', error);
    res.status(500).json({ error: 'Failed to update conversation' });
  }
});

// Delete conversation
router.delete('/:conversationId', authenticateUser, async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const { conversationId } = req.params;

    const result = await withOrgContext(
      authReq.user.id,
      authReq.user.activeOrganizationId,
      async (client) => {
        // Verify the conversation exists and belongs to the organization AND user
        const convCheck = await client.query(
          'SELECT id FROM conversations WHERE id = $1 AND organization_id = $2 AND user_id = $3',
          [conversationId, authReq.user.activeOrganizationId, authReq.user.id]
        );

        if (convCheck.rows.length === 0) {
          return null; // Will result in a 404
        }

        // Delete the conversation (CASCADE will handle messages and document links)
        await client.query(
          'DELETE FROM conversations WHERE id = $1 AND organization_id = $2 AND user_id = $3',
          [conversationId, authReq.user.activeOrganizationId, authReq.user.id]
        );

        return { deleted: true };
      }
    );

    if (result === null) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json(result);

  } catch (error) {
    console.error('Error deleting conversation:', error);
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
});


export default router;
