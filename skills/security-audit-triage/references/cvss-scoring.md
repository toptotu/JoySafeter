# CVSS v3.1 Scoring Guide for Security Audit Findings

## Quick Reference: CWE to CVSS Mapping

### Injection Vulnerabilities

| Vulnerability | CWE | AV | AC | PR | UI | S | C | I | A | Score |
|---------------|-----|----|----|----|----|---|---|---|---|-------|
| SQL Injection (auth bypass) | CWE-89 | N | L | N | N | U | H | H | H | **9.8 CRITICAL** |
| SQL Injection (read-only) | CWE-89 | N | L | L | N | U | H | N | N | **6.5 MEDIUM** |
| Command Injection | CWE-78 | N | L | L | N | U | H | H | H | **8.8 HIGH** |
| Template Injection (RCE) | CWE-94 | N | L | N | N | U | H | H | H | **9.8 CRITICAL** |
| XXE | CWE-611 | N | L | N | N | U | H | L | N | **8.2 HIGH** |
| SSRF (internal network) | CWE-918 | N | L | N | N | C | H | L | N | **8.6 HIGH** |
| SSRF (blind) | CWE-918 | N | L | L | N | U | L | N | N | **4.3 MEDIUM** |

### XSS Vulnerabilities

| Vulnerability | CWE | AV | AC | PR | UI | S | C | I | A | Score |
|---------------|-----|----|----|----|----|---|---|---|---|-------|
| Stored XSS | CWE-79 | N | L | L | R | C | L | L | N | **5.4 MEDIUM** |
| Stored XSS (admin panel) | CWE-79 | N | L | N | R | C | L | L | N | **6.1 MEDIUM** |
| Reflected XSS | CWE-79 | N | L | N | R | C | L | L | N | **6.1 MEDIUM** |
| DOM XSS | CWE-79 | N | L | N | R | C | L | L | N | **6.1 MEDIUM** |

### Access Control

| Vulnerability | CWE | AV | AC | PR | UI | S | C | I | A | Score |
|---------------|-----|----|----|----|----|---|---|---|---|-------|
| IDOR (sensitive data) | CWE-639 | N | L | L | N | U | H | N | N | **6.5 MEDIUM** |
| IDOR (write) | CWE-639 | N | L | L | N | U | H | H | N | **8.1 HIGH** |
| Missing Auth (admin) | CWE-306 | N | L | N | N | U | H | H | H | **9.8 CRITICAL** |
| Privilege Escalation | CWE-269 | N | L | L | N | U | H | H | H | **8.8 HIGH** |
| CSRF | CWE-352 | N | L | N | R | U | N | L | N | **4.3 MEDIUM** |
| CSRF (sensitive action) | CWE-352 | N | L | N | R | U | H | H | N | **8.0 HIGH** |

### Cryptography & Secrets

| Vulnerability | CWE | AV | AC | PR | UI | S | C | I | A | Score |
|---------------|-----|----|----|----|----|---|---|---|---|-------|
| Hardcoded credentials | CWE-798 | N | L | N | N | U | H | H | N | **9.1 CRITICAL** |
| Weak JWT secret | CWE-326 | N | H | N | N | U | H | H | N | **8.1 HIGH** |
| Sensitive data in logs | CWE-532 | L | L | L | N | U | H | N | N | **5.5 MEDIUM** |
| TLS 1.0/1.1 enabled | CWE-326 | N | H | N | N | U | H | N | N | **5.9 MEDIUM** |
| Missing HTTPS | CWE-319 | N | H | N | N | U | H | N | N | **5.9 MEDIUM** |

### Supply Chain

| Vulnerability | CWE | Score Range | Notes |
|---------------|-----|------------|-------|
| Critical CVE in dep (exploitable) | CWE-1035 | 9.0–9.8 | Use original CVE CVSS |
| High CVE in dep (exploitable) | CWE-1035 | 7.0–8.9 | Use original CVE CVSS |
| Dependency confusion attack | CWE-494 | 8.8 HIGH | AV:N/AC:H/PR:N/UI:N |
| Lockfile tampering | CWE-494 | 7.5 HIGH | AV:N/AC:H/PR:L/UI:N |

## CVSS v3.1 Metric Quick Reference

| Metric | Options | Notes |
|--------|---------|-------|
| **AV** Attack Vector | N(Network) L(Local) P(Physical) A(Adjacent) | Web APIs = N |
| **AC** Attack Complexity | L(Low) H(High) | H = race conditions, special config required |
| **PR** Privileges Required | N(None) L(Low) H(High) | Auth required? What level? |
| **UI** User Interaction | N(None) R(Required) | XSS needs R; injection usually N |
| **S** Scope | U(Unchanged) C(Changed) | C = can attack other components (sandbox escape, stored XSS affecting other users) |
| **C/I/A** Impact | N(None) L(Low) H(High) | Think about what attacker gains |

## Special Cases

### Dependency CVEs
Always use the CVE's published CVSS score if available. Only auto-calculate if:
- CVE has no CVSS score
- The vulnerable code path is not exercised (reduce by 2 points)
- The vulnerable code path is used in a privileged context (use published score as-is)

### Configuration Issues
Config findings rarely exceed MEDIUM without evidence of active exploitation. Apply:
- Missing security header: INFO to LOW (5.3 max unless specific bypass demonstrated)
- Exposed admin interface: MEDIUM to HIGH (depends on what's accessible)
- Debug mode enabled in production: MEDIUM (5.3 typical, up to HIGH if RCE possible)

### Information Disclosure
- Stack traces/debug info: LOW (3.7) to MEDIUM (5.3)
- Internal IP/path disclosure: LOW (3.7)
- Full schema/table disclosure via error: MEDIUM (5.3)
- Account enumeration: LOW (3.7) to MEDIUM (4.3)
