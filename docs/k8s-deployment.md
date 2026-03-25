# Kubernetes Deployment Guide

This guide covers deploying the Rita application to Kubernetes using Helm charts and helmfile orchestration for the individual development environments.

## Architecture Overview

Rita is deployed as a multi-tenant microservices application on Kubernetes with:

- **API Server** - TypeScript/Express backend
- **Frontend** - React/TypeScript SPA with nginx
- **Centralized Keycloak** - Authentication server at `auth.dev.resolve.io` (shared, realm per tenant)
- **External Services** - PostgreSQL (Rita DB), RabbitMQ, Consul, Valkey (shared infrastructure)

**Note**: Each tenant gets a dedicated realm in the centralized Keycloak instance rather than per-tenant Keycloak deployments.

## Prerequisites

Before deploying, ensure you have:

1. **AWS Resources**
   - ECR repositories created:
     - `rita-api-server`
     - `rita-frontend`
   - ACM certificate for `*.resolve.io`
   - Route53 DNS records (see DNS Configuration below)
   - IAM role for GitHub Actions OIDC authentication
   - kops cluster with ALB ingress controller installed
   - NodePort services configured for ALB instance target mode

2. **GitHub Secrets**

   Required secrets in GitHub repository settings:

   ```
   # AWS Configuration
   AWS_OIDC_ROLE_ARN=arn:aws:iam::<account>:role/GitHubActionsKubernetesDeployRole
   ACM_CERTIFICATE_ARN=arn:aws:acm:us-east-1:<account>:certificate/<id>
   KOPS_CLUSTER_NAME=<cluster-name>
   KOPS_STATE_STORE=s3://<bucket-name>

   # Database & Services
   DEV_DATABASE_URL=postgresql://user:pass@host:5432/rita
   DEV_RABBITMQ_URL=amqp://user:pass@host:5672
   DEV_CONSUL_HTTP_ADDR=host:8500
   DEV_CONSUL_HTTP_TOKEN=<token>
   VALKEY_URL_DEV=redis://host:6379
   DEV_POSTGRES_HOST=<rita-db-host>
   DEV_RABBITMQ_HOST=<rabbitmq-host>
   DEV_CONSUL_HOST=<consul-host>
   DEV_VALKEY_HOST=<valkey-host>

   # Keycloak (Centralized)
   DEV_KEYCLOAK_ISSUER=https://auth.dev.resolve.io/realms/<tenant-namespace>
   KEYCLOAK_ADMIN_USER=admin
   KEYCLOAK_ADMIN_PASSWORD=<admin-password>
   RITA_CLIENT_SECRET=<client-secret-for-rita-go-auth-client>

   # Note: Frontend Keycloak config is set at runtime via Helm ConfigMap
   # VITE_* variables are no longer used in GitHub Secrets

   # Automation
   DEV_AUTOMATION_WEBHOOK_URL=<webhook-url>
   DEV_AUTOMATION_AUTH=<auth-token>

   # Route53 DNS Automation (Optional)
   ROUTE53_ENABLED=true  # Set to true to enable automated DNS creation
   ROUTE53_HOSTED_ZONE_ID=<hosted-zone-id>  # Route53 hosted zone ID for resolve.io
   ```

3. **Local Tools** (for manual deployment)
   - kubectl
   - helm
   - helmfile
   - AWS CLI configured with credentials

## Directory Structure

```
helm/ritadev/
├── charts/
│   ├── api-server/           # API server Helm chart
│   ├── frontend/             # Frontend Helm chart with Keycloak client import job
│   ├── keycloak/             # Keycloak Helm chart (archived, not deployed)
│   └── keycloak-postgres/    # Keycloak PostgreSQL Helm chart (archived, not deployed)
├── environments/
│   └── dev/
│       └── values/
│           ├── api-server.yml
│           ├── frontend.yml
│           ├── keycloak.yml       # Archived
│           └── keycloak-postgres.yml  # Archived
└── ops/
    └── helmfile.yaml.gotmpl   # Helmfile orchestration (deploys api-server + frontend only)
```

**Note**: Keycloak charts remain for reference but are not deployed. Using centralized Keycloak at `auth.dev.resolve.io`.

## Deployment Methods

### 1. Automated Deployment via GitHub Actions

#### Deploy All Services (Triggered on Push to `develop`)

