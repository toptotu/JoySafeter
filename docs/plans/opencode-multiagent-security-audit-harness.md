# OpenCode 多 Agent 安全审计 Skills Harness 方案设计

**版本**: 1.0  
**适用平台**: JoySafeter (LangGraph + DeepAgents + Skills 体系)  
**目标**: 在 opencode（即本平台）上构建可生产化落地的多 Agent 安全审计编排工程

---

## 1. 问题背景与核心挑战

### 1.1 单 Agent 的局限

通用大模型在安全审计场景中有三个根本性缺陷：

| 缺陷 | 表现 | 影响 |
|------|------|------|
| **上下文窗口瓶颈** | 大型代码库全量注入触达 Token 上限 | 遗漏深层逻辑漏洞 |
| **串行执行低效** | 一次只能做一类检查 | 审计时间线性增长 |
| **专业深度不足** | 通才 Agent 对细分场景（如 SSRF、Race Condition）覆盖浅 | 误报/漏报率高 |

### 1.2 Skills Harness 的价值

Skills Harness = **结构化技能库** + **多 Agent 并行编排** + **结果汇聚验证** 三层组合，将安全审计从"AI 辅助人工"升级为"AI 驱动、人工审核"。

---

## 2. 整体架构设计

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Security Audit Harness                           │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                   Orchestrator Manager                       │   │
│  │  (security-audit-orchestrator skill + DeepAgents Manager)   │   │
│  │                                                              │   │
│  │  • 接收审计目标 (repo URL / scope / 威胁模型)               │   │
│  │  • 生成审计计划 (brainstorming + writing-plans skill)       │   │
│  │  • 分发子任务给专项 Worker                                   │   │
│  │  • 汇聚结果 → triage → report                               │   │
│  └──────────────────┬──────────────────────────────────────────┘   │
│                     │ task()                                        │
│     ┌───────────────┼──────────────────────────────────┐          │
│     │               │                │                 │           │
│  ┌──▼──┐        ┌───▼───┐       ┌────▼───┐       ┌────▼───┐      │
│  │ W1  │        │  W2   │       │   W3   │       │  W4    │      │
│  │代码 │        │ API   │       │ 配置   │       │ 供应链 │      │
│  │审计 │        │ 审计  │       │ 加固   │       │ 安全   │      │
│  └──┬──┘        └───┬───┘       └────┬───┘       └────┬───┘      │
│     │               │                │                 │           │
│     └───────────────┴────────────────┴─────────────────┘          │
│                              │                                      │
│              ┌───────────────▼───────────────┐                    │
│              │    Triage + Report Agent       │                    │
│              │  (security-audit-triage +      │                    │
│              │   security-audit-report skill) │                    │
│              └───────────────────────────────┘                    │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │               Shared Docker Backend                          │   │
│  │  /workspace/skills/  →  所有 Worker 共享技能文件系统        │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.1 四层结构说明

| 层级 | 组件 | 职责 |
|------|------|------|
| **Layer 0 - 输入层** | 用户 / Copilot | 提供目标范围、授权文件、威胁模型偏好 |
| **Layer 1 - 编排层** | Orchestrator Manager (DeepAgents) | 拆解任务、并发调度、状态追踪 |
| **Layer 2 - 执行层** | 专项 Worker Agents × N | 并发执行不同维度的安全检查 |
| **Layer 3 - 综合层** | Triage + Report Agent | 去重、置信度评分、生成可交付报告 |

---

## 3. Skills 设计规范（渐进式披露协议）

### 3.1 Skills 目录结构

```
skills/
├── security-audit-orchestrator/
│   ├── SKILL.md                  # 主描述（短摘要 + 阶段索引）
│   └── references/
│       ├── task-decomposition.md # 任务分解策略
│       └── scope-templates.md    # 范围模板（Web/API/Mobile/Cloud）
│
├── security-audit-triage/
│   ├── SKILL.md
│   └── references/
│       ├── dedup-algorithm.md    # 去重算法（基于 CWE 聚合）
│       ├── cvss-scoring.md       # CVSS v3.1 自动评分逻辑
│       └── confidence-matrix.md  # 置信度矩阵
│
├── security-audit-report/
│   ├── SKILL.md
│   ├── templates/
│   │   ├── executive-summary.md  # 管理层摘要模板
│   │   ├── technical-detail.md   # 技术详情模板
│   │   └── remediation-plan.md   # 修复建议模板
│   └── references/
│       └── finding-format.md     # 发现格式规范（SARIF / 自定义 JSON）
│
├── pentest-whitebox-code-review/ # 已有
├── pentest-api-deep/             # 已有
├── pentest-config-hardening/     # 已有
├── pentest-supply-chain/         # 已有
├── pentest-secrets-exposure/     # 已有
├── pentest-recon-attack-surface/ # 已有
└── pentest-vuln-verify/          # 已有
```

