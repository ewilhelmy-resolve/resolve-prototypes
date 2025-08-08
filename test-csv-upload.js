const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const http = require('http');

async function testCSVUpload() {
  // Step 1: Login first
  console.log('1. Logging in...');
  const loginData = JSON.stringify({
    email: 'john@resolve.io',
    password: '!Password1'
  });

  const loginOptions = {
    hostname: 'localhost',
    port: 8082,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': loginData.length
    }
  };

  const token = await new Promise((resolve, reject) => {
    const req = http.request(loginOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.success && parsed.token) {
            console.log('✅ Login successful');
            resolve(parsed.token);
          } else {
            reject('Login failed');
          }
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.write(loginData);
    req.end();
  });

  // Step 2: Upload CSV
  console.log('2. Uploading CSV...');
  const form = new FormData();
  const csvPath = path.join(__dirname, 'sample-tickets.csv');
  
  if (!fs.existsSync(csvPath)) {
    console.log('❌ CSV file not found:', csvPath);
    return;
  }

  form.append('csvFile', fs.createReadStream(csvPath));

  const uploadOptions = {
    hostname: 'localhost',
    port: 8082,
    path: '/api/tickets/upload',
    method: 'POST',
    headers: {
      ...form.getHeaders(),
      'Authorization': `Bearer ${token}`
    }
  };

  const uploadReq = http.request(uploadOptions, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
      console.log('Response status:', res.statusCode);
      console.log('Response:', data);
      
      try {
        const parsed = JSON.parse(data);
        if (res.statusCode === 200) {
          console.log('✅ CSV uploaded successfully');
          if (parsed.tickets) {
            console.log(`✅ Processed ${parsed.tickets.length} tickets`);
          }
        } else {
          console.log('❌ Upload failed');
        }
      } catch (e) {
        console.log('Raw response:', data);
      }
    });
  });

  uploadReq.on('error', (error) => {
    console.error('Upload error:', error);
  });

  form.pipe(uploadReq);
}

testCSVUpload().catch(console.error);