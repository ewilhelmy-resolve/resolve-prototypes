# Load Balancer Setup for Resolve Onboarding

## Overview

This document provides configuration examples and setup instructions for load balancing the Resolve Onboarding application across multiple server instances.

## Nginx Load Balancer Configuration

### Basic Configuration

Create `/etc/nginx/sites-available/resolve-onboarding`:

```nginx
# Upstream configuration for Resolve app servers
upstream resolve_app {
    # Use least connections load balancing
    least_conn;
    
    # Application server instances
    server app1.resolve.io:5000 max_fails=3 fail_timeout=30s weight=1;
    server app2.resolve.io:5000 max_fails=3 fail_timeout=30s weight=1;
    server app3.resolve.io:5000 max_fails=3 fail_timeout=30s weight=1;
    
    # Backup server (optional)
    server backup.resolve.io:5000 backup;
    
    # Health check configuration
    keepalive 32;
}

# Main server block
server {
    listen 80;
    listen [::]:80;
    server_name resolve.io www.resolve.io;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

# HTTPS server block
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name resolve.io www.resolve.io;
    
    # SSL Configuration
    ssl_certificate /etc/ssl/certs/resolve.io.crt;
    ssl_certificate_key /etc/ssl/private/resolve.io.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header Referrer-Policy strict-origin-when-cross-origin always;
    
    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=auth:10m rate=5r/s;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    # Main location block
    location / {
        # Apply rate limiting to auth endpoints
        if ($request_uri ~ ^/(auth|login|signup)) {
            set $auth_limit 1;
        }
        if ($auth_limit) {
            limit_req zone=auth burst=10 nodelay;
        }
        
        # Apply general rate limiting
        limit_req zone=api burst=20 nodelay;
        
        # Proxy to application servers
        proxy_pass http://resolve_app;
        proxy_http_version 1.1;
        
        # Connection settings
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_cache_bypass $http_upgrade;
        
        # Headers for the backend
        proxy_set_header Host $http_host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port $server_port;
        
        # Timeouts
        proxy_connect_timeout 5s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
        
        # Buffer settings
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
        proxy_busy_buffers_size 8k;
        
        # For sticky sessions (if needed)
        # ip_hash;
    }
    
    # Static files handling (if serving static content)
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        add_header Vary Accept-Encoding;
        
        # Try local files first, then proxy to app
        try_files $uri @proxy;
    }
    
    # Fallback for static files
    location @proxy {
        proxy_pass http://resolve_app;
        proxy_set_header Host $http_host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Health check endpoint
    location /nginx-health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
    
    # Block common attack patterns
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
    
    # Error pages
    error_page 502 503 504 /50x.html;
    location = /50x.html {
        root /usr/share/nginx/html;
        internal;
    }
}
```

### Advanced Configuration with Caching

```nginx
# Cache configuration
proxy_cache_path /var/cache/nginx/resolve levels=1:2 keys_zone=resolve_cache:10m max_size=100m inactive=60m use_temp_path=off;

# Enhanced server block with caching
server {
    # ... SSL configuration above ...
    
    # API responses that can be cached briefly
    location ~* ^/api/(dashboard|knowledge) {
        proxy_cache resolve_cache;
        proxy_cache_valid 200 5m;
        proxy_cache_valid 404 1m;
        proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
        proxy_cache_background_update on;
        proxy_cache_lock on;
        
        add_header X-Cache-Status $upstream_cache_status;
        
        proxy_pass http://resolve_app;
        # ... other proxy settings ...
    }
    
    # Never cache auth endpoints
    location ~* ^/(auth|login|signup) {
        proxy_cache off;
        proxy_no_cache 1;
        proxy_cache_bypass 1;
        
        proxy_pass http://resolve_app;
        # ... other proxy settings ...
    }
}
```

## HAProxy Configuration Alternative

If you prefer HAProxy, here's an equivalent configuration:

```haproxy
# /etc/haproxy/haproxy.cfg

global
    daemon
    log stdout len 65536 local0 info
    chroot /var/lib/haproxy
    stats socket /run/haproxy/admin.sock mode 660 level admin
    stats timeout 30s
    user haproxy
    group haproxy
    
    # SSL
    ssl-default-bind-ciphers ECDH+AESGCM:DH+AESGCM:ECDH+AES256:DH+AES256:!aNULL:!MD5:!DSS
    ssl-default-bind-options ssl-min-ver TLSv1.2 no-tls-tickets

defaults
    mode http
    log global
    option httplog
    option dontlognull
    option log-health-checks
    option forwardfor except 127.0.0.0/8
    option redispatch
    retries 3
    timeout connect 5000ms
    timeout client 30000ms
    timeout server 30000ms
    errorfile 400 /etc/haproxy/errors/400.http
    errorfile 403 /etc/haproxy/errors/403.http
    errorfile 408 /etc/haproxy/errors/408.http
    errorfile 500 /etc/haproxy/errors/500.http
    errorfile 502 /etc/haproxy/errors/502.http
    errorfile 503 /etc/haproxy/errors/503.http
    errorfile 504 /etc/haproxy/errors/504.http

# Frontend configuration
frontend resolve_frontend
    bind *:80
    bind *:443 ssl crt /etc/ssl/private/resolve.io.pem
    
    # Security headers
    http-response set-header Strict-Transport-Security max-age=31536000;\ includeSubDomains
    http-response set-header X-Frame-Options DENY
    http-response set-header X-Content-Type-Options nosniff
    
    # Rate limiting (requires HAProxy 2.4+)
    stick-table type ip size 100k expire 30s store http_req_rate(10s)
    http-request track-sc0 src
    http-request deny if { sc_http_req_rate(0) gt 20 }
    
    # Auth endpoint rate limiting
    acl is_auth path_beg /auth /login /signup
    http-request deny if is_auth { sc_http_req_rate(0) gt 10 }
    
    # Redirect HTTP to HTTPS
    redirect scheme https code 301 if !{ ssl_fc }
    
    default_backend resolve_app

# Backend configuration
backend resolve_app
    balance leastconn
    option httpchk GET /health
    
    # Health check configuration
    http-check connect
    http-check send meth GET uri /health
    http-check expect status 200
    
    # Server definitions
    server app1 app1.resolve.io:5000 check inter 10s rise 2 fall 3 maxconn 100
    server app2 app2.resolve.io:5000 check inter 10s rise 2 fall 3 maxconn 100
    server app3 app3.resolve.io:5000 check inter 10s rise 2 fall 3 maxconn 100
    server backup backup.resolve.io:5000 check inter 30s backup

# Statistics page
frontend stats
    bind *:8080
    stats enable
    stats uri /stats
    stats refresh 30s
    stats admin if TRUE
```