Push to `develop` branch automatically triggers deployment:

```bash
git push origin develop
```

#### Manual Deployment (Workflow Dispatch)

Deploy specific services or tenants via GitHub UI:

1. Go to Actions → "Deploy to K8s Dev"
2. Click "Run workflow"
3. Set parameters:
   - **tenant**: Namespace to deploy to (default: `rita-dev`)
   - **services**: Services to deploy (`all`, `api-server`, `frontend`)

Example combinations:
- Deploy all services to `rita-dev`: `tenant=rita-dev`, `services=all`
- Deploy only frontend to `tenant-xyz`: `tenant=tenant-xyz`, `services=frontend`
- Deploy only API server: `tenant=rita-dev`, `services=api-server`

**Note**: Keycloak is no longer deployed per-tenant. Client configuration is automatically imported to centralized Keycloak via Helm Job.

### 2. Manual Deployment via Helmfile

#### Prerequisites

Export required environment variables:

```bash
export IMAGE_TAG=<commit-sha>
export ECR_REGISTRY=<account>.dkr.ecr.us-east-1.amazonaws.com
export DATABASE_URL=<connection-string>
export RABBITMQ_URL=<connection-string>
export KEYCLOAK_ISSUER=https://auth.dev.resolve.io/realms/<tenant-name>
export KEYCLOAK_ADMIN_USER=admin
export KEYCLOAK_ADMIN_PASSWORD=<centralized-keycloak-admin-password>
export RITA_CLIENT_SECRET=<rita-go-auth-client-secret>
export CONSUL_HTTP_TOKEN=<token>
export CONSUL_HTTP_ADDR=<host:port>
export VALKEY_URL=<connection-string>
export AUTOMATION_WEBHOOK_URL=<webhook-url>
export AUTOMATION_AUTH=<token>
export ACM_CERTIFICATE_ARN=<arn>
export POSTGRES_HOST=<host>
export RABBITMQ_HOST=<host>
export CONSUL_HOST=<host>
export VALKEY_HOST=<host>
```

**Note:** KEYCLOAK_ISSUER now points to centralized Keycloak realm, not per-tenant instance.

#### Deploy Commands

```bash
cd helm/ritadev/ops

# Deploy all services to rita-dev namespace
helmfile -e dev \
  --state-values-set namespace=rita-dev \
  apply --concurrency 3 --wait --timeout 600

# Deploy all services to custom tenant namespace
helmfile -e dev \
  --state-values-set namespace=tenant-xyz \
  apply --concurrency 3 --wait --timeout 600

# Deploy only API server
helmfile -e dev \
  --state-values-set namespace=rita-dev \
  --selector app=api-server \
  apply --wait --timeout 600

# Deploy only frontend (includes client import job)
helmfile -e dev \
  --state-values-set namespace=rita-dev \
  --selector app=frontend \
  apply --wait --timeout 600
```

#### Dry-Run (Preview Changes)

```bash
helmfile -e dev \
  --state-values-set namespace=rita-dev \
  diff
```

## DNS Configuration

### Automated DNS Creation (Recommended)

Route53 CNAME records can be automatically created and deleted during deployment via Kubernetes Jobs.

**Features:**
- Creates CNAME record after ALB provisioning (post-install/post-upgrade)
- Deletes CNAME record before uninstall (pre-delete)
- Safe: Skips deletion if record doesn't exist or is not a CNAME

**Setup:**

1. Add GitHub Secrets:
   ```
   ROUTE53_ENABLED=true
   ROUTE53_HOSTED_ZONE_ID=Z1234567890ABC  # Your Route53 hosted zone ID for resolve.io
   ```

2. Configure IAM permissions for the job's service account:
   - Option A: Add IAM role to nodes (easier for kops)
   - Option B: Use IRSA (IAM Roles for Service Accounts) with annotation in frontend values

3. Deploy normally - DNS record created automatically after ALB provisioning
4. Uninstall cleanly - DNS record deleted automatically before removal

