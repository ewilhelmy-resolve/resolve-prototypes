# Local Testing with Docker

## Quick Start

### Using Docker Compose (Recommended)
```bash
# Start the container
docker-compose up -d

# View the site at http://localhost:8080

# Stop the container
docker-compose down
```

### Using Docker directly
```bash
# Build the image
docker build -t resolve-onboarding .

# Run the container
docker run -d -p 8080:80 --name resolve-onboarding resolve-onboarding

# View the site at http://localhost:8080

# Stop and remove the container
docker stop resolve-onboarding
docker rm resolve-onboarding
```

## Live Reload Development

The docker-compose.yml file includes volume mounting, so any changes you make to the HTML, CSS, or JS files will be reflected immediately when you refresh the browser.

## Troubleshooting

If port 8080 is already in use, you can change it in docker-compose.yml:
```yaml
ports:
  - "8081:80"  # Change 8081 to any available port
```