# Finding Format Specification

## Primary JSON Schema (findings-final.json)

The canonical finding format used across the entire harness:

```json
{
  "$schema": "https://joysafeter.security/schemas/finding/v1.0",
  "type": "object",
  "required": ["id", "title", "severity", "cwe", "confidence"],
  "properties": {
    "id": {
      "type": "string",
      "pattern": "^FIND-[0-9]{4}$",
      "description": "Sequential finding identifier"
    },
    "priority_rank": {
      "type": "integer",
      "description": "1 = highest priority, assigned by triage"
    },
    "priority_score": {
      "type": "number",
      "description": "Computed: cvss_score × confidence_weight × exploitability_multiplier"
    },
    "title": {
      "type": "string",
      "description": "Concise finding title: '<VulnType> in <Location/Feature>'"
    },
    "severity": {
      "type": "string",
      "enum": ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"]
    },
    "cvss_score": {
      "type": ["number", "null"],
      "minimum": 0,
      "maximum": 10
    },
    "cvss_vector": {
      "type": "string",
      "pattern": "^CVSS:3\\.1/",
      "description": "Full CVSS v3.1 vector string"
    },
    "cwe": {
      "type": "string",
      "pattern": "^CWE-[0-9]+$"
    },
    "owasp": {
      "type": "string",
      "description": "OWASP Top 10 2021 or OWASP API Security 2023 category"
    },
    "compliance": {
      "type": "object",
      "properties": {
        "owasp_top10_2021": {"type": "string"},
        "owasp_api_2023": {"type": "string"},
        "cwe_top25_2023": {"type": "string"},
        "pci_dss_v4": {"type": "string"},
        "iso27001_2022": {"type": "string"},
        "nist_csf": {"type": "string"}
      }
    },
    "confidence": {
      "type": "string",
      "enum": ["CONFIRMED", "LIKELY", "POSSIBLE", "FP_SUSPECTED"]
    },
    "location": {
      "type": "object",
      "properties": {
        "file": {"type": "string"},
        "line_start": {"type": "integer"},
        "line_end": {"type": "integer"},
        "endpoint": {"type": "string"},
        "component": {"type": "string", "description": "Service/module name"}
      }
    },
    "evidence": {
      "type": "object",
      "properties": {
        "code_snippet": {"type": "string"},
        "request": {"type": "string", "description": "HTTP request (sensitive values REDACTED)"},
        "response": {"type": "string", "description": "HTTP response (sensitive values REDACTED)"},
        "tool_output": {"type": "string", "description": "Relevant tool output excerpt (max 500 chars)"},
        "screenshot": {"type": "string", "description": "Path to screenshot if captured"}
      }
    },
    "reproduction_steps": {
      "type": "array",
      "items": {"type": "string"},
      "description": "Numbered steps to reproduce"
    },
    "remediation": {
      "type": "string",
      "description": "Specific fix recommendation with example"
    },
    "effort_estimate": {
      "type": "string",
      "enum": ["< 1 hour", "1-4 hours", "1-2 days", "> 2 days"]
    },
    "references": {
      "type": "array",
      "items": {"type": "string", "format": "uri"}
    },
    "found_by": {
      "type": "string",
      "description": "Comma-separated worker names"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time"
    },
    "_merged": {
      "type": "boolean",
      "description": "True if this finding was merged from multiple workers"
    },
    "_fp_flag": {
      "type": "boolean",
      "description": "True if false positive is suspected"
    }
  }
}
```

## SARIF 2.1.0 Mapping

| Finding Field | SARIF Field |
|--------------|------------|
| `id` | `result.ruleId` |
| `title` | `result.message.text` |
| `severity=CRITICAL/HIGH` | `result.level = "error"` |
| `severity=MEDIUM` | `result.level = "warning"` |
| `severity=LOW/INFO` | `result.level = "note"` |
| `location.file` | `result.locations[].physicalLocation.artifactLocation.uri` |
| `location.line_start` | `result.locations[].physicalLocation.region.startLine` |
| `cvss_score` | `result.properties.security-severity` |
| `cwe` | `rule.id` |
| `remediation` | `result.fixes[].description.text` |

## Raw Worker Output (Before Triage)

Workers may output a simplified schema (triage adds the enriched fields):

```json
[
  {
    "title": "Hardcoded API key in config.py",
    "severity": "CRITICAL",
    "cwe": "CWE-798",
    "confidence": "LIKELY",
    "location": {
      "file": "backend/app/config.py",
      "line_start": 15
    },
    "evidence": {
      "code_snippet": "API_KEY = 'sk-abcdef123456'",
      "tool_output": "trufflehog: HighEntropy match (Shannon entropy 4.8)"
    },
    "remediation": "Move API_KEY to environment variable. Rotate the exposed key immediately.",
    "found_by": "secrets-worker",
    "timestamp": "2026-04-01T10:30:00Z"
  }
]
```

Workers **do not** need to compute: `id`, `priority_rank`, `priority_score`, `cvss_vector`, `compliance`, `_merged`, `_fp_flag`. These are added by the triage step.
