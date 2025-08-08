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
- [高级特性](#高级特性)
  - [连接池管理](#连接池管理)
  - [查询缓存机制](#查询缓存机制)
  - [智能重试机制](#智能重试机制)
  - [版本兼容性检测](#版本兼容性检测)
  - [请求取消功能](#请求取消功能)
  - [系统监控和统计](#系统监控和统计)
  - [配置验证和建议系统](#配置验证和建议系统)
  - [插件元数据管理](#插件元数据管理)
  - [Prometheus 集成](#prometheus-集成)
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
  adminAPI: {
    baseURL: "http://127.0.0.1:9180",
    apiKey: "your-api-key",
    timeout: 30000,
  },
});
```

## 配置

### SDK 配置选项

```typescript
interface ApisixSDKConfig {
  adminAPI: {
    baseURL: string; // APISIX Admin API 基础 URL
    apiKey?: string; // API 密钥
    timeout?: number; // 请求超时时间
    headers?: Record<string, string>; // 额外请求头
  };
  controlAPI?: {
    baseURL: string; // Control API 基础 URL
    timeout?: number; // 超时时间
    headers?: Record<string, string>; // 额外请求头
  };
}
```

### 环境变量配置

```typescript
const client = new ApisixSDK({
  adminAPI: {
    baseURL: process.env.APISIX_ADMIN_URL || "http://127.0.0.1:9180",
    apiKey: process.env.APISIX_API_KEY,
    timeout: Number(process.env.APISIX_TIMEOUT) || 30000,
  },
  controlAPI: {
    baseURL: process.env.APISIX_CONTROL_URL || "http://127.0.0.1:9090",
  },
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

// 高级路由搜索
const searchResults = await client.routes.search({
  uriPattern: "/api/v1",
  methods: ["GET", "POST"],
  hosts: ["api.example.com"],
  plugins: ["limit-count", "cors"],
  status: 1,
  hasUpstream: true,
  hasService: false,
  labels: { env: "production" },
  createdAfter: new Date("2024-01-01"),
});

// 批量操作
const batchResult = await client.routes.batchOperations([
  {
    operation: "create",
    data: { name: "api-1", uri: "/api/1", methods: ["GET"] },
  },
  {
    operation: "update",
    id: "route-1",
    data: { desc: "更新的路由" },
  },
  {
    operation: "delete",
    id: "route-2",
  },
]);

// 从 OpenAPI 导入
const importResult = await client.routes.importFromOpenAPI(openApiSpec, {
  strategy: "merge",
  validateBeforeImport: true,
});

// 导出为 OpenAPI
const openApiExport = await client.routes.exportToOpenAPI({
  title: "我的 API 路由",
  version: "1.0.0",
  includeDisabled: false,
});

// 增强的统计信息，包含更多详细内容
const stats = await client.routes.getStatistics();
console.log("路由统计信息:", {
  总计: stats.total,
  已启用: stats.enabledCount,
  已禁用: stats.disabledCount,
  方法分布: stats.methodDistribution,
  热门插件: stats.topPlugins,
  主机数量: stats.hostCount,
  服务路由: stats.serviceRoutes,
  上游路由: stats.upstreamRoutes,
});
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

用于 HTTPS 终止的 SSL 证书，支持增强的安全处理。

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

// 获取即将过期的证书
const expiringCerts = await client.ssl.getExpiringCertificates(30);
console.log(`发现 ${expiringCerts.length} 个证书将在 30 天内过期`);

// 克隆 SSL 证书 (处理 APISIX 安全行为)
// 注意：出于安全考虑，APISIX 在单个 GET 请求中不返回私钥
// 克隆方法会在需要时自动从列表响应中检索密钥
const clonedCert = await client.ssl.clone(
  "source-cert-id",
  {
    snis: ["new-domain.example.com"],
    // 可选：如果要替换原始密钥，请提供新密钥
    // key: "-----BEGIN PRIVATE KEY-----\n...",
  },
  "new-cert-id",
);

// 替代方案：使用明确的密钥替换进行克隆
const clonedWithNewKey = await client.ssl.clone(
  "source-cert-id",
  {
    snis: ["another-domain.example.com"],
    key: "-----BEGIN PRIVATE KEY-----\n...", // 新的私钥
  },
  "another-cert-id",
);

// 启用/禁用证书
await client.ssl.enable("ssl-id");
await client.ssl.disable("ssl-id");

// 按状态查找
const enabledCerts = await client.ssl.findByStatus(1);
const disabledCerts = await client.ssl.findByStatus(0);
```

#### SSL 安全行为

**重要说明**：APISIX 实施了关于私钥暴露的安全措施：

- **单个 GET 请求** (`/apisix/admin/ssls/{id}`) 出于安全原因不返回 `key` 字段
- **列表请求** (`/apisix/admin/ssls`) 在响应中包含 `key` 字段

SDK 自动处理此行为：

1. **自动密钥检索**：在克隆证书时，如果无法从单个 GET 请求获取源证书的密钥，SDK 会自动从列表端点检索
2. **优雅降级**：如果自动检索失败，您可以在克隆修改中提供替换密钥
3. **清晰的错误消息**：当需要手动提供密钥时，信息性错误消息会指导您

```typescript
// 自动密钥检索示例 (推荐方法)
try {
  const cloned = await client.ssl.clone("source-id", {
    snis: ["new.example.com"],
  });
  console.log("证书克隆成功，自动检索密钥");
} catch (error) {
  console.error("克隆失败:", error.message);
  // 错误消息会指示是否需要手动提供密钥
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

## 高级特性

### 连接池管理

SDK 实现了高效的连接池管理，自动处理连接复用和清理，提升性能并减少资源消耗。

```typescript
// 获取连接池统计信息
const poolStats = client.getConnectionPoolStats();
console.log("连接池统计:", {
  管理连接数: poolStats.adminConnections,
  控制连接数: poolStats.controlConnections,
  总连接数: poolStats.totalConnections,
  最大池大小: poolStats.maxPoolSize,
  连接TTL: poolStats.ttl + "ms",
});

// 清理连接池
client.clearConnectionPool();

// 配置连接池（在客户端初始化时自动设置）
const client = new ApisixSDK({
  adminAPI: {
    baseURL: "http://127.0.0.1:9180",
    apiKey: "your-api-key",
  },
  // 连接池自动初始化，最大10个连接，5分钟TTL
});
```

**连接池特性：**

- 自动连接复用，减少建立连接的开销
- 智能过期清理，自动移除闲置连接
- 连接池大小限制，防止资源过度消耗
- 分别管理 Admin API 和 Control API 连接

### 查询缓存机制

SDK 内置智能查询缓存，自动缓存 GET 请求结果，减少重复请求，提升响应速度。

```typescript
// 获取缓存统计信息
const cacheStats = client.getCacheStats();
console.log("缓存统计:", {
  总条目: cacheStats.totalEntries,
  过期条目: cacheStats.expiredEntries,
  内存占用: cacheStats.sizeInBytes + " bytes",
});

// 清理所有缓存
client.clearCache();

// 清理特定端点的缓存
client.clearCacheForEndpoint("/routes");

// 跳过缓存进行请求
const freshData = await client.routes.list(undefined, { skipCache: true });

// 配置缓存设置
client.configureCache({
  ttl: 60000, // 60秒缓存
  maxSize: 1000, // 最大1000个缓存条目
});
```

**缓存特性：**

- 30秒默认TTL（可配置）
- 自动过期清理
- 基于请求方法和参数的智能缓存键
- 支持手动缓存清理和统计查询

### 智能重试机制

SDK 实现了带有指数退避的智能重试机制，自动处理网络故障和临时错误。

```typescript
// 配置重试设置
client.configureRetry({
  maxAttempts: 5, // 最大重试次数
  baseDelay: 2000, // 基础延迟2秒
});

// 重试会自动应用于所有请求
try {
  const route = await client.routes.get("route-id");
  // 如果请求失败，SDK会自动重试（最多5次）
} catch (error) {
  // 所有重试都失败后才抛出错误
  console.log("所有重试都失败:", error.message);
}

// 重试机制会智能跳过某些错误类型：
// - 认证错误 (401)
// - 权限错误 (403)
// - 资源不存在 (404)
// - 数据验证错误
// - 资源已存在冲突
```

**重试特性：**

- 指数退避算法，避免请求风暴
- 智能错误分类，只重试可恢复错误
- 可配置重试次数和延迟
- 随机抖动，防止同步重试

### 版本兼容性检测

SDK 自动检测 APISIX 版本并提供兼容性支持，确保在不同版本间正常工作。

```typescript
// 获取当前 APISIX 版本
const version = await client.getVersion();
console.log("APISIX 版本:", version);

// 检查版本兼容性
const isCompatible = await client.isVersionCompatible("3.2.0");
console.log("兼容 3.2.0:", isCompatible);

// 检查是否为 3.0 或更高版本
const isV3Plus = await client.isVersion3OrLater();
console.log("支持 v3+ 特性:", isV3Plus);

// 获取版本特定配置
const versionConfig = await client.getApiVersionConfig();
console.log("版本特性:", {
  支持凭据管理: versionConfig.supportsCredentials,
  支持 Secrets: versionConfig.supportsSecrets,
  支持新响应格式: versionConfig.supportsNewResponseFormat,
  支持流路由: versionConfig.supportsStreamRoutes,
  支持分页: versionConfig.supportsPagination,
});
```

**版本检测特性：**

- 自动版本检测和缓存
- 版本比较功能
- API 特性兼容性检查
- 降级支持旧版本

### 请求取消功能

SDK 支持请求取消，允许长时间运行的操作被中途终止。

```typescript
// 创建 AbortController
const controller = client.createAbortController();

// 发起可取消的请求
const requestPromise = client.routes.list(undefined, {
  signal: controller.signal,
});

// 取消请求
setTimeout(() => {
  controller.abort();
  console.log("请求已取消");
}, 1000);

try {
  const routes = await requestPromise;
} catch (error) {
  if (error.name === "AbortError") {
    console.log("请求被取消");
  } else {
    console.log("其他错误:", error.message);
  }
}
```

### 系统监控和统计

通过 Control API 获取详细的系统监控信息和统计数据。

```typescript
// 获取系统概览
const overview = await client.control.getSystemOverview();
console.log("系统概览:", {
  服务器信息: overview.server,
  模式信息: overview.schemas,
  健康状态: overview.health,
  上游健康: overview.upstreamHealth,
  发现服务: overview.discoveryServices,
});

// 获取内存统计
const memoryStats = await client.control.getMemoryStats();
console.log("内存使用:", memoryStats);

// 获取 Prometheus 指标
const metrics = await client.control.getPrometheusMetrics();
console.log("Prometheus 指标:", metrics.substring(0, 200) + "...");

// 健康检查
const isHealthy = await client.control.isHealthy();
console.log("系统健康状态:", isHealthy);

// 触发垃圾回收
const gcResult = await client.control.triggerGC();
console.log("GC 结果:", gcResult);
```

### 配置验证和建议系统

SDK 提供配置验证和建议功能，帮助优化 APISIX 配置。

```typescript
// 验证路由配置
const validation = await client.control.validateSchema("route", routeConfig, {
  validatePlugins: true,
  pluginName: "limit-count",
});

if (!validation.valid) {
  console.log("验证错误:", validation.errors);
  console.log("验证警告:", validation.warnings);
}

// 获取配置建议
const recommendations = await client.control.getValidationRecommendations();
console.log("可用插件:", recommendations.availablePlugins);
console.log("已弃用插件:", recommendations.deprecatedPlugins);
console.log("推荐设置:", recommendations.recommendedSettings);

// 检查模式兼容性
const compatibility = await client.control.getSchemaCompatibility("3.6.0");
console.log("兼容性检查:", {
  当前版本: compatibility.currentVersion,
  目标版本: compatibility.targetVersion,
  是否兼容: compatibility.compatible,
  破坏性变更: compatibility.breaking_changes,
  新特性: compatibility.new_features,
});
```

### 插件元数据管理

管理和查询插件的元数据信息。

```typescript
// 获取所有插件元数据
const pluginMetadata = await client.control.getPluginMetadata();
console.log("插件元数据:", pluginMetadata);

// 获取特定插件的元数据
const pluginInfo = await client.control.getPluginMetadataById("limit-count");
console.log("limit-count 插件信息:", pluginInfo);

// 重载插件
const reloadResult = await client.control.reloadPlugins();
console.log("插件重载结果:", reloadResult);
```

### Prometheus 集成

集成 Prometheus 监控，收集详细的性能指标。

```typescript
// 获取 Prometheus 指标
const metrics = await client.control.getPrometheusMetrics();

// 解析关键指标
const lines = metrics.split("\n");
const httpRequests = lines.find((line) =>
  line.startsWith("http_requests_total"),
);
const responseTime = lines.find((line) =>
  line.startsWith("apisix_http_latency_seconds"),
);

console.log("HTTP 请求总数:", httpRequests);
console.log("响应时间:", responseTime);

// 指标类型包括：
// - http_requests_total: HTTP 请求总数
// - apisix_http_latency_seconds: 响应时间
// - apisix_bandwidth_bytes: 带宽使用
// - apisix_connections_active: 活跃连接数
// - apisix_etcd_reachable: etcd 连接状态
```

## API 特性

### 批量操作

在单个请求中执行多个操作，支持错误处理和验证。

```typescript
// 路由批量操作
const operations = [
  {
    operation: "create" as const,
    data: {
      name: "api-route-1",
      uri: "/api/v1/users",
      methods: ["GET", "POST"],
      upstream: { type: "roundrobin", nodes: { "127.0.0.1:8080": 1 } },
    },
  },
  {
    operation: "update" as const,
    id: "existing-route-id",
    data: { desc: "Updated description" },
  },
  {
    operation: "delete" as const,
    id: "route-to-delete",
  },
];

const result = await client.routes.batchOperations(operations);

console.log(
  `总计: ${result.total}, 成功: ${result.successful}, 失败: ${result.failed}`,
);
result.results.forEach((res, idx) => {
  if (res.success) {
    console.log(`操作 ${idx + 1}: 成功`, res.data);
  } else {
    console.log(`操作 ${idx + 1}: 失败`, res.error);
  }
});

// SDK 级别的批量操作
const batchResult = await client.batchOperations("routes", operations, {
  continueOnError: true,
  validateBeforeExecution: true,
});
```

### 数据导入/导出

以多种格式导入和导出配置数据，支持冲突解决。

```typescript
// 导出路由到 JSON
const jsonData = await client.exportData("routes", {
  format: "json",
  pretty: true,
  exclude: ["create_time", "update_time"],
});

// 导出为 YAML
const yamlData = await client.exportData("routes", {
  format: "yaml",
  include: ["name", "uri", "methods", "upstream"],
});

// 使用策略导入数据
const importResult = await client.importData("routes", jsonData, {
  strategy: "merge", // 'replace' | 'merge' | 'skip_existing'
  validate: true,
  dryRun: false,
});

console.log(
  `导入结果: ${importResult.created} 个已创建, ${importResult.updated} 个已更新`,
);
if (importResult.errors.length > 0) {
  console.log("导入错误:", importResult.errors);
}
```

### OpenAPI 集成

从 OpenAPI 规范导入路由，并将 APISIX 路由导出为 OpenAPI 规范。

```typescript
// 从 OpenAPI 规范导入
const openApiSpec = {
  openapi: "3.0.0",
  info: { title: "My API", version: "1.0.0" },
  paths: {
    "/users": {
      get: {
        operationId: "getUsers",
        summary: "获取所有用户",
        "x-apisix-upstream": {
          type: "roundrobin",
          nodes: [{ host: "127.0.0.1", port: 8080, weight: 1 }],
        },
        "x-apisix-plugins": {
          "limit-count": { count: 100, time_window: 60 },
        },
      },
      post: {
        operationId: "createUser",
        summary: "创建用户",
        "x-apisix-service_id": "user-service",
      },
    },
  },
};

const importResult = await client.importFromOpenAPI(openApiSpec, {
  strategy: "merge",
  validateBeforeImport: true,
  defaultUpstream: {
    type: "roundrobin",
    nodes: [{ host: "127.0.0.1", port: 8080, weight: 1 }],
  },
});

// 导出为 OpenAPI 规范
const exportedSpec = await client.exportToOpenAPI({
  title: "APISIX Routes API",
  version: "1.0.0",
  serverUrl: "https://api.example.com",
  includeDisabled: false,
  filterByLabels: { env: "production" },
});
```

### 高级搜索

使用多种条件和复杂过滤进行路由搜索。

```typescript
// 高级路由搜索
const searchResults = await client.searchRoutes({
  uriPattern: "/api/v1",
  methods: ["GET", "POST"],
  hosts: ["api.example.com"],
  plugins: ["limit-count", "cors"],
  status: 1, // 仅启用的路由
  hasUpstream: true,
  labels: { env: "production", team: "backend" },
  createdAfter: new Date("2024-01-01"),
  createdBefore: new Date("2024-12-31"),
});

// 使用路由特定的高级搜索
const routes = await client.routes.search({
  uri: "/api/users",
  methods: ["GET"],
  hasService: true,
  plugins: ["jwt-auth"],
});
```

### 数据验证

在应用更改之前，根据 APISIX Schema 验证配置数据。

```typescript
// 验证路由配置
const routeConfig = {
  name: "test-route",
  uri: "/api/test",
  methods: ["GET"],
  upstream: {
    type: "roundrobin",
    nodes: [{ host: "127.0.0.1", port: 8080, weight: 1 }],
  },
  plugins: {
    "limit-count": { count: 100, time_window: 60 },
  },
};

const validation = await client.validateData("route", routeConfig, {
  validatePlugins: true,
});

if (!validation.valid) {
  console.log("验证错误:", validation.errors);
  console.log("验证警告:", validation.warnings);
} else {
  console.log("配置有效");
}

// 获取配置建议
const recommendations = await client.getConfigurationRecommendations();
console.log("可用插件:", recommendations.availablePlugins);
console.log("已弃用插件:", recommendations.deprecatedPlugins);
console.log("推荐设置:", recommendations.recommendedSettings);
```

### Schema 兼容性

检查 Schema 兼容性和迁移建议。

```typescript
// 检查 Schema 兼容性
const compatibility = await client.getSchemaCompatibility("3.6.0");

console.log(
  `当前版本: ${compatibility.currentVersion}, 目标版本: ${compatibility.targetVersion}`,
);
console.log(`兼容: ${compatibility.compatible}`);

if (compatibility.breaking_changes.length > 0) {
  console.log("破坏性变更:", compatibility.breaking_changes);
}

if (compatibility.new_features.length > 0) {
  console.log("新特性:", compatibility.new_features);
}
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
