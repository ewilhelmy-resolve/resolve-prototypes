# pgvector Installation Saga - Complete Documentation

## Overview
This document chronicles the extensive troubleshooting process for installing pgvector on an AWS EC2 production server, after it worked perfectly in local development.

## The Problem
- **Local**: pgvector works perfectly with various Docker images
- **Production (EC2)**: Every pgvector Docker image fails with "extension 'vector' is not available"
- **Error**: `Could not open extension control file "/usr/local/share/postgresql/extension/vector.control"`

## Complete Timeline of Attempts

### 1. Initial State: `pgvector/pgvector:pg15`
- **Approach**: Used the "official" pgvector Docker image
- **Result**: "type 'vector' does not exist" error in production
- **Problem**: The image didn't actually have pgvector installed when pulled on EC2
- **Learning**: Docker images can behave differently on different architectures

### 2. Switch to `ankane/pgvector`
- **Commit**: `05fe40f` - "Fix pgvector by using ankane/pgvector image"
- **Reasoning**: Research suggested this was the "recommended" image
- **Result**: Still no pgvector in production - same error
- **Problem**: Extension files still missing on EC2

### 3. Force Rebuild with Fresh Volumes
- **Approach**: Multiple commits to remove volumes, force recreate containers
- **Commands tried**:
  - `docker-compose down -v`
  - `docker rmi` all cached images
  - Force pull fresh images
- **Result**: Still missing pgvector
- **Problem**: The issue wasn't cached data - the Docker images themselves don't have pgvector on EC2

### 4. Manual Installation from Source
- **Approach**: Added scripts to compile pgvector during deployment
- **Scripts created**:
  - `scripts/install-pgvector-in-container.sh`
  - `scripts/fix-pgvector-production.sh`
- **Result**: Failed - no build tools available
- **Problem**: Can't easily modify running containers in production

### 5. Custom Dockerfile.postgres
- **Approach**: Build our own PostgreSQL image with pgvector compiled from source
- **Implementation**:
  ```dockerfile
  FROM postgres:15
  RUN apt-get update && apt-get install -y build-essential...
  RUN git clone pgvector && make && make install
  ```
- **Result**: Works perfectly locally! But fails in production
- **Critical Discovery**: **Production doesn't have the Dockerfile** - deployment only pulls the app image from GitHub Container Registry, not source files!

### 6. Return to `pgvector/pgvector:pg15`
- **Approach**: Maybe the "official" image was fixed?
- **Result**: Still doesn't work on EC2
- **Problem**: Confirmed - image doesn't contain pgvector on production architecture

### 7. Specific Version Tag
- **Approach**: Use exact version `pgvector/pgvector:0.8.0-pg15`
- **Implementation**: Deploy docker-compose.yml directly via heredoc in GitHub Actions
- **Result**: Works locally (pgvector 0.8.0), fails on EC2 with same error
- **Problem**: Even specific versions don't have pgvector installed on EC2

### 8. Runtime Installation Attempt
- **Approach**: Use standard `postgres:15` + install pgvector after container starts
- **Implementation**: Install build tools and compile pgvector inside the running container
- **Challenge**: postgres:15 uses Alpine Linux (apk, not apt-get)
- **Result**: FAILED - Same clang-19 error, `make install` fails even though .so file is built
- **Error**: `make: clang-19: No such file or directory` when trying to install
- **Problem**: Even manual compilation in container fails due to LLVM bitcode generation

### 9. Custom Dockerfile with Build Workaround (Local Success)
- **Approach**: Build custom postgres image with pgvector, ignore LLVM errors
- **Implementation**: 
  ```dockerfile
  FROM postgres:15-alpine AS builder
  RUN apk add git make gcc musl-dev postgresql15-dev
  RUN git clone pgvector && (make || true) && cp files manually
  ```
- **Local Result**: SUCCESS! Works perfectly in local Docker
- **Production Result**: NOT DEPLOYED - Would need to push custom image to registry
- **Problem**: Production deployment only uses docker-compose.yml, not Dockerfiles

## Core Issues Discovered