**Required IAM Policy:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "route53:ChangeResourceRecordSets",
        "route53:ListResourceRecordSets"
      ],
      "Resource": "arn:aws:route53:::hostedzone/Z1234567890ABC"
    }
  ]
}
```

**Lifecycle:**
- **On Deploy**: Creates/updates `<tenant>-rita.resolve.io` → ALB DNS
- **On Uninstall**: Deletes `<tenant>-rita.resolve.io` CNAME record
- **Safety**: Cleanup job only deletes if CNAME record exists

### Manual DNS Creation

If automated DNS is disabled, create the following DNS records in Route53:

#### For Default Tenant (rita-dev)

```
rita-dev-rita.resolve.io   → ALB DNS (A or CNAME)
```

#### For Additional Tenants

```
<tenant-name>-rita.resolve.io   → ALB DNS (A or CNAME)
```

**To get ALB DNS name:**
```bash
kubectl get ingress frontend -n <tenant-name> -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'
```

**Note**:
- All domains use the wildcard `*.resolve.io` ACM certificate
- Authentication uses centralized Keycloak at `auth.dev.resolve.io` (managed separately)
- No per-tenant auth DNS records needed

## Multi-Tenant Deployment

### Deploy New Tenant

1. Ensure Keycloak admin credentials are set:
   ```bash
   export KEYCLOAK_ADMIN_USER=admin
   export KEYCLOAK_ADMIN_PASSWORD=<admin-password>
   export RITA_CLIENT_SECRET=<client-secret>
   ```

2. Deploy to new namespace:
   ```bash
   helmfile -e dev \
     --state-values-set namespace=tenant-xyz \
     apply --concurrency 3 --wait --timeout 600
   ```

3. Create DNS record:
   ```
   tenant-xyz-rita.resolve.io   → ALB DNS
   ```

4. Verify Keycloak realm and clients:
   - Check `https://auth.dev.resolve.io/admin/master/console/#/tenant-xyz`
   - Verify `onboarding-auth-client` and `rita-go-auth-client` exist
   - Automated client import job runs on Helm install/upgrade

### Tenant Isolation

Each tenant gets:
- Dedicated namespace (`tenant-xyz`)
- Dedicated realm in centralized Keycloak (`https://auth.dev.resolve.io/realms/tenant-xyz`)
- Dedicated OAuth clients (auto-imported via Helm job)
- Shared Rita PostgreSQL, RabbitMQ, Consul, Valkey instances

### Runtime Configuration

Frontend Keycloak configuration is injected at runtime (not build-time) to support multi-tenant deployments:

**How it works:**
1. ConfigMap (`frontend-config`) contains tenant-specific Keycloak URL/realm/clientId
2. Init container copies app files and injects `<script src="/env-config.js">` into index.html
3. Nginx serves env-config.js from ConfigMap volume
4. Frontend keycloak.ts checks `window.ENV_CONFIG` before fallback to build-time vars

**Benefit:** Single Docker image supports all tenants with different Keycloak configs

**GitHub Actions:** Patches keycloak.ts before build to support runtime config override

### ALB Configuration

**Target Type:** Instance mode with NodePort services

Services use `type: NodePort` with ALB ingress configured for `target-type: instance`. This avoids ENI resolution issues that occur with IP target mode in certain VPC configurations.

**Ingress annotations:**
```yaml
alb.ingress.kubernetes.io/target-type: instance
alb.ingress.kubernetes.io/healthcheck-path: /
alb.ingress.kubernetes.io/healthcheck-port: '3000'  # or '80' for frontend
```

**Service configuration:**
```yaml
type: NodePort
port: 3000  # or 80 for frontend
targetPort: 3000  # or 80 for frontend
```

ALB forwards traffic to NodePorts on EC2 instances, which route to pods via kube-proxy.

## Database Migrations

Migrations run automatically before API server deployment via Kubernetes Job.

### Migration Job Behavior

- Runs as pre-install/pre-upgrade Helm hook
- Uses API server image
- Executes: `node packages/api-server/dist/database/migrate.js`
- Fails deployment if migration fails (`backoffLimit: 0`)
- Job name includes revision: `api-server-migration-<revision>`
- Kept for 24 hours after completion (`ttlSecondsAfterFinished: 86400`)

### Check Migration Status

```bash
# List migration jobs
kubectl get jobs -n rita-dev -l app.kubernetes.io/component=migration

# View migration logs
kubectl logs job/api-server-migration-<revision> -n rita-dev

# Check migration history in database
kubectl exec -it deployment/api-server -n rita-dev -- \
  node -e "require('pg').Client({connectionString:process.env.DATABASE_URL}).connect().then(c=>c.query('SELECT * FROM migration_history ORDER BY id')).then(r=>console.log(r.rows))"
```

