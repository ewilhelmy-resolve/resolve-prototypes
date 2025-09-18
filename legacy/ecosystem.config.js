module.exports = {
  apps: [{
    // Application configuration
    name: 'resolve-app',
    script: './server.js',
    
    // Single instance mode to fix session management issue
    // TODO: Replace with Redis-based session store for proper scaling
    instances: 1,
    exec_mode: 'fork',
    
    // Memory management
    max_memory_restart: '1G',
    
    // Environment variables
    env: {
      NODE_ENV: 'development',
      PORT: 5000,
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 5000,
    },
    
    // Logging
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_file: './logs/pm2-combined.log',
    time: true,
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    
    // Log rotation
    log_type: 'json',
    
    // Watch & restart
    watch: false,
    autorestart: true,
    
    // Advanced features
    min_uptime: '10s',
    listen_timeout: 3000,
    kill_timeout: 5000,
    
    // Zero-downtime reload
    wait_ready: true,
    
    // Health check via HTTP
    health_check_grace_period: 3000,
    
    // Post-deploy actions
    post_deploy: 'npm install --production && pm2 reload ecosystem.config.js --env production',
    
    // Additional PM2 options
    ignore_watch: ['node_modules', 'logs', 'uploads', 'tests'],
    
    // Environment-specific settings
    node_args: '--max-old-space-size=2048',
  }],

  // Deployment configuration (optional - for PM2 deploy)
  deploy: {
    production: {
      user: 'nodejs',
      host: ['server1.resolve.io', 'server2.resolve.io', 'server3.resolve.io'],
      ref: 'origin/main',
      repo: 'git@github.com:resolve-io/resolve-onboarding.git',
      path: '/var/www/resolve-onboarding',
      'post-deploy': 'npm ci --production && pm2 reload ecosystem.config.js --env production',
      env: {
        NODE_ENV: 'production',
      },
    },
    staging: {
      user: 'nodejs',
      host: 'staging.resolve.io',
      ref: 'origin/develop',
      repo: 'git@github.com:resolve-io/resolve-onboarding.git',
      path: '/var/www/resolve-onboarding-staging',
      'post-deploy': 'npm ci --production && pm2 reload ecosystem.config.js --env staging',
      env: {
        NODE_ENV: 'staging',
      },
    },
  },
};