const { test, expect } = require('@playwright/test');

test.describe('Tenant Isolation Validation', () => {
  const baseURL = 'http://localhost:3001';

  test('Complete validation of tenant isolation and user journey', async ({ page }) => {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║         TENANT ISOLATION VALIDATION TEST                  ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    
    // Step 1: Verify server is running
    console.log('📍 Step 1: Verifying server health...');
    const healthResponse = await page.request.get(`${baseURL}/api/health`);
    expect(healthResponse.status()).toBe(200);
    const health = await healthResponse.json();
    expect(health.status).toBe('healthy');
    console.log('   ✅ Server is healthy\n');
    
    // Step 2: Test unauthenticated access is blocked
    console.log('📍 Step 2: Testing unauthenticated access...');
    const unauthResponse = await page.request.get(`${baseURL}/api/tickets/data`);
    expect(unauthResponse.status()).toBe(401);
    const unauthError = await unauthResponse.json();
    expect(unauthError.error).toBe('API key required');
    console.log('   ✅ Unauthenticated access blocked\n');
    
    // Step 3: Create Tenant 1 (AlphaCorp)
    console.log('📍 Step 3: Creating Tenant 1 (AlphaCorp)...');
    const tenant1Email = 'admin@alphacorp.com';
    const tenant1CSV = `ticket_id,title,status,priority,category
ALPHA-001,AlphaCorp Network Issue,open,high,Network
ALPHA-002,AlphaCorp Software Request,resolved,medium,Software
ALPHA-003,AlphaCorp Password Reset,open,low,Security`;
    
    // Upload data for Tenant 1
    const upload1Response = await page.request.post(`${baseURL}/api/upload`, {
      headers: {
        'X-User-Email': tenant1Email,
        'Content-Type': 'text/csv'
      },
      data: tenant1CSV
    });
    expect(upload1Response.status()).toBe(200);
    const upload1Result = await upload1Response.json();
    expect(upload1Result.success).toBe(true);
    console.log(`   ✅ Uploaded data for ${tenant1Email}`);
    
    // Generate API key for Tenant 1
    const key1Response = await page.request.post(`${baseURL}/api/generate-key`, {
      headers: {
        'X-User-Email': tenant1Email,
        'Content-Type': 'application/json'
      }
    });
    expect(key1Response.status()).toBe(200);
    const key1Data = await key1Response.json();
    const tenant1Key = key1Data.apiKey;
    expect(tenant1Key).toMatch(/^rslv_/);
    console.log(`   ✅ Generated API key: ${tenant1Key.substring(0, 20)}...`);
    
    // Verify Tenant 1 can access their data
    const data1Response = await page.request.get(`${baseURL}/api/tickets/data`, {
      headers: {
        'X-API-Key': tenant1Key,
        'Content-Type': 'application/json'
      }
    });
    expect(data1Response.status()).toBe(200);
    const data1 = await data1Response.json();
    expect(data1.success).toBe(true);
    expect(data1.data.length).toBe(3);
    expect(data1.data.every(item => item.ticket_id.startsWith('ALPHA'))).toBe(true);
    console.log(`   ✅ Tenant 1 can access their ${data1.data.length} records\n`);
    
    // Step 4: Create Tenant 2 (BetaCorp)
    console.log('📍 Step 4: Creating Tenant 2 (BetaCorp)...');
    const tenant2Email = 'admin@betacorp.com';
    const tenant2CSV = `ticket_id,title,status,priority,category
BETA-001,BetaCorp Email Issue,resolved,high,Email
BETA-002,BetaCorp Hardware Request,open,medium,Hardware
BETA-003,BetaCorp Access Request,open,high,Security
BETA-004,BetaCorp Software Update,resolved,low,Software`;
    
    // Upload data for Tenant 2
    const upload2Response = await page.request.post(`${baseURL}/api/upload`, {
      headers: {
        'X-User-Email': tenant2Email,
        'Content-Type': 'text/csv'
      },
      data: tenant2CSV
    });
    expect(upload2Response.status()).toBe(200);
    console.log(`   ✅ Uploaded data for ${tenant2Email}`);
    
    // Generate API key for Tenant 2
    const key2Response = await page.request.post(`${baseURL}/api/generate-key`, {
      headers: {
        'X-User-Email': tenant2Email,
        'Content-Type': 'application/json'
      }
    });
    const key2Data = await key2Response.json();
    const tenant2Key = key2Data.apiKey;
    expect(tenant2Key).toMatch(/^rslv_/);
    expect(tenant2Key).not.toBe(tenant1Key);
    console.log(`   ✅ Generated API key: ${tenant2Key.substring(0, 20)}...`);
    
    // Verify Tenant 2 can access their data
    const data2Response = await page.request.get(`${baseURL}/api/tickets/data`, {
      headers: {
        'X-API-Key': tenant2Key,
        'Content-Type': 'application/json'
      }
    });
    const data2 = await data2Response.json();
    expect(data2.data.length).toBe(4);
    expect(data2.data.every(item => item.ticket_id.startsWith('BETA'))).toBe(true);
    console.log(`   ✅ Tenant 2 can access their ${data2.data.length} records\n`);
    
    // Step 5: Verify complete isolation
    console.log('📍 Step 5: Verifying complete tenant isolation...');
    
    // Check Tenant 1 cannot see Tenant 2's data
    const tenant1NoAccess = !data1.data.some(item => item.ticket_id.startsWith('BETA'));
    expect(tenant1NoAccess).toBe(true);
    console.log('   ✅ Tenant 1 cannot see BETA records');
    
    // Check Tenant 2 cannot see Tenant 1's data
    const tenant2NoAccess = !data2.data.some(item => item.ticket_id.startsWith('ALPHA'));
    expect(tenant2NoAccess).toBe(true);
    console.log('   ✅ Tenant 2 cannot see ALPHA records\n');
    
    // Step 6: Test filtering and pagination
    console.log('📍 Step 6: Testing API filtering and pagination...');
    
    // Test filtering by status for Tenant 1
    const openTicketsResponse = await page.request.get(`${baseURL}/api/tickets/data?status=open`, {
      headers: {
        'X-API-Key': tenant1Key,
        'Content-Type': 'application/json'
      }
    });
    const openTickets = await openTicketsResponse.json();
    expect(openTickets.data.every(item => item.status === 'open')).toBe(true);
    console.log(`   ✅ Filtering works: ${openTickets.data.length} open tickets for Tenant 1`);
    
    // Test pagination for Tenant 2
    const page1Response = await page.request.get(`${baseURL}/api/tickets/data?page=1&limit=2`, {
      headers: {
        'X-API-Key': tenant2Key,
        'Content-Type': 'application/json'
      }
    });
    const page1Data = await page1Response.json();
    expect(page1Data.data.length).toBeLessThanOrEqual(2);
    expect(page1Data.pagination.page).toBe(1);
    console.log(`   ✅ Pagination works: Page 1 with ${page1Data.data.length} records\n`);
    
    // Step 7: Test cross-tenant access prevention
    console.log('📍 Step 7: Testing cross-tenant access prevention...');
    
    // Try to use Tenant 1's API key and verify it only sees Tenant 1's data
    const crossCheckResponse = await page.request.get(`${baseURL}/api/tickets/data`, {
      headers: {
        'X-API-Key': tenant1Key,
        'Content-Type': 'application/json'
      }
    });
    const crossCheckData = await crossCheckResponse.json();
    const onlyAlphaData = crossCheckData.data.every(item => item.ticket_id.startsWith('ALPHA'));
    const noBetaData = !crossCheckData.data.some(item => item.ticket_id.startsWith('BETA'));
    expect(onlyAlphaData && noBetaData).toBe(true);
    console.log('   ✅ API keys are properly isolated\n');
    
    // Step 8: Test invalid API key
    console.log('📍 Step 8: Testing invalid API key handling...');
    const invalidKeyResponse = await page.request.get(`${baseURL}/api/tickets/data`, {
      headers: {
        'X-API-Key': 'rslv_invalid_key_12345',
        'Content-Type': 'application/json'
      }
    });
    expect(invalidKeyResponse.status()).toBe(401);
    const invalidError = await invalidKeyResponse.json();
    expect(invalidError.error).toBe('Invalid API key');
    console.log('   ✅ Invalid API keys are rejected\n');
    
    // Summary
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║                    TEST RESULTS SUMMARY                   ║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log('║ ✅ Server Health Check:        PASSED                     ║');
    console.log('║ ✅ Unauthenticated Access:     BLOCKED                    ║');
    console.log('║ ✅ Tenant 1 (AlphaCorp):       3 records isolated         ║');
    console.log('║ ✅ Tenant 2 (BetaCorp):        4 records isolated         ║');
    console.log('║ ✅ Cross-Tenant Access:        PREVENTED                  ║');
    console.log('║ ✅ API Filtering:              WORKING                    ║');
    console.log('║ ✅ API Pagination:             WORKING                    ║');
    console.log('║ ✅ Invalid API Keys:           REJECTED                   ║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log('║ 🎯 TENANT ISOLATION:           FULLY VALIDATED            ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    
    // Display tenant details
    console.log('📊 Tenant Details:');
    console.log('─────────────────────────────────────────────────');
    console.log('Tenant 1 (AlphaCorp):');
    console.log(`  Email: ${tenant1Email}`);
    console.log(`  API Key: ${tenant1Key.substring(0, 30)}...`);
    console.log(`  Records: ${data1.data.length} (All prefixed with ALPHA-)`);
    console.log('');
    console.log('Tenant 2 (BetaCorp):');
    console.log(`  Email: ${tenant2Email}`);
    console.log(`  API Key: ${tenant2Key.substring(0, 30)}...`);
    console.log(`  Records: ${data2.data.length} (All prefixed with BETA-)`);
    console.log('─────────────────────────────────────────────────\n');
  });
});