## Verification Steps

### Check Deployment Status

```bash
NAMESPACE=rita-dev

# Check pods
kubectl get pods -n $NAMESPACE

# Check deployments
kubectl get deployments -n $NAMESPACE

# Check services
kubectl get svc -n $NAMESPACE

# Check ingress
kubectl get ingress -n $NAMESPACE

# Check jobs (migrations, client import)
kubectl get jobs -n $NAMESPACE
```

### Check Pod Logs

```bash
# API server logs
kubectl logs deployment/api-server -n rita-dev --tail=50 -f

# Frontend logs
kubectl logs deployment/frontend -n rita-dev --tail=50 -f

# Client import job logs
kubectl logs job/frontend-keycloak-client-import -n rita-dev
```

### Test Health Endpoints

```bash
# API server health check (via pod)
kubectl run -it --rm curl --image=curlimages/curl -n rita-dev -- \
  curl http://api-server:3000/health

# External health check (via ingress)
curl https://rita-dev-rita.resolve.io/health

# Centralized Keycloak health check
curl https://auth.dev.resolve.io/health
```

### Test Database Connectivity

```bash
# Test API server → PostgreSQL connection
kubectl exec -it deployment/api-server -n rita-dev -- \
  node -e "require('pg').Client({connectionString:process.env.DATABASE_URL}).connect().then(()=>console.log('Connected')).catch(e=>console.error(e))"
```

## Rollback

### Helm Rollback (Per Service)

```bash
# List revisions
helm history api-server -n rita-dev

# Rollback to previous revision
helm rollback api-server -n rita-dev

# Rollback to specific revision
helm rollback api-server 3 -n rita-dev
```

### Helmfile Rollback (All Services)

```bash
cd helm/ritadev/ops

# Rollback all services to previous release
helmfile -e dev \
  --state-values-set namespace=rita-dev \
  apply --concurrency 3 --wait --timeout 600 \
  --set image.tag=<previous-sha>
```

## Scaling

### Manual Scaling

```bash
# Scale API server
kubectl scale deployment/api-server --replicas=5 -n rita-dev

# Scale frontend
kubectl scale deployment/frontend --replicas=3 -n rita-dev
```

### Horizontal Pod Autoscaler (HPA)

Enable autoscaling by updating values:

```yaml
# In helm/ritadev/environments/dev/values/api-server.yml
autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70
```

Then redeploy:

```bash
helmfile -e dev \
  --state-values-set namespace=rita-dev \
  --selector app=api-server \
  apply
```

## Keycloak Client Management

### Automated Client Import

OAuth clients are automatically imported to centralized Keycloak (`auth.dev.resolve.io`) during deployment via Helm job.

**Imported clients:**
- `onboarding-auth-client` (public client for frontend)
- `rita-go-auth-client` (confidential client for API server)

**Job details:**
- Runs as post-install/post-upgrade Helm hook
- Creates realm if doesn't exist
- Updates existing clients if already present
- Configured via `keycloak.clientImport.*` values

**Check import status:**

```bash
# View job logs
kubectl logs job/frontend-keycloak-client-import -n rita-dev

# List jobs
kubectl get jobs -n rita-dev -l app=keycloak-client-import
```

### Manual Client Management

Access centralized Keycloak admin console:

```
https://auth.dev.resolve.io/admin/master/console/
```

Navigate to realm: `https://auth.dev.resolve.io/admin/master/console/#/<tenant-name>`

## Troubleshooting

### Pods Not Starting

```bash
# Describe pod to see events
kubectl describe pod <pod-name> -n rita-dev

# Check pod logs
kubectl logs <pod-name> -n rita-dev

# Check previous logs (if pod crashed)
kubectl logs <pod-name> -n rita-dev --previous
```

### Migration Job Failures

```bash
# Check migration job status
kubectl get jobs -n rita-dev -l app.kubernetes.io/component=migration

# View migration logs
kubectl logs job/api-server-migration-<revision> -n rita-dev

# Delete failed job and retry
kubectl delete job api-server-migration-<revision> -n rita-dev
helm upgrade api-server ./helm/ritadev/charts/api-server -n rita-dev
```

### Service Not Accessible

