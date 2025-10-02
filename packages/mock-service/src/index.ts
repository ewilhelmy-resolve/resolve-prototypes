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
  transcript?: Array<{ role: string; content: string }>;
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
  } else if (content.startsWith('inline') || content.startsWith('test-inline')) {
    // test-inline: Text with inline citation markers [1], [2], [3]
    parts.push({
      type: 'text',
      text: `## Inline Citations Demo

According to recent research [1], artificial intelligence has shown remarkable progress in natural language processing. This breakthrough has been documented extensively in academic literature [2] and industry reports [3].

The field continues to evolve rapidly, with new models achieving state-of-the-art results on benchmark tasks. These advancements are particularly notable in areas such as machine translation, text summarization, and question answering.`
    });
    parts.push({
      type: 'sources',
      sources: [
        { url: 'https://arxiv.org/ai-progress-2024', title: 'AI Progress in Natural Language Processing' },
        { url: 'https://journals.ai/nlp-breakthroughs', title: 'Recent NLP Breakthroughs' },
        { url: 'https://industry-reports.com/ai-2024', title: '2024 AI Industry Report' }
      ]
    });
  } else if (content.toLowerCase().startsWith('modal') && !content.toLowerCase().includes('article')) {
    // modal: Test modal citation variant (generic, without article content)
    parts.push({
      type: 'text',
      text: `## Modal Citations Demo

Modal dialogs provide a focused viewing experience by overlaying the entire screen with a backdrop. This approach is particularly effective when users need to concentrate on reference materials without distraction from the main content.

Research shows that modal interfaces can improve user engagement when displaying detailed information. The centered layout and backdrop help draw attention to the content while maintaining context through the visible underlying page.

Click "Used 3 sources" below to see the modal citation display.`
    });
    parts.push({
      type: 'sources',
      sources: [
        { url: 'https://uxdesign.cc/modal-best-practices-2024', title: 'Modal Interface Best Practices' },
        { url: 'https://research.ux/focused-reading-patterns', title: 'Focused Reading Patterns Study' },
        { url: 'https://docs.modal-design.com/engagement-metrics', title: 'User Engagement with Modal Dialogs' }
      ],
      citationVariant: 'modal'
    });
  } else if ((content.toLowerCase().startsWith('right-panel') || content.toLowerCase().startsWith('right panel')) && !content.toLowerCase().includes('article')) {
    // right-panel: Test right-panel citation variant
    parts.push({
      type: 'text',
      text: `## Right Panel Citations Demo

Side panels offer contextual reference while keeping the main content visible. This pattern is commonly used in modern web applications to provide additional information without navigating away from the current view.

The right-aligned panel design allows users to read sources while maintaining their position in the conversation. This side-by-side layout is particularly valuable for fact-checking and cross-referencing during active discussions.

Click "Used 3 sources" below to see the right panel slide out from the side.`
    });
    parts.push({
      type: 'sources',
      sources: [
        { url: 'https://patterns.ux/side-panel-navigation', title: 'Side Panel Navigation Patterns' },
        { url: 'https://webdesign.modern/split-screen-layouts', title: 'Modern Split-Screen Layouts' },
        { url: 'https://research.ui/contextual-information-display', title: 'Contextual Information Display Research' }
      ],
      citationVariant: 'right-panel'
    });
  } else if (content.toLowerCase().startsWith('hover-card') || content.toLowerCase().startsWith('hover card')) {
    // hover-card: Test hover-card citation variant with inline markers
    parts.push({
      type: 'text',
      text: `## Hover Card Citations Demo

Hover interactions provide instant access to information without requiring explicit clicks [1]. This pattern reduces cognitive load by offering contextual details on demand through simple mouse movement [2].

Tooltip-style hover cards are particularly effective for inline references [3], allowing readers to quickly preview source information while maintaining reading flow. The interaction feels natural and requires minimal user effort.

Hover over any inline badge (like [1] above) to see the hover card with source information.`
    });
    parts.push({
      type: 'sources',
      sources: [
        { url: 'https://interaction-design.org/hover-patterns', title: 'Hover Interaction Design Patterns' },
        { url: 'https://cognitive-ux.research/tooltip-effectiveness', title: 'Cognitive Benefits of Tooltips' },
        { url: 'https://ux-patterns.com/inline-preview-cards', title: 'Inline Preview Cards Best Practices' }
      ]
    });
  } else if (content.toLowerCase().startsWith('collapsible-list') || content.toLowerCase().startsWith('collapsible list')) {
    // collapsible-list: Test collapsible-list citation variant (baseline)
    parts.push({
      type: 'text',
      text: `## Collapsible List Citations Demo

Collapsible lists serve as the baseline citation display by providing a simple expand/collapse mechanism. This familiar interaction pattern has been used successfully across web applications for years.

The collapsed state keeps the interface clean, while the expanded view reveals all sources at once. This approach balances information density with usability, making it ideal as a default implementation.

Click "Used 3 sources" below to expand the collapsible list.`
    });
    parts.push({
      type: 'sources',
      sources: [
        { url: 'https://ux-baseline.com/accordion-patterns', title: 'Accordion and Collapsible Patterns' },
        { url: 'https://web-standards.org/disclosure-widgets', title: 'Disclosure Widget Design Standards' },
        { url: 'https://accessibility-research.org/expand-collapse', title: 'Accessible Expand/Collapse Controls' }
      ],
      citationVariant: 'collapsible-list'
    });
  } else if (content.toLowerCase().includes('modal') && content.toLowerCase().includes('article')) {
    // modal with article: Test modal with large markdown content
    parts.push({
      type: 'text',
      text: `## Modal with Article Content

This demo showcases the modal citation variant displaying full markdown articles with complex formatting including headings, tables, lists, and code blocks.

The modal provides a focused reading experience ideal for longer reference materials. When users need to dive deep into source documentation, the modal overlay removes distractions and centers attention on the content.

Click "Used 2 sources" below to view detailed technical articles in the modal.`
    });
    parts.push({
      type: 'sources',
      sources: [
        {
          url: 'https://docs.resolve.com/rita/automation-guide',
          title: 'Rita Automation Guide - Complete Reference',
          content: `# Rita Automation System

## Overview

The Rita automation system provides enterprise-grade workflow automation with **SOC2 Type II compliance** and comprehensive audit logging.

## Architecture Components

| Component | Purpose | Technology Stack |
|-----------|---------|-----------------|
| API Server | REST endpoints | Node.js, Express |
| Queue System | Async processing | RabbitMQ |
| Database | Persistent storage | PostgreSQL |
| Client | React UI | React 18, TypeScript |

## Getting Started

### Installation

\`\`\`bash
npm install @resolve/rita-client
npm install @resolve/rita-api
\`\`\`

### Configuration

1. **Environment Setup**: Configure your \`.env\` file
2. **Database Migration**: Run \`npm run migrate\`
3. **Start Services**: Use \`docker compose up -d\`

## Key Features

### Workflow Automation

- **Trigger-based execution** - Execute workflows based on events
- **Conditional logic** - Complex decision trees and branching
- **Error handling** - Automatic retry with exponential backoff
- **Monitoring** - Real-time status tracking and alerting

### Security & Compliance

The platform implements industry-standard security practices:

- 🔒 **Encryption**: AES-256 for data at rest, TLS 1.3 for transit
- 🔐 **Authentication**: OAuth 2.0 with Keycloak integration
- 📊 **Audit Logs**: Comprehensive activity tracking
- ✅ **SOC2 Compliance**: Full Type II certification

## Performance Metrics

Our automation system handles enterprise-scale workloads:

| Metric | Value | Notes |
|--------|-------|-------|
| Throughput | 10,000 tasks/sec | Peak load capacity |
| Latency | < 50ms | P95 response time |
| Availability | 99.99% | SLA guarantee |
| Scalability | Horizontal | Auto-scaling enabled |

## Best Practices

### Error Handling

\`\`\`typescript
try {
  await executeWorkflow(params)
} catch (error) {
  logger.error('Workflow failed', { error, workflowId })
  await retry(executeWorkflow, params, { maxRetries: 3 })
}
\`\`\`

### Monitoring

Set up comprehensive monitoring with:

- **Health checks**: Every 30 seconds
- **Metrics collection**: Prometheus + Grafana
- **Alerting**: PagerDuty integration
- **Log aggregation**: ELK stack

## Advanced Topics

### Custom Workflow Development

Create custom workflows using our TypeScript SDK:

\`\`\`typescript
import { Workflow, Task } from '@resolve/rita-sdk'

const workflow = new Workflow({
  name: 'data-processing',
  triggers: ['file.uploaded'],
  tasks: [
    new Task.Validate(),
    new Task.Transform(),
    new Task.Store()
  ]
})
\`\`\`

### Integration Patterns

Rita supports multiple integration patterns:

1. **RESTful APIs** - Standard HTTP endpoints
2. **GraphQL** - Flexible query language
3. **Webhooks** - Event-driven notifications
4. **SSE** - Real-time updates via Server-Sent Events

> 💡 **Pro Tip**: Use webhooks for asynchronous workflows and SSE for real-time UI updates.

## Troubleshooting

Common issues and solutions:

| Issue | Cause | Solution |
|-------|-------|----------|
| Queue backup | High load | Scale workers horizontally |
| Slow queries | Missing indexes | Run query optimizer |
| Auth failures | Token expiration | Implement token refresh |

## Support

- 📚 **Documentation**: https://docs.resolve.com
- 💬 **Community**: https://community.resolve.com
- 📧 **Enterprise Support**: support@resolve.com`
        },
        {
          url: 'https://research.automation/enterprise-patterns-2024',
          title: 'Enterprise Automation Patterns 2024',
          content: `# Enterprise Automation Patterns

## Executive Summary

This comprehensive study analyzes enterprise automation patterns across **500+ organizations** implementing workflow automation at scale.

## Methodology

### Research Approach

| Phase | Activities | Duration |
|-------|-----------|----------|
| Discovery | Stakeholder interviews | 3 months |
| Analysis | Pattern identification | 2 months |
| Validation | Case studies | 4 months |

## Key Findings

### Pattern Categories

1. **Event-Driven Architecture**
   - Decoupled components
   - Asynchronous processing
   - High scalability
   - Complex debugging

2. **Orchestration vs Choreography**
   - **Orchestration**: Central coordinator
   - **Choreography**: Distributed coordination
   - Trade-offs in complexity and resilience

3. **Error Recovery Strategies**
   - **Retry with backoff**: 87% adoption
   - **Dead letter queues**: 72% adoption
   - **Circuit breakers**: 65% adoption
   - **Compensation transactions**: 43% adoption

## Implementation Statistics

\`\`\`
Technology Adoption (2024):
━━━━━━━━━━━━━━━━━━━━━━━━━━
RabbitMQ:    ████████████████ 45%
Apache Kafka: ███████████████ 42%
AWS SQS:     ████████ 23%
Azure Service Bus: ████ 18%
\`\`\`

### Success Metrics

Companies implementing automation patterns reported:

- ⬆️ **67% increase** in operational efficiency
- ⬇️ **54% reduction** in manual errors
- ⬆️ **89% improvement** in response times
- ⬇️ **41% decrease** in operational costs

## Architectural Patterns

### The Saga Pattern

For distributed transactions:

\`\`\`typescript
class OrderSaga {
  async execute() {
    await reserveInventory()
    await processPayment()
    await scheduleShipping()
  }

  async compensate() {
    await refundPayment()
    await releaseInventory()
  }
}
\`\`\`

### Event Sourcing

Benefits and trade-offs:

| Aspect | Benefit | Trade-off |
|--------|---------|-----------|
| Audit trail | Complete history | Storage costs |
| Time travel | Debug past states | Complexity |
| Replay | Rebuild state | Processing time |

## Security Considerations

### Zero Trust Architecture

- **Verify explicitly**: Authenticate every request
- **Least privilege**: Minimum necessary access
- **Assume breach**: Continuous monitoring

### Encryption Strategy

\`\`\`
Data Protection Layers:
┌────────────────────────┐
│ Application Level      │ ← End-to-end encryption
├────────────────────────┤
│ Transport Level        │ ← TLS 1.3
├────────────────────────┤
│ Storage Level          │ ← AES-256
└────────────────────────┘
\`\`\`

## Conclusion

Enterprise automation requires careful pattern selection based on:

- **Scale requirements**
- **Latency constraints**
- **Consistency needs**
- **Operational complexity tolerance**

The most successful implementations combine multiple patterns adapted to specific use cases rather than applying a one-size-fits-all approach.`
        }
      ],
      citationVariant: 'modal'
    });
  } else if (content.toLowerCase().includes('right') && content.toLowerCase().includes('panel') && content.toLowerCase().includes('article')) {
    // right-panel with article: Test right panel with large markdown content
    parts.push({
      type: 'text',
      text: `## Right Panel with Article Content

This demonstration features the right panel citation variant with comprehensive markdown articles. The side-by-side layout allows you to reference documentation while continuing to read the conversation.

The right panel excels at providing contextual information without interrupting the user's current flow. It's particularly effective for technical documentation where users frequently cross-reference specifications.

Click "Used 2 sources" below to open the side panel with detailed technical references.`
    });
    parts.push({
      type: 'sources',
      sources: [
        {
          url: 'https://docs.accessibility.org/wcag-2.1-aa-implementation',
          title: 'WCAG 2.1 AA Implementation Guide',
          content: `# WCAG 2.1 AA Compliance

## Introduction

Web Content Accessibility Guidelines (WCAG) 2.1 Level AA provides the framework for creating accessible web experiences that work for users with diverse abilities.

## Core Principles (POUR)

| Principle | Description | Key Requirements |
|-----------|-------------|------------------|
| **Perceivable** | Information must be presentable | Alt text, captions, color contrast |
| **Operable** | UI components must be usable | Keyboard navigation, sufficient time |
| **Understandable** | Content must be clear | Readable text, predictable behavior |
| **Robust** | Content works across technologies | Valid markup, compatibility |

## Level AA Requirements

### Visual Requirements

#### Color Contrast

- **Normal text**: Minimum 4.5:1 contrast ratio
- **Large text** (18pt+): Minimum 3:1 contrast ratio
- **UI components**: 3:1 for interactive elements

\`\`\`css
/* Good contrast example */
.text-primary {
  color: #1a1a1a;        /* Near black */
  background: #ffffff;    /* White */
  /* Contrast ratio: 19.56:1 ✅ */
}

.button-primary {
  color: #ffffff;
  background: #0066cc;    /* Blue */
  /* Contrast ratio: 4.55:1 ✅ */
}
\`\`\`

#### Text Resizing

Users must be able to resize text up to **200%** without loss of content or functionality.

### Keyboard Accessibility

#### Focus Management

All interactive elements must be keyboard accessible:

\`\`\`typescript
// Proper focus trap in modal
function Modal({ children, onClose }) {
  const firstFocusable = useRef<HTMLElement>()
  const lastFocusable = useRef<HTMLElement>()

  useEffect(() => {
    firstFocusable.current?.focus()

    const handleTab = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        // Trap focus within modal
        trapFocus(e, firstFocusable, lastFocusable)
      }
    }

    document.addEventListener('keydown', handleTab)
    return () => document.removeEventListener('keydown', handleTab)
  }, [])

  return <div role="dialog" aria-modal="true">{children}</div>
}
\`\`\`

#### Skip Links

Provide skip navigation for keyboard users:

\`\`\`html
<a href="#main-content" class="skip-link">
  Skip to main content
</a>
\`\`\`

### ARIA Implementation

#### Semantic HTML First

Use native HTML elements when possible:

| Instead of | Use |
|------------|-----|
| \`<div onclick="...">\` | \`<button>\` |
| \`<div>\` for navigation | \`<nav>\` |
| \`<div>\` for lists | \`<ul>\`, \`<ol>\` |

#### ARIA Roles and Properties

\`\`\`tsx
// Accessible dropdown
<div role="combobox" aria-expanded={isOpen} aria-haspopup="listbox">
  <input
    type="text"
    aria-label="Search options"
    aria-autocomplete="list"
    aria-controls="listbox-id"
  />
  <ul role="listbox" id="listbox-id">
    <li role="option" aria-selected={isSelected}>
      Option 1
    </li>
  </ul>
</div>
\`\`\`

## Form Accessibility

### Labels and Instructions

Every form input must have:

1. **Visible label**: \`<label>\` element
2. **Clear purpose**: Descriptive text
3. **Error identification**: Specific error messages
4. **Help text**: Additional guidance when needed

\`\`\`tsx
<div>
  <label htmlFor="email">
    Email Address <span aria-label="required">*</span>
  </label>
  <input
    id="email"
    type="email"
    aria-required="true"
    aria-invalid={hasError}
    aria-describedby="email-error email-help"
  />
  <div id="email-help">We'll never share your email</div>
  {hasError && (
    <div id="email-error" role="alert">
      Please enter a valid email address
    </div>
  )}
</div>
\`\`\`

## Testing Checklist

### Automated Testing

| Tool | Purpose | Coverage |
|------|---------|----------|
| axe-core | Rule-based checking | ~57% WCAG |
| WAVE | Visual feedback | Basic issues |
| Lighthouse | Chrome DevTools | Performance + A11y |

### Manual Testing

- ✅ **Keyboard navigation**: Tab through entire interface
- ✅ **Screen reader**: Test with NVDA/JAWS (Windows) or VoiceOver (Mac)
- ✅ **Color contrast**: Use contrast checker tools
- ✅ **Zoom testing**: Test at 200% zoom
- ✅ **Focus indicators**: Verify visible focus states

## Common Patterns

### Accessible Modal Dialog

\`\`\`typescript
interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

function AccessibleModal({ isOpen, onClose, title, children }: ModalProps) {
  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      aria-labelledby="modal-title"
      aria-describedby="modal-description"
    >
      <div role="document">
        <h2 id="modal-title">{title}</h2>
        <div id="modal-description">
          {children}
        </div>
        <button onClick={onClose} aria-label="Close dialog">
          ×
        </button>
      </div>
    </Dialog>
  )
}
\`\`\`

### Accessible Data Table

\`\`\`html
<table>
  <caption>User Activity Report</caption>
  <thead>
    <tr>
      <th scope="col">Name</th>
      <th scope="col">Email</th>
      <th scope="col">Last Login</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">John Doe</th>
      <td>john@example.com</td>
      <td><time datetime="2024-01-15">Jan 15, 2024</time></td>
    </tr>
  </tbody>
</table>
\`\`\`

## Resources

- **W3C WCAG 2.1**: https://www.w3.org/WAI/WCAG21/quickref/
- **MDN Accessibility**: https://developer.mozilla.org/en-US/docs/Web/Accessibility
- **WebAIM**: https://webaim.org/resources/`
        },
        {
          url: 'https://soc2.compliance.guide/type-ii-requirements',
          title: 'SOC 2 Type II Requirements & Implementation',
          content: `# SOC 2 Type II Compliance

## Overview

Service Organization Control (SOC) 2 Type II examines both the **design** and **operational effectiveness** of security controls over time (typically 6-12 months).

## Trust Services Criteria

### Security (Required)

The foundation of SOC 2 compliance:

\`\`\`
Security Control Framework:
┌─────────────────────────────────┐
│ Access Controls                 │
│ ├─ Authentication              │
│ ├─ Authorization               │
│ └─ Least Privilege             │
├─────────────────────────────────┤
│ Change Management               │
│ ├─ Code review process         │
│ ├─ Deployment procedures       │
│ └─ Rollback capabilities       │
├─────────────────────────────────┤
│ Incident Response               │
│ ├─ Detection systems           │
│ ├─ Response procedures         │
│ └─ Post-incident review        │
└─────────────────────────────────┘
\`\`\`

### Additional Criteria (Optional)

| Criterion | Focus Area | Key Controls |
|-----------|------------|--------------|
| **Availability** | System uptime | Monitoring, redundancy, disaster recovery |
| **Processing Integrity** | Data accuracy | Validation, error handling, reconciliation |
| **Confidentiality** | Data protection | Encryption, access controls, DLP |
| **Privacy** | PII handling | Consent management, data rights, retention |

## Implementation Requirements

### Access Control Implementation

\`\`\`typescript
// Multi-factor authentication
class AuthenticationService {
  async authenticate(credentials: Credentials): Promise<AuthToken> {
    // 1. Verify username/password
    const user = await this.verifyCredentials(credentials)

    // 2. Require MFA
    if (!user.mfaVerified) {
      throw new MFARequiredError()
    }

    // 3. Generate session token
    const token = await this.generateToken(user, {
      expiresIn: '8h',
      refreshable: true
    })

    // 4. Audit log
    await this.auditLog.record({
      event: 'user.authenticated',
      userId: user.id,
      timestamp: new Date(),
      ipAddress: credentials.ipAddress,
      userAgent: credentials.userAgent
    })

    return token
  }
}
\`\`\`

### Audit Logging

Comprehensive logging requirements:

| Log Type | Required Fields | Retention |
|----------|----------------|-----------|
| Authentication | User ID, timestamp, IP, result | 1 year |
| Authorization | User, resource, action, result | 1 year |
| Data Access | User, data type, timestamp | 7 years |
| Configuration | Change type, user, before/after | 7 years |
| Security Events | Event type, severity, details | 7 years |

### Encryption Standards

\`\`\`typescript
// Data encryption implementation
class EncryptionService {
  // Data at rest
  encryptAtRest(data: Buffer): EncryptedData {
    return {
      ciphertext: aes256gcm.encrypt(data, this.dataKey),
      algorithm: 'AES-256-GCM',
      keyId: this.dataKey.id
    }
  }

  // Data in transit
  tlsConfig(): TLSConfig {
    return {
      minVersion: 'TLSv1.3',
      ciphers: [
        'TLS_AES_256_GCM_SHA384',
        'TLS_AES_128_GCM_SHA256'
      ],
      honorCipherOrder: true,
      requireCertificate: true
    }
  }
}
\`\`\`

## Monitoring & Alerting

### Real-time Monitoring

\`\`\`yaml
# Monitoring configuration
monitoring:
  metrics:
    - name: authentication_failures
      threshold: 5
      window: 5m
      severity: high

    - name: unauthorized_access_attempts
      threshold: 3
      window: 1m
      severity: critical

    - name: data_access_unusual_volume
      threshold: 1000
      window: 1h
      severity: medium

  alerts:
    - type: email
      recipients: [security-team@company.com]

    - type: pagerduty
      severity: [critical, high]

    - type: slack
      channel: '#security-alerts'
\`\`\`

### Incident Response

Response time requirements:

| Severity | Response Time | Resolution Time |
|----------|---------------|-----------------|
| Critical | < 15 minutes | < 4 hours |
| High | < 1 hour | < 24 hours |
| Medium | < 4 hours | < 5 days |
| Low | < 24 hours | < 30 days |

## Audit Evidence

### Documentation Requirements

1. **Policies & Procedures**
   - Information security policy
   - Access control procedures
   - Incident response plan
   - Business continuity plan

2. **Technical Evidence**
   - System configurations
   - Access control lists
   - Audit logs
   - Vulnerability scans
   - Penetration test results

3. **Operational Evidence**
   - Security awareness training records
   - Background check documentation
   - Vendor management records
   - Change management tickets

## Continuous Compliance

### Quarterly Reviews

\`\`\`markdown
## Q1 2024 Compliance Review Checklist

- [ ] User access review (all systems)
- [ ] Privileged access verification
- [ ] Security awareness training completion
- [ ] Vulnerability management report
- [ ] Incident response test results
- [ ] Backup and recovery validation
- [ ] Third-party audit findings review
- [ ] Policy updates and acknowledgments
\`\`\`

### Automation Opportunities

| Process | Automation | Tool |
|---------|------------|------|
| Access reviews | Quarterly automated | Okta, Azure AD |
| Vulnerability scanning | Continuous | Qualys, Nessus |
| Log analysis | Real-time | Splunk, ELK |
| Compliance reporting | Monthly | Vanta, Drata |

## Common Pitfalls

⚠️ **Insufficient audit logging**: Ensure all security-relevant events are logged

⚠️ **Missing evidence**: Document everything - if it's not documented, it didn't happen

⚠️ **Scope creep**: Clearly define system boundaries and maintain consistency

⚠️ **Manual processes**: Automate controls where possible to reduce human error

## Certification Timeline

\`\`\`
SOC 2 Type II Timeline:
┌────────────────────────────────────────────┐
│ Months 1-3: Preparation                    │
│ ├─ Gap assessment                          │
│ ├─ Control implementation                  │
│ └─ Documentation                           │
├────────────────────────────────────────────┤
│ Months 4-9: Observation Period             │
│ ├─ Controls operating                      │
│ ├─ Evidence collection                     │
│ └─ Continuous monitoring                   │
├────────────────────────────────────────────┤
│ Months 10-12: Audit                        │
│ ├─ Evidence review                         │
│ ├─ Control testing                         │
│ └─ Report issuance                         │
└────────────────────────────────────────────┘
\`\`\`

Total timeline: **12-18 months** from initiation to report`
        }
      ],
      citationVariant: 'right-panel'
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
      const metadata: any = {};

      if (part.type === 'reasoning') {
        metadata[part.type] = { content: part.text, state: part.state };
      } else if (part.type === 'sources') {
        metadata[part.type] = part[part.type];
        // Include citationVariant if provided
        if (part.citationVariant) {
          metadata.citationVariant = part.citationVariant;
        }
      } else {
        metadata[part.type] = part[part.type];
      }

      responses.push({
        message_id: messagePayload.message_id,
        conversation_id: messagePayload.conversation_id,
        tenant_id: messagePayload.tenant_id,
        user_id: messagePayload.user_id,
        response: '', // Empty text content for metadata-only messages
        metadata,
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
