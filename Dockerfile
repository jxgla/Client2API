# ── Stage 1: 编译 Go TLS sidecar ──
FROM golang:1.22-alpine AS sidecar-builder

RUN apk add --no-cache git

WORKDIR /build
COPY tls-sidecar/go.mod tls-sidecar/go.sum* ./
RUN go mod download || true

COPY tls-sidecar/ ./
RUN go mod tidy && CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o tls-sidecar .

# ── Stage 2: Node.js 应用 ──
FROM node:20-alpine

# 设置标签
LABEL maintainer="GROKAPI Team"
LABEL description="Docker image for GROKAPI server"

# 安装必要的系统工具
RUN apk add --no-cache tar git curl

# 从 sidecar 构建阶段复制二进制
COPY --from=sidecar-builder /build/tls-sidecar /app/tls-sidecar/tls-sidecar
RUN chmod +x /app/tls-sidecar/tls-sidecar

# 设置工作目录
WORKDIR /app

# 复制package.json和package-lock.json
COPY package*.json ./

# 安装生产依赖
RUN npm ci --omit=dev

# 复制源代码
COPY . .

# 创建目录用于存储日志等
RUN mkdir -p /app/logs

# 暴露 控制台 端口
EXPOSE 3001

# 添加健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://0.0.0.0:3001/ || exit 1

# 设置启动命令
CMD ["node", "src/core/master.js", "--host", "0.0.0.0"]