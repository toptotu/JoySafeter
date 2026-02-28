## JoySafeter 在阿里云 ECS 部署（公网可访问，推荐 Nginx + HTTPS）

本项目已提供生产环境编排文件 `deploy/docker-compose.prod.yml`（直接拉取预构建镜像），在 ECS 上最稳妥的做法是：

- **公网只开放 80/443**（以及 22/SSH）
- Docker 容器端口 **只绑定到 127.0.0.1**
- 用 **Nginx 反向代理**到本机 `3000`（前端）与 `8000`（后端），并处理 **WebSocket/SSE**
- 通过 Let’s Encrypt/阿里云证书实现 **HTTPS**

---

## 1. 准备工作（阿里云控制台）

### 1.1 购买 ECS 建议

- **系统**：Ubuntu 22.04/24.04 LTS（或 Alibaba Cloud Linux 3）
- **规格**：建议 \(>= 4C8G\)（含模型/工具调用场景可更高）
- **磁盘**：系统盘 50GB+，数据盘按日志/文件存储需求增加
- **公网**：绑定公网 IP 或 EIP

### 1.2 安全组（必须）

入方向放通：

- **22/tcp**（仅你的办公 IP 段更安全）
- **80/tcp**
- **443/tcp**

不建议对公网开放（保持关闭）：

- 3000/8000（前后端容器端口）
- 5432/6379（Postgres/Redis）
- 8001-8010（MCP 相关端口，如确需请只对内网/VPC 放通）

---

## 2. 服务器初始化（Ubuntu 示例）

### 2.1 登录与基础软件

```bash
ssh root@<你的ECS公网IP>

apt update
apt install -y ca-certificates curl gnupg git ufw
```

### 2.2 安装 Docker 与 Docker Compose v2

```bash
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo $VERSION_CODENAME) stable" \
  > /etc/apt/sources.list.d/docker.list

apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

systemctl enable --now docker
docker version
docker compose version
```

（可选）配置 Docker 日志轮转，避免磁盘爆满：

```bash
cat >/etc/docker/daemon.json <<'JSON'
{
  "log-driver": "json-file",
  "log-opts": { "max-size": "50m", "max-file": "3" }
}
JSON
systemctl restart docker
```

---

## 3. 拉取代码并准备目录

建议放到 `/opt/joysafeter`：

```bash
mkdir -p /opt/joysafeter
cd /opt/joysafeter
git clone <你的仓库地址> .
```

> 如果你不想在服务器上拉代码，也可以只上传 `deploy/`、`backend/.env` 等必要文件；但用 Git 更方便升级回滚。

---

## 4. 配置环境变量（关键）

本项目运行至少需要两份配置：

- `deploy/.env`：Docker Compose 用的端口映射/前端 URL 等
- `backend/.env`：后端应用配置（**必须设置 `SECRET_KEY`**，生产建议设置 `CREDENTIAL_ENCRYPTION_KEY`）

### 4.1 生成配置文件

```bash
cd /opt/joysafeter/deploy
./install.sh --mode prod --non-interactive
```

此时会生成：

- `/opt/joysafeter/deploy/.env`
- `/opt/joysafeter/backend/.env`
- `/opt/joysafeter/frontend/.env.local`（可选）

### 4.2 推荐：端口只绑定到 127.0.0.1（避免直接公网暴露）

编辑 `deploy/.env`，将端口变量改为带 `127.0.0.1:` 前缀（Docker 端口映射支持 `HOSTIP:HOSTPORT`）：

```ini
# 只监听本机回环地址
FRONTEND_PORT_HOST=127.0.0.1:3000
BACKEND_PORT_HOST=127.0.0.1:8000
POSTGRES_PORT_HOST=127.0.0.1:5432
REDIS_PORT_HOST=127.0.0.1:6379

# MCP 端口如无外部需求，也建议只绑定到 127.0.0.1
DEMO_MCP_SERVER_PORT=127.0.0.1:8001
SCANNER_MCP_PORT=127.0.0.1:8002
JEB_MCP_PORT=127.0.0.1:8008
MCP_PORT_3=127.0.0.1:8003
MCP_PORT_4=127.0.0.1:8004
MCP_PORT_5=127.0.0.1:8005
```

同时把前端公网地址写对（不要带结尾 `/`）：

```ini
FRONTEND_URL=https://<你的域名>
FRONTEND_HOSTNAME=<你的域名>
BACKEND_HOST=<你的域名>
```

### 4.3 必改项：`backend/.env`

编辑 `/opt/joysafeter/backend/.env`，至少确保：

- `ENVIRONMENT=production`
- `DEBUG=false`
- **`SECRET_KEY`**：强随机字符串（必须）
- **`CREDENTIAL_ENCRYPTION_KEY`**：强随机字符串（强烈建议，避免重启后无法解密数据库中的模型凭据）
- `FRONTEND_URL=https://<你的域名>`
- `CORS_ORIGINS=["https://<你的域名>"]`
- （推荐）`TAVILY_API_KEY=tvly-...`（启用搜索工具时需要）
- （可选兜底）`OPENAI_API_KEY=...`（未在 UI/数据库中配置模型凭据时的兜底）

