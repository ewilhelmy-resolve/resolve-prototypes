import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { type Channel, type ChannelModel, connect } from 'amqplib';
import axios from 'axios';
import cors from 'cors';
import { config } from 'dotenv';
import express from 'express';
import {
  configLogger,
  createContextLogger,
  generateCorrelationId,
  logError,
  logger,
  PerformanceTimer,
  rabbitLogger,
  webhookLogger
} from './config/logger.js';


// Load environment from root .env file
config({ path: resolve(process.cwd(), '../../.env') });

const app = express();
const PORT = process.env.MOCK_SERVICE_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Mock service configuration
const MOCK_CONFIG = {
  // Response scenarios: 'success', 'failure', 'timeout', 'processing'
  defaultScenario: process.env.MOCK_SCENARIO || 'success',
  // Response delays in milliseconds
  responseDelay: parseInt(process.env.MOCK_DELAY || '2000', 10),
  // Success rate (0-100)
  successRate: parseInt(process.env.MOCK_SUCCESS_RATE || '90', 10),
  // RabbitMQ configuration
  queueName: process.env.QUEUE_NAME || 'chat.responses',
  rabbitUrl: process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672',
  // Keycloak configuration
  keycloak: {
    baseUrl: process.env.KEYCLOAK_URL || 'http://localhost:8080',
    realm: process.env.KEYCLOAK_REALM || 'resolve',
    adminUser: process.env.KEYCLOAK_ADMIN || 'admin',
    adminPassword: process.env.KEYCLOAK_ADMIN_PASSWORD || 'admin',
    clientId: process.env.KEYCLOAK_CLIENT_ID || 'rita-client'
  }
};

// Base webhook payload shared by all webhook types
interface BaseWebhookPayload {
  source: string;
  action: string;
  user_email?: string;
  user_id?: string;
  tenant_id: string;
  timestamp?: string;
}

// Message webhook payload for rita-chat
interface MessageWebhookPayload extends BaseWebhookPayload {
  source: 'rita-chat';
  action: 'message_created';
  conversation_id: string;
  customer_message: string;
  message_id: string;
  document_ids?: string[];
  transcript_ids?: {
    transcripts: Array<{ role: string; content: string }>;
  };
}

// Document webhook payload for rita-documents
interface DocumentWebhookPayload extends BaseWebhookPayload {
  source: 'rita-documents';
  action: 'document_uploaded';
  blob_metadata_id: string; // blob_metadata.id
  blob_id: string; // blobs.blob_id
  document_url: string;
  file_type: string;
  file_size: number;
  original_filename: string;
}

// Signup webhook payload for rita-signup
interface SignupWebhookPayload extends BaseWebhookPayload {
  source: 'rita-signup';
  action: 'user_signup';
  first_name: string;
  last_name: string;
  company: string;
  password: string;
  verification_token: string;
  verification_url: string;
  pending_user_id: string;
}

// Union type for all webhook payloads
type WebhookPayload = MessageWebhookPayload | DocumentWebhookPayload | SignupWebhookPayload | BaseWebhookPayload;

interface MockResponse {
  message_id: string;
  conversation_id: string;
  tenant_id: string;
  user_id?: string;
  response: string;
  metadata?: any;
  response_group_id?: string;
}

interface MessagePart {
  type: 'text' | 'reasoning' | 'sources' | 'tasks' | 'files';
  [key: string]: any;
}

// RabbitMQ connection
let rabbitConnection: ChannelModel | null = null;
let rabbitChannel: Channel | null = null;

async function connectRabbitMQ(): Promise<void> {
  const timer = new PerformanceTimer(rabbitLogger, 'connect-rabbitmq');
  try {
    rabbitLogger.info({ url: MOCK_CONFIG.rabbitUrl }, 'Connecting to RabbitMQ...');
    rabbitConnection = await connect(MOCK_CONFIG.rabbitUrl);
    rabbitChannel = await rabbitConnection.createChannel();

    await rabbitChannel.assertQueue(MOCK_CONFIG.queueName, { durable: true });
    timer.end({ queueName: MOCK_CONFIG.queueName, success: true });
    rabbitLogger.info({ queueName: MOCK_CONFIG.queueName }, 'Connected to RabbitMQ successfully');
  } catch (error) {
    timer.end({ success: false });
    logError(rabbitLogger, error as Error, { operation: 'connect-rabbitmq', url: MOCK_CONFIG.rabbitUrl });
    throw error;
  }
}

async function publishResponse(response: MockResponse): Promise<void> {
  const timer = new PerformanceTimer(rabbitLogger, 'publish-response');
  const contextLogger = createContextLogger(rabbitLogger, generateCorrelationId(), {
    messageId: response.message_id,
    tenantId: response.tenant_id,
    userId: response.user_id
  });

  try {
    if (!rabbitChannel) {
      throw new Error('RabbitMQ channel not initialized');
    }

    const messageBuffer = Buffer.from(JSON.stringify(response));
    rabbitChannel.sendToQueue(MOCK_CONFIG.queueName, messageBuffer, {
      persistent: true
    });

    timer.end({
      messageId: response.message_id,
      queueName: MOCK_CONFIG.queueName,
      success: true
    });
    contextLogger.info({
      queueName: MOCK_CONFIG.queueName
    }, 'Published response to queue');
  } catch (error) {
    timer.end({ success: false });
    logError(contextLogger, error as Error, { operation: 'publish-response' });
    throw error;
  }
}

