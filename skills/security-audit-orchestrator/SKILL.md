---
name: security-audit-orchestrator
version: 1.0.0
description: Multi-agent security audit orchestrator — decomposes an audit engagement into parallel specialist workers, coordinates phased execution (recon → parallel analysis → verification → report), and manages findings exchange via structured JSON files.
---

# Security Audit Orchestrator

## Purpose

Coordinate a full-stack security audit across multiple specialist Worker agents using JoySafeter's DeepAgents star topology. The Orchestrator (Manager) reads the audit scope, plans the engagement, dispatches tasks to Workers, and synthesizes findings into a prioritized report.

## When to Use

Load this skill when you are the **Manager node** in a DeepAgents graph and the user requests a security audit, penetration test, or code review. Do not load this skill in Worker nodes.

## Prerequisites

### Required Files
- `/workspace/audit-scope.md` — target scope, exclusions, authorization statement
- `/workspace/findings/` — empty directory for Worker outputs (create if absent)

### Available Worker Roles
Instruct each Worker with `task()` using these role labels:
- `recon-worker` — attack surface mapping (pentest-recon-attack-surface skill)
- `code-audit-worker` — white-box source code review (pentest-whitebox-code-review skill)
- `api-audit-worker` — API security testing (pentest-api-deep skill)
- `config-worker` — configuration hardening (pentest-config-hardening skill)
- `secrets-worker` — secrets exposure scanning (pentest-secrets-exposure skill)
- `supply-chain-worker` — dependency and CI/CD security (pentest-supply-chain skill)
- `verify-worker` — vulnerability validation (pentest-exploit-validation + pentest-vuln-verify skill)
- `report-worker` — triage and report generation (security-audit-triage + security-audit-report skill)

## Execution Phases

### Phase 0 — Scope Parsing and Plan Generation
1. Read `/workspace/audit-scope.md`.
2. Load brainstorming skill: read `/workspace/skills/brainstorming/SKILL.md`.
3. Identify which Worker roles are relevant based on scope (web / API / cloud / mobile / code).
4. Load writing-plans skill: read `/workspace/skills/writing-plans/SKILL.md`.
5. Write audit plan to `/workspace/findings/audit-plan.md` with:
   - Scope summary
   - Active Worker list
   - Phase timeline
   - Human-in-the-Loop checkpoints
6. **PAUSE for human approval** (Copilot interrupt): "审计计划已生成，请确认后继续。"

### Phase 1 — Reconnaissance (Serial)
7. `task("recon-worker", "对以下目标执行攻击面侦察，输出至 /workspace/findings/recon.json: {scope}")`
8. Wait for `recon.json` to appear and contain valid JSON.
9. **PAUSE if scope discrepancy detected**: present unexpected assets for human confirmation.

### Phase 2 — Parallel Deep Analysis
Execute all of the following concurrently (do not wait for one before starting another):
10. `task("code-audit-worker", "基于 /workspace/findings/recon.json 的代码路径，执行白盒源代码安全审计，结果写入 /workspace/findings/code.json")`
11. `task("api-audit-worker", "基于 /workspace/findings/recon.json 的 API 端点清单，执行 OWASP API Top 10 审计，结果写入 /workspace/findings/api.json")`
12. `task("config-worker", "审计目标的配置加固状态，包含 TLS/headers/CSP/cookie，结果写入 /workspace/findings/config.json")`
13. `task("secrets-worker", "扫描源代码仓库和 HTTP 响应中的密钥暴露，结果写入 /workspace/findings/secrets.json")`
14. `task("supply-chain-worker", "审计依赖库安全性和 CI/CD 管道安全，结果写入 /workspace/findings/supply.json")`
15. Wait for all five JSON files to be written.

### Phase 2.5 — Human Review Gate (High Severity Findings)
16. Count findings with `severity: CRITICAL` or `severity: HIGH` across all Phase 2 outputs.
17. If any exist: **PAUSE** — "发现 {N} 个高危漏洞。请审核后确认是否继续进行 PoC 验证（验证可能产生实际流量）。"
18. If human approves: proceed to Phase 3. Otherwise: skip to Phase 4.

### Phase 3 — Vulnerability Verification (Serial)
19. `task("verify-worker", "对以下高置信度发现执行 PoC 验证，严格限于授权范围内: {high_confidence_findings_summary}，结果写入 /workspace/findings/verified.json")`
20. Wait for `verified.json`.

### Phase 4 — Triage and Report
21. `task("report-worker", "对所有发现执行去重、置信度评分和 CVSS 评分，生成最终报告至 /workspace/findings/report.md 和 /workspace/findings/findings-final.json")`
22. Wait for report files.
23. **PAUSE for final human review**: "安全审计报告已生成。请在 /workspace/findings/report.md 查看。"
24. Present summary to user: total findings by severity, top 3 critical findings, report location.

## Findings File Protocol

All Workers **must** write their output as a JSON array matching this structure:

```json
[
  {
    "id": "FIND-0001",
    "title": "SQL Injection in /api/search parameter q",
    "severity": "CRITICAL",
    "cvss_score": 9.8,
    "cwe": "CWE-89",
    "owasp": "A03:2021",
    "confidence": "CONFIRMED",
    "location": {
      "file": "backend/app/api/v1/search.py",
      "line_start": 42,
      "line_end": 48,
      "endpoint": "GET /api/v1/search"
    },
    "evidence": {
      "code_snippet": "query = f\"SELECT * FROM items WHERE name = '{q}'\"",
      "tool_output": "semgrep: python.lang.security.audit.sqli.formatted-sql-query"
    },
    "reproduction_steps": [
      "Send GET /api/v1/search?q=' OR '1'='1",
      "Observe full table dump in response"
    ],
    "remediation": "Use parameterized queries: db.execute('SELECT * FROM items WHERE name = %s', (q,))",
    "references": ["https://cwe.mitre.org/data/definitions/89.html"],
    "found_by": "code-audit-worker",
    "timestamp": "2026-04-01T10:00:00Z"
  }
]
```

## Error Handling

- If a Worker fails to produce output within its expected window: log a warning to `/workspace/findings/{worker}-error.txt` and proceed without that domain's findings (note coverage gap in report).
- If a Worker produces malformed JSON: attempt to re-task with explicit schema reminder; if second attempt fails, mark that domain as "manual review required."
- Never abort the entire audit due to a single Worker failure.

## References
- `references/task-decomposition.md` — detailed task decomposition strategies per target type
- `references/scope-templates.md` — pre-built scope templates for web / API / cloud / mobile