生成随机密钥示例：

```bash
python3 - <<'PY'
import secrets
print("SECRET_KEY=", secrets.token_urlsafe(48))
print("CREDENTIAL_ENCRYPTION_KEY=", secrets.token_urlsafe(48))
PY
```

把输出粘到 `backend/.env` 中即可。

---

## 5. 启动服务（生产 compose）

### 5.1 拉取镜像

```bash
cd /opt/joysafeter/deploy
docker compose -f docker-compose.prod.yml pull
```

默认会拉取官方预构建镜像（见 `docker-compose.prod.yml` 中的 `docker.io/jdopensource/...:latest`）。如果你要使用自建镜像仓库，请在 `deploy/.env` 里配置：

```ini
DOCKER_REGISTRY=your-registry.com/namespace
IMAGE_TAG=v1.0.0
BACKEND_IMAGE=joysafeter-backend
FRONTEND_IMAGE=joysafeter-frontend
```

### 5.2 启动数据库与 Redis，并初始化数据库（只需首次执行）

```bash
cd /opt/joysafeter/deploy

# 先起 db/redis
docker compose -f docker-compose.prod.yml up -d db redis

# 初始化表结构（profile init）
docker compose -f docker-compose.prod.yml --profile init run --rm db-init
```

### 5.3 启动后端与前端

```bash
cd /opt/joysafeter/deploy
docker compose -f docker-compose.prod.yml up -d backend frontend
docker compose -f docker-compose.prod.yml ps
```

（可选）如确需启动 `mcpserver`：

```bash
docker compose -f docker-compose.prod.yml --profile mcpserver up -d mcpserver
```

检查健康：

```bash
curl -fsS http://127.0.0.1:8000/ >/dev/null && echo OK
curl -fsS http://127.0.0.1:3000/ >/dev/null && echo OK
```

---

## 6. 配置 Nginx 反向代理（包含 WebSocket / SSE）

### 6.1 安装 Nginx

```bash
apt install -y nginx
systemctl enable --now nginx
```

### 6.2 Nginx 配置（单域名：前端 + 后端同域）

创建 `/etc/nginx/sites-available/joysafeter.conf`：

```nginx
map $http_upgrade $connection_upgrade {
  default upgrade;
  ''      close;
}

server {
  listen 80;
  server_name <你的域名>;

  # 先不写跳转，等证书签发后再加 301
  location /.well-known/acme-challenge/ { root /var/www/html; }

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  # 后端 API（项目后端路由前缀为 /api）
  location /api/ {
    proxy_pass http://127.0.0.1:8000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    # SSE/长连接更友好
    proxy_buffering off;
    proxy_read_timeout 3600s;
  }

  # WebSocket（后端 WS 入口为 /ws/...）
  location /ws/ {
    proxy_pass http://127.0.0.1:8000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $connection_upgrade;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 3600s;
  }
}
```

启用并检查：

```bash
ln -sf /etc/nginx/sites-available/joysafeter.conf /etc/nginx/sites-enabled/joysafeter.conf
nginx -t
systemctl reload nginx
```

---

## 7. 配置 HTTPS（Let’s Encrypt / Certbot）

确保域名已解析到 ECS 公网 IP 后执行：

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d <你的域名>
```

签发成功后，Certbot 会自动改写为 443 配置。你需要确认：

- 80 → 443 跳转已开启
- 443 server 块内仍然保留了 `/api/` 与 `/ws/` 的代理配置

证书续期（系统一般已自动装定时任务）：

```bash
certbot renew --dry-run
```

---

## 8. 运行与运维常用命令

### 8.1 查看状态/日志

```bash
cd /opt/joysafeter/deploy
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f --tail=200 backend
docker compose -f docker-compose.prod.yml logs -f --tail=200 frontend
```

### 8.2 升级（拉最新镜像并滚动重启）

```bash
cd /opt/joysafeter/deploy
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

### 8.3 回滚（按 tag）

将 `deploy/.env` 中 `IMAGE_TAG` 改回旧版本，然后：

```bash
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

---

## 9. 常见坑位（部署必看）

- **`backend/.env` 的 `FRONTEND_URL` 必须是公网真实 URL**（生产环境里若仍是 `localhost` 会导致 OAuth/邮件链接/分享链接等功能异常，且后端启动会报警告）。
- **`SECRET_KEY` 是强制配置**：不改会有安全风险，且设置逻辑要求必须提供。
- **`CREDENTIAL_ENCRYPTION_KEY` 强烈建议配置**：否则后端重启可能生成新随机密钥，导致数据库里加密的模型凭据无法解密。
- **不要把 Postgres/Redis 端口暴露公网**：用 `127.0.0.1:PORT` 绑定或安全组直接不放通。
- **WebSocket/SSE 要配好 Nginx**：`/ws/` 需要 `Upgrade/Connection` 头，`/api/` 需要 `proxy_buffering off` 更稳定。