### 3.2 Skills 渐进式披露原则

`SkillsMiddleware` 仅向 Agent 注入各 Skill 的单行 `description`（来自 YAML frontmatter）。Agent 在实际需要时再通过 `read_file("/workspace/skills/<name>/SKILL.md")` 加载完整内容。

**好处**：
- 避免将所有技能全量注入 prompt，节省 Token
- Agent 可以自主判断"需要加载哪个技能的完整指令"
- 支持未来扩展更多技能而不影响上下文长度

---

## 4. Multi-Agent 拓扑设计

### 4.1 推荐拓扑：DeepAgents 星型 + 动态 Worker 集

```
Manager (Orchestrator)
    │
    ├── task("recon") ─────────────────→ ReconWorker
    │                                      (pentest-recon-attack-surface)
    │
    ├── task("code-audit") ────────────→ CodeAuditWorker
    │                                      (pentest-whitebox-code-review)
    │
    ├── task("api-audit") ─────────────→ ApiAuditWorker
    │                                      (pentest-api-deep)
    │
    ├── task("config-hardening") ──────→ ConfigWorker
    │                                      (pentest-config-hardening)
    │
    ├── task("secrets-exposure") ──────→ SecretsWorker
    │                                      (pentest-secrets-exposure)
    │
    ├── task("supply-chain") ──────────→ SupplyChainWorker
    │                                      (pentest-supply-chain)
    │
    └── task("triage+report") ─────────→ ReportWorker
                                           (security-audit-triage +
                                            security-audit-report)
```

### 4.2 Worker 专项化配置

每个 Worker 绑定特定 Skills 集合，通过 `skills` 字段在 Graph Node 中指定：

```json
{
  "id": "code_audit_worker",
  "label": "代码审计专家",
  "type": "agent",
  "useDeepAgents": false,
  "skills": [
    "pentest-whitebox-code-review",
    "pentest-secrets-exposure",
    "brainstorming"
  ],
  "systemPrompt": "你是一名专注于白盒源代码安全审计的专家...",
  "tools": ["semgrep", "codeql", "ripgrep", "filesystem"]
}
```

### 4.3 并行化策略

**阶段划分**（关键路径优化）：

```
Phase 0 (串行): Recon → 生成目标资产清单 + 攻击面地图
    ↓
Phase 1 (并行): CodeAudit ‖ ApiAudit ‖ ConfigWorker ‖ SecretsWorker ‖ SupplyChain
    ↓
Phase 2 (串行): VulnVerify → 对 Phase 1 高置信度发现做 PoC 验证
    ↓
Phase 3 (串行): Triage + Report → 汇聚、去重、评分、生成报告
```

---

## 5. 关键技术实现细节

### 5.1 Manager Agent 系统提示设计

```
你是安全审计编排专家（Orchestrator）。你的任务是：

1. **解析范围**：读取用户提供的目标范围文件 /workspace/audit-scope.md
2. **制定计划**：调用 brainstorming + writing-plans skill 生成审计计划
3. **分发任务**：
   - 使用 task("recon") 启动侦察，等待结果
   - 并发调用 task("code-audit"), task("api-audit"), task("config"), 
     task("secrets"), task("supply-chain")（无需等待各个完成）
   - 所有 Phase 1 完成后，调用 task("verify") 对高置信度发现做验证
   - 最终调用 task("report") 生成报告
4. **状态文件协议**：所有 Worker 通过 /workspace/findings/ 目录交换结果：
   - /workspace/findings/recon.json     (侦察结果)
   - /workspace/findings/code.json      (代码审计发现)
   - /workspace/findings/api.json       (API 安全发现)
   - /workspace/findings/config.json    (配置安全发现)
   - /workspace/findings/secrets.json   (密钥暴露发现)
   - /workspace/findings/supply.json    (供应链风险)
   - /workspace/findings/verified.json  (已验证漏洞)
   - /workspace/findings/report.md      (最终报告)

技能参考：读取 /workspace/skills/security-audit-orchestrator/SKILL.md
```

