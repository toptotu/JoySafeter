# Audit Scope Example — JoySafeter Platform Self-Audit

> 这是一个示例范围文件，演示如何配置针对 JoySafeter 平台自身的安全审计。
> 实际使用时，将此文件复制到 `/workspace/audit-scope.md` 并按目标修改。

## 目标信息

- **应用名称**: JoySafeter 平台
- **仓库**: /workspace (本地路径)
- **分支**: main
- **运行环境**: http://localhost:8000 (staging)
- **测试类型**: 白盒 + 黑盒混合

## 审计范围

### 代码审计范围
```
backend/app/api/          # REST API 接口层
backend/app/core/         # 核心引擎（认证/授权/数据库）
backend/app/models/       # 数据模型
backend/app/services/     # 业务服务层
```

### API 测试范围
```
http://localhost:8000/api/v1/*     # 全部 REST API
ws://localhost:8000/ws/*           # WebSocket 端点
```

### 配置审计范围
```
deploy/docker/            # Docker 配置
deploy/docker-compose*.yml
backend/.env.example      # 环境变量配置（不含实际值）
.github/workflows/        # CI/CD 管道
```

### 依赖审计范围
```
backend/pyproject.toml    # Python 依赖
frontend/package.json     # Node.js 依赖
```

## 排除范围

```
tests/                    # 测试代码
docs/                     # 文档
frontend/node_modules/    # Node 依赖包（仅审计声明，不扫描包内容）
*.lock                    # Lockfile（仅做完整性检查，不深度扫描）
```

## 特别关注点

1. **认证机制**: JWT 实现、SSO/OAuth 集成 (`backend/app/core/oauth/`)
2. **多租户隔离**: 用户会话隔离、sandbox 资源隔离
3. **MCP 工具执行**: 动态工具调用的输入验证
4. **Skill 文件系统访问**: SKILL.md 加载的路径遍历风险
5. **API 密钥管理**: `CREDENTIAL_ENCRYPTION_KEY` 的使用

## 授权声明

- **授权方**: JoySafeter 安全团队
- **有效期**: 2026-04-01 ~ 2026-04-30
- **联系人**: security@joysafeter.ai

## 测试账号

- 标准用户: 见 `/workspace/secrets/test-accounts.txt`（不存在则跳过运行时测试）
- 管理员: 见 `/workspace/secrets/admin-accounts.txt`

## 可接受的测试行为

- ✅ 只读数据提取（验证 IDOR/权限绕过）
- ✅ 注入 payload 测试（不实际执行破坏性 SQL）
- ✅ 认证绕过尝试
- ❌ 数据删除/修改操作
- ❌ DoS 攻击
- ❌ 向第三方服务发送请求

## Worker 激活配置

```json
{
  "active_workers": ["recon", "code-audit", "api-audit", "config", "secrets", "supply-chain"],
  "skip_workers": [],
  "skip_verify_phase": false,
  "max_findings_for_auto_verify": 10
}
```
