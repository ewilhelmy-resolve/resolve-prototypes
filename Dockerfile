FROM node:18-alpine

# Install nginx, supervisor, and build dependencies for SQLite
RUN apk add --no-cache nginx supervisor python3 make g++

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy backend server and database module
COPY server-backend.js ./
COPY database.js ./

# Copy frontend files to nginx
COPY index.html /usr/share/nginx/html/
COPY jarvis.html /usr/share/nginx/html/
COPY jarvis-mock.html /usr/share/nginx/html/
COPY iframe-proxy.html /usr/share/nginx/html/
COPY test-styling.html /usr/share/nginx/html/
COPY context-demo.html /usr/share/nginx/html/
COPY logo.svg /usr/share/nginx/html/
COPY components /usr/share/nginx/html/components/
COPY styles /usr/share/nginx/html/styles/

# Create nginx config with reverse proxy
RUN echo 'server { \
    listen 80; \
    server_name localhost; \
    root /usr/share/nginx/html; \
    index index.html; \
    \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    \
    location /api/ { \
        proxy_pass http://127.0.0.1:3001; \
        proxy_http_version 1.1; \
        proxy_set_header Upgrade $http_upgrade; \
        proxy_set_header Connection "upgrade"; \
        proxy_set_header Host $host; \
        proxy_set_header X-Real-IP $remote_addr; \
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; \
        proxy_set_header X-Forwarded-Proto $scheme; \
    } \
}' > /etc/nginx/http.d/default.conf

# Create supervisor config with proper formatting
RUN printf '[supervisord]\n\
nodaemon=true\n\
\n\
[program:nginx]\n\
command=nginx -g "daemon off;"\n\
autostart=true\n\
autorestart=true\n\
stdout_logfile=/dev/stdout\n\
stdout_logfile_maxbytes=0\n\
stderr_logfile=/dev/stderr\n\
stderr_logfile_maxbytes=0\n\
\n\
[program:backend]\n\
command=node /app/server-backend.js\n\
directory=/app\n\
autostart=true\n\
autorestart=true\n\
environment=PORT="3001"\n\
stdout_logfile=/dev/stdout\n\
stdout_logfile_maxbytes=0\n\
stderr_logfile=/dev/stderr\n\
stderr_logfile_maxbytes=0\n' > /etc/supervisord.conf

# Expose port 80
EXPOSE 80

# Start both services
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]