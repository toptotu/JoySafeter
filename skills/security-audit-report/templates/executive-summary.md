# Executive Summary Template

---

## Security Audit Executive Summary

**Target**: {target_name}  
**Audit Period**: {start_date} — {end_date}  
**Report Date**: {report_date}  
**Overall Risk Rating**: 🔴 CRITICAL / 🟠 HIGH / 🟡 MEDIUM / 🔵 LOW *(select one)*

---

### Key Findings at a Glance

| Severity | Count | Confirmed | Remediated |
|----------|-------|-----------|-----------|
| 🔴 Critical | {N} | {N} | 0 |
| 🟠 High | {N} | {N} | 0 |
| 🟡 Medium | {N} | {N} | 0 |
| 🔵 Low | {N} | {N} | 0 |
| ⚪ Info | {N} | — | — |
| **Total** | **{N}** | **{N}** | **0** |

---

### Critical Issues Requiring Immediate Attention

> ⚠️ The following vulnerabilities pose immediate risk to the business and must be addressed before the next production deployment.

1. **{FIND-0001 Title}** — {one-sentence business impact}. An attacker could {consequence in plain language}.
2. **{FIND-0002 Title}** — {one-sentence business impact}.
3. **{FIND-0003 Title}** — {one-sentence business impact}.

---

### Business Risk Summary

{2-3 paragraph summary covering:
- What is at risk (data, systems, reputation, compliance)
- How likely exploitation is (are these easy or hard to exploit?)
- What the blast radius is (how many users/records/systems affected)
}

---

### Top 5 Recommendations

1. **{Action Item 1}**: {Specific, plain-language action. Example: "Replace all direct SQL query construction with parameterized queries across the API codebase."}  
   *Effort: X days | Team: Backend Engineering | Priority: Immediate*

2. **{Action Item 2}**: ...

3. **{Action Item 3}**: ...

4. **{Action Item 4}**: ...

5. **{Action Item 5}**: ...

---

### Scope Summary

- **Tested**: {brief scope description from audit-scope.md}
- **Not Tested**: {exclusions — mobile app, third-party integrations, etc.}
- **Testing Method**: Automated analysis (AI multi-agent) + manual verification of critical findings
- **Authorization**: Authorized by {name} on {date}, valid through {date}

---

### Attestation

This security audit was conducted by the JoySafeter multi-agent security audit system within the authorized scope. All findings have been reviewed by the security team. Critical and High severity findings were verified through active testing within the stated authorization boundaries.

*This report is CONFIDENTIAL and intended solely for {organization}.*
