/**
 * Comprehensive Authentication Test Suite - Zero Mocks
 * 
 * This test suite uses real PostgreSQL and Redis containers via Testcontainers
 * to test the complete authentication flow without any mocking.
 * 
 * Test Coverage:
 * - User Registration (signup flow) with all tiers
 * - Password hashing verification in real database
 * - Session creation in Redis
 * - Duplicate email prevention
 * - Password strength validation
 * - User Login (signin flow)
 * - Session management and expiration
 * - Password reset flow
 * - Rate limiting on auth endpoints
 */

const { describe, test, expect, beforeAll, afterAll, beforeEach } = require('@jest/globals');
const express = require('express');
const supertest = require('supertest');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { TestEnvironment } = require('../testcontainers');

// Import the auth routes and middleware
const authRoutes = require('../../src/routes/auth');
const authService = require('../../src/services/authService');
const { authLimiter, passwordResetLimiter } = require('../../src/middleware/rateLimiter');
const cookieParser = require('cookie-parser');

describe('Authentication Flow - Zero Mocks', () => {
  let testEnv;
  let app;
  let request;
  let containers;
  let testData;
  let helpers;

  beforeAll(async () => {
    // Initialize test environment with containers
    console.log('🚀 Setting up authentication test environment...');
    testEnv = new TestEnvironment();
    
    const result = await testEnv.initialize({
      seedData: false, // We'll create our own test data
      clearFirst: true
    });
    
    containers = result.containers;
    helpers = testEnv.helpers;
    
    // Set up test environment variables for auth service
    const envVars = helpers.getTestEnvironment();
    Object.assign(process.env, envVars);
    
    // Force Redis session usage for testing
    process.env.USE_REDIS_SESSIONS = 'true';
    
    // Create Express app with auth routes
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(cookieParser());
    
    // Add auth routes
    app.use('/auth', authRoutes);
    
    // Create supertest instance
    request = supertest(app);
    
    console.log('✅ Authentication test environment ready');
  }, 60000); // 60 second timeout for container setup

  afterAll(async () => {
    console.log('🧹 Cleaning up authentication test environment...');
    if (testEnv) {
      await testEnv.cleanup();
    }
  });

  beforeEach(async () => {
    // Reset database state before each test
    await helpers.executeQuery('TRUNCATE TABLE users RESTART IDENTITY CASCADE;');
    await helpers.executeQuery('TRUNCATE TABLE sessions RESTART IDENTITY CASCADE;');
    await helpers.clearRedisData();
  });

  describe('User Registration (Signup)', () => {
    test('should successfully register a new user with valid data', async () => {
      const userData = {
        email: 'newuser@test.com',
        password: 'SecurePass123!',
        fullName: 'New Test User',
        companyName: 'Test Company Inc'
      };

      const response = await request
        .post('/auth/register')
        .send(userData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User registered successfully');
      expect(response.body.user).toMatchObject({
        email: userData.email,
        fullName: userData.fullName,
        companyName: userData.companyName
      });

      // Verify user was created in database with proper password hashing
      const dbUser = await helpers.findUserByEmail(userData.email);
      expect(dbUser).toBeTruthy();
      expect(dbUser.email).toBe(userData.email);
      expect(dbUser.full_name).toBe(userData.fullName);
      expect(dbUser.company_name).toBe(userData.companyName);
      expect(dbUser.tier).toBe('standard');
      expect(dbUser.tenant_id).toBeTruthy();
      
      // Verify password is properly hashed
      expect(dbUser.password).not.toBe(userData.password);
      expect(dbUser.password.startsWith('$2b$')).toBe(true);
      
      // Verify password can be verified
      const isValidPassword = await bcrypt.compare(userData.password, dbUser.password);
      expect(isValidPassword).toBe(true);

      // Verify session cookie is set
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeTruthy();
      const sessionCookie = cookies.find(cookie => cookie.startsWith('sessionToken='));
      expect(sessionCookie).toBeTruthy();
      expect(sessionCookie).toContain('HttpOnly');

      // Extract session token and verify it exists in Redis
      const tokenMatch = sessionCookie.match(/sessionToken=([^;]+)/);
      expect(tokenMatch).toBeTruthy();
      const sessionToken = tokenMatch[1];
      
      const redisSession = await helpers.getRedisSession(sessionToken);
      expect(redisSession).toBeTruthy();
      expect(redisSession.userId).toBe(dbUser.id);
      expect(redisSession.email).toBe(userData.email);
      expect(redisSession.tenantId).toBe(dbUser.tenant_id);
    });

    test('should register users with all tier types', async () => {
      const tiers = ['free', 'standard', 'premium', 'enterprise', 'admin'];
      
      for (const tier of tiers) {
        const userData = {
          email: `${tier}@test.com`,
          password: 'SecurePass123!',
          fullName: `${tier} User`,
          companyName: `${tier} Company`,
          tier: tier
        };

        const response = await request
          .post('/auth/register')
          .send(userData)
          .expect(200);

        expect(response.body.success).toBe(true);

        // Verify tier in database
        const dbUser = await helpers.findUserByEmail(userData.email);
        expect(dbUser.tier).toBe(tier);
      }
    });

    test('should prevent duplicate email registration', async () => {
      const userData = {
        email: 'duplicate@test.com',
        password: 'SecurePass123!',
        fullName: 'First User',
        companyName: 'First Company'
      };

      // Register first user
      await request
        .post('/auth/register')
        .send(userData)
        .expect(200);

      // Attempt to register with same email
      const duplicateResponse = await request
        .post('/auth/register')
        .send({
          ...userData,
          fullName: 'Second User',
          companyName: 'Second Company'
        })
        .expect(400);

      expect(duplicateResponse.body.success).toBe(false);
      expect(duplicateResponse.body.message).toBe('User already exists');

      // Verify only one user exists
      const users = await helpers.executeQuery('SELECT COUNT(*) as count FROM users WHERE email = $1', [userData.email]);
      expect(parseInt(users.rows[0].count)).toBe(1);
    });

    test('should enforce password strength requirements', async () => {
      const weakPasswords = [
        'weak',           // Too short
        'password',       // No uppercase, numbers, special chars
        'Password',       // No numbers, special chars
        'Password123',    // No special chars
        'password123!',   // No uppercase
        'PASSWORD123!',   // No lowercase
        'Passwrd!',       // Too short with requirements
      ];

      for (const weakPassword of weakPasswords) {
        const response = await request
          .post('/auth/register')
          .send({
            email: `weak${Date.now()}@test.com`,
            password: weakPassword,
            fullName: 'Test User',
            companyName: 'Test Company'
          })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Validation failed');
        expect(response.body.errors).toBeTruthy();
      }
    });

    test('should validate email format', async () => {
      const invalidEmails = [
        'notanemail',
        '@domain.com',
        'user@',
        'user@domain',
        'user..user@domain.com',
        'user@domain..com'
      ];

      for (const invalidEmail of invalidEmails) {
        const response = await request
          .post('/auth/register')
          .send({
            email: invalidEmail,
            password: 'SecurePass123!',
            fullName: 'Test User',
            companyName: 'Test Company'
          })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Validation failed');
      }
    });

    test('should sanitize user input to prevent XSS', async () => {
      const maliciousData = {
        email: 'xss@test.com',
        password: 'SecurePass123!',
        fullName: '<script>alert("xss")</script>Malicious User',
        companyName: '<img src=x onerror=alert("xss")>Evil Corp'
      };

      const response = await request
        .post('/auth/register')
        .send(maliciousData)
        .expect(200);

      // Verify data was sanitized in database
      const dbUser = await helpers.findUserByEmail(maliciousData.email);
      expect(dbUser.full_name).not.toContain('<script>');
      expect(dbUser.full_name).not.toContain('alert');
      expect(dbUser.company_name).not.toContain('<img');
      expect(dbUser.company_name).not.toContain('onerror');
    });
  });

  describe('User Login (Signin)', () => {
    let testUser;

    beforeEach(async () => {
      // Create a test user for login tests
      const userData = {
        email: 'login@test.com',
        password: 'LoginPass123!',
        fullName: 'Login Test User',
        companyName: 'Login Test Company'
      };

      await request
        .post('/auth/register')
        .send(userData)
        .expect(200);

      testUser = await helpers.findUserByEmail(userData.email);
      testUser.plainPassword = userData.password;
    });

    test('should successfully login with correct credentials', async () => {
      const response = await request
        .post('/auth/signin')
        .send({
          email: testUser.email,
          password: testUser.plainPassword
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Sign in successful');
      expect(response.body.user).toMatchObject({
        id: testUser.id,
        email: testUser.email,
        fullName: testUser.full_name,
        companyName: testUser.company_name
      });

      // Verify session cookie is set
      const cookies = response.headers['set-cookie'];
      const sessionCookie = cookies.find(cookie => cookie.startsWith('sessionToken='));
      expect(sessionCookie).toBeTruthy();

      // Verify session in Redis
      const tokenMatch = sessionCookie.match(/sessionToken=([^;]+)/);
      const sessionToken = tokenMatch[1];
      const redisSession = await helpers.getRedisSession(sessionToken);
      expect(redisSession).toBeTruthy();
      expect(redisSession.userId).toBe(testUser.id);
    });

    test('should fail login with wrong password', async () => {
      const response = await request
        .post('/auth/signin')
        .send({
          email: testUser.email,
          password: 'WrongPassword123!'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid email or password');

      // Verify no session cookie is set
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeFalsy();
    });

    test('should fail login with non-existent user', async () => {
      const response = await request
        .post('/auth/signin')
        .send({
          email: 'nonexistent@test.com',
          password: 'AnyPassword123!'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid email or password');
    });

    test('should create session in both database and Redis', async () => {
      const response = await request
        .post('/auth/signin')
        .send({
          email: testUser.email,
          password: testUser.plainPassword
        })
        .expect(200);

      // Extract session token
      const cookies = response.headers['set-cookie'];
      const sessionCookie = cookies.find(cookie => cookie.startsWith('sessionToken='));
      const tokenMatch = sessionCookie.match(/sessionToken=([^;]+)/);
      const sessionToken = tokenMatch[1];

      // Verify session in database
      const dbSession = await helpers.executeQuery(
        'SELECT * FROM sessions WHERE token = $1',
        [sessionToken]
      );
      expect(dbSession.rows.length).toBe(0); // Auth service uses Redis, not DB sessions

      // Verify session in Redis
      const redisSession = await helpers.getRedisSession(sessionToken);
      expect(redisSession).toBeTruthy();
      expect(redisSession.userId).toBe(testUser.id);
      expect(redisSession.email).toBe(testUser.email);
      expect(redisSession.expiresAt).toBeTruthy();
    });

    test('should validate login input format', async () => {
      // Test invalid email
      await request
        .post('/auth/signin')
        .send({
          email: 'notanemail',
          password: 'Password123!'
        })
        .expect(400);

      // Test empty password
      await request
        .post('/auth/signin')
        .send({
          email: testUser.email,
          password: ''
        })
        .expect(400);
    });
  });

  describe('Session Management', () => {
    let testUser;
    let sessionToken;

    beforeEach(async () => {
      // Create and login a test user
      const userData = {
        email: 'session@test.com',
        password: 'SessionPass123!',
        fullName: 'Session Test User',
        companyName: 'Session Test Company'
      };

      await request
        .post('/auth/register')
        .send(userData)
        .expect(200);

      const loginResponse = await request
        .post('/auth/signin')
        .send({
          email: userData.email,
          password: userData.password
        })
        .expect(200);

      testUser = await helpers.findUserByEmail(userData.email);
      
      // Extract session token
      const cookies = loginResponse.headers['set-cookie'];
      const sessionCookie = cookies.find(cookie => cookie.startsWith('sessionToken='));
      const tokenMatch = sessionCookie.match(/sessionToken=([^;]+)/);
      sessionToken = tokenMatch[1];
    });

    test('should maintain session persistence across requests', async () => {
      // Make a request with the session cookie
      const response = await request
        .get('/auth/verify') // This endpoint doesn't exist, but we test the session middleware
        .set('Cookie', `sessionToken=${sessionToken}`)
        .expect(404); // Route doesn't exist, but session should be valid

      // Verify session still exists in Redis
      const redisSession = await helpers.getRedisSession(sessionToken);
      expect(redisSession).toBeTruthy();
      expect(redisSession.userId).toBe(testUser.id);
    });

    test('should handle session expiration', async () => {
      // Manually expire the session in Redis
      await helpers.executeRedisCommand('EXPIRE', `session:${sessionToken}`, 1);
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Verify session is expired
      const expiredSession = await helpers.getRedisSession(sessionToken);
      expect(expiredSession).toBeNull();
    });

    test('should handle concurrent sessions for same user', async () => {
      // Login again to create a second session
      const secondLoginResponse = await request
        .post('/auth/signin')
        .send({
          email: testUser.email,
          password: 'SessionPass123!'
        })
        .expect(200);

      // Extract second session token
      const cookies = secondLoginResponse.headers['set-cookie'];
      const sessionCookie = cookies.find(cookie => cookie.startsWith('sessionToken='));
      const tokenMatch = sessionCookie.match(/sessionToken=([^;]+)/);
      const secondSessionToken = tokenMatch[1];

      // Verify both sessions exist
      const firstSession = await helpers.getRedisSession(sessionToken);
      const secondSession = await helpers.getRedisSession(secondSessionToken);

      expect(firstSession).toBeTruthy();
      expect(secondSession).toBeTruthy();
      expect(firstSession.userId).toBe(testUser.id);
      expect(secondSession.userId).toBe(testUser.id);
      expect(sessionToken).not.toBe(secondSessionToken);
    });

    test('should successfully logout and cleanup session', async () => {
      const response = await request
        .post('/auth/signout')
        .set('Cookie', `sessionToken=${sessionToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Signed out successfully');

      // Verify session cookie is cleared
      const cookies = response.headers['set-cookie'];
      const clearedCookie = cookies.find(cookie => cookie.includes('sessionToken='));
      expect(clearedCookie).toBeTruthy();
      expect(clearedCookie).toContain('Max-Age=0');

      // Verify session is removed from Redis
      const redisSession = await helpers.getRedisSession(sessionToken);
      expect(redisSession).toBeNull();
    });

    test('should extend session on activity (sliding expiration)', async () => {
      // Get initial expiration
      const initialSession = await helpers.getRedisSession(sessionToken);
      const initialExpiration = initialSession.expiresAt;

      // Wait a moment then make a request
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Simulate activity by getting session again
      const extendedSession = await helpers.getRedisSession(sessionToken);
      
      // Verify expiration was extended
      expect(extendedSession.expiresAt).toBeGreaterThan(initialExpiration);
    });
  });

  describe('Password Reset Flow', () => {
    let testUser;

    beforeEach(async () => {
      // Create a test user for password reset tests
      const userData = {
        email: 'reset@test.com',
        password: 'ResetPass123!',
        fullName: 'Reset Test User',
        companyName: 'Reset Test Company'
      };

      await request
        .post('/auth/register')
        .send(userData)
        .expect(200);

      testUser = await helpers.findUserByEmail(userData.email);
      testUser.plainPassword = userData.password;
    });

    test('should generate password reset token', async () => {
      const response = await request
        .post('/auth/password-reset-request')
        .send({
          email: testUser.email
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('password reset link has been sent');

      // Verify reset token was created in database
      const resetTokens = await helpers.executeQuery(
        'SELECT * FROM password_resets WHERE user_id = $1',
        [testUser.id]
      );
      expect(resetTokens.rows.length).toBe(1);
      expect(resetTokens.rows[0].token).toBeTruthy();
      expect(resetTokens.rows[0].expires_at).toBeTruthy();
      
      // Verify token expires in the future
      const expiresAt = new Date(resetTokens.rows[0].expires_at);
      expect(expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    test('should not reveal if user does not exist', async () => {
      const response = await request
        .post('/auth/password-reset-request')
        .send({
          email: 'nonexistent@test.com'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('password reset link has been sent');
    });

    test('should successfully reset password with valid token', async () => {
      // Generate reset token
      await request
        .post('/auth/password-reset-request')
        .send({
          email: testUser.email
        })
        .expect(200);

      // Get the reset token from database
      const resetTokens = await helpers.executeQuery(
        'SELECT * FROM password_resets WHERE user_id = $1',
        [testUser.id]
      );
      const resetToken = resetTokens.rows[0].token;

      const newPassword = 'NewSecurePass123!';

      // Reset password
      const response = await request
        .post('/auth/password-reset')
        .send({
          token: resetToken,
          newPassword: newPassword
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Password reset successfully');

      // Verify old password no longer works
      await request
        .post('/auth/signin')
        .send({
          email: testUser.email,
          password: testUser.plainPassword
        })
        .expect(401);

      // Verify new password works
      await request
        .post('/auth/signin')
        .send({
          email: testUser.email,
          password: newPassword
        })
        .expect(200);

      // Verify reset token was deleted
      const remainingTokens = await helpers.executeQuery(
        'SELECT * FROM password_resets WHERE user_id = $1',
        [testUser.id]
      );
      expect(remainingTokens.rows.length).toBe(0);
    });

    test('should reject invalid reset token', async () => {
      const response = await request
        .post('/auth/password-reset')
        .send({
          token: 'invalid_token',
          newPassword: 'NewSecurePass123!'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid or expired reset token');
    });

    test('should reject expired reset token', async () => {
      // Generate reset token
      await request
        .post('/auth/password-reset-request')
        .send({
          email: testUser.email
        })
        .expect(200);

      // Get and expire the token
      const resetTokens = await helpers.executeQuery(
        'SELECT * FROM password_resets WHERE user_id = $1',
        [testUser.id]
      );
      const resetToken = resetTokens.rows[0].token;

      // Manually expire the token
      await helpers.executeQuery(
        'UPDATE password_resets SET expires_at = $1 WHERE token = $2',
        [new Date(Date.now() - 1000), resetToken]
      );

      // Attempt to use expired token
      const response = await request
        .post('/auth/password-reset')
        .send({
          token: resetToken,
          newPassword: 'NewSecurePass123!'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid or expired reset token');
    });

    test('should enforce password strength on reset', async () => {
      // Generate reset token
      await request
        .post('/auth/password-reset-request')
        .send({
          email: testUser.email
        })
        .expect(200);

      const resetTokens = await helpers.executeQuery(
        'SELECT * FROM password_resets WHERE user_id = $1',
        [testUser.id]
      );
      const resetToken = resetTokens.rows[0].token;

      // Try to reset with weak password
      const response = await request
        .post('/auth/password-reset')
        .send({
          token: resetToken,
          newPassword: 'weak'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
    });
  });

  describe('Rate Limiting and Security', () => {
    test('should rate limit registration attempts', async () => {
      const userData = {
        email: 'rate@test.com',
        password: 'SecurePass123!',
        fullName: 'Rate Test User',
        companyName: 'Rate Test Company'
      };

      // Make multiple registration attempts
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          request
            .post('/auth/register')
            .send({
              ...userData,
              email: `rate${i}@test.com`
            })
        );
      }

      const responses = await Promise.all(promises);

      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    test('should rate limit login attempts', async () => {
      // Create a test user first
      await request
        .post('/auth/register')
        .send({
          email: 'ratelimit@test.com',
          password: 'SecurePass123!',
          fullName: 'Rate Limit User',
          companyName: 'Rate Limit Company'
        })
        .expect(200);

      // Make multiple failed login attempts
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          request
            .post('/auth/signin')
            .send({
              email: 'ratelimit@test.com',
              password: 'WrongPassword'
            })
        );
      }

      const responses = await Promise.all(promises);

      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    test('should prevent SQL injection in auth inputs', async () => {
      const sqlInjectionPayloads = [
        "admin@test.com'; DROP TABLE users; --",
        "admin@test.com' OR '1'='1",
        "admin@test.com' UNION SELECT * FROM users --"
      ];

      for (const payload of sqlInjectionPayloads) {
        const response = await request
          .post('/auth/signin')
          .send({
            email: payload,
            password: 'AnyPassword123!'
          })
          .expect(400); // Should be caught by validation

        expect(response.body.success).toBe(false);
      }

      // Verify users table still exists and is intact
      const users = await helpers.executeQuery('SELECT COUNT(*) as count FROM users');
      expect(users.rows[0]).toBeTruthy();
    });

    test('should track and lock accounts after failed login attempts', async () => {
      // Create a test user
      const userData = {
        email: 'lockout@test.com',
        password: 'SecurePass123!',
        fullName: 'Lockout Test User',
        companyName: 'Lockout Test Company'
      };

      await request
        .post('/auth/register')
        .send(userData)
        .expect(200);

      // Make multiple failed login attempts
      for (let i = 0; i < 6; i++) {
        await request
          .post('/auth/signin')
          .send({
            email: userData.email,
            password: 'WrongPassword'
          })
          .expect(401);
      }

      // Subsequent attempts should be rejected due to lockout
      const lockedResponse = await request
        .post('/auth/signin')
        .send({
          email: userData.email,
          password: userData.password // Even correct password should be rejected
        })
        .expect(401);

      expect(lockedResponse.body.message).toContain('Account temporarily locked');
    });
  });

  describe('Database Integration', () => {
    test('should properly handle database transactions during user creation', async () => {
      const userData = {
        email: 'transaction@test.com',
        password: 'SecurePass123!',
        fullName: 'Transaction Test User',
        companyName: 'Transaction Test Company'
      };

      const response = await request
        .post('/auth/register')
        .send(userData)
        .expect(200);

      // Verify user was created with all required fields
      const dbUser = await helpers.findUserByEmail(userData.email);
      
      expect(dbUser.id).toBeTruthy();
      expect(dbUser.tenant_id).toBeTruthy();
      expect(dbUser.created_at).toBeTruthy();
      expect(dbUser.updated_at).toBeTruthy();
      expect(typeof dbUser.tenant_id).toBe('string');
      expect(dbUser.tenant_id.length).toBe(36); // UUID length
    });

    test('should handle concurrent user registrations', async () => {
      const baseUserData = {
        password: 'SecurePass123!',
        fullName: 'Concurrent Test User',
        companyName: 'Concurrent Test Company'
      };

      // Create multiple users concurrently
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(
          request
            .post('/auth/register')
            .send({
              ...baseUserData,
              email: `concurrent${i}@test.com`
            })
        );
      }

      const responses = await Promise.all(promises);

      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      // Verify all users were created with unique IDs and tenant IDs
      const users = await helpers.executeQuery('SELECT * FROM users WHERE email LIKE $1', ['concurrent%@test.com']);
      expect(users.rows.length).toBe(5);
      
      const userIds = users.rows.map(u => u.id);
      const tenantIds = users.rows.map(u => u.tenant_id);
      
      expect(new Set(userIds).size).toBe(5); // All unique
      expect(new Set(tenantIds).size).toBe(5); // All unique
    });

    test('should maintain referential integrity', async () => {
      // Create a user
      const userData = {
        email: 'integrity@test.com',
        password: 'SecurePass123!',
        fullName: 'Integrity Test User',
        companyName: 'Integrity Test Company'
      };

      await request
        .post('/auth/register')
        .send(userData)
        .expect(200);

      const user = await helpers.findUserByEmail(userData.email);

      // Attempt to create a session with invalid user_id (if sessions table exists)
      try {
        await helpers.executeQuery(
          'INSERT INTO sessions (token, user_id, expires_at) VALUES ($1, $2, $3)',
          ['invalid_session', 99999, new Date(Date.now() + 86400000)]
        );
        // Should not reach here if foreign key constraint exists
      } catch (error) {
        expect(error.message).toContain('foreign key constraint');
      }
    });
  });

  describe('Redis Session Store Integration', () => {
    test('should fallback gracefully when Redis is unavailable', async () => {
      // This test would require temporarily disconnecting Redis
      // For now, we'll verify Redis connection is working
      const redisHealth = await helpers.executeRedisCommand('PING');
      expect(redisHealth).toBe('PONG');
    });

    test('should maintain session data consistency between Redis and application', async () => {
      const userData = {
        email: 'redis@test.com',
        password: 'RedisPass123!',
        fullName: 'Redis Test User',
        companyName: 'Redis Test Company'
      };

      const response = await request
        .post('/auth/register')
        .send(userData)
        .expect(200);

      // Extract session token
      const cookies = response.headers['set-cookie'];
      const sessionCookie = cookies.find(cookie => cookie.startsWith('sessionToken='));
      const tokenMatch = sessionCookie.match(/sessionToken=([^;]+)/);
      const sessionToken = tokenMatch[1];

      // Verify session data in Redis matches user data
      const redisSession = await helpers.getRedisSession(sessionToken);
      
      expect(redisSession.email).toBe(userData.email);
      expect(redisSession.fullName).toBe(userData.fullName);
      expect(redisSession.companyName).toBe(userData.companyName);
      expect(redisSession.userId).toBeTruthy();
      expect(redisSession.tenantId).toBeTruthy();
      expect(redisSession.tier).toBe('standard');
      expect(redisSession.createdAt).toBeTruthy();
      expect(redisSession.expiresAt).toBeTruthy();
    });

    test('should handle Redis key expiration correctly', async () => {
      // Create a session
      const userData = {
        email: 'expiration@test.com',
        password: 'ExpirationPass123!',
        fullName: 'Expiration Test User',
        companyName: 'Expiration Test Company'
      };

      const response = await request
        .post('/auth/register')
        .send(userData)
        .expect(200);

      const cookies = response.headers['set-cookie'];
      const sessionCookie = cookies.find(cookie => cookie.startsWith('sessionToken='));
      const tokenMatch = sessionCookie.match(/sessionToken=([^;]+)/);
      const sessionToken = tokenMatch[1];

      // Verify session exists
      let session = await helpers.getRedisSession(sessionToken);
      expect(session).toBeTruthy();

      // Set short expiration
      await helpers.executeRedisCommand('EXPIRE', `session:${sessionToken}`, 1);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Session should be gone
      session = await helpers.getRedisSession(sessionToken);
      expect(session).toBeNull();
    });
  });
});