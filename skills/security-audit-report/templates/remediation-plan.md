# Remediation Roadmap Template

---

## Remediation Roadmap

**Target**: {target_name}  
**Report Date**: {date}

---

## Immediate Actions (Before Next Deployment)

These findings must be resolved before any new production deployment.

| ID | Finding | CWE | Effort | Owner | Notes |
|----|---------|-----|--------|-------|-------|
| FIND-0001 | {title} | CWE-89 | < 1 hour | Backend | Use parameterized queries |
| FIND-0002 | {title} | CWE-798 | < 1 hour | DevOps | Rotate key, move to vault |

### Remediation Details

#### FIND-0001: {Title}
**Location**: `{file}:{line}`  
**Fix**: {specific code change with example}

```python
# Before (vulnerable)
{vulnerable_code}

# After (fixed)
{fixed_code}
```

**Verification**: After fix, re-run `{verification_command}` — expected: no findings.

---

## Sprint 1 (Within 2 Weeks)

| ID | Finding | Severity | Effort | Owner |
|----|---------|----------|--------|-------|
| FIND-0003 | {title} | HIGH | 1-4 hours | Backend |
| FIND-0004 | {title} | HIGH | 1-2 days | Frontend |

---

## Sprint 2 (Within 4 Weeks)

| ID | Finding | Severity | Effort | Owner |
|----|---------|----------|--------|-------|
| FIND-0008 | {title} | MEDIUM | 1-4 hours | Backend |
| FIND-0009 | {title} | MEDIUM | < 1 hour | DevOps |

---

## Backlog (Schedule in Upcoming Sprints)

| ID | Finding | Severity | Confidence | Notes |
|----|---------|----------|-----------|-------|
| FIND-0020 | {title} | LOW | LIKELY | Hardening item |
| FIND-0021 | {title} | INFO | POSSIBLE | Verify manually first |

---

## Dependency Upgrade Plan

Dependencies requiring upgrade (from supply-chain analysis):

| Package | Current | Secure Version | CVE(s) | Breaking Changes |
|---------|---------|---------------|--------|-----------------|
| {package} | {ver} | {ver} | CVE-XXXX | {yes/no, notes} |

---

## Verification After Remediation

For each fix, use these verification commands:

| Fix Type | Verification Command |
|---------|---------------------|
| SQL injection fix | `semgrep --config p/python backend/app/` |
| Secrets removal | `trufflehog git file://. --only-verified` |
| Dependency update | `pip-audit` / `npm audit` |
| Config hardening | `nuclei -t /workspace/skills/pentest-config-hardening/ -u {target}` |
| Header security | `curl -I https://{target}` (check HSTS, CSP, X-Frame-Options) |

---

## Re-Audit Recommendation

Following remediation of all Immediate and Sprint 1 items, a focused re-audit is recommended to:
1. Verify all CRITICAL and HIGH fixes are effective
2. Confirm no regression in previously passing areas
3. Update audit report with remediation status

Estimated re-audit scope: 20-30% of original engagement.
