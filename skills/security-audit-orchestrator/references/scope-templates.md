# Audit Scope Templates

## Template 1 — Web Application Full Audit

```markdown
# Audit Scope — Web Application

## Target
- Application URL: https://app.example.com
- Repository: https://github.com/org/repo (branch: main, commit: abc123)
- Environment: staging / production

## In Scope
- Web frontend: /frontend/**
- API backend: /backend/app/api/**
- Infrastructure configs: /deploy/**
- Database migrations: /backend/alembic/**

## Out of Scope
- Third-party integrations (only note their presence)
- Test files: /tests/**
- Documentation: /docs/**
- Performance testing

## Authorization
- Authorized by: [Name, Title]
- Authorization date: YYYY-MM-DD
- Valid until: YYYY-MM-DD
- Contact: security@example.com

## Test Accounts
- Standard user: testuser / testpass123
- Admin user: testadmin / adminpass123
- (Stored in /workspace/secrets/test-credentials.txt — do not commit)

## Acceptable Impact
- Read-only exploitation of CRITICAL/HIGH findings for PoC
- No destructive operations (DROP TABLE, mass deletion, DoS)
- No exfiltration of real user data
```

## Template 2 — API Security Audit

```markdown
# Audit Scope — API Security

## Target
- API base URL: https://api.example.com/v1
- OpenAPI spec: /workspace/api-spec.yaml
- GraphQL schema: /workspace/schema.graphql (if applicable)

## In Scope
- All endpoints in OpenAPI spec
- Authentication/authorization mechanisms
- Rate limiting and throttling
- Input validation

## Out of Scope
- UI / frontend
- Infrastructure layer

## Test Accounts
- User role: api_key=user_test_key_xxx
- Admin role: api_key=admin_test_key_yyy
- Service account: api_key=svc_test_key_zzz
```

## Template 3 — Cloud Infrastructure Audit

```markdown
# Audit Scope — Cloud Infrastructure

## Target
- Cloud Provider: AWS / Azure / GCP
- Repository (IaC): https://github.com/org/infra-repo
- Environments: staging

## In Scope
- Terraform / CloudFormation configurations
- Kubernetes RBAC and network policies
- Docker images (registry: registry.example.com/*)
- CI/CD pipelines (.github/workflows/**, .gitlab-ci.yml)
- Secret management configurations

## Out of Scope
- Production environment (staging only)
- Billing and cost configurations

## Access Provided
- Read-only IAM role: arn:aws:iam::123456789:role/security-audit-readonly
- Kubeconfig: /workspace/secrets/kubeconfig
```

## Template 4 — Code Repository Audit (No Runtime)

```markdown
# Audit Scope — Source Code Review

## Target
- Repository: https://github.com/org/repo
- Branch: main
- Commit: abc123
- Language(s): Python, TypeScript

## In Scope
- All source code under /src/, /app/, /lib/
- Configuration files
- Docker and CI/CD files

## Out of Scope
- Test files: /tests/, /__tests__/
- Generated files: /dist/, /build/, /.next/
- Third-party vendored code: /vendor/

## Analysis Mode
- Static analysis only (no runtime testing)
- Git history scanning: yes (last 100 commits)

## Authorization
- Internal security review — no external target
- Authorized by: [Engineering Lead]
```

## Scope Validation Checklist

Before starting, the Orchestrator must verify:
- [ ] Authorization statement is present and valid
- [ ] Out-of-scope items are clearly defined
- [ ] Test credentials are provided (if runtime testing needed)
- [ ] Acceptable impact boundaries are stated
- [ ] Contact information for scope questions is available