### 1. Architecture Mismatch
- **Local Development**: Likely x86_64 architecture
- **AWS EC2 Production**: Possibly ARM or different x86 variant
- **Impact**: Pre-built Docker images don't include pgvector for all architectures

### 2. Deployment Limitations
- **What gets deployed**: Only the app Docker image from GitHub Container Registry
- **What doesn't**: Source files, Dockerfiles, build contexts
- **Impact**: Can't build custom images on production server

### 3. Docker Image Inconsistency
- **Assumption**: If an image works locally, it works everywhere
- **Reality**: Images can have different contents based on architecture
- **Verification**: The exact same image tag has pgvector locally but not on EC2

### 4. The Circular Loop Pattern
We kept repeating these steps:
1. Try different pgvector image → Doesn't work on EC2
2. Try to build custom image → No Dockerfile on production  
3. Try to install at runtime → Package manager issues
4. Return to step 1 with a "new" image

## Lessons Learned

### 1. Don't Trust Pre-built Images
- Pre-built images may not support all architectures
- What works locally may not work in production
- Always have a fallback plan for runtime installation

### 2. Understand Deployment Constraints
- Know what files are available in production
- Understand the difference between build-time and runtime
- GitHub Actions deployment ≠ full source code deployment

### 3. Architecture Matters
- Always check the production server architecture (`uname -m`)
- Docker images can be architecture-specific
- ARM vs x86 can cause silent failures

### 4. Debug Systematically
- Check if extension files actually exist in the container
- Verify image contents, don't assume
- Use specific version tags for reproducibility

## Final Resolution: Split Strategy

### For Local Development ✅
- **Solution**: Use `pgvector/pgvector:pg15` Docker image
- **Status**: WORKING PERFECTLY
- **Version**: pgvector 0.8.0
- **Why it works**: Pre-built image has pgvector for x86_64 architecture

### For Production ❌  
- **Current Problem**: Same Docker image fails on EC2 (missing pgvector)
- **Root Cause**: Architecture mismatch or image registry issues
- **Attempted Solutions**: All 9 approaches failed

## Recommended Production Solutions

### Option 1: AWS RDS PostgreSQL (Best for Enterprise)
```yaml
# Use managed PostgreSQL with pgvector pre-installed
DATABASE_URL: postgresql://user:pass@your-rds.amazonaws.com:5432/db
```
- **Pros**: pgvector works immediately, managed, scalable, backed up
- **Cons**: Additional cost (~$20-50/month)
- **Setup**: RDS PostgreSQL 15.3+ has pgvector extension available

### Option 2: External PostgreSQL on EC2
```bash
# Separate EC2 instance with PostgreSQL + pgvector
sudo yum install postgresql15-server postgresql15-contrib
# Install pgvector from source or package
```
- **Pros**: Full control, can compile pgvector properly
- **Cons**: Need to manage another server

### Option 3: PostgreSQL Outside Container (Same EC2)
```bash
# Install PostgreSQL directly on host, not in Docker
# Connect from Docker app to host PostgreSQL
```
- **Pros**: Avoids Docker complexity for database
- **Cons**: Mixes containerized and non-containerized services

## Commands for Debugging

### Check Architecture
```bash
uname -m
docker version
```

### Verify Extension Files
```bash
docker exec postgres ls -la /usr/share/postgresql/*/extension/vector*
docker exec postgres ls -la /usr/local/share/postgresql/extension/vector*
```

### Test pgvector
```sql
CREATE EXTENSION IF NOT EXISTS vector;
SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';
SELECT '[1,2,3]'::vector as test;
```

## Prevention for Future Projects

1. **Test deployment on similar architecture** to production early
2. **Include architecture in CI/CD tests**
3. **Build custom images in CI/CD**, not relying on pre-built images
4. **Document architecture requirements** in README
5. **Have runtime installation scripts** as backup

## Timeline
- **Duration**: ~4 hours of debugging
- **Commits**: 20+ attempts with different approaches
- **Root Cause**: Architecture-specific Docker image behavior
- **Solution**: Runtime compilation for guaranteed compatibility