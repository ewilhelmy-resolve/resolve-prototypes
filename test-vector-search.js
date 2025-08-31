const axios = require('axios');

async function testVectorSearch() {
    const baseUrl = 'http://localhost:5000/api/rag';
    
    // Test data
    const testEmbedding = new Array(1536).fill(0).map(() => Math.random());
    const tenantId = 'test-tenant-123';
    const callbackToken = 'test-token-123';
    
    try {
        console.log('Testing vector search endpoint...');
        
        const response = await axios.post(
            `${baseUrl}/vector-search`,
            {
                query_embedding: testEmbedding,
                tenant_id: tenantId,
                limit: 5,
                threshold: 0.7
            },
            {
                headers: {
                    'X-Callback-Token': callbackToken,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        console.log('✅ Vector search successful!');
        console.log('Response:', JSON.stringify(response.data, null, 2));
        
    } catch (error) {
        console.error('❌ Vector search failed!');
        console.error('Error:', error.response?.data || error.message);
        
        // Check if it's the specific error we fixed
        if (error.response?.data?.message?.includes('operator does not exist')) {
            console.error('\n⚠️  This appears to be the vector type casting issue.');
            console.error('The fix should resolve this by properly casting JSON to vector type.');
        }
    }
}

// Run the test
testVectorSearch();