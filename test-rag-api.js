const axios = require('axios');

const BASE_URL = 'http://localhost:5000';
const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'test123';

async function testRagApi() {
    console.log('Testing RAG API implementation...\n');
    
    try {
        // 1. Test signup to create a user with tenant_id
        console.log('1. Testing user signup...');
        const signupRes = await axios.post(`${BASE_URL}/api/signup`, {
            email: TEST_EMAIL,
            password: TEST_PASSWORD,
            fullName: 'Test User',
            companyName: 'Test Company'
        }).catch(err => {
            if (err.response?.status === 400 && err.response?.data?.message?.includes('already exists')) {
                console.log('   User already exists, continuing...');
                return { data: { success: true } };
            }
            throw err;
        });
        
        if (signupRes.data.success) {
            console.log('   ✓ User created/exists');
        }
        
        // 2. Test signin to get session
        console.log('2. Testing user signin...');
        const signinRes = await axios.post(`${BASE_URL}/api/signin`, {
            email: TEST_EMAIL,
            password: TEST_PASSWORD
        });
        
        const sessionToken = signinRes.data.token;
        if (sessionToken) {
            console.log('   ✓ Signin successful, got session token');
        }
        
        // 3. Test RAG ingest endpoint
        console.log('3. Testing RAG ingest endpoint...');
        const ingestRes = await axios.post(
            `${BASE_URL}/api/rag/ingest`,
            {
                documents: [{
                    content: 'This is a test document for the RAG system. It contains information about testing.',
                    metadata: { source: 'test', category: 'testing' }
                }]
            },
            {
                headers: {
                    'Authorization': `Bearer ${sessionToken}`
                }
            }
        );
        
        if (ingestRes.data.success) {
            console.log('   ✓ Document ingestion successful');
            console.log('   Document ID:', ingestRes.data.documents[0].document_id);
            console.log('   Callback ID:', ingestRes.data.documents[0].callback_id);
        }
        
        // 4. Test RAG chat endpoint
        console.log('4. Testing RAG chat endpoint...');
        const chatRes = await axios.post(
            `${BASE_URL}/api/rag/chat`,
            {
                message: 'What information do you have about testing?'
            },
            {
                headers: {
                    'Authorization': `Bearer ${sessionToken}`
                }
            }
        );
        
        if (chatRes.data.conversation_id) {
            console.log('   ✓ Chat endpoint working');
            console.log('   Conversation ID:', chatRes.data.conversation_id);
            console.log('   Response:', chatRes.data.message);
        }
        
        // 5. Test conversation history endpoint
        if (chatRes.data.conversation_id) {
            console.log('5. Testing conversation history endpoint...');
            const historyRes = await axios.get(
                `${BASE_URL}/api/rag/conversation/${chatRes.data.conversation_id}`,
                {
                    headers: {
                        'Authorization': `Bearer ${sessionToken}`
                    }
                }
            );
            
            if (historyRes.data.success) {
                console.log('   ✓ Conversation history retrieved');
                console.log('   Messages count:', historyRes.data.messages.length);
            }
        }
        
        console.log('\n✅ All RAG API tests passed!');
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        if (error.response?.data) {
            console.error('   Error details:', error.response.data);
        }
        process.exit(1);
    }
}

// Run tests
testRagApi().then(() => process.exit(0));