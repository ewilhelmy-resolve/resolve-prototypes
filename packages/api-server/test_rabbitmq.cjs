const amqp = require('amqplib');
const axios = require('axios');
const { execSync } = require('child_process');

async function testRabbitMQ() {
  try {
    console.log('🔐 Creating authentication session...');
    const authOutput = execSync('cd ../.. && node test-auth.js', { encoding: 'utf8' });
    const cookieMatch = authOutput.match(/🍪 Session Cookie: (.+)/);

    if (!cookieMatch) {
      throw new Error('Failed to get session cookie');
    }

    const sessionCookie = cookieMatch[1];
    console.log(`✅ Got session cookie: ${sessionCookie.substring(0, 30)}...`);

    console.log('\n📝 Creating a test message to respond to...');
    const messageResponse = await axios.post('http://localhost:3000/api/messages', {
      content: 'Test message for RabbitMQ response simulation'
    }, {
      headers: {
        'Cookie': sessionCookie,
        'Content-Type': 'application/json'
      }
    });

    const { id: messageId, conversation_id: conversationId } = messageResponse.data.message;
    console.log(`✅ Created test message: ${messageId}`);
    console.log(`✅ In conversation: ${conversationId}`);

    // Get user info from a profile call to get current org and user IDs
    console.log('\n🔍 Getting user profile for org/user IDs...');
    const profileResponse = await axios.get('http://localhost:3000/api/profile', {
      headers: { 'Cookie': sessionCookie }
    });

    const { id: userId, activeOrganizationId } = profileResponse.data.user;
    console.log(`✅ User ID: ${userId}`);
    console.log(`✅ Organization ID: ${activeOrganizationId}`);

    // Connect to RabbitMQ
    console.log('\n🐰 Connecting to RabbitMQ...');
    const connection = await amqp.connect('amqp://guest:guest@localhost:5672');
    const channel = await connection.createChannel();

    const queueName = 'chat.responses';
    await channel.assertQueue(queueName, { durable: true });

    // Create a test response message for the message we just created
    const testResponse = {
      message_id: messageId,
      organization_id: activeOrganizationId,
      user_id: userId,
      status: 'completed',
      response_content: 'This is a test response from the external automation service via RabbitMQ!',
      processed_at: new Date().toISOString()
    };

    // Publish test message
    channel.sendToQueue(queueName, Buffer.from(JSON.stringify(testResponse)), {
      persistent: true
    });

    console.log('✅ Test response sent to queue:', testResponse);

    await channel.close();
    await connection.close();

    console.log('\n⏳ Waiting 2 seconds for processing...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check if the message was updated
    console.log('\n🔍 Checking if message was updated...');
    const updatedMessage = await axios.get(`http://localhost:3000/api/messages/${messageId}`, {
      headers: { 'Cookie': sessionCookie }
    });

    const message = updatedMessage.data.message;
    console.log(`📋 Final status: ${message.status}`);
    console.log(`💬 Response: ${message.response_content || 'No response'}`);
    console.log(`⏰ Processed: ${message.processed_at || 'Not processed'}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

testRabbitMQ();