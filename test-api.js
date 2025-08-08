const http = require('http');

const data = JSON.stringify({
  email: 'john@resolve.io',
  password: '!Password1'
});

console.log('Sending:', data);

const options = {
  hostname: 'localhost',
  port: 8082,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  
  let responseData = '';
  res.on('data', (chunk) => {
    responseData += chunk;
  });
  
  res.on('end', () => {
    console.log('Response:', responseData);
    try {
      const parsed = JSON.parse(responseData);
      console.log('Parsed:', JSON.stringify(parsed, null, 2));
      if (parsed.success) {
        console.log('✅ Login successful!');
        console.log('Token:', parsed.token);
        console.log('User:', parsed.user);
      }
    } catch (e) {
      console.log('Could not parse response');
    }
  });
});

req.on('error', (error) => {
  console.error('Request error:', error);
});

req.write(data);
req.end();