// Keycloak Admin API functions
let keycloakAdminToken: string | null = null;
let tokenExpiresAt: number = 0;

async function getKeycloakAdminToken(): Promise<string> {
  const timer = new PerformanceTimer(webhookLogger, 'keycloak-admin-token');

  // Return cached token if still valid (with 30 second buffer)
  if (keycloakAdminToken && Date.now() < tokenExpiresAt - 30000) {
    timer.end({ cached: true, success: true });
    return keycloakAdminToken;
  }

  try {
    const response = await axios.post(
      `${MOCK_CONFIG.keycloak.baseUrl}/realms/master/protocol/openid-connect/token`,
      new URLSearchParams({
        grant_type: 'password',
        client_id: 'admin-cli',
        username: MOCK_CONFIG.keycloak.adminUser,
        password: MOCK_CONFIG.keycloak.adminPassword
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    keycloakAdminToken = response.data.access_token;
    tokenExpiresAt = Date.now() + (response.data.expires_in * 1000);

    timer.end({ cached: false, success: true });
    return keycloakAdminToken;
  } catch (error) {
    timer.end({ success: false });
    logError(webhookLogger, error as Error, { operation: 'keycloak-admin-token' });
    throw new Error('Failed to get Keycloak admin token');
  }
}

async function createKeycloakUser(signupData: SignupWebhookPayload): Promise<string> {
  const timer = new PerformanceTimer(webhookLogger, 'create-keycloak-user');
  const contextLogger = createContextLogger(webhookLogger, generateCorrelationId(), {
    email: signupData.user_email,
    pendingUserId: signupData.pending_user_id
  });

  try {
    const adminToken = await getKeycloakAdminToken();

    const userData = {
      username: signupData.user_email,
      email: signupData.user_email,
      firstName: signupData.first_name,
      lastName: signupData.last_name,
      enabled: true,
      emailVerified: true, // Mark as verified for local development testing
      credentials: [{
        type: 'password',
        value: Buffer.from(signupData.password, 'base64').toString('utf8'),
        temporary: false
      }],
      attributes: {
        company: [signupData.company],
        pendingUserId: [signupData.pending_user_id],
        verificationToken: [signupData.verification_token]
      }
    };

    const response = await axios.post(
      `${MOCK_CONFIG.keycloak.baseUrl}/admin/realms/${MOCK_CONFIG.keycloak.realm}/users`,
      userData,
      {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // Extract user ID from Location header
    const locationHeader = response.headers.location;
    const userId = locationHeader ? locationHeader.split('/').pop() : 'unknown';

    timer.end({
      email: signupData.user_email,
      keycloakUserId: userId,
      success: true
    });

    contextLogger.info({
      keycloakUserId: userId,
      keycloakRealm: MOCK_CONFIG.keycloak.realm
    }, 'Keycloak user created successfully');

    return userId;
  } catch (error) {
    timer.end({ success: false });
    logError(contextLogger, error as Error, {
      operation: 'create-keycloak-user',
      keycloakRealm: MOCK_CONFIG.keycloak.realm
    });
    throw error;
  }
}

function generateMockResponse(payload: WebhookPayload, scenario?: string): MockResponse[] | null {
  // Only generate responses for rita-chat messages, not document processing
  if (payload.source !== 'rita-chat') {
    return null;
  }

  const messagePayload = payload as MessageWebhookPayload;
  const content = messagePayload.customer_message.toLowerCase();
  const documentCount = messagePayload.document_ids?.length || 0;

  // Generate a unique response group ID for this multi-part response (UUID format)
  const responseGroupId = randomUUID();

  const parts: MessagePart[] = [];

  // Check for test trigger words first
  if (content.startsWith('test1')) {
    // test1: Normal text message only
    parts.push({
      type: 'text',
      text: `## Simple Text Response ✅

This is a **normal text message** without any reasoning, sources, or tasks.

You triggered: **"${messagePayload.customer_message}"**

### Features
- Clean markdown formatting
- **Bold text** and *italic text*
- Code snippets: \`npm install\`

\`\`\`javascript
console.log('Hello from test1!');
\`\`\`

> This is a simple response to test basic text rendering.`
    });
  } else if (content.startsWith('test2')) {
    // test2: Reasoning + text message
    parts.push({
      type: 'reasoning',
      text: `Let me think about your test2 request:\n\n1. You want to see reasoning + text combination\n2. I'll process this step by step\n3. Then provide a detailed text response`,
      state: 'done'
    });
    parts.push({
      type: 'text',
      text: `## Reasoning + Text Response 🧠

I've analyzed your **"${messagePayload.customer_message}"** request with reasoning.

### What happened:
- **Step 1**: Reasoning was displayed first
- **Step 2**: Now showing the main text response
- **Step 3**: Testing the combination works correctly

This tests the reasoning → text flow in the UI.`
    });
  } else if (content.startsWith('test3')) {
    // test3: Text + sources
    parts.push({
      type: 'text',
      text: `## Text + Sources Response 📚

Your request **"${messagePayload.customer_message}"** triggered a text response with sources.

### Information Provided:
- Main content in this text block
- Related sources listed below
- Documentation references included

Check the sources section for additional resources!`
    });
    parts.push({
      type: 'sources',
      sources: [
        { url: 'https://docs.resolve.com/test3', title: 'Test3 Documentation' },
        { url: 'https://github.com/resolve-io/test3', title: 'Test3 GitHub Repository' },
        { url: 'https://blog.resolve.com/test3-guide', title: 'Complete Test3 Guide' }
      ]
    });
  } else if (content.startsWith('test4')) {
    // test4: Text + tasks
    parts.push({
      type: 'text',
      text: `## Text + Tasks Response ✅

Your **"${messagePayload.customer_message}"** request includes actionable tasks.

### Overview:
- Main response content here
- Automated tasks are generated below
- Ready for immediate execution

Review the task list to see what actions are available.`
    });
    parts.push({
      type: 'tasks',
      tasks: [
        {
          title: 'Test4 Primary Tasks',
          defaultOpen: true,
          items: [
            'Initialize test4 environment',
            'Configure test4 settings',
            'Run test4 validation',
            'Generate test4 report'
          ]
        },
        {
          title: 'Test4 Cleanup Tasks',
          defaultOpen: false,
          items: [
            'Clean temporary test4 files',
            'Reset test4 configuration',
            'Archive test4 logs'
          ]
        }
      ]
    });
  } else if (content.startsWith('test5')) {
    // test5: Full response (reasoning + text + sources + tasks)
    parts.push({
      type: 'reasoning',
      text: `Processing your test5 request comprehensively:\n\n1. Analyzing the full response requirement\n2. Preparing reasoning, text, sources, and tasks\n3. Ensuring all components work together seamlessly`,
      state: 'done'
    });
    parts.push({
      type: 'text',
      text: `## Complete Response Suite 🎯

Your **"${messagePayload.customer_message}"** triggered the full response with all components.

### Components Included:
- **Reasoning**: Step-by-step analysis ✅
- **Text Response**: This main content ✅
- **Sources**: Reference documentation ✅
- **Tasks**: Actionable items ✅

This tests the complete grouped message functionality.`
    });
    parts.push({
      type: 'sources',
      sources: [
        { url: 'https://docs.resolve.com/complete-guide', title: 'Complete Feature Guide' },
        { url: 'https://docs.resolve.com/testing', title: 'Testing Best Practices' },
        { url: 'https://docs.resolve.com/components', title: 'Component Documentation' }
      ]
    });
    parts.push({
      type: 'tasks',
      tasks: [
        {
          title: 'Full Suite Validation',
          defaultOpen: true,
          items: [
            'Verify reasoning display',
            'Check text formatting',
            'Validate sources rendering',
            'Confirm task functionality'
          ]
        }
      ]
    });
  } else if (content.startsWith('test6')) {
    // test6: Just reasoning
    parts.push({
      type: 'reasoning',
      text: `This is a reasoning-only response for your test6 request:\n\n1. You specifically asked for just reasoning\n2. No other components will be generated\n3. This tests the standalone reasoning display\n4. The reasoning should appear in a collapsible section\n5. Perfect for testing the reasoning component in isolation`,
      state: 'done'
    });
  } else if (content.startsWith('test7')) {
    // test7: Just sources
    parts.push({
      type: 'sources',
      sources: [
        { url: 'https://docs.resolve.com/sources-only', title: 'Sources-Only Test Documentation' },
        { url: 'https://api.resolve.com/sources', title: 'Sources API Reference' },
        { url: 'https://github.com/resolve-io/sources', title: 'Sources Component Repository' },
        { url: 'https://blog.resolve.com/sources-guide', title: 'How to Use Sources Effectively' },
        { url: 'https://community.resolve.com/sources', title: 'Community Sources Discussion' }
      ]
    });
  } else if (content.startsWith('test8')) {
    // test8: Just tasks
    parts.push({
      type: 'tasks',
      tasks: [
        {
          title: 'Primary Test8 Operations',
          defaultOpen: true,
          items: [
            'Execute standalone task test',
            'Verify task component isolation',
            'Check task item rendering',
            'Validate task interaction'
          ]
        },
        {
          title: 'Secondary Test8 Operations',
          defaultOpen: false,
          items: [
            'Run background task validation',
            'Test task completion tracking',
            'Generate task execution report'
          ]
        },
        {
          title: 'Test8 Cleanup',
          defaultOpen: false,
          items: [
            'Clean task workspace',
            'Archive task results',
            'Reset task environment'
          ]
        }
      ]
    });
  } else if (content.startsWith('test9')) {
    // test9: Reasoning + sources
    parts.push({
      type: 'reasoning',
      text: `Analyzing your test9 request for reasoning + sources combination:\n\n1. This tests reasoning followed by sources\n2. No text or tasks will be included\n3. Useful for information-gathering scenarios\n4. Sources provide additional context to the reasoning`,
      state: 'done'
    });
    parts.push({
      type: 'sources',
      sources: [
        { url: 'https://docs.resolve.com/reasoning-sources', title: 'Reasoning + Sources Pattern' },
        { url: 'https://research.resolve.com/analysis', title: 'Analysis Methodology' },
        { url: 'https://docs.resolve.com/test9', title: 'Test9 Combination Guide' }
      ]
    });
  } else if (content.startsWith('test10')) {
    // test10: Reasoning + tasks
    parts.push({
      type: 'reasoning',
      text: `Processing your test10 request for reasoning + tasks:\n\n1. I'm analyzing what needs to be done\n2. Based on the analysis, I'll generate specific tasks\n3. This pattern is great for action-oriented responses\n4. The reasoning explains why these tasks are necessary`,
      state: 'done'
    });
    parts.push({
      type: 'tasks',
      tasks: [
        {
          title: 'Reasoning-Based Actions',
          defaultOpen: true,
          items: [
            'Implement reasoning conclusions',
            'Execute analysis recommendations',
            'Monitor reasoning accuracy',
            'Document reasoning outcomes'
          ]
        },
        {
          title: 'Follow-up Tasks',
          defaultOpen: false,
          items: [
            'Validate reasoning-task connection',
            'Optimize task generation logic',
            'Review task completion metrics'
          ]
        }
      ]
    });
  } else {
    // Default scenario - fall back to original logic
    const useScenario = scenario || MOCK_CONFIG.defaultScenario;
    const isSuccess = Math.random() * 100 < MOCK_CONFIG.successRate;

    switch (useScenario) {
    case 'success':
      // Add reasoning part
      parts.push({
        type: 'reasoning',
        text: `Let me analyze your request step by step:\n\n1. First, I'll check the current system status\n2. Then analyze any documents you've provided (${documentCount} found)\n3. Finally, I'll create automation tasks to resolve any issues`,
        state: 'done'
      });

      // Add main text response
      parts.push({
        type: 'text',
        text: `## Analysis Complete ✅

I've successfully processed your request: **"${content}"**

### Summary
- **Documents processed**: ${documentCount}
- **Status**: ✅ Completed successfully
- **Response time**: ~${Math.floor(Math.random() * 3) + 1} seconds

### Key Findings
1. **System health check** passed
2. **Security scan** completed - no issues found
3. **Performance metrics** within normal range

\`\`\`bash
# Example automation script
systemctl status nginx
curl -I https://your-app.com/health
\`\`\`

### Next Steps
- Monitor system for 24 hours
- Review \`/var/log/application.log\` for any warnings
- Consider implementing **automated alerts** for similar issues

> 💡 **Tip**: You can set up automated monitoring to catch this type of issue early!`
      });

      // Add sources
      parts.push({
        type: 'sources',
        sources: [
          { url: 'https://docs.resolve.com/rita/automation', title: 'Rita Automation Documentation' },
          { url: 'https://docs.resolve.com/monitoring/best-practices', title: 'System Monitoring Best Practices' },
          { url: 'https://docs.resolve.com/troubleshooting/common-issues', title: 'Common Infrastructure Issues' }
        ]
      });

      // Add automation tasks
      parts.push({
        type: 'tasks',
        tasks: [
          {
            title: 'System Health Check',
            defaultOpen: true,
            items: [
              'Check system resource utilization (CPU, Memory, Disk)',
              'Verify critical service status and uptime',
              'Generate monitoring report',
              'Send alerts if thresholds exceeded'
            ]
          },
          {
            title: 'Performance Optimization',
            defaultOpen: false,
            items: [
              'Analyze slow database queries',
              'Optimize application caching',
              'Review and tune server configurations',
              'Implement automated scaling policies'
            ]
          }
        ]
      });
      break;

    case 'failure':
      // Add reasoning for failure scenario
      parts.push({
        type: 'reasoning',
        text: `I encountered several issues while trying to process your request:\n\n1. Initial connection to the target system failed\n2. Authentication credentials appear to be invalid\n3. The requested automation cannot proceed safely\n\nLet me provide details and suggested remediation steps.`,
        state: 'done'
      });

      // Add main error response
      parts.push({
        type: 'text',
        text: `## Automation Failed ❌

Unable to process your request: **"${content}"**

### Error Details
- **Error Code**: \`ERR_${Math.floor(Math.random() * 1000)}\`
- **Timestamp**: ${new Date().toISOString()}
- **Affected Services**: ${Math.floor(Math.random() * 3) + 1}

### Common Causes
1. **Network connectivity** issues
2. **Insufficient permissions** on target system
3. **Resource exhaustion** (CPU/Memory)

\`\`\`json
{
  "error": "Connection timeout",
  "service": "automation-engine",
  "retry_count": 3,
  "max_retries": 5
}
\`\`\`

> ⚠️ **Note**: This is a simulated error for testing purposes.`
      });

      // Add troubleshooting sources
      parts.push({
        type: 'sources',
        sources: [
          { url: 'https://docs.resolve.com/troubleshooting/network', title: 'Network Connectivity Troubleshooting' },
          { url: 'https://docs.resolve.com/troubleshooting/permissions', title: 'Permission Issues Guide' }
        ]
      });

      // Add remediation tasks
      parts.push({
        type: 'tasks',
        tasks: [
          {
            title: 'Error Diagnosis & Recovery',
            defaultOpen: true,
            items: [
              'Check system connectivity and firewall rules',
              'Verify credentials and permissions',
              'Review system resource usage and capacity',
              'Try manual execution to isolate the issue'
            ]
          }
        ]
      });
      break;

    case 'processing':
      // Add reasoning for processing state
      parts.push({
        type: 'reasoning',
        text: `I'm currently processing your request in multiple phases:\n\n1. Validating input parameters and prerequisites\n2. Discovering available resources and dependencies\n3. Planning the automation workflow\n4. Executing the automation safely\n5. Verifying results and cleanup\n\nThis may take a few minutes to complete.`,
        state: 'streaming'
      });

      // Add processing status
      parts.push({
        type: 'text',
        text: `## Processing Your Request 🔄

Currently working on: **"${content}"**

### Progress Status
- **Phase 1**: Initial validation ✅
- **Phase 2**: Resource discovery 🔄
- **Phase 3**: Automation execution ⏳
- **Phase 4**: Verification ⏳

### Current Activity
\`\`\`
[INFO] Scanning infrastructure...
[INFO] Found ${Math.floor(Math.random() * 10) + 1} servers
[INFO] Connecting to primary database...
[WARN] High CPU usage detected on server-03
[INFO] Applying configuration changes...
\`\`\`

### Estimated Completion
**~${Math.floor(Math.random() * 5) + 2} minutes** remaining

> 📊 This is an intermediate status update. Full results will be available upon completion.`
      });
      break;

    case 'random':
      if (isSuccess) {
        // Random success with reasoning
        parts.push({
          type: 'reasoning',
          text: `Random scenario generator selected success path. I'll create a comprehensive response with multiple automation tasks and documentation references.`,
          state: 'done'
        });

        parts.push({
          type: 'text',
          text: `## Random Success! 🎲

Successfully processed: **"${content}"**

### Metrics
- **Operations completed**: ${Math.floor(Math.random() * 10) + 1}
- **Success rate**: ${Math.floor(Math.random() * 20) + 80}%
- **Processing time**: ${Math.floor(Math.random() * 30) + 10}s

### Generated Results
\`\`\`yaml
automation:
  status: success
  randomSeed: ${Math.floor(Math.random() * 1000)}
  servicesAffected:
    - web-server-${Math.floor(Math.random() * 5) + 1}
    - database-${Math.floor(Math.random() * 3) + 1}
  changes:
    - Updated configuration files
    - Restarted services
    - Cleared cache
\`\`\`

> 🎯 Random scenario executed successfully!`
        });

        parts.push({
          type: 'sources',
          sources: [
            { url: 'https://docs.resolve.com/random/success', title: 'Random Success Patterns' }
          ]
        });

        parts.push({
          type: 'tasks',
          tasks: [
            {
              title: 'Random Task Generation',
              defaultOpen: true,
              items: [
                `Process random seed: ${Math.floor(Math.random() * 1000)}`,
                'Apply configuration changes',
                'Verify system stability',
                'Generate completion report'
              ]
            }
          ]
        });
      } else {
        // Random failure
        parts.push({
          type: 'reasoning',
          text: `Random scenario generator selected failure path. This simulates various types of automation failures that can occur in real environments.`,
          state: 'done'
        });

        parts.push({
          type: 'text',
          text: `## Random Failure! 🎲

Could not process: **"${content}"**

### Error Information
- **Error Code**: \`RND_${Math.floor(Math.random() * 1000)}\`
- **Failure Point**: Stage ${Math.floor(Math.random() * 4) + 1}
- **Retry Attempts**: ${Math.floor(Math.random() * 5) + 1}

### Debug Information
\`\`\`log
[ERROR] Random failure simulation triggered
[ERROR] Service unavailable: random-service-${Math.floor(Math.random() * 10)}
[ERROR] Timeout after ${Math.floor(Math.random() * 30) + 10} seconds
[INFO] Rolling back changes...
[INFO] Cleanup completed
\`\`\`

> 🎲 This is a randomly generated failure for testing purposes.`
        });
      }
      break;

    default:
      parts.push({
        type: 'text',
        text: `## Default Response

Processed your request: **"${content}"**

This is a basic response format. Set \`MOCK_SCENARIO\` environment variable to get different response types:
- \`success\` - Detailed success response with reasoning, sources, and tasks
- \`failure\` - Error scenario with debugging info
- \`processing\` - Work-in-progress status
- \`random\` - Randomly choose success/failure

### Available Scenarios
| Scenario | Description |
|----------|-------------|
| success | ✅ Successful automation with structured response |
| failure | ❌ Error with debug info and remediation |
| processing | 🔄 In-progress status with reasoning |
| random | 🎲 Random outcome with structured parts |`
      });
      break;
    }
  }

  // Convert parts to separate messages with the external service format
  const responses = [];

  for (const part of parts) {
    if (part.type === 'text') {
      // Main text response
      responses.push({
        message_id: messagePayload.message_id,
        conversation_id: messagePayload.conversation_id,
        tenant_id: messagePayload.tenant_id,
        user_id: messagePayload.user_id,
        response: part.text,
        response_group_id: responseGroupId
      });
    } else {
      // Metadata-based response (reasoning, sources, tasks)
      responses.push({
        message_id: messagePayload.message_id,
        conversation_id: messagePayload.conversation_id,
        tenant_id: messagePayload.tenant_id,
        user_id: messagePayload.user_id,
        response: '', // Empty text content for metadata-only messages
        metadata: { [part.type]: part.type === 'reasoning' ? { content: part.text, state: part.state } : part[part.type] },
        response_group_id: responseGroupId
      });
    }
  }

  return responses;
}

// Health check
app.get('/health', (_req, res) => {
  const correlationId = generateCorrelationId();
  const contextLogger = createContextLogger(logger, correlationId);

  contextLogger.info({}, 'Health check requested');

  res.json({
    status: 'ok',
    service: 'rita-mock-automation',
    timestamp: new Date().toISOString(),
    config: MOCK_CONFIG
  });
});

// Webhook endpoint - main automation receiver
app.post('/webhook', async (req, res) => {
  const correlationId = generateCorrelationId();
  const timer = new PerformanceTimer(webhookLogger, 'webhook-processing');

  try {
    const payload: WebhookPayload = req.body;

    // Basic validation - all webhooks must have source, action, and tenant_id
    if (!payload.source || !payload.action || !payload.tenant_id) {
      const errorLogger = createContextLogger(webhookLogger, correlationId);
      errorLogger.warn({
        hasSource: !!payload.source,
        hasAction: !!payload.action,
        hasTenantId: !!payload.tenant_id
      }, 'Webhook validation failed - missing basic required fields');
      return res.status(400).json({
        error: 'Missing required fields: source, action, tenant_id'
      });
    }

    // Handle different webhook types
    if (payload.source === 'rita-chat' && payload.action === 'message_created') {
      const messagePayload = payload as MessageWebhookPayload;

      const contextLogger = createContextLogger(webhookLogger, correlationId, {
        messageId: messagePayload.message_id,
        tenantId: messagePayload.tenant_id,
        userId: messagePayload.user_id,
        conversationId: messagePayload.conversation_id
      });

      contextLogger.info({
        source: messagePayload.source,
        action: messagePayload.action,
        user_email: messagePayload.user_email,
        content: `${messagePayload.customer_message?.substring(0, 50)}...`,
        documentCount: messagePayload.document_ids?.length || 0,
        conversationId: messagePayload.conversation_id
      }, 'Received message webhook');

      // Log full webhook payload with transcript
      console.log('\n' + '═'.repeat(100));
      console.log('📨 WEBHOOK PAYLOAD RECEIVED');
      console.log('═'.repeat(100));
      console.log(JSON.stringify(messagePayload, null, 2));
      console.log('═'.repeat(100) + '\n');

      // Validate message-specific required fields
      if (!messagePayload.message_id || !messagePayload.conversation_id || !messagePayload.customer_message) {
        contextLogger.warn({
          hasMessageId: !!messagePayload.message_id,
          hasConversationId: !!messagePayload.conversation_id,
          hasCustomerMessage: !!messagePayload.customer_message
        }, 'Message webhook validation failed - missing required fields');
        return res.status(400).json({
          error: 'Missing required fields for message webhook: message_id, conversation_id, customer_message'
        });
      }

    } else if (payload.source === 'rita-documents' && payload.action === 'document_uploaded') {
      const documentPayload = payload as DocumentWebhookPayload;

      const contextLogger = createContextLogger(webhookLogger, correlationId, {
        blobMetadataId: documentPayload.blob_metadata_id,
        blobId: documentPayload.blob_id,
        tenantId: documentPayload.tenant_id,
        userId: documentPayload.user_id
      });

      contextLogger.info({
        source: documentPayload.source,
        action: documentPayload.action,
        user_email: documentPayload.user_email,
        blob_metadata_id: documentPayload.blob_metadata_id,
        blob_id: documentPayload.blob_id,
        document_url: documentPayload.document_url,
        file_type: documentPayload.file_type,
        file_size: documentPayload.file_size,
        original_filename: documentPayload.original_filename
      }, 'Received document webhook');

      // Validate document-specific required fields
      if (!documentPayload.blob_metadata_id || !documentPayload.blob_id || !documentPayload.document_url || !documentPayload.file_type) {
        contextLogger.warn({
          hasBlobMetadataId: !!documentPayload.blob_metadata_id,
          hasBlobId: !!documentPayload.blob_id,
          hasDocumentUrl: !!documentPayload.document_url,
          hasFileType: !!documentPayload.file_type
        }, 'Document webhook validation failed - missing required fields');
        return res.status(400).json({
          error: 'Missing required fields for document webhook: blob_metadata_id, blob_id, document_url, file_type'
        });
      }

    } else if (payload.source === 'rita-signup' && payload.action === 'user_signup') {
      const signupPayload = payload as SignupWebhookPayload;

      const contextLogger = createContextLogger(webhookLogger, correlationId, {
        email: signupPayload.user_email,
        pendingUserId: signupPayload.pending_user_id,
        tenantId: signupPayload.tenant_id
      });

      contextLogger.info({
        source: signupPayload.source,
        action: signupPayload.action,
        user_email: signupPayload.user_email,
        first_name: signupPayload.first_name,
        last_name: signupPayload.last_name,
        company: signupPayload.company,
        pending_user_id: signupPayload.pending_user_id,
        verification_url: signupPayload.verification_url
      }, 'Received signup webhook');

      // Validate signup-specific required fields
      if (!signupPayload.user_email || !signupPayload.first_name || !signupPayload.last_name || !signupPayload.company || !signupPayload.password || !signupPayload.verification_token) {
        contextLogger.warn({
          hasEmail: !!signupPayload.user_email,
          hasFirstName: !!signupPayload.first_name,
          hasLastName: !!signupPayload.last_name,
          hasCompany: !!signupPayload.company,
          hasPassword: !!signupPayload.password,
          hasVerificationToken: !!signupPayload.verification_token
        }, 'Signup webhook validation failed - missing required fields');
        return res.status(400).json({
          error: 'Missing required fields for signup webhook: user_email, first_name, last_name, company, password, verification_token'
        });
      }

    } else {
      const errorLogger = createContextLogger(webhookLogger, correlationId);
      // Avoid accessing properties on a value narrowed to never by referencing raw body as BaseWebhookPayload
      const basePayload = req.body as BaseWebhookPayload;
      errorLogger.warn({
        source: basePayload.source,
        action: basePayload.action
      }, 'Unsupported webhook type');
      return res.status(400).json({
        error: `Unsupported webhook type: ${basePayload.source}:${basePayload.action}`
      });
    }

    const contextLogger = createContextLogger(webhookLogger, correlationId, {
      tenantId: payload.tenant_id,
      userId: payload.user_id
    });

    // Check authorization
    const authHeader = req.headers.authorization;
    const expectedAuth = process.env.AUTOMATION_AUTH;

    // Handle both "Basic token" and "token" formats
    const receivedToken = authHeader?.startsWith('Basic ')
      ? authHeader.substring(6)
      : authHeader;

    if (receivedToken !== expectedAuth) {
      contextLogger.warn({
        hasAuthHeader: !!authHeader,
        authHeaderPrefix: `${authHeader?.substring(0, 10)}...`,
        expectedAuth: `${expectedAuth?.substring(0, 10)}...`
      }, 'Webhook authentication failed');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    contextLogger.info({}, 'Webhook authenticated successfully');

    // Handle processing based on webhook type
    if (payload.source === 'rita-chat') {
      // Message processing - generate response and send to RabbitMQ
      const estimatedCompletion = new Date(Date.now() + MOCK_CONFIG.responseDelay);
      timer.end({
        messageId: (payload as MessageWebhookPayload).message_id,
        estimatedCompletion: estimatedCompletion.toISOString(),
        responseDelay: MOCK_CONFIG.responseDelay,
        success: true
      });

      contextLogger.info({
        estimatedCompletion: estimatedCompletion.toISOString(),
        responseDelay: MOCK_CONFIG.responseDelay
      }, 'Message webhook acknowledged, processing scheduled');

      res.status(202).json({
        message: 'Message webhook received, processing started',
        message_id: (payload as MessageWebhookPayload).message_id,
        estimated_completion: estimatedCompletion.toISOString()
      });

      // Process message with configured delay
      setTimeout(async () => {
        const processingTimer = new PerformanceTimer(webhookLogger, 'mock-message-processing');
        const messagePayload = payload as MessageWebhookPayload;
        const processingLogger = createContextLogger(webhookLogger, correlationId, {
          messageId: messagePayload.message_id,
          tenantId: messagePayload.tenant_id,
          userId: messagePayload.user_id,
          conversationId: messagePayload.conversation_id
        });

        try {
          processingLogger.info({}, 'Starting mock message response generation');
          const responses = generateMockResponse(payload);
          if (responses && responses.length > 0) {
            // Publish each response part separately with incremental delays to ensure proper ordering
            for (let i = 0; i < responses.length; i++) {
              const response = responses[i];
              // Add small delay between parts (100ms * index) to ensure chronological order
              if (i > 0) {
                await new Promise(resolve => setTimeout(resolve, 100 * i));
              }
              await publishResponse(response);
            }
            processingTimer.end({
              messageId: messagePayload.message_id,
              responseCount: responses.length,
              success: true
            });
            processingLogger.info({ responseCount: responses.length }, 'Mock message processing completed successfully');
          } else {
            processingLogger.warn({}, 'No response generated for message');
          }
        } catch (error) {
          processingTimer.end({ success: false });
          logError(processingLogger, error as Error, {
            operation: 'mock-message-processing',
            messageId: messagePayload.message_id
          });

          // Send failure response
          const failureResponses = generateMockResponse(payload, 'failure');
          if (failureResponses && failureResponses.length > 0) {
            try {
              for (const response of failureResponses) {
                await publishResponse(response);
              }
              processingLogger.info({ responseCount: failureResponses.length }, 'Published failure response after error');
            } catch (publishError) {
              logError(processingLogger, publishError as Error, {
                operation: 'publish-failure-response',
                messageId: messagePayload.message_id
              });
            }
          }
        }
      }, MOCK_CONFIG.responseDelay);

    } else if (payload.source === 'rita-documents') {
      // Document processing - just log as placeholder
      const documentPayload = payload as DocumentWebhookPayload;
      timer.end({
        blobMetadataId: documentPayload.blob_metadata_id,
        blobId: documentPayload.blob_id,
        success: true
      });

      contextLogger.info({
        blob_metadata_id: documentPayload.blob_metadata_id,
        blob_id: documentPayload.blob_id,
        document_url: documentPayload.document_url,
        file_type: documentPayload.file_type,
        file_size: documentPayload.file_size,
        original_filename: documentPayload.original_filename,
        note: 'Document processing is placeholder - only logging to console'
      }, '📄 PLACEHOLDER: Document processing webhook received');

      res.status(200).json({
        message: 'Document webhook received and logged (placeholder implementation)',
        blob_metadata_id: documentPayload.blob_metadata_id,
        blob_id: documentPayload.blob_id,
        status: 'acknowledged'
      });

    } else if (payload.source === 'rita-signup') {
      // Signup processing - create Keycloak user and log verification URL
      const signupPayload = payload as SignupWebhookPayload;
      timer.end({
        email: signupPayload.user_email,
        pendingUserId: signupPayload.pending_user_id,
        success: true
      });

      try {
        // Create user in Keycloak
        const keycloakUserId = await createKeycloakUser(signupPayload);

        contextLogger.info({
          email: signupPayload.user_email,
          keycloakUserId,
          verification_url: signupPayload.verification_url,
          pending_user_id: signupPayload.pending_user_id
        }, '🎉 SIGNUP SUCCESS: Keycloak user created');

        // Log verification URL prominently for testing
        console.log('\n' + '='.repeat(80));
        console.log('📧 MOCK EMAIL VERIFICATION');
        console.log('='.repeat(80));
        console.log(`To: ${signupPayload.user_email}`);
        console.log(`Name: ${signupPayload.first_name} ${signupPayload.last_name}`);
        console.log(`Company: ${signupPayload.company}`);
        console.log('');
        console.log('Click here to verify your email:');
        console.log(`${signupPayload.verification_url}`);
        console.log('');
        console.log('(In production, this would be sent via email)');
        console.log(`${'='.repeat(80)}\n`);

        res.status(200).json({
          message: 'Signup webhook processed successfully',
          keycloak_user_id: keycloakUserId,
          email: signupPayload.user_email,
          status: 'user_created_and_email_logged'
        });

      } catch (error) {
        logError(contextLogger, error as Error, { operation: 'signup-processing' });

        res.status(200).json({
          message: 'Signup webhook received but user creation failed',
          error: error instanceof Error ? error.message : 'Unknown error',
          status: 'failed_but_acknowledged'
        });
      }
    }

  } catch (error) {
    timer.end({ success: false });
    const errorLogger = createContextLogger(webhookLogger, correlationId);
    logError(errorLogger, error as Error, { operation: 'webhook-processing' });
    res.status(500).json({ error: 'Internal server error' });
  }
});


// Configuration endpoint
app.get('/config', (_req, res) => {
  const correlationId = generateCorrelationId();
  const contextLogger = createContextLogger(configLogger, correlationId);

  contextLogger.info({}, 'Configuration requested');

  res.json({
    config: MOCK_CONFIG,
    scenarios: ['success', 'failure', 'processing', 'random'],
    description: 'Mock automation service for Rita Chat testing'
  });
});


// Start server
app.listen(PORT, async () => {
  logger.info({
    port: PORT,
    endpoints: {
      health: `http://localhost:${PORT}/health`,
      config: `http://localhost:${PORT}/config`,
      webhook: `http://localhost:${PORT}/webhook`
    },
    scenario: MOCK_CONFIG.defaultScenario,
    responseDelay: MOCK_CONFIG.responseDelay
  }, 'Rita Mock Automation Service started');

  // Initialize RabbitMQ connection
  try {
    await connectRabbitMQ();
  } catch (error) {
    logError(logger, error as Error, { operation: 'startup', component: 'rabbitmq-initialization' });
    process.exit(1);
  }
});

// Graceful shutdown
process.on('SIGINT', async () => {
  const shutdownLogger = logger.child({ operation: 'graceful-shutdown' });
  shutdownLogger.info({}, 'Mock service shutting down gracefully...');

  try {
    if (rabbitChannel) {
      await rabbitChannel.close();
      shutdownLogger.info({}, 'RabbitMQ channel closed');
    }
    if (rabbitConnection) {
      await (rabbitConnection as unknown as { close: () => Promise<void> }).close();
      shutdownLogger.info({}, 'RabbitMQ connection closed');
    }
    shutdownLogger.info({}, 'Graceful shutdown completed');
  } catch (error) {
    logError(shutdownLogger, error as Error, { operation: 'graceful-shutdown' });
  }
  process.exit(0);
});
