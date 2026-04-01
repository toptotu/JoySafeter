# Confidence Level Decision Matrix

## Level Definitions

| Level | Meaning | Action Required |
|-------|---------|----------------|
| `CONFIRMED` | Vulnerability is real and reproducible with PoC | Include in report with full evidence |
| `LIKELY` | Strong evidence from multiple sources or dynamic testing | Include in report, recommend verification |
| `POSSIBLE` | Pattern match or structural analysis only | Include with caveat, manual review recommended |
| `FP_SUSPECTED` | Pattern match with contradicting context | Separate section in report, human decision required |

## Assignment Rules

### Automatic CONFIRMED
- Finding appears in `verified.json` with successful PoC
- Same CWE + endpoint found by 3+ independent workers
- Tool output shows active exploitation (e.g., SQLI with data returned)

### Automatic LIKELY
- Finding appears in 2 independent workers
- Single worker with dynamic testing evidence (request/response pair)
- Static taint analysis with complete sink-to-source chain (no sanitizer in path)

### Automatic POSSIBLE
- Single worker, static analysis only
- Pattern match without taint chain verification
- Dependency with CVE but no confirmed usage of vulnerable code path

### Automatic FP_SUSPECTED
- Worker explicitly flags as `FP_SUSPECTED`
- Regex/entropy match for secrets that are test data or examples
- Authorization check detected in a different middleware layer than the route (framework handles it)
- Dependency CVE with CVSS < 4.0 and no known exploitation in context

## Cross-Worker Correlation Examples

### Example 1 — Confidence Upgrade
```
code-audit-worker: SQL injection at search.py:42 (POSSIBLE)
  → static semgrep match, no taint chain
api-audit-worker: GET /api/search - BOLA + SQLi potential (POSSIBLE)
  → response time variance detected
triage rule D2: same CWE-89 + same endpoint
  → merged finding: confidence upgraded to LIKELY
```

### Example 2 — CONFIRMED via Verification
```
api-audit-worker: Mass assignment in POST /api/users (LIKELY)
  → extra fields in response
verify-worker: POST /api/users with role=admin → 201 Created, role set (CONFIRMED)
  → triage rule D4: verified.json supersedes
  → final confidence: CONFIRMED
```

### Example 3 — FP_SUSPECTED
```
secrets-worker: API_KEY=test_key_12345 in .env.example (POSSIBLE)
  → TruffleHog entropy match
triage: file is .env.example, value contains "test_", common test pattern
  → FP_SUSPECTED flag applied
  → note: "Example file, likely not a real credential — verify manually"
```
