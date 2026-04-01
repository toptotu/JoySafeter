# Task Decomposition Strategies

## Web Application Audit

### Recommended Worker Set
| Worker | Primary Skill | Expected Output Size |
|--------|--------------|---------------------|
| recon-worker | pentest-recon-attack-surface | 20-50 endpoints |
| code-audit-worker | pentest-whitebox-code-review | 5-30 findings |
| api-audit-worker | pentest-api-deep | 3-20 findings |
| config-worker | pentest-config-hardening | 5-15 findings |
| secrets-worker | pentest-secrets-exposure | 0-10 findings |
| supply-chain-worker | pentest-supply-chain | 5-25 findings |

### Task Message Templates

**recon-worker**:
```
执行对 {target_url} 的白盒攻击面侦察：
1. 技术指纹识别（框架/版本/WAF）
2. 路由提取（从源代码 {routes_dir}）
3. 认证中间件映射
4. 输入参数清单（每端点）
输出结果到 /workspace/findings/recon.json（格式参见 Orchestrator SKILL.md）
```

**code-audit-worker**:
```
对 {repo_path} 执行白盒代码审计：
- 重点路径：{recon_high_priority_paths}（来自 /workspace/findings/recon.json）
- 使用 pentest-whitebox-code-review 技能的 5 并行分析轨道
- 工具：semgrep（使用 p/python 或 p/javascript 规则集）、ripgrep
- 输出到 /workspace/findings/code.json
```

## API-Only Audit

### Reduced Worker Set
- recon-worker（仅 API 发现模式）
- api-audit-worker（主力）
- code-audit-worker（仅检查 API 控制器层）
- config-worker（仅 API 网关配置）

## Cloud-Native Audit

### Recommended Worker Set
- recon-worker（云资产枚举模式）
- config-worker（云配置 + 容器安全）
- supply-chain-worker（镜像 + IaC 安全）
- secrets-worker（环境变量 + 密钥管理器）

### Additional Task
```
config-worker 补充指令：
除标准配置加固外，额外检查：
- Kubernetes RBAC 配置（kubebench）
- Docker 镜像漏洞（trivy image scan）
- IAM 最小权限（checkov IaC 扫描）
```

## Code Repository Audit (No Live Target)

### Recommended Worker Set
- code-audit-worker（全量代码扫描）
- secrets-worker（git 历史 + 当前代码）
- supply-chain-worker（依赖 + CI/CD）

### Phase Adjustment
跳过 Phase 1（无网络侦察）：
- Phase 0: 读取 repo 结构生成文件清单代替 recon.json
- Phase 2: 仅激活 code/secrets/supply-chain 三个 Worker
- Phase 3: 跳过 PoC 验证（无运行时目标）

## Scoping Decision Matrix

| 输入信息 | 推荐激活 Worker | 可跳过 Worker |
|---------|---------------|-------------|
| 仓库 URL（无运行实例）| code, secrets, supply | recon, api, config |
| 运行中 Web 应用 + 源码 | 全部 | 无 |
| 运行中 Web 应用（黑盒） | recon, api, config | code, secrets, supply |
| API 规范文件（OpenAPI）| api, config | recon, code |
| Docker/K8s 配置文件 | config, supply, secrets | recon, api, code |
