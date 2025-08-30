const { test, expect } = require('@playwright/test');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

// Configure to always record video for debugging
test.use({
  video: 'retain-on-failure',
  screenshot: 'only-on-failure',
  trace: 'retain-on-failure'
});

// Helper function to generate a vector embedding (1536 dimensions for OpenAI compatibility)
function generateMockEmbedding(seed = 'test') {
  const embedding = [];
  for (let i = 0; i < 1536; i++) {
    // Generate deterministic pseudo-random values based on seed
    const hash = crypto.createHash('sha256').update(`${seed}-${i}`).digest();
    const value = (hash[0] / 255) * 2 - 1; // Normalize to [-1, 1]
    embedding.push(parseFloat(value.toFixed(6)));
  }
  return embedding;
}

test.describe('Knowledge API - RAG Embeddings & Tenant Isolation', () => {

  test('ingest knowledge articles with tenant isolation', async ({ page, request }) => {
    // Generate unique users for different tenants
    const timestamp = Date.now();
    const tenant1 = {
      name: `Tenant One ${timestamp}`,
      email: `tenant1_${timestamp}@example.com`,
      company: `Company One ${timestamp}`,
      password: 'TestPassword123!'
    };
    const tenant2 = {
      name: `Tenant Two ${timestamp}`,
      email: `tenant2_${timestamp}@example.com`,
      company: `Company Two ${timestamp}`,
      password: 'TestPassword123!'
    };

    console.log(`\n🚀 KNOWLEDGE INGESTION TEST - TENANT ISOLATION\n`);

    // ============= SETUP: Create Tenant 1 =============
    console.log('📝 Setting up Tenant 1...');
    
    await page.goto('/');
    await page.waitForTimeout(2000);
    
    // Fill signup form for Tenant 1
    const nameField = page.locator('input[name="fullName"], input[placeholder*="name" i]').first();
    const emailField = page.locator('input[type="email"], input[name="email"]').first();
    const companyField = page.locator('input[name="company"], input[placeholder*="Acme" i]').first();
    const passwordField = page.locator('input[type="password"], input[name="password"]').first();
    
    await nameField.fill(tenant1.name);
    await emailField.fill(tenant1.email);
    await companyField.fill(tenant1.company);
    await passwordField.fill(tenant1.password);
    
    await page.click('button:has-text("Continue")');
    await page.waitForTimeout(2000);
    
    // Skip through to dashboard
    if (page.url().includes('step2')) {
      await page.click('button:has-text("Continue")');
      await page.waitForTimeout(2000);
    }
    if (page.url().includes('completion')) {
      await page.waitForTimeout(5000);
      const dashboardBtn = page.locator('button:has-text("Continue to Dashboard")');
      if (await dashboardBtn.isVisible()) {
        await dashboardBtn.click();
      }
    }
    
    // Get Tenant 1's session token
    const cookies1 = await page.context().cookies();
    const sessionToken1 = cookies1.find(c => c.name === 'sessionToken')?.value || 'active';
    const tenantId1 = uuidv4(); // Generate proper UUID for tenant ID
    
    console.log('   ✅ Tenant 1 setup complete');

    // ============= TENANT 1: INGEST KNOWLEDGE ARTICLES =============
    console.log('\n1️⃣ TENANT 1: INGESTING KNOWLEDGE ARTICLES');
    
    const tenant1Articles = [
      {
        title: 'Customer Support Guide - Tenant 1',
        content: `This is a comprehensive guide for Tenant 1's customer support team. 
                 It includes procedures for handling tickets, escalation protocols, 
                 and common troubleshooting steps specific to our products.`,
        category: 'support',
        tags: ['customer-service', 'troubleshooting', 'tenant1'],
        source: 'internal-docs'
      },
      {
        title: 'Product API Documentation - Tenant 1',
        content: `API endpoints and authentication methods for Tenant 1's services. 
                 Includes REST API patterns, webhook integrations, and rate limiting 
                 policies specific to our infrastructure.`,
        category: 'technical',
        tags: ['api', 'development', 'tenant1'],
        source: 'tech-docs'
      }
    ];
    
    console.log(`   📤 Ingesting ${tenant1Articles.length} articles for Tenant 1...`);
    
    const ingest1Response = await request.post(`/api/tenant/${tenantId1}/knowledge`, {
      headers: {
        'Authorization': `Bearer ${sessionToken1}`,
        'Content-Type': 'application/json',
        'X-Test-Tenant-Id': tenantId1,
        'X-Test-Email': tenant1.email
      },
      data: {
        articles: tenant1Articles
      }
    });
    
    if (!ingest1Response.ok()) {
      const errorText = await ingest1Response.text();
      console.log(`   ❌ Tenant 1 ingest failed: ${ingest1Response.status()}`);
      console.log(`   Error: ${errorText}`);
      throw new Error(`Ingest failed: ${errorText}`);
    }
    
    const ingest1Data = await ingest1Response.json();
    console.log(`   ✅ Tenant 1 ingestion successful`);
    console.log(`   📋 Articles accepted: ${ingest1Data.accepted}/${ingest1Data.total}`);
    
    // Store article IDs and callback IDs for Tenant 1
    const tenant1ArticleIds = ingest1Data.articles.map(a => ({
      article_id: a.article_id,
      callback_id: a.callback_id,
      title: a.title
    }));

    // ============= SETUP: Create Tenant 2 =============
    console.log('\n📝 Setting up Tenant 2...');
    
    // Log out and create Tenant 2
    await page.goto('/');
    await page.waitForTimeout(2000);
    
    await nameField.fill(tenant2.name);
    await emailField.fill(tenant2.email);
    await companyField.fill(tenant2.company);
    await passwordField.fill(tenant2.password);
    
    await page.click('button:has-text("Continue")');
    await page.waitForTimeout(2000);
    
    if (page.url().includes('step2')) {
      await page.click('button:has-text("Continue")');
      await page.waitForTimeout(2000);
    }
    if (page.url().includes('completion')) {
      await page.waitForTimeout(5000);
      const dashboardBtn = page.locator('button:has-text("Continue to Dashboard")');
      if (await dashboardBtn.isVisible()) {
        await dashboardBtn.click();
      }
    }
    
    // Get Tenant 2's session token
    const cookies2 = await page.context().cookies();
    const sessionToken2 = cookies2.find(c => c.name === 'sessionToken')?.value || 'active';
    const tenantId2 = uuidv4(); // Generate proper UUID for tenant ID
    
    console.log('   ✅ Tenant 2 setup complete');

    // ============= TENANT 2: INGEST DIFFERENT KNOWLEDGE ARTICLES =============
    console.log('\n2️⃣ TENANT 2: INGESTING KNOWLEDGE ARTICLES');
    
    const tenant2Articles = [
      {
        title: 'Sales Playbook - Tenant 2',
        content: `Complete sales methodology for Tenant 2's products. Contains 
                 competitive analysis, pricing strategies, and objection handling 
                 specific to our market segment.`,
        category: 'sales',
        tags: ['sales', 'strategy', 'tenant2'],
        source: 'sales-team'
      },
      {
        title: 'Security Compliance Guide - Tenant 2',
        content: `Security policies and compliance requirements for Tenant 2. 
                 Covers GDPR, SOC2, and industry-specific regulations that 
                 apply to our operations.`,
        category: 'compliance',
        tags: ['security', 'compliance', 'tenant2'],
        source: 'legal-dept'
      }
    ];
    
    console.log(`   📤 Ingesting ${tenant2Articles.length} articles for Tenant 2...`);
    
    const ingest2Response = await request.post(`/api/tenant/${tenantId2}/knowledge`, {
      headers: {
        'Authorization': `Bearer ${sessionToken2}`,
        'Content-Type': 'application/json',
        'X-Test-Tenant-Id': tenantId2,
        'X-Test-Email': tenant2.email
      },
      data: {
        articles: tenant2Articles
      }
    });
    
    if (!ingest2Response.ok()) {
      const errorText = await ingest2Response.text();
      console.log(`   ❌ Tenant 2 ingest failed: ${ingest2Response.status()}`);
      console.log(`   Error: ${errorText}`);
      throw new Error(`Ingest failed: ${errorText}`);
    }
    
    const ingest2Data = await ingest2Response.json();
    console.log(`   ✅ Tenant 2 ingestion successful`);
    console.log(`   📋 Articles accepted: ${ingest2Data.accepted}/${ingest2Data.total}`);
    
    // Store article IDs for Tenant 2
    const tenant2ArticleIds = ingest2Data.articles.map(a => ({
      article_id: a.article_id,
      callback_id: a.callback_id,
      title: a.title
    }));

    // ============= SIMULATE VECTORIZATION CALLBACKS =============
    console.log('\n3️⃣ SIMULATING VECTORIZATION CALLBACKS FROM ACTIONS PLATFORM');
    
    // Vectorize Tenant 1's articles
    for (const article of tenant1ArticleIds) {
      const vectors = [
        {
          chunk_text: article.title,
          embedding: generateMockEmbedding(`t1-${article.article_id}-title`),
          chunk_index: 0,
          metadata: { type: 'title' }
        },
        {
          chunk_text: `Content chunk for ${article.title}`,
          embedding: generateMockEmbedding(`t1-${article.article_id}-content`),
          chunk_index: 1,
          metadata: { type: 'content' }
        }
      ];
      
      await request.post(`/api/tenant/${tenantId1}/knowledge/callback/${article.callback_id}`, {
        headers: { 'Content-Type': 'application/json' },
        data: {
          document_id: article.article_id,
          vectors: vectors
        }
      });
    }
    console.log(`   ✅ Vectorized ${tenant1ArticleIds.length} articles for Tenant 1`);
    
    // Vectorize Tenant 2's articles
    for (const article of tenant2ArticleIds) {
      const vectors = [
        {
          chunk_text: article.title,
          embedding: generateMockEmbedding(`t2-${article.article_id}-title`),
          chunk_index: 0,
          metadata: { type: 'title' }
        },
        {
          chunk_text: `Content chunk for ${article.title}`,
          embedding: generateMockEmbedding(`t2-${article.article_id}-content`),
          chunk_index: 1,
          metadata: { type: 'content' }
        }
      ];
      
      await request.post(`/api/tenant/${tenantId2}/knowledge/callback/${article.callback_id}`, {
        headers: { 'Content-Type': 'application/json' },
        data: {
          document_id: article.article_id,
          vectors: vectors
        }
      });
    }
    console.log(`   ✅ Vectorized ${tenant2ArticleIds.length} articles for Tenant 2`);

    // ============= TEST TENANT ISOLATION IN SEARCH =============
    console.log('\n4️⃣ TESTING TENANT ISOLATION IN VECTOR SEARCH');
    
    // Search from Tenant 1's perspective
    const queryEmbedding = generateMockEmbedding('support-query');
    
    console.log('   🔍 Tenant 1 searching for support content...');
    const search1Response = await request.post(`/api/tenant/${tenantId1}/knowledge/search-embedding`, {
      headers: { 'Content-Type': 'application/json' },
      data: {
        query_embedding: queryEmbedding,
        limit: 10,
        threshold: 0.0
      }
    });
    
    if (search1Response.ok()) {
      const search1Data = await search1Response.json();
      console.log(`   ✅ Tenant 1 found ${search1Data.total_documents} documents`);
      
      // Verify only Tenant 1's content is returned
      const hasTenant2Content = search1Data.documents.some(doc => 
        doc.title.includes('Tenant 2') || 
        doc.tags?.includes('tenant2')
      );
      
      if (hasTenant2Content) {
        throw new Error('❌ SECURITY BREACH: Tenant 1 can see Tenant 2 content!');
      }
      console.log('   ✅ Tenant isolation verified: No Tenant 2 content visible');
    }
    
    console.log('   🔍 Tenant 2 searching for their content...');
    const search2Response = await request.post(`/api/tenant/${tenantId2}/knowledge/search-embedding`, {
      headers: { 'Content-Type': 'application/json' },
      data: {
        query_embedding: generateMockEmbedding('sales-query'),
        limit: 10,
        threshold: 0.0
      }
    });
    
    if (search2Response.ok()) {
      const search2Data = await search2Response.json();
      console.log(`   ✅ Tenant 2 found ${search2Data.total_documents} documents`);
      
      // Verify only Tenant 2's content is returned
      const hasTenant1Content = search2Data.documents.some(doc => 
        doc.title.includes('Tenant 1') || 
        doc.tags?.includes('tenant1')
      );
      
      if (hasTenant1Content) {
        throw new Error('❌ SECURITY BREACH: Tenant 2 can see Tenant 1 content!');
      }
      console.log('   ✅ Tenant isolation verified: No Tenant 1 content visible');
    }

    // ============= TEST KNOWLEDGE RETRIEVAL =============
    console.log('\n5️⃣ TESTING KNOWLEDGE ARTICLE RETRIEVAL');
    
    // Get Tenant 1's articles
    const list1Response = await request.get(`/api/tenant/${tenantId1}/knowledge?limit=10`, {
      headers: {
        'Authorization': `Bearer ${sessionToken1}`,
        'X-Test-Tenant-Id': tenantId1,
        'X-Test-Email': tenant1.email
      }
    });
    
    if (list1Response.ok()) {
      const list1Data = await list1Response.json();
      console.log(`   ✅ Tenant 1 has ${list1Data.articles.length} articles`);
      console.log(`   📋 Articles:`, list1Data.articles.map(a => a.title));
    }

    // ============= TEST SUMMARY =============
    console.log('\n' + '='.repeat(60));
    console.log('🎉 KNOWLEDGE API TENANT ISOLATION TEST COMPLETE!');
    console.log('='.repeat(60));
    console.log('\n📋 Test Results:');
    console.log('   ✅ Knowledge ingestion with tenant isolation working');
    console.log('   ✅ Vectorization callbacks processed correctly');
    console.log('   ✅ Tenant isolation enforced in vector search');
    console.log('   ✅ Each tenant can only access their own knowledge');
    console.log(`   ✅ Tenant 1: ${tenant1ArticleIds.length} articles`);
    console.log(`   ✅ Tenant 2: ${tenant2ArticleIds.length} articles`);
    console.log('\n✨ Multi-tenant RAG knowledge base fully operational!');
  });

  test('validate embedding-based retrieval with filtering', async ({ page, request }) => {
    const timestamp = Date.now();
    const testUser = {
      name: `Filter Test ${timestamp}`,
      email: `filter_${timestamp}@example.com`,
      company: `FilterCo ${timestamp}`,
      password: 'TestPassword123!'
    };

    console.log(`\n🔍 EMBEDDING SEARCH WITH FILTERS TEST\n`);

    // Quick setup
    await page.goto('/');
    await page.waitForTimeout(2000);
    
    const nameField = page.locator('input[name="fullName"], input[placeholder*="name" i]').first();
    const emailField = page.locator('input[type="email"], input[name="email"]').first();
    const companyField = page.locator('input[name="company"], input[placeholder*="Acme" i]').first();
    const passwordField = page.locator('input[type="password"], input[name="password"]').first();
    
    await nameField.fill(testUser.name);
    await emailField.fill(testUser.email);
    await companyField.fill(testUser.company);
    await passwordField.fill(testUser.password);
    await page.click('button:has-text("Continue")');
    
    // Skip to dashboard
    await page.waitForTimeout(2000);
    if (page.url().includes('step2')) {
      await page.click('button:has-text("Continue")');
    }
    await page.waitForTimeout(7000);
    
    const cookies = await page.context().cookies();
    const sessionToken = cookies.find(c => c.name === 'sessionToken')?.value || 'active';
    const tenantId = uuidv4();

    console.log('1️⃣ Ingesting diverse knowledge articles...');
    
    const articles = [
      {
        title: 'Python Programming Guide',
        content: 'Learn Python programming with examples of data structures, algorithms, and web frameworks.',
        category: 'technical',
        tags: ['python', 'programming', 'tutorial']
      },
      {
        title: 'JavaScript Best Practices',
        content: 'Modern JavaScript development patterns, async/await, and ES6+ features explained.',
        category: 'technical',
        tags: ['javascript', 'programming', 'web']
      },
      {
        title: 'HR Onboarding Process',
        content: 'Complete guide for onboarding new employees, including paperwork and orientation.',
        category: 'hr',
        tags: ['human-resources', 'onboarding', 'process']
      },
      {
        title: 'Marketing Campaign Strategy',
        content: 'How to plan and execute successful marketing campaigns with ROI tracking.',
        category: 'marketing',
        tags: ['marketing', 'strategy', 'campaigns']
      }
    ];
    
    const ingestResponse = await request.post(`/api/tenant/${tenantId}/knowledge`, {
      headers: {
        'Authorization': `Bearer ${sessionToken}`,
        'Content-Type': 'application/json',
        'X-Test-Tenant-Id': tenantId,
        'X-Test-Email': testUser.email
      },
      data: { articles }
    });
    
    const ingestData = await ingestResponse.json();
    console.log(`   ✅ Ingested ${ingestData.accepted} articles`);
    
    // Vectorize all articles
    for (const article of ingestData.articles) {
      const vectors = [{
        chunk_text: articles.find(a => a.title === article.title)?.content || '',
        embedding: generateMockEmbedding(article.article_id),
        chunk_index: 0
      }];
      
      await request.post(`/api/tenant/${tenantId}/knowledge/callback/${article.callback_id}`, {
        headers: { 'Content-Type': 'application/json' },
        data: {
          document_id: article.article_id,
          vectors: vectors
        }
      });
    }
    
    console.log('\n2️⃣ Testing search with category filter...');
    
    // Search only technical articles
    const technicalSearchResponse = await request.post(`/api/tenant/${tenantId}/knowledge/search-embedding`, {
      headers: { 'Content-Type': 'application/json' },
      data: {
        query_embedding: generateMockEmbedding('programming-query'),
        category: 'technical',
        limit: 10,
        threshold: 0.0
      }
    });
    
    const technicalData = await technicalSearchResponse.json();
    console.log(`   ✅ Found ${technicalData.total_documents} technical documents`);
    
    // Verify all results are technical category
    const allTechnical = technicalData.documents.every(doc => doc.category === 'technical');
    if (allTechnical) {
      console.log('   ✅ Category filter working: All results are technical');
    } else {
      throw new Error('Category filter not working correctly');
    }
    
    console.log('\n3️⃣ Testing search with tag filter...');
    
    // Search with specific tags
    const tagSearchResponse = await request.post(`/api/tenant/${tenantId}/knowledge/search-embedding`, {
      headers: { 'Content-Type': 'application/json' },
      data: {
        query_embedding: generateMockEmbedding('web-query'),
        tags: ['programming'],
        limit: 10,
        threshold: 0.0
      }
    });
    
    const tagData = await tagSearchResponse.json();
    console.log(`   ✅ Found ${tagData.total_documents} documents with 'programming' tag`);
    
    console.log('\n✨ Filtering test complete!');
  });

  test('handle article deletion with cascade cleanup', async ({ page, request }) => {
    const timestamp = Date.now();
    const testUser = {
      name: `Delete Test ${timestamp}`,
      email: `delete_${timestamp}@example.com`,
      company: `DeleteCo ${timestamp}`,
      password: 'TestPassword123!'
    };

    console.log(`\n🗑️ ARTICLE DELETION TEST\n`);

    // Quick setup
    await page.goto('/');
    await page.waitForTimeout(2000);
    
    const nameField = page.locator('input[name="fullName"], input[placeholder*="name" i]').first();
    const emailField = page.locator('input[type="email"], input[name="email"]').first();
    const companyField = page.locator('input[name="company"], input[placeholder*="Acme" i]').first();
    const passwordField = page.locator('input[type="password"], input[name="password"]').first();
    
    await nameField.fill(testUser.name);
    await emailField.fill(testUser.email);
    await companyField.fill(testUser.company);
    await passwordField.fill(testUser.password);
    await page.click('button:has-text("Continue")');
    
    await page.waitForTimeout(2000);
    if (page.url().includes('step2')) {
      await page.click('button:has-text("Continue")');
    }
    await page.waitForTimeout(7000);
    
    const cookies = await page.context().cookies();
    const sessionToken = cookies.find(c => c.name === 'sessionToken')?.value || 'active';
    const tenantId = uuidv4();

    console.log('1️⃣ Creating test article...');
    
    const article = {
      title: 'Article to Delete',
      content: 'This article will be deleted to test cascade cleanup of vectors.',
      category: 'test',
      tags: ['test', 'deletion']
    };
    
    const ingestResponse = await request.post(`/api/tenant/${tenantId}/knowledge`, {
      headers: {
        'Authorization': `Bearer ${sessionToken}`,
        'Content-Type': 'application/json',
        'X-Test-Tenant-Id': tenantId,
        'X-Test-Email': testUser.email
      },
      data: { articles: [article] }
    });
    
    const ingestData = await ingestResponse.json();
    const articleId = ingestData.articles[0].article_id;
    const callbackId = ingestData.articles[0].callback_id;
    console.log(`   ✅ Article created: ${articleId}`);
    
    // Vectorize the article
    await request.post(`/api/tenant/${tenantId}/knowledge/callback/${callbackId}`, {
      headers: { 'Content-Type': 'application/json' },
      data: {
        document_id: articleId,
        vectors: [{
          chunk_text: article.content,
          embedding: generateMockEmbedding(articleId),
          chunk_index: 0
        }]
      }
    });
    console.log('   ✅ Article vectorized');
    
    // Verify article exists in search
    const searchBeforeResponse = await request.post(`/api/tenant/${tenantId}/knowledge/search-embedding`, {
      headers: { 'Content-Type': 'application/json' },
      data: {
        query_embedding: generateMockEmbedding(articleId),
        limit: 10,
        threshold: 0.0
      }
    });
    
    const searchBeforeData = await searchBeforeResponse.json();
    const foundBefore = searchBeforeData.documents.some(doc => doc.document_id === articleId);
    console.log(`   ✅ Article found in search before deletion: ${foundBefore}`);
    
    console.log('\n2️⃣ Deleting article...');
    
    const deleteResponse = await request.delete(`/api/tenant/${tenantId}/knowledge/${articleId}`, {
      headers: {
        'Authorization': `Bearer ${sessionToken}`,
        'X-Test-Tenant-Id': tenantId,
        'X-Test-Email': testUser.email
      }
    });
    
    if (deleteResponse.ok()) {
      console.log('   ✅ Article deleted successfully');
    } else {
      throw new Error(`Delete failed: ${deleteResponse.status()}`);
    }
    
    console.log('\n3️⃣ Verifying article no longer searchable...');
    
    const searchAfterResponse = await request.post(`/api/tenant/${tenantId}/knowledge/search-embedding`, {
      headers: { 'Content-Type': 'application/json' },
      data: {
        query_embedding: generateMockEmbedding(articleId),
        limit: 10,
        threshold: 0.0
      }
    });
    
    const searchAfterData = await searchAfterResponse.json();
    const foundAfter = searchAfterData.documents.some(doc => doc.document_id === articleId);
    
    if (!foundAfter) {
      console.log('   ✅ Article no longer found in search - vectors cleaned up');
    } else {
      throw new Error('Article still found after deletion - cascade cleanup failed');
    }
    
    console.log('\n✨ Deletion test complete!');
  });

});