## Docker Compose with Load Balancer

For local testing or Docker-based deployments:

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  app1:
    build:
      context: .
      target: production
    environment:
      - NODE_ENV=production
      - PORT=5000
    volumes:
      - ./logs:/app/logs
    depends_on:
      - postgres
  
  app2:
    build:
      context: .
      target: production
    environment:
      - NODE_ENV=production
      - PORT=5000
    volumes:
      - ./logs:/app/logs
    depends_on:
      - postgres
  
  app3:
    build:
      context: .
      target: production
    environment:
      - NODE_ENV=production
      - PORT=5000
    volumes:
      - ./logs:/app/logs
    depends_on:
      - postgres
  
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/sites-enabled:/etc/nginx/sites-enabled
      - ./ssl:/etc/ssl/certs
    depends_on:
      - app1
      - app2
      - app3
  
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: resolve
      POSTGRES_USER: resolve
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

## Session Persistence Considerations

### Sticky Sessions (Not Recommended)

While possible, sticky sessions are not recommended for this application because:

1. **Session Storage**: The application uses database-backed sessions
2. **Scalability**: Reduces load balancing effectiveness
3. **Fault Tolerance**: Server failures affect user sessions

### Database-Backed Sessions (Recommended)

The application already implements database-backed sessions, which allows:

- **Load Balancer Freedom**: Any server can handle any request
- **Fault Tolerance**: Server failures don't affect user sessions
- **Easy Scaling**: Add/remove servers without session concerns

## Health Check Implementation

Ensure your application has a proper health check endpoint. Add this to your server if not already present:

```javascript
// In server.js or routes
app.get('/health', async (req, res) => {
  try {
    // Check database connection
    await pool.query('SELECT 1');
    
    // Check critical services
    const checks = {
      database: true,
      memory: process.memoryUsage().heapUsed < 500 * 1024 * 1024, // < 500MB
      uptime: process.uptime() > 10, // Running > 10 seconds
      timestamp: new Date().toISOString()
    };
    
    const healthy = Object.values(checks).every(check => check === true || typeof check === 'string');
    
    res.status(healthy ? 200 : 503).json({
      status: healthy ? 'healthy' : 'unhealthy',
      checks
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});
```

## Deployment Steps

1. **Setup Load Balancer Server**:
   ```bash
   # Install Nginx
   sudo apt update
   sudo apt install nginx
   
   # Copy configuration
   sudo cp resolve-onboarding /etc/nginx/sites-available/
   sudo ln -s /etc/nginx/sites-available/resolve-onboarding /etc/nginx/sites-enabled/
   
   # Test configuration
   sudo nginx -t
   
   # Start services
   sudo systemctl enable nginx
   sudo systemctl start nginx
   ```

2. **Deploy Application Servers**:
   ```bash
   # On each app server
   git clone https://github.com/resolve-io/resolve-onboarding.git
   cd resolve-onboarding
   npm install --production
   npm run migrate:production
   npm run prod
   ```

3. **Monitor and Test**:
   ```bash
   # Check load balancer status
   curl -I http://resolve.io/nginx-health
   
   # Check application health
   curl -s http://resolve.io/health | jq
   
   # Monitor logs
   tail -f /var/log/nginx/access.log
   pm2 logs resolve-app
   ```

## Monitoring and Alerts

### Nginx Monitoring

```bash
# Add to crontab for basic monitoring
*/5 * * * * curl -f http://localhost/nginx-health || echo "Nginx down" | mail -s "Alert" admin@resolve.io
```

### Application Monitoring

```javascript
// Add to ecosystem.config.js for PM2 monitoring
module.exports = {
  apps: [{
    // ... existing config
    monitoring: {
      http: true,
      https: false,
      port: 9615
    }
  }]
};
```

## Troubleshooting

### Common Issues

1. **502 Bad Gateway**: Check if application servers are running
2. **504 Gateway Timeout**: Increase proxy timeout values
3. **Too Many Connections**: Adjust upstream server limits
4. **SSL Issues**: Verify certificate paths and permissions

### Debug Commands

```bash
# Check Nginx configuration
nginx -t

# Check upstream server connectivity
curl -I http://app1.resolve.io:5000/health

# View error logs
tail -f /var/log/nginx/error.log

# Check PM2 status on app servers
pm2 status
pm2 logs resolve-app --lines 100
```

This load balancer setup provides high availability, SSL termination, rate limiting, and proper health checking for the Resolve Onboarding application.