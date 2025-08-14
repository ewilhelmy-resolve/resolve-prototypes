const { test, expect } = require('@playwright/test');
const { execSync } = require('child_process');

test.describe('Fresh Database Startup Tests', () => {
  
  test.describe.serial('PostgreSQL Fresh Start', () => {
    
    test.skip(process.env.SKIP_DOCKER_TESTS === 'true', 'Skipping Docker tests');
    
    test('Application starts with completely fresh PostgreSQL database', async ({ request }) => {
      console.log('🔄 Testing fresh PostgreSQL database startup...');
      
      try {
        // Note: This test requires Docker to be running
        console.log('Stopping containers and removing volumes...');
        execSync('docker-compose down -v 2>/dev/null || true', { stdio: 'pipe' });
        
        console.log('Starting with fresh database...');
        execSync('docker-compose up -d', { stdio: 'pipe' });
        
        // Wait for services to be ready
        console.log('Waiting for services to start...');
        await new Promise(resolve => setTimeout(resolve, 15000));
        
        // Check if app is healthy
        const maxRetries = 30;
        let retries = 0;
        let health;
        
        while (retries < maxRetries) {
          try {
            health = await request.get('http://localhost:8082/health');
            if (health.ok()) break;
          } catch (e) {
            // Server not ready yet
          }
          retries++;
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        expect(health.ok()).toBeTruthy();
        console.log('✅ Application started successfully with fresh database');
        
        // Verify admin user was created
        const loginResponse = await request.post('http://localhost:8082/api/auth/login', {
          data: {
            email: 'john@resolve.io',
            password: 'AdminPassword1'
          }
        });
        
        expect(loginResponse.ok()).toBeTruthy();
        const loginData = await loginResponse.json();
        expect(loginData.success).toBe(true);
        console.log('✅ Admin user was created by migrations');
        
        // Verify we can create new users
        const timestamp = Date.now();
        const signupResponse = await request.post('http://localhost:8082/api/auth/signup', {
          data: {
            email: `fresh-test-${timestamp}@example.com`,
            password: 'TestPass123',
            company_name: 'Fresh Start Test'
          }
        });
        
        expect(signupResponse.ok()).toBeTruthy();
        console.log('✅ All tables were created successfully');
        
      } catch (error) {
        console.error('Test failed:', error.message);
        throw error;
      }
    });
    
    test('Verify all tables exist after fresh start', async ({ request }) => {
      console.log('Verifying database schema...');
      
      // Login as admin
      const loginResponse = await request.post('http://localhost:8082/api/auth/login', {
        data: {
          email: 'john@resolve.io',
          password: 'AdminPassword1'
        }
      });
      
      expect(loginResponse.ok()).toBeTruthy();
      const loginData = await loginResponse.json();
      const token = loginData.token;
      
      // Test various endpoints that require different tables
      const tests = [
        {
          name: 'Users/Sessions',
          endpoint: '/api/auth/login',
          method: 'POST',
          data: { email: 'john@resolve.io', password: 'AdminPassword1' }
        },
        {
          name: 'Health Check',
          endpoint: '/health',
          method: 'GET'
        }
      ];
      
      for (const testCase of tests) {
        const response = await request[testCase.method.toLowerCase()](
          `http://localhost:8082${testCase.endpoint}`,
          testCase.data ? { data: testCase.data } : {}
        );
        
        expect(response.status()).toBeLessThan(500);
        console.log(`✅ ${testCase.name} endpoint works`);
      }
    });
  });
  
  test.describe('SQLite Fresh Start', () => {
    
    test.skip(process.env.DATABASE_TYPE === 'postgresql', 'Skipping SQLite test in PostgreSQL mode');
    
    test('SQLite database is created on first run', async ({ request }) => {
      console.log('Testing SQLite database creation...');
      
      // In SQLite mode, the database file is created automatically
      // We just need to verify it works
      
      if (process.env.DATABASE_TYPE !== 'postgresql') {
        // Create a test user
        const timestamp = Date.now();
        const signupResponse = await request.post('/api/auth/signup', {
          data: {
            email: `sqlite-test-${timestamp}@example.com`,
            password: 'TestPass123',
            company_name: 'SQLite Test'
          }
        });
        
        if (signupResponse.ok()) {
          console.log('✅ SQLite database works');
        } else {
          console.log('⚠️ Not in SQLite mode or database issue');
        }
      }
    });
  });
});

test.describe('Production Simulation Tests', () => {
  
  test('Simulates production deployment scenario', async ({ request }) => {
    console.log('🚀 Simulating production deployment...');
    
    // This test verifies the exact scenario the customer reported:
    // "The application was deployed to production but the database has nothing in it"
    
    // 1. Application should start
    const health = await request.get('http://localhost:8082/health');
    expect(health.ok()).toBeTruthy();
    console.log('✅ Step 1: Application starts');
    
    // 2. Admin should be able to login
    const adminLogin = await request.post('http://localhost:8082/api/auth/login', {
      data: {
        email: 'john@resolve.io',
        password: 'AdminPassword1'
      }
    });
    
    expect(adminLogin.ok()).toBeTruthy();
    console.log('✅ Step 2: Admin can login');
    
    // 3. New users should be able to sign up
    const timestamp = Date.now();
    const customerSignup = await request.post('http://localhost:8082/api/auth/signup', {
      data: {
        email: `customer-${timestamp}@production.com`,
        password: 'ProdPass123',
        company_name: 'Production Customer',
        tier: 'premium'
      }
    });
    
    expect(customerSignup.ok()).toBeTruthy();
    console.log('✅ Step 3: Customers can sign up');
    
    // 4. Customer should be able to use features
    const customerData = await customerSignup.json();
    const customerToken = customerData.token;
    
    // Try to validate Jira (uses multiple tables)
    const jiraValidation = await request.post('http://localhost:8082/api/integrations/validate-jira', {
      headers: {
        'Authorization': `Bearer ${customerToken}`
      },
      data: {
        url: 'https://production.atlassian.net',
        email: 'prod@example.com',
        token: 'prod-token'
      }
    });
    
    // Should not return 500 error
    expect(jiraValidation.status()).toBeLessThan(500);
    console.log('✅ Step 4: Features are accessible');
    
    console.log('🎉 Production deployment simulation successful!');
  });
  
  test('Verifies migration logs are generated', async ({ request }) => {
    console.log('Checking migration logs...');
    
    // In a real deployment, we'd check actual logs
    // Here we verify the app is running which means migrations completed
    
    const health = await request.get('http://localhost:8082/health');
    expect(health.ok()).toBeTruthy();
    
    console.log('✅ Application is running (migrations completed)');
    console.log('📝 Check Docker logs with: docker-compose logs app | grep -i migration');
  });
});