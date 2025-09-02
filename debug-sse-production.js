#!/usr/bin/env node

const axios = require('axios');

async function debugSSE() {
    const messageId = 'a8c4f078-96fe-4b67-acb2-7d2f53a42d36';
    
    try {
        // 1. Login as admin
        console.log('1️⃣ Logging in...');
        const loginResponse = await axios.post('http://localhost:5000/api/auth/signin', {
            email: 'admin@resolve.io',
            password: 'P@ssw0rd123!'
        });
        
        const token = loginResponse.data.token;
        const tenantId = loginResponse.data.tenant_id;
        console.log('✅ Logged in');
        console.log('   Tenant ID:', tenantId);
        
        // 2. Query the database to check the message
        console.log('\n2️⃣ Checking message in database...');
        const checkMessage = await axios.post(
            'http://localhost:5000/api/admin/diagnostics/query',
            {
                query: `
                    SELECT m.*, c.tenant_id as conv_tenant_id 
                    FROM rag_messages m 
                    JOIN rag_conversations c ON m.conversation_id = c.conversation_id 
                    WHERE m.conversation_id IN (
                        SELECT conversation_id FROM rag_messages 
                        WHERE message LIKE '%Actions Platform%' 
                        ORDER BY created_at DESC 
                        LIMIT 5
                    )
                    ORDER BY m.created_at DESC
                `
            },
            {
                headers: { 'Authorization': `Bearer ${token}` },
                validateStatus: () => true
            }
        );
        
        if (checkMessage.status === 200 && checkMessage.data) {
            console.log('📊 Messages found:');
            checkMessage.data.forEach(msg => {
                console.log(`   - ${msg.role}: ${msg.message?.substring(0, 50)}...`);
                console.log(`     Tenant: ${msg.conv_tenant_id}, Created: ${msg.created_at}`);
            });
        } else {
            console.log('❌ Could not query messages');
        }
        
        // 3. Check webhook failures table
        console.log('\n3️⃣ Checking webhook failures...');
        const checkFailures = await axios.post(
            'http://localhost:5000/api/admin/diagnostics/query',
            {
                query: `
                    SELECT webhook_type, status, payload->>'message_id' as message_id, 
                           payload->>'conversation_id' as conversation_id,
                           payload->>'tenant_id' as tenant_id,
                           created_at
                    FROM rag_webhook_failures 
                    WHERE created_at > NOW() - INTERVAL '1 hour'
                    ORDER BY created_at DESC 
                    LIMIT 5
                `
            },
            {
                headers: { 'Authorization': `Bearer ${token}` },
                validateStatus: () => true
            }
        );
        
        if (checkFailures.status === 200 && checkFailures.data) {
            console.log('📊 Recent webhook attempts:');
            checkFailures.data.forEach(wh => {
                console.log(`   - Type: ${wh.webhook_type}, Status: ${wh.status}`);
                console.log(`     Message: ${wh.message_id}`);
                console.log(`     Tenant: ${wh.tenant_id}`);
            });
        }
        
        // 4. Check SSE diagnostic endpoint
        console.log('\n4️⃣ Checking SSE clients...');
        const sseCheck = await axios.get(
            'http://localhost:5000/api/admin/diagnostics/sse-status',
            {
                headers: { 'Authorization': `Bearer ${token}` },
                validateStatus: () => true
            }
        );
        
        if (sseCheck.status === 200) {
            console.log('📊 SSE Status:', sseCheck.data);
        } else {
            console.log('⚠️  SSE status endpoint not available');
        }
        
        // 5. Test SSE connection
        console.log('\n5️⃣ Testing SSE event delivery...');
        const testSSE = await axios.post(
            'http://localhost:5000/api/rag/test-sse',
            {
                message: 'Debug test from diagnostic script'
            },
            {
                headers: { 'Authorization': `Bearer ${token}` },
                validateStatus: () => true
            }
        );
        
        console.log('   SSE test response:', testSSE.status, testSSE.data);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

debugSSE();