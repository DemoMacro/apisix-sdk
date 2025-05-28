# Apache APISIX 管理 API 文档

Apache APISIX 管理 API 提供了 RESTful 端点，用于管理 API 网关配置的各个方面。此 SDK 涵盖了所有主要的管理 API 功能，并提供完整的 TypeScript 支持。

## 目录

- [概述](#概述)
- [配置](#配置)
- [核心资源](#核心资源)
  - [路由](#路由)
  - [服务](#服务)
  - [上游](#上游)
  - [消费者](#消费者)
  - [SSL 证书](#ssl-证书)
  - [插件](#插件)
  - [全局规则](#全局规则)
  - [消费者组](#消费者组)
  - [插件配置](#插件配置)
  - [流路由](#流路由)
  - [Secrets](#secrets)
  - [Credentials](#credentials)
  - [Protos](#protos)
- [API 特性](#api-特性)
- [错误处理](#错误处理)
- [示例](#示例)

## 概述

管理 API 允许用户通过 RESTful 端点控制其部署的 Apache APISIX 实例。它提供了对路由、服务、上游、消费者、SSL 证书、插件以及其他 APISIX 资源的完整管理能力。

### 基本配置

- **默认端口**: 9180
- **默认基础路径**: `/apisix/admin`
- **API 版本**: v1 (支持 v3 特性)
- **默认 IP**: 0.0.0.0 (可配置)

### API Key 认证

所有管理 API 请求都需要使用 `X-API-KEY` 头进行认证：

```typescript
import { ApisixSDK } from "apisix-sdk";

const client = new ApisixSDK({
  baseURL: "http://127.0.0.1:9180",
  apiKey: "edd1c9f034335f136f87ad84b625c8f1", // 生产环境中请更改！
  timeout: 30000,
});
```

## 配置

### SDK 配置选项

```typescript
interface ApisixSDKConfig {
  baseURL: string; // APISIX 管理 API 基础 URL
  apiKey?: string; // API Key 用于认证
  timeout?: number; // 请求超时时间（毫秒，默认值：30000）
  headers?: Record<string, string>; // 额外的头信息
}
```

### 环境变量

```typescript
const client = new ApisixSDK({
  baseURL: process.env.APISIX_BASE_URL || "http://127.0.0.1:9180",
  apiKey: process.env.APISIX_API_KEY,
});
```

## 核心资源

### 路由

路由定义了如何匹配和处理传入的请求。

#### 路由接口

```typescript
interface Route {
  id?: string;
  name?: string;
  desc?: string;
  uri?: string; // 单个 URI 模式
  uris?: string[]; // 多个 URI 模式
  methods?: string[]; // HTTP 方法
  host?: string; // 单个 Host
  hosts?: string[]; // 多个 Host
  remote_addr?: string; // 单个客户端 IP
  remote_addrs?: string[]; // 多个客户端 IP
  vars?: Array<[string, string, string]>; // 条件匹配
  filter_func?: string; // 自定义 Lua 函数
  plugins?: Record<string, unknown>; // 插件配置
  upstream?: Upstream; // 内联上游
  upstream_id?: string; // 引用上游 ID
  service_id?: string; // 引用服务 ID
  plugin_config_id?: string; // 引用插件配置 ID
  priority?: number; // 路由优先级 (默认值: 0)
  enable_websocket?: boolean; // 启用 WebSocket
  timeout?: {
    connect?: number;
    send?: number;
    read?: number;
  };
  status?: 0 | 1; // 0=禁用, 1=启用
  labels?: Record<string, string>;
  create_time?: number;
  update_time?: number;
}
```

#### 路由操作

```typescript
// 列出所有路由
const routes = await client.routes.list();

// 带分页的列表
const { routes, total, hasMore } = await client.routes.listPaginated(1, 10);

// 获取指定路由
const route = await client.routes.get("route-id");

// 创建新路由
const newRoute = await client.routes.create({
  name: "api-route",
  uri: "/api/v1/*",
  methods: ["GET", "POST"],
  upstream: {
    type: "roundrobin",
    nodes: { "127.0.0.1:8080": 1 },
  },
});

// 更新路由
const updatedRoute = await client.routes.update("route-id", {
  desc: "Updated description",
});

// 部分更新
await client.routes.patch("route-id", { priority: 10 });

// 删除路由
await client.routes.delete("route-id");

// 强制删除 (即使正在使用)
await client.routes.delete("route-id", { force: true });

// 检查是否存在
const exists = await client.routes.exists("route-id");

// 启用/禁用路由
await client.routes.enable("route-id");
await client.routes.disable("route-id");

// 按条件查找路由
const apiRoutes = await client.routes.findByUri("/api");
const getRoutes = await client.routes.findByMethod("GET");
const hostRoutes = await client.routes.findByHost("api.example.com");

// 克隆路由
const cloned = await client.routes.clone("source-id", {
  name: "cloned-route",
  uri: "/new-path/*",
});

// 获取统计信息
const stats = await client.routes.getStatistics();
```

### 服务

服务为上游管理提供了一层抽象。

#### 服务接口

```typescript
interface Service {
  id?: string;
  name?: string;
  desc?: string;
  upstream?: Upstream;
  upstream_id?: string;
  plugins?: Record<string, unknown>;
  plugin_config_id?: string;
  hosts?: string[];
  enable_websocket?: boolean;
  labels?: Record<string, string>;
  create_time?: number;
  update_time?: number;
}
```

#### 服务操作

```typescript
// 列出所有服务
const services = await client.services.list();

// 获取指定服务
const service = await client.services.get("service-id");

// 创建服务
const newService = await client.services.create({
  name: "user-service",
  upstream: {
    type: "roundrobin",
    nodes: { "127.0.0.1:8080": 1 },
  },
});

// 更新服务
await client.services.update("service-id", {
  desc: "Updated service",
});

// 删除服务
await client.services.delete("service-id");

// 按名称查找服务
const userServices = await client.services.findByName("user");

// 克隆服务
const cloned = await client.services.clone("source-id", {
  name: "cloned-service",
});
```

### 上游

上游定义了带有健康检查和负载均衡的后端服务器集群。

#### 上游接口

```typescript
interface Upstream {
  id?: string;
  name?: string;
  desc?: string;
  type?: "roundrobin" | "chash" | "ewma" | "least_conn";
  nodes?: Record<string, number> | UpstreamNode[];
  service_name?: string;
  discovery_type?: string;
  hash_on?: "vars" | "header" | "cookie" | "consumer";
  key?: string;
  checks?: HealthCheck;
  retries?: number;
  retry_timeout?: number;
  timeout?: {
    connect?: number;
    send?: number;
    read?: number;
  };
  keepalive_pool?: KeepalivePool;
  scheme?: "http" | "https" | "grpc" | "grpcs" | "tcp" | "udp" | "tls";
  pass_host?: "pass" | "node" | "rewrite";
  upstream_host?: string;
  tls?: UpstreamTLS;
  labels?: Record<string, string>;
  create_time?: number;
  update_time?: number;
}
```

#### 上游操作

```typescript
// 列出所有上游
const upstreams = await client.upstreams.list();

// 创建带健康检查的上游
const upstream = await client.upstreams.create({
  name: "backend-cluster",
  type: "roundrobin",
  nodes: [
    { host: "127.0.0.1", port: 8080, weight: 1 },
    { host: "127.0.0.1", port: 8081, weight: 2 },
  ],
  checks: {
    active: {
      type: "http",
      http_path: "/health",
      timeout: 5,
      healthy: { interval: 10, successes: 2 },
      unhealthy: { interval: 5, http_failures: 3 },
    },
  },
});

// 添加/移除节点
await client.upstreams.addNode("upstream-id", "127.0.0.1", 8082, 1);
await client.upstreams.removeNode("upstream-id", "127.0.0.1", 8082);

// 更新节点权重
await client.upstreams.updateNodeWeight("upstream-id", "127.0.0.1", 8080, 3);

// 获取统计信息
const stats = await client.upstreams.getStatistics();
```

### 消费者

消费者代表带有认证凭证的 API 用户。

#### 消费者接口

```typescript
interface Consumer {
  id?: string;
  username: string;
  desc?: string;
  plugins?: Record<string, unknown>;
  group_id?: string;
  labels?: Record<string, string>;
  create_time?: number;
  update_time?: number;
}
```

#### 消费者操作

```typescript
// 列出所有消费者
const consumers = await client.consumers.list();

// 创建消费者
const consumer = await client.consumers.create({
  username: "api-user",
  desc: "API user for mobile app",
});

// 添加认证插件
await client.consumers.addKeyAuth("api-user", "user-api-key-123");
await client.consumers.addJwtAuth("api-user", "jwt-key", "secret");
await client.consumers.addBasicAuth("api-user", "username", "password");

// 列出消费者凭证
const credentials = await client.consumers.listCredentials("api-user");

// 按组查找消费者
const groupConsumers = await client.consumers.findByGroup("premium-users");
```

### SSL 证书

用于 HTTPS 终止的 SSL 证书。

#### SSL 接口

```typescript
interface SSL {
  id?: string;
  cert: string;
  key: string;
  certs?: string[];
  keys?: string[];
  snis?: string[];
  client?: {
    ca?: string;
    depth?: number;
    skip_mtls_uri_regex?: string[];
  };
  labels?: Record<string, string>;
  status?: 0 | 1;
  type?: "server" | "client";
  ssl_protocols?: string[];
  validity_start?: number;
  validity_end?: number;
  create_time?: number;
  update_time?: number;
}
```

#### SSL 操作

```typescript
// 创建 SSL 证书
const ssl = await client.ssl.create({
  cert: "-----BEGIN CERTIFICATE-----\n...",
  key: "-----BEGIN PRIVATE KEY-----\n...",
  snis: ["api.example.com", "*.api.example.com"],
});

// 按 SNI 查找证书
const certs = await client.ssl.findBySNI("api.example.com");

// 检查证书过期时间
const expiration = await client.ssl.checkExpiration("ssl-id", 30);
if (expiration.willExpireSoon) {
  console.log(`证书将在 ${expiration.daysRemaining} 天内过期`);
}
```

### 插件

插件管理和配置。

#### 插件操作

```typescript
// 列出所有可用插件
const plugins = await client.plugins.list();

// 获取插件 Schema
const schema = await client.plugins.getSchema("limit-count");

// 按类别获取插件
const authPlugins = await client.plugins.getPluginsByCategory("authentication");

// 验证插件配置
const validation = await client.plugins.validateConfig("limit-count", {
  count: 100,
  time_window: 60,
});
```

### 全局规则

应用于所有路由的全局插件规则。

#### 全局规则操作

```typescript
// 创建全局规则
const globalRule = await client.globalRules.create({
  plugins: {
    prometheus: { prefer_name: true },
    cors: { allow_origins: "*" },
  },
});

// 添加插件到全局规则
await client.globalRules.addPlugin("rule-id", "rate-limit", {
  count: 1000,
  time_window: 3600,
});

// 从全局规则中移除插件
await client.globalRules.removePlugin("rule-id", "rate-limit");
```

### 消费者组

用于共享插件配置的消费者分组。

#### 消费者组操作

```typescript
// 创建消费者组
const group = await client.consumerGroups.create({
  desc: "Premium users",
  plugins: {
    "limit-count": { count: 1000, time_window: 60 },
  },
  labels: { tier: "premium" },
});

// 添加/移除标签
await client.consumerGroups.addLabel("group-id", "env", "production");
await client.consumerGroups.removeLabel("group-id", "env");
```

### 插件配置

可重用的插件配置。

#### 插件配置操作

```typescript
// 创建插件配置
const pluginConfig = await client.pluginConfigs.create({
  desc: "Rate limiting config",
  plugins: {
    "limit-count": { count: 100, time_window: 60 },
    cors: { allow_origins: "*" },
  },
});

// 按插件类型查找
const rateLimitConfigs = await client.pluginConfigs.findByPlugin("limit-count");
```

### 流路由

TCP/UDP 代理路由配置。

#### 流路由操作

```typescript
// 创建 TCP 流路由
const tcpRoute = await client.streamRoutes.createTCPRoute({
  server_port: 9100,
  upstream_id: "tcp-upstream-1",
  plugins: {
    "limit-conn": { conn: 100 },
  },
});

// 创建 UDP 流路由
const udpRoute = await client.streamRoutes.createUDPRoute({
  server_port: 9200,
  server_addr: "0.0.0.0",
  upstream: {
    type: "roundrobin",
    nodes: [{ host: "127.0.0.1", port: 8080, weight: 1 }],
  },
});

// 按协议查找
const tcpRoutes = await client.streamRoutes.findByProtocol("tcp");

// 验证配置
const validation = client.streamRoutes.validateConfig({
  server_port: 9100,
  upstream_id: "test-upstream",
});
```

### Secrets

用于 Vault, AWS 和 GCP 的 Secrets 存储管理。

#### Secret 操作

```typescript
// Vault Secrets 管理
const vaultSecret = await client.secrets.createVaultSecret(
  {
    uri: "https://vault.example.com",
    prefix: "/apisix/kv",
    token: "vault-token-123",
    namespace: "apisix-ns",
  },
  "vault-secret-1",
);

// 测试 Vault 连接
const vaultConnection =
  await client.secrets.testVaultConnection("vault-secret-1");

// AWS Secrets Manager
const awsSecret = await client.secrets.createAWSSecret(
  {
    access_key_id: "AKIAIOSFODNN7EXAMPLE",
    secret_access_key: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
    region: "us-east-1",
  },
  "aws-secret-1",
);

// GCP Secret Manager
const gcpSecret = await client.secrets.createGCPSecret(
  {
    auth_config: {
      client_email: "service@project.iam.gserviceaccount.com",
      private_key: "-----BEGIN PRIVATE KEY-----\n...",
      project_id: "my-project",
    },
    ssl_verify: true,
  },
  "gcp-secret-1",
);

// 列出所有 Secrets (按类型)
const allSecrets = await client.secrets.listAllSecrets();
```

### Credentials

独立的凭证管理 (APISIX 3.0+)。

#### Credential 操作

```typescript
// 创建独立凭证
const credential = await client.credentials.create("consumer-id", "cred-id", {
  plugins: {
    "key-auth": { key: "user-api-key-123" },
    "jwt-auth": { key: "user-key", secret: "user-secret" },
  },
  desc: "API user credentials",
});

// 列出消费者凭证
const credentials = await client.credentials.list("consumer-id");

// 更新凭证
await client.credentials.update("consumer-id", "cred-id", {
  plugins: {
    "key-auth": { key: "updated-key" },
  },
});
```

### Protos

用于 gRPC 服务的 Protocol buffer 定义。

#### Proto 操作

```typescript
// 创建 Proto 定义
const proto = await client.protos.create({
  desc: "User service proto",
  content: `
    syntax = "proto3";
    package user;
    service UserService {
      rpc GetUser(GetUserRequest) returns (User);
    }
  `,
});

// 按内容查找
const grpcProtos = await client.protos.findByContent("UserService");
```

## API 特性

### 分页支持

```typescript
// 使用内置分页
const { routes, total, hasMore } = await client.routes.listPaginated(1, 20, {
  name: "api-*", // 按名称模式过滤
});

console.log(`找到 ${total} 个路由`);
console.log(`第 1 页有 ${routes.length} 个路由`);
```

### 过滤

```typescript
// 按各种条件过滤资源
const filteredRoutes = await client.routes.list({
  name: "api",
  uri: "/v1",
  label: "env:prod",
});
```

### 强制操作

```typescript
// 强制删除 (即使资源正在使用)
await client.upstreams.delete("upstream-id", { force: true });
```

### 资源克隆

```typescript
// 克隆并修改路由
const clonedRoute = await client.routes.clone(
  "source-route-id",
  {
    name: "cloned-api",
    uri: "/api/v2/*",
  },
  "new-route-id",
);
```

## 错误处理

```typescript
try {
  const route = await client.routes.get("non-existent-id");
} catch (error) {
  if (error.message.includes("APISIX API Error")) {
    console.log("APISIX 返回错误:", error.message);
  } else {
    console.log("网络或其他错误:", error.message);
  }
}
```

## 示例

### 完整的路由配置示例

```typescript
// 创建上游
const upstream = await client.upstreams.create({
  name: "api-backend",
  type: "roundrobin",
  nodes: [
    { host: "127.0.0.1", port: 8080, weight: 1 },
    { host: "127.0.0.1", port: 8081, weight: 1 },
  ],
  checks: {
    active: {
      type: "http",
      http_path: "/health",
      timeout: 5,
      healthy: { interval: 10, successes: 2 },
    },
  },
});

// 创建服务
const service = await client.services.create({
  name: "api-service",
  upstream_id: upstream.id,
  plugins: {
    "rate-limit": { count: 1000, time_window: 3600 },
  },
});

// 创建路由
const route = await client.routes.create({
  name: "api-route",
  uri: "/api/v1/*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  service_id: service.id,
  plugins: {
    cors: {
      allow_origins: "*",
      allow_methods: "GET,POST,PUT,DELETE",
      allow_headers: "Content-Type,Authorization",
    },
    "jwt-auth": {},
  },
});

console.log("API 配置完成:", route.id);
```

### 带有认证的消费者示例

```typescript
// 创建消费者
const consumer = await client.consumers.create({
  username: "api-user",
  desc: "Mobile app user",
});

// 添加多种认证方法
await client.consumers.addKeyAuth("api-user", "mobile-app-key-123");
await client.consumers.addJwtAuth("api-user", "mobile-jwt-key", "secret");

// 创建消费者组
const group = await client.consumerGroups.create({
  desc: "Mobile users",
  plugins: {
    "limit-count": { count: 500, time_window: 60 },
  },
});

// 将消费者分配到组
await client.consumers.update("api-user", {
  group_id: group.id,
});
```

更多示例请参见 [playground 目录](../../playground/)。
