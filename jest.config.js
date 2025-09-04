module.exports = {
  // Test environment
  testEnvironment: 'node',
  
  // Test patterns
  testMatch: [
    '**/tests/no-mocks/**/*.test.js'
  ],
  
  // Coverage settings
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/database/01-init.sql',
    '!src/database/99-create-admin-user.sql'
  ],
  
  // Timeout for tests (important for container startup)
  testTimeout: 120000, // 2 minutes for container operations
  
  // Setup files
  setupFilesAfterEnv: [],
  
  // Module paths
  roots: ['<rootDir>'],
  modulePaths: ['<rootDir>'],
  
  // Verbose output
  verbose: true,
  
  // Detect open handles (important for testcontainers cleanup)
  detectOpenHandles: true,
  forceExit: true,
  
  // Transform settings
  transform: {},
  
  // Module file extensions
  moduleFileExtensions: ['js', 'json'],
  
  // Global setup/teardown
  globalSetup: undefined,
  globalTeardown: undefined,
  
  // Test runner specific settings
  maxWorkers: 1, // Run tests serially to avoid container conflicts
  
  // Error handling
  bail: false, // Continue running tests even if one fails
  
  // Output settings
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: './tests/test-results',
      outputName: 'auth-test-results.xml'
    }]
  ]
};