### 5.2 Finding 交换格式（JSON Schema）

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "SecurityFinding",
  "type": "object",
  "required": ["id", "title", "severity", "cwe", "confidence", "evidence"],
  "properties": {
    "id": { "type": "string", "description": "唯一标识符 FIND-XXXX" },
    "title": { "type": "string" },
    "severity": { "enum": ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"] },
    "cvss_score": { "type": "number", "minimum": 0, "maximum": 10 },
    "cwe": { "type": "string", "description": "CWE-XXX" },
    "owasp": { "type": "string", "description": "A01:2021 等" },
    "confidence": { "enum": ["CONFIRMED", "LIKELY", "POSSIBLE", "FP_SUSPECTED"] },
    "location": {
      "type": "object",
      "properties": {
        "file": { "type": "string" },
        "line_start": { "type": "integer" },
        "line_end": { "type": "integer" },
        "endpoint": { "type": "string" }
      }
    },
    "evidence": {
      "type": "object",
      "properties": {
        "code_snippet": { "type": "string" },
        "request": { "type": "string" },
        "response": { "type": "string" },
        "tool_output": { "type": "string" }
      }
    },
    "reproduction_steps": { "type": "array", "items": { "type": "string" } },
    "remediation": { "type": "string" },
    "references": { "type": "array", "items": { "type": "string" } },
    "found_by": { "type": "string", "description": "Worker Agent 名称" },
    "timestamp": { "type": "string", "format": "date-time" }
  }
}
```

### 5.3 Triage 去重与置信度评分算法

```
去重规则（按优先级）：
1. 相同 CWE + 相同文件位置（±5行）→ 合并，取最高置信度
2. 相同 CWE + 相同端点 → 合并，附多来源标记
3. 相同 title 模糊匹配（Jaccard > 0.8）→ 标记为重复候选，人工确认

置信度提升规则：
- 2个以上不同 Worker 都发现同一问题 → confidence 提升一级
- 有工具输出作为证据 → confidence += 0.2
- 有 PoC 可重现 → confidence = CONFIRMED
- 仅静态分析无动态验证 → confidence 降级（LIKELY → POSSIBLE）

CVSS 自动评分（需 Manager 辅助判断）：
- AV: Network（API/Web）/ Local（内部代码）/ Physical（嵌入式）
- AC: Low（无需特殊条件）/ High（需要竞争条件/特定配置）
- PR: None / Low / High（根据 Auth 要求）
- UI: None / Required
- C/I/A: High/Low/None（根据漏洞类型）
```

---

## 6. 面向不同目标类型的场景化配置

### 6.1 Web 应用全量审计

**激活技能集**：
- `pentest-recon-attack-surface` (Phase 0)
- `pentest-whitebox-code-review` + `pentest-enterprise-web` (Phase 1)
- `pentest-api-deep` + `pentest-business-logic` (Phase 1)
- `pentest-config-hardening` + `pentest-secrets-exposure` (Phase 1)
- `pentest-exploit-validation` (Phase 2)
- `security-audit-triage` + `security-audit-report` (Phase 3)

### 6.2 API 专项审计

**激活技能集**：
- `pentest-api-deep` (主)
- `pentest-recon-attack-surface` (辅：发现影子 API)
- `pentest-race-conditions` (并发控制)
- `pentest-business-logic` (业务逻辑)
- `pentest-http-smuggling` (协议层)
- `security-audit-triage` + `security-audit-report`

### 6.3 云原生/DevOps 审计

**激活技能集**：
- `pentest-cloud-infrastructure`
- `pentest-supply-chain`
- `pentest-config-hardening`
- `pentest-secrets-exposure`
- `pentest-recon-attack-surface`
- `security-audit-triage` + `security-audit-report`

### 6.4 代码仓库白盒审计

**激活技能集**：
- `pentest-whitebox-code-review` (核心)
- `pentest-secrets-exposure` (密钥扫描)
- `pentest-supply-chain` (依赖审计)
- `pentest-ai-llm-security` (如有 AI 组件)
- `security-audit-triage` + `security-audit-report`

---

## 7. 可观测性与可审计性设计

### 7.1 Langfuse 追踪集成

每个 Worker 的执行链路通过 Langfuse 完整记录：

```
Trace: security-audit-session-{id}
├── span: orchestrator.plan          # 审计计划生成
├── span: recon.attack-surface       # 侦察阶段
├── span: parallel.code-audit        # 代码审计（含工具调用子 span）
│   ├── span: semgrep.run
│   ├── span: codeql.analyze
│   └── span: findings.write
├── span: parallel.api-audit
├── span: parallel.config
├── span: parallel.secrets
├── span: parallel.supply-chain
├── span: vuln-verify.run
└── span: report.generate
```

### 7.2 审计日志要求

每次审计任务必须记录：
- 审计目标范围哈希（SHA-256）
- 使用的 Skills 版本（SKILL.md frontmatter version 字段）
- 每个 Worker 的 LLM 调用次数 + Token 消耗
- 工具调用记录（命令 + 参数 + 退出码）
- 发现数量按严重程度的分布统计
- 人工审核标记（哪些发现已由人工确认/驳回）

### 7.3 Human-in-the-Loop 审批点

在以下节点强制暂停等待人工确认（通过 Copilot 中断机制）：

1. **Phase 0 → Phase 1 过渡**：人工确认攻击面地图准确性
2. **Phase 2（漏洞验证）前**：人工审核高危发现是否授权进行 PoC
3. **报告发布前**：人工审核最终报告，避免误报

---

## 8. 实施路径

### Step 1：基础设施验证
```bash
# 1. 确认 Skills 已同步到 DB
# UI: Settings → Skills → Import

