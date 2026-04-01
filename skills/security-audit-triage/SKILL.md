---
name: security-audit-triage
version: 1.0.0
description: Aggregates findings from multiple security audit workers, deduplicates by CWE and location, applies confidence scoring, auto-calculates CVSS v3.1 scores, and produces a prioritized findings JSON for downstream reporting.
---

# Security Audit Triage

## Purpose

Consume raw finding arrays from multiple specialist Worker outputs (`/workspace/findings/*.json`), deduplicate cross-worker overlaps, apply confidence level logic, compute CVSS v3.1 base scores, map to compliance frameworks, and produce a clean prioritized list at `/workspace/findings/findings-final.json`.

## When to Use

Load this skill when you are the **Report Worker** in a DeepAgents graph, after all specialist Workers have written their output files. Run triage before invoking the report-generation step.

## Input Files

Read all of the following (skip gracefully if absent):
- `/workspace/findings/recon.json`
- `/workspace/findings/code.json`
- `/workspace/findings/api.json`
- `/workspace/findings/config.json`
- `/workspace/findings/secrets.json`
- `/workspace/findings/supply.json`
- `/workspace/findings/verified.json`

## Triage Workflow

### Step 1 — Load and Validate
1. Read each input file. Skip files that are absent or contain invalid JSON (log coverage gap).
2. Validate each finding object has required fields: `id`, `title`, `severity`, `cwe`, `confidence`, `found_by`.
3. Assign a new sequential ID to any finding missing an ID: `FIND-{zero-padded-sequence}`.
4. Count total raw findings per source worker.

### Step 2 — Deduplication

Apply rules in this priority order:

**Rule D1 — Exact Location Match**
- Condition: Same `cwe` AND same `location.file` AND `|line_start_A - line_start_B| <= 5`
- Action: Merge into single finding. Keep highest `severity`. Merge `evidence` objects. Set `confidence` to the higher of the two. Append both worker names to `found_by` (e.g., `"code-audit-worker, secrets-worker"`).
- Mark merged originals as `_merged: true`.

**Rule D2 — Same CWE + Same Endpoint**
- Condition: Same `cwe` AND same `location.endpoint` AND different `location.file` (different workers found same endpoint-level issue via different paths)
- Action: Merge. Note both evidence paths. Upgrade `confidence` by one level (POSSIBLE → LIKELY → CONFIRMED).

**Rule D3 — Title Similarity**
- Condition: Jaccard similarity of title tokens > 0.75 AND same `severity`
- Action: Flag as `_dedup_candidate: true`. Do NOT auto-merge. Note in finding: "Similar finding from {worker_B} — manual review recommended."

**Rule D4 — Verified Supersedes Unverified**
- Condition: Finding in `verified.json` matches any finding in other files by CWE + endpoint
- Action: Replace `confidence` with `CONFIRMED`. Attach verified `evidence` to the merged finding.

### Step 3 — Confidence Scoring

For each deduplicated finding, apply scoring adjustments:

| Condition | Adjustment |
|-----------|-----------|
| Found by 2+ different workers | Upgrade confidence one level |
| Has `evidence.code_snippet` | +0.1 weight (no level change, affects prioritization score) |
| Has `evidence.tool_output` (automated tool) | +0.1 weight |
| Has `evidence.request` + `evidence.response` | Upgrade to CONFIRMED if was LIKELY |
| PoC in `verified.json` reproduces it | Force CONFIRMED |
| Static analysis only, no dynamic evidence | Keep or downgrade by one level |
| `FP_SUSPECTED` from any worker | Keep finding but add `_fp_flag: true`, move to end of priority list |

**Final Confidence Levels**:
- `CONFIRMED` — reproduced with PoC or found by 2+ workers with dynamic evidence
- `LIKELY` — single worker with tool evidence or 2+ workers static-only
- `POSSIBLE` — single worker, static analysis only
- `FP_SUSPECTED` — pattern match only, no contextual support

### Step 4 — CVSS v3.1 Scoring

For findings without `cvss_score`, calculate based on CWE and finding characteristics:

