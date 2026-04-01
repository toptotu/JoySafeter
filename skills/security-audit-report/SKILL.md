---
name: security-audit-report
version: 1.0.0
description: Generates professional security audit deliverables from triaged findings — executive summary for management, technical detail section for engineers, and a remediation roadmap with effort estimates. Outputs Markdown and structured JSON.
---

# Security Audit Report

## Purpose

Transform triaged findings from `/workspace/findings/findings-final.json` into a complete, professional security audit report. The report follows industry-standard structure used by leading security consultancies and is suitable for both executive and technical audiences.

## When to Use

Load this skill when you are the **Report Worker** in a DeepAgents graph, immediately after `security-audit-triage` has produced `findings-final.json`. Run triage first, then call this skill.

## Output Files

| File | Format | Audience |
|------|--------|---------|
| `/workspace/findings/report.md` | Markdown | Primary deliverable |
| `/workspace/findings/report-executive.md` | Markdown | C-suite / management |
| `/workspace/findings/findings-final.json` | JSON (SARIF-compatible) | CI/CD integration |
| `/workspace/findings/remediation-roadmap.md` | Markdown | Engineering teams |

## Report Generation Workflow

### Step 1 — Load Inputs
1. Read `/workspace/findings/findings-final.json` (required).
2. Read `/workspace/findings/triage-summary.json` (required).
3. Read `/workspace/findings/audit-plan.md` (optional — for scope section).
4. Read `/workspace/audit-scope.md` (optional — for authorization section).

### Step 2 — Generate Executive Summary
Follow the template in `templates/executive-summary.md`.

Key elements:
- **Risk Rating**: Overall engagement risk level (CRITICAL / HIGH / MEDIUM / LOW) based on highest severity confirmed finding.
- **Headline Numbers**: Total findings, breakdown by severity, % CONFIRMED.
- **Top 3 Findings**: Names only (no technical detail) with business impact in plain language.
- **Trend vs Prior Audit**: If prior report exists at `/workspace/findings/prior-report.json`, compare finding counts.
- **Remediation Priority**: List top 5 recommendations as business-language action items.
- **Attestation Statement**: Scope, dates, authorization reference.

### Step 3 — Generate Technical Detail Section
For each finding in `findings-final.json` (sorted by `priority_rank`):

1. **Finding Header**: ID, title, severity badge, CVSS score + vector.
2. **Summary**: 2-3 sentences describing the vulnerability.
3. **Location**: File + line range + endpoint (clickable file:// link format if possible).
4. **Evidence**: Code snippet (syntax highlighted), HTTP request/response (if available), tool output excerpt (max 20 lines).
5. **Reproduction Steps**: Numbered steps for engineer to reproduce.
6. **Impact**: Specific business/data impact (e.g., "Attacker can exfiltrate all user records from the `users` table").
7. **Remediation**: Specific code fix or configuration change with example.
8. **References**: CVE links, CWE description, OWASP Testing Guide section.
9. **Compliance**: Applicable compliance controls violated.

### Step 4 — Generate Remediation Roadmap
Follow the template in `templates/remediation-plan.md`.

Group findings into effort tiers:

| Tier | Criteria | Target Timeline |
|------|---------|----------------|
| **Immediate** | CRITICAL severity OR CONFIRMED CRITICAL | Fix before next deployment |
| **Sprint 1** | HIGH severity, CONFIRMED or LIKELY | Fix within 2 weeks |
| **Sprint 2** | MEDIUM severity, CONFIRMED | Fix within 4 weeks |
| **Backlog** | LOW/INFO OR POSSIBLE confidence | Schedule in upcoming sprints |

For each finding, include:
- Brief description (1 line)
- Estimated fix effort: `< 1 hour` / `1-4 hours` / `1-2 days` / `> 2 days`
- Team responsible (Backend / Frontend / DevOps / Security)
- Dependencies (e.g., "Requires library upgrade before fix")

### Step 5 — Final Report Assembly

Assemble `report.md` with this structure:

```markdown
# Security Audit Report
## [Target Application Name]
**Prepared by**: JoySafeter Security Audit Agent  
**Date**: {date}  
**Engagement Reference**: {audit-scope reference}  
**Classification**: CONFIDENTIAL

---

## Table of Contents
1. Executive Summary
2. Scope and Methodology
3. Critical Findings
4. High Findings
5. Medium Findings
6. Low / Informational Findings
7. Coverage Gaps
8. Remediation Roadmap
9. Appendix: Tool Outputs
10. Appendix: SARIF Export

---

## 1. Executive Summary
{executive summary content}

## 2. Scope and Methodology
{from audit-plan.md + audit-scope.md}

### Workers Deployed
| Worker | Skill | Findings |
...

## 3. Critical Findings
{for each CRITICAL finding: full technical detail}

## 4. High Findings
...

## 5. Medium Findings
...

## 6. Low / Informational Findings
{condensed table format, not full detail}

| ID | Title | CWE | Confidence | Location |
|----|-------|-----|-----------|---------|
...

## 7. Coverage Gaps
{from triage-summary.json coverage_gaps field}

## 8. Remediation Roadmap
{from remediation-plan output}

## 9. Appendix A: Raw Tool Outputs
{brief excerpts, link to /workspace/findings/raw/ for full outputs}

## 10. Appendix B: SARIF
{SARIF JSON block for IDE integration}
```

### Step 6 — SARIF Export

Generate SARIF 2.1.0 format within the report for IDE integration:

```json
{
  "$schema": "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json",
  "version": "2.1.0",
  "runs": [{
    "tool": {
      "driver": {
        "name": "JoySafeter Security Audit",
        "version": "1.0.0",
        "rules": [
          {
            "id": "CWE-89",
            "name": "SQLInjection",
            "shortDescription": { "text": "SQL Injection" },
            "helpUri": "https://cwe.mitre.org/data/definitions/89.html"
          }
        ]
      }
    },
    "results": [
      {
        "ruleId": "CWE-89",
        "level": "error",
        "message": { "text": "SQL Injection in search parameter" },
        "locations": [{
          "physicalLocation": {
            "artifactLocation": { "uri": "backend/app/api/v1/search.py" },
            "region": { "startLine": 42, "endLine": 48 }
          }
        }]
      }
    ]
  }]
}
```

## Severity Display Standards

Use these visual markers in Markdown output:

| Severity | Marker | Background |
|----------|--------|-----------|
| CRITICAL | 🔴 **CRITICAL** | `> ⚠️ CRITICAL SEVERITY` blockquote |
| HIGH | 🟠 **HIGH** | `> ⚠️ HIGH SEVERITY` blockquote |
| MEDIUM | 🟡 **MEDIUM** | Standard section |
| LOW | 🔵 **LOW** | Condensed format |
| INFO | ⚪ **INFO** | Table row only |

## Quality Checks Before Finalizing

Before writing the final report, verify:
- [ ] Every CRITICAL finding has at least one `reproduction_steps` entry
- [ ] No finding references files outside the declared scope
- [ ] `FP_SUSPECTED` findings are clearly labeled and in a separate section
- [ ] All CVSS scores have the full vector string (not just the numeric score)
- [ ] Remediation roadmap covers all CRITICAL and HIGH findings
- [ ] Coverage gaps section lists any worker that failed or was skipped
- [ ] Report does not contain raw credentials or active exploit payloads (redact with `[REDACTED]`)

## References
- `templates/executive-summary.md` — executive summary template
- `templates/technical-detail.md` — technical finding detail template
- `templates/remediation-plan.md` — remediation roadmap template
- `references/finding-format.md` — SARIF and JSON format specification