# 2. 验证 OpenClaw 沙箱
./deploy/quick-start.sh
# 检查 /workspace/skills/ 目录挂载正常

# 3. 配置 MCP 工具
# 添加 semgrep、trivy、trufflehog 等工具的 MCP server
```

### Step 2：构建 DeepAgents Graph
在 JoySafeter UI 中：
1. 新建 Graph → 选择 "DeepAgents" 模式
2. 添加 Manager 节点，绑定 `security-audit-orchestrator` skill
3. 添加各专项 Worker 节点（参见第 4 节），绑定对应 skill
4. 只设 Manager→Workers 的 edges，Workers 之间无直接连接
5. 导入本文档 `附录 A` 中的 JSON 配置

### Step 3：配置审计范围文件
```markdown
# /workspace/audit-scope.md
## 目标
- 仓库: https://github.com/target/app
- 分支: main
- 提交: abc123

## 范围
- Web 前端: /frontend/**
- API 后端: /backend/app/api/**
- 基础设施: /deploy/**

## 排除项
- 测试代码: /tests/**
- 文档: /docs/**

## 授权方
- 签署方: xxx
- 有效期: 2026-04-01 ~ 2026-04-30
```

### Step 4：执行与监控
1. 通过 Copilot 发起审计："请对 /workspace/audit-scope.md 中的目标执行完整安全审计"
2. 通过 Langfuse 仪表板监控执行进度
3. 在 Human-in-the-Loop 节点审核关键决策
4. 审计完成后获取 `/workspace/findings/report.md`

---

## 9. 关键风险与缓解措施

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| **Worker 输出格式不一致** | Triage 聚合失败 | 强制所有 Worker 写入规范 JSON Schema |
| **工具调用失败** | 部分覆盖缺失 | 每个 Worker 实现降级策略（工具不可用时用纯 LLM 分析并标注 confidence=POSSIBLE） |
| **上下文溢出** | Worker 行为退化 | 每个 Worker 分配独立对话上下文；大文件分块处理（每次最多 500 行） |
| **漏洞验证越权** | 测试超出授权范围 | Phase 2 前强制 Human-in-the-Loop 确认；VulnVerify Worker 只读取 findings.json 而非直接攻击 |
| **报告误报过多** | 降低可信度 | Triage 阶段 confidence < LIKELY 的发现单独标注"待验证" |
| **Skills 版本漂移** | 行为不一致 | SKILL.md frontmatter 加 version 字段；Orchestrator 在启动时记录版本快照 |

---

## 10. 扩展方向

1. **增量审计模式**：只对 git diff 范围内的变更代码执行审计（`pentest-whitebox-code-review` 中加 `--changed-only` 参数传递）
2. **CI/CD 集成**：将 Orchestrator 图打包为 API 调用，在 GitHub Actions PR 门控中触发
3. **知识库积累**：将历史审计的 confirmed findings 存入 MemorySystem（`procedure` 类型），供后续审计参考
4. **自动修复 Agent**：在 `security-audit-report` 后新增 `auto-remediation` Worker，自动生成修复 PR
5. **监管合规映射**：在 Triage 阶段加入合规标签（OWASP Top 10、PCI-DSS、等保三级）映射

---

## 附录 A：DeepAgents Graph 导入 JSON

参见 `/workspace/docs/plans/opencode-security-audit-graph.json`

---

## 附录 B：新增 Skills 清单

| Skill 名称 | 功能 | 文件位置 |
|-----------|------|---------|
| `security-audit-orchestrator` | 主编排逻辑 + 任务分解 | `skills/security-audit-orchestrator/` |
| `security-audit-triage` | 去重、置信度评分、CVSS | `skills/security-audit-triage/` |
| `security-audit-report` | 报告模板 + 格式化 | `skills/security-audit-report/` |

---

*设计者备注：本方案完全基于 JoySafeter 现有架构，无需新增后端依赖。所有新增 Skills 遵循现有 `SKILL.md` Progressive Disclosure 协议，与平台的 SkillsMiddleware、SkillSandboxLoader 完全兼容。*