| CWE Category | Base AV/AC/PR/UI | Typical Range |
|--------------|-----------------|---------------|
| CWE-89 (SQL Injection) | N/L/N/N | 9.8 CRITICAL |
| CWE-79 (XSS Stored) | N/L/N/R | 8.8 HIGH |
| CWE-79 (XSS Reflected) | N/L/N/R | 6.1 MEDIUM |
| CWE-22 (Path Traversal) | N/L/L/N | 7.5 HIGH |
| CWE-918 (SSRF) | N/L/N/N | 8.6 HIGH |
| CWE-352 (CSRF) | N/L/N/R | 6.5 MEDIUM |
| CWE-200 (Info Disclosure) | N/L/N/N | 5.3 MEDIUM |
| CWE-798 (Hardcoded Creds) | N/L/N/N | 9.8 CRITICAL |
| CWE-306 (Missing Auth) | N/L/N/N | 9.1 CRITICAL |
| CWE-1035 (Vulnerable Dep) | N/H/N/N | 5.9–8.1 varies |

For findings where CVSS cannot be auto-determined, set `cvss_score: null` and note "CVSS requires manual assessment."

### Step 5 — Compliance Mapping

Add `compliance` object to each finding:

```json
{
  "compliance": {
    "owasp_top10_2021": "A03:2021-Injection",
    "owasp_api_2023": "API1:2023",
    "cwe_top25_2023": "CWE-89 (#3)",
    "pci_dss_v4": "6.2.4",
    "iso27001_2022": "A.8.25",
    "nist_csf": "PR.DS-1"
  }
}
```

Map using this reference:

| CWE | OWASP Top 10 2021 | OWASP API 2023 | PCI-DSS v4 |
|-----|------------------|----------------|-----------|
| CWE-89 | A03 Injection | API10 | 6.2.4 |
| CWE-79 | A03 Injection | — | 6.2.4 |
| CWE-306,862 | A01 Broken Access Control | API1,API5 | 6.2.1 |
| CWE-798,259 | A07 ID & Auth Failures | API2 | 8.6.1 |
| CWE-22 | A01 Broken Access Control | — | 6.2.4 |
| CWE-918 | A10 SSRF | API7 | 6.2.4 |
| CWE-1035+ | A06 Vulnerable Components | — | 6.3.3 |
| CWE-200 | A02 Crypto Failures | API3 | 3.5.1 |

### Step 6 — Prioritization

Score each finding for prioritization (higher = fix first):

```
priority_score = cvss_base_score × confidence_weight × exploitability_multiplier

confidence_weight:
  CONFIRMED  = 1.0
  LIKELY     = 0.75
  POSSIBLE   = 0.5
  FP_SUSPECTED = 0.1

exploitability_multiplier:
  Has reproduction steps = 1.2
  External-facing endpoint = 1.1
  Affects authentication = 1.15
  Supply chain / all users affected = 1.3
```

Sort final list by `priority_score` descending.

### Step 7 — Statistics Summary

Compute and write to `/workspace/findings/triage-summary.json`:

```json
{
  "total_raw_findings": 87,
  "after_dedup": 52,
  "by_severity": {
    "CRITICAL": 3,
    "HIGH": 11,
    "MEDIUM": 24,
    "LOW": 10,
    "INFO": 4
  },
  "by_confidence": {
    "CONFIRMED": 8,
    "LIKELY": 20,
    "POSSIBLE": 21,
    "FP_SUSPECTED": 3
  },
  "by_worker": {
    "code-audit-worker": 21,
    "api-audit-worker": 14,
    "config-worker": 8,
    "secrets-worker": 5,
    "supply-chain-worker": 11,
    "verify-worker": 3
  },
  "coverage_gaps": ["mobile-app testing skipped (out of scope)"],
  "top_cwe": ["CWE-89", "CWE-79", "CWE-1035"]
}
```

## Output

Write sorted, deduplicated findings to `/workspace/findings/findings-final.json`:

```json
{
  "schema_version": "1.0",
  "triage_timestamp": "2026-04-01T12:00:00Z",
  "summary": { ... },
  "findings": [
    {
      "id": "FIND-0001",
      "priority_rank": 1,
      "priority_score": 11.76,
      "title": "...",
      "severity": "CRITICAL",
      "cvss_score": 9.8,
      "cvss_vector": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H",
      "cwe": "CWE-89",
      "compliance": { ... },
      "confidence": "CONFIRMED",
      "location": { ... },
      "evidence": { ... },
      "reproduction_steps": [ ... ],
      "remediation": "...",
      "found_by": "code-audit-worker, verify-worker",
      "references": [ ... ]
    }
  ]
}
```

## References
- `references/dedup-algorithm.md` — detailed deduplication logic with examples
- `references/cvss-scoring.md` — CVSS v3.1 scoring guide for common CWEs
- `references/confidence-matrix.md` — confidence level decision matrix