```bash
# Check service endpoints
kubectl get endpoints -n rita-dev

# Check ingress configuration
kubectl describe ingress -n rita-dev

# Check ALB target groups
aws elbv2 describe-target-health --target-group-arn <arn>

# Test service internally
kubectl run -it --rm curl --image=curlimages/curl -n rita-dev -- \
  curl http://api-server:3000/health
```

### Database Connection Issues

```bash
# Check external service configuration
kubectl get svc -n rita-dev postgres-rita -o yaml

# Test connectivity from pod
kubectl run -it --rm postgres-client --image=postgres:15 -n rita-dev -- \
  psql $DATABASE_URL -c "SELECT 1"

# Check network policies
kubectl get networkpolicies -n rita-dev
```

### Image Pull Errors

```bash
# Check ECR login
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin <account>.dkr.ecr.us-east-1.amazonaws.com

# Verify image exists
aws ecr describe-images --repository-name rita-api-server --region us-east-1

# Check pod events
kubectl describe pod <pod-name> -n rita-dev
```

### Client Import Job Failures

```bash
# Check job status
kubectl get jobs -n rita-dev -l app=keycloak-client-import

# View job logs
kubectl logs job/frontend-keycloak-client-import -n rita-dev

# Check Keycloak realm
curl -sk https://auth.dev.resolve.io/realms/<tenant-name>/.well-known/openid-configuration

# Delete failed job and retry
kubectl delete job frontend-keycloak-client-import -n rita-dev
helm upgrade frontend ./helm/ritadev/charts/frontend -n rita-dev
```

### ALB Target Health Issues

```bash
# Check target group health
aws elbv2 describe-target-health --target-group-arn <arn>

# Check service type (should be NodePort for instance target-type)
kubectl get svc -n rita-dev -o wide

# Check ingress annotations
kubectl get ingress -n rita-dev -o yaml | grep alb.ingress

# Verify pods are running
kubectl get pods -n rita-dev -o wide
```

### Route53 DNS Job Failures

```bash
# Check job status
kubectl get jobs -n rita-dev -l app=route53-dns-setup

# View job logs
kubectl logs job/frontend-route53-dns -n rita-dev

# Verify ALB DNS name is available
kubectl get ingress frontend -n rita-dev -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'

# Check IAM permissions (if using node IAM role)
aws sts get-caller-identity

# Test Route53 access manually
aws route53 list-resource-record-sets --hosted-zone-id <zone-id> --max-items 1

# Delete failed job and retry
kubectl delete job frontend-route53-dns -n rita-dev
helm upgrade frontend ./helm/ritadev/charts/frontend -n rita-dev
```

## Cost Optimization

### Dev Environment Recommendations

1. **Reduce replicas**:
   ```yaml
   replicaCount: 1  # Instead of 2
   ```

2. **Disable autoscaling**:
   ```yaml
   autoscaling:
     enabled: false
   ```

3. **Reduce resource requests**:
   ```yaml
   resources:
     requests:
       memory: "256Mi"  # Reduced from 512Mi
       cpu: "100m"      # Reduced from 250m
   ```

4. **Use Spot instances** for kops worker nodes

5. **Scale down during off-hours** (optional CronJob):
   ```bash
   kubectl scale deployment/api-server --replicas=0 -n rita-dev
   ```

## Monitoring

### Recommended Tools

- **Prometheus + Grafana** - Metrics collection and visualization
- **Loki** - Log aggregation
- **Datadog** - APM and monitoring (if available)

### Key Metrics to Monitor

- Pod CPU/Memory usage
- API server request latency
- Database connection pool metrics
- Ingress request rate and error rate
- Job completion status (migrations, client imports)

## Security Best Practices

1. **Secrets Management**
   - Use AWS Secrets Manager or Parameter Store
   - Consider External Secrets Operator for K8s integration

2. **Network Policies**
   - Restrict pod-to-pod communication
   - Allow only necessary external connections

3. **RBAC**
   - Create service accounts with minimal permissions
   - Use namespaces for tenant isolation

4. **Image Scanning**
   - Enable ECR image scanning
   - Integrate with CI/CD for vulnerability detection

## Additional Resources

- [Helm Documentation](https://helm.sh/docs/)
- [Helmfile Documentation](https://helmfile.readthedocs.io/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [kops Documentation](https://kops.sigs.k8s.io/)
- [AWS Load Balancer Controller](https://kubernetes-sigs.github.io/aws-load-balancer-controller/)
