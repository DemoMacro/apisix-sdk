# Apache APISIX 控制 API 文档

Apache APISIX 控制 API 提供了监控、健康检查和运行时信息端点。此 SDK 提供对所有控制 API 功能的全面访问，并提供完整的 TypeScript 支持。

## 目录

- [概述](#概述)
- [配置](#配置)
- [健康监控](#健康监控)
- [服务器信息](#服务器信息)
- [Schema 管理](#schema-管理)
- [插件信息](#插件信息)
- [指标和监控](#指标和监控)
- [服务发现](#服务发现)
- [系统概览](#系统概览)
- [错误处理](#错误处理)
- [示例](#示例)

## 概述

控制 API 旨在监控和管理 APISIX 运行时状态。与用于配置管理的管理 API 不同，控制 API 提供对运行时信息、健康状态和指标的只读访问。

### 基本配置

- **默认端口**: 9090 (可配置)
- **默认基础路径**: `/v1`
- **协议**: HTTP/HTTPS
- **认证**: 通常不需要 (内部使用)

### 启用控制 API

控制 API 默认启用，但可以在 `config.yaml` 中配置：

```yaml
apisix:
  enable_control: true
  control:
    ip: "0.0.0.0"
    port: 9090
```

## 配置

### SDK 配置

```typescript
import { ApisixSDK } from "apisix-sdk";

const client = new ApisixSDK({
  adminAPI: {
    baseURL: "http://127.0.0.1:9180", // Admin API URL
    apiKey: "your-api-key",
  },
  controlAPI: {
    baseURL: "http://127.0.0.1:9090", // Control API URL
  },
});
```

### 控制 API 接口

```typescript
interface ControlAPI {
  healthCheck(): Promise<HealthCheckStatus>;
  getServerInfo(): Promise<ServerInfo>;
  getSchemas(): Promise<SchemaInfo>;
  getPlugins(): Promise<PluginList>;
  getPrometheusMetrics(): Promise<PrometheusMetrics>;
  getUpstreamHealth(): Promise<UpstreamHealth[]>;
  getDiscoveryServices(): Promise<DiscoveryServices>;
  getDiscoveryDump(): Promise<DiscoveryDump>;
  getSystemOverview(): Promise<SystemOverview>;
}
```

## 健康监控

### 健康检查

监控 APISIX 的整体健康状态。

```typescript
// 基本健康检查
const health = await client.control.healthCheck();

console.log("状态:", health.status); // "ok" | "error"
if (health.info) {
  console.log("版本:", health.info.version);
  console.log("主机名:", health.info.hostname);
  console.log("运行时间:", health.info.up_time);
}
```

#### 健康检查响应

```typescript
interface HealthCheckStatus {
  status: "ok" | "error";
  info?: {
    version: string;
    hostname: string;
    up_time: number;
  };
}
```

### 上游健康

监控上游节点的健康状态。

```typescript
// 获取上游健康状态
const upstreamHealth = await client.control.getUpstreamHealth();

upstreamHealth.forEach((upstream) => {
  console.log(`上游: ${upstream.name}`);
  console.log(`类型: ${upstream.type}`);

  upstream.nodes.forEach((node) => {
    console.log(`  ${node.host}:${node.port} - ${node.status}`);
    console.log(`    成功: ${node.counter.success}`);
    console.log(`    HTTP 失败: ${node.counter.http_failure}`);
    console.log(`    TCP 失败: ${node.counter.tcp_failure}`);
    console.log(`    超时失败: ${node.counter.timeout_failure}`);
  });
});
```

#### 上游健康响应

```typescript
interface UpstreamHealth {
  name: string;
  type: "http" | "https" | "tcp";
  nodes: UpstreamHealthNode[];
}

interface UpstreamHealthNode {
  host: string;
  port: number;
  status: "healthy" | "unhealthy" | "mostly_healthy" | "mostly_unhealthy";
  counter: {
    http_failure: number;
    tcp_failure: number;
    timeout_failure: number;
    success: number;
  };
}
```

## 服务器信息

获取有关 APISIX 服务器实例的详细信息。

```typescript
// 获取服务器信息
const serverInfo = await client.control.getServerInfo();

console.log("主机名:", serverInfo.hostname);
console.log("版本:", serverInfo.version);
console.log("启动时间:", new Date(serverInfo.boot_time * 1000));
console.log("运行时间:", serverInfo.up_time, "秒");
console.log("最后报告时间:", new Date(serverInfo.last_report_time * 1000));
console.log("etcd 版本:", serverInfo.etcd_version);
```

### 服务器信息响应

```typescript
interface ServerInfo {
  hostname: string;
  version: string;
  up_time: number;
  boot_time: number;
  last_report_time: number;
  etcd_version: string;
}
```

## Schema 管理

访问配置 Schema 以进行验证和文档记录。

```typescript
// 获取所有 Schema
const schemas = await client.control.getSchemas();

// 主要资源 Schema
console.log("路由 Schema:", schemas.main.route.properties);
console.log("上游 Schema:", schemas.main.upstream.properties);
console.log("服务 Schema:", schemas.main.service.properties);

// 插件 Schema
Object.entries(schemas.plugins).forEach(([name, schema]) => {
  console.log(`插件 ${name}:`, {
    type: schema.type,
    priority: schema.priority,
    version: schema.version,
  });
});

// 流插件 Schema
Object.entries(schemas["stream-plugins"]).forEach(([name, schema]) => {
  console.log(`流插件 ${name}:`, schema);
});

// 验证配置数据
const validation = await client.control.validateSchema(
  "route",
  {
    name: "test-route",
    uri: "/test",
    methods: ["GET"],
    upstream: {
      type: "roundrobin",
      nodes: [{ host: "127.0.0.1", port: 8080, weight: 1 }],
    },
  },
  {
    validatePlugins: true,
  },
);

if (!validation.valid) {
  console.log("验证错误:", validation.errors);
  console.log("验证警告:", validation.warnings);
}

// 获取验证建议
const recommendations = await client.control.getValidationRecommendations();
console.log("可用插件:", recommendations.availablePlugins);
console.log("已弃用插件:", recommendations.deprecatedPlugins);
console.log("推荐设置:", recommendations.recommendedSettings);

// 检查 Schema 兼容性
const compatibility = await client.control.getSchemaCompatibility("3.6.0");
console.log("Schema 兼容性:", compatibility);
```

### Schema 信息响应

```typescript
interface SchemaInfo {
  main: {
    route: { properties: object };
    upstream: { properties: object };
    service: { properties: object };
    consumer: { properties: object };
    ssl: { properties: object };
    [key: string]: { properties: object };
  };
  plugins: Record<
    string,
    {
      consumer_schema?: object;
      metadata_schema?: object;
      schema?: object;
      type?: string;
      priority?: number;
      version?: number;
    }
  >;
  "stream-plugins": Record<string, object>;
}
```

## 插件信息

获取有关可用插件及其状态的信息。

```typescript
// 获取插件列表
const plugins = await client.control.getPlugins();

Object.entries(plugins).forEach(([name, enabled]) => {
  console.log(`插件 ${name}: ${enabled ? "已启用" : "已禁用"}`);
});

// 检查特定插件
if (plugins["limit-count"]) {
  console.log("限流插件可用");
}
```

### 插件列表响应

```typescript
interface PluginList {
  [pluginName: string]: boolean;
}
```

## 指标和监控

### Prometheus 指标

获取 Prometheus 格式的指标以进行监控和报警。

```typescript
// 获取 Prometheus 指标
const metrics = await client.control.getPrometheusMetrics();

console.log("原始指标:", metrics.metrics);

// 解析特定值的指标
const lines = metrics.metrics.split("\n");
const httpRequests = lines.find((line) =>
  line.startsWith("apisix_http_requests_total"),
);
console.log("HTTP 请求指标:", httpRequests);
```

### Prometheus 指标响应

```typescript
interface PrometheusMetrics {
  metrics: string; // 原始 Prometheus 指标格式
}
```

### 系统概览

获取系统状态和统计信息的全面概览。

```typescript
// 获取系统概览
const overview = await client.control.getSystemOverview();

console.log("系统概览:", {
  总路由: overview.routes?.total,
  总服务: overview.services?.total,
  总上游: overview.upstreams?.total,
  总消费者: overview.consumers?.total,
  健康上游: overview.upstreams?.healthy,
  不健康上游: overview.upstreams?.unhealthy,
});
```

## 服务发现

监控服务发现集成和状态。

### 服务发现状态

```typescript
// 获取服务发现服务
const discovery = await client.control.getDiscoveryServices();

console.log("服务发现服务:");
Object.entries(discovery.services).forEach(([serviceName, nodes]) => {
  console.log(`服务: ${serviceName}`);
  nodes.forEach((node) => {
    console.log(`  ${node.host}:${node.port} (权重: ${node.weight})`);
  });
});

console.log("最后更新时间:", new Date(discovery.last_update * 1000));
console.log("过期时间:", new Date(discovery.expire * 1000));
```

### 服务发现响应

```typescript
interface DiscoveryServices {
  services: Record<
    string,
    Array<{
      host: string;
      port: number;
      weight: number;
    }>
  >;
  expire: number;
  last_update: number;
}
```

### 服务发现 Dump

获取详细的服务发现配置和端点。

```typescript
// 获取服务发现 dump
const dump = await client.control.getDiscoveryDump();

console.log("服务发现端点:");
dump.endpoints.forEach((endpoint) => {
  console.log(`ID: ${endpoint.id}`);
  endpoint.endpoints.forEach((ep) => {
    console.log(`  ${ep.name}: ${ep.value}`);
  });
});

console.log("服务发现配置:");
dump.config.forEach((config) => {
  console.log(`服务 ID: ${config.id}`);
  console.log(`默认权重: ${config.default_weight}`);
  console.log(`服务: ${config.service.host}:${config.service.port}`);
});
```

### 服务发现 Dump 响应

```typescript
interface DiscoveryDump {
  endpoints: Array<{
    endpoints: Array<{
      value: string;
      name: string;
    }>;
    id: string;
  }>;
  config: Array<{
    default_weight: number;
    id: string;
    client: Record<string, unknown>;
    service: {
      host: string;
      port: string;
      schema: string;
    };
    shared_size: string;
  }>;
}
```

## 错误处理

```typescript
try {
  const health = await client.control.healthCheck();
  if (health.status === "error") {
    console.error("APISIX 不健康");
    // 处理不健康状态
  }
} catch (error) {
  console.error("健康检查失败:", error.message);
  // 处理网络或其他错误
}
```

## 示例

### 完整的健康监控示例

```typescript
async function monitorApisixHealth() {
  try {
    // 检查整体健康
    const health = await client.control.healthCheck();
    console.log("APISIX 健康状态:", health.status);

    if (health.status === "error") {
      console.error("APISIX 不健康！");
      return;
    }

    // 获取服务器信息
    const serverInfo = await client.control.getServerInfo();
    console.log(`APISIX ${serverInfo.version} 运行在 ${serverInfo.hostname}`);
    console.log(`运行时间: ${Math.floor(serverInfo.up_time / 3600)} 小时`);

    // 检查上游健康
    const upstreamHealth = await client.control.getUpstreamHealth();
    const unhealthyUpstreams = upstreamHealth.filter((upstream) =>
      upstream.nodes.some(
        (node) =>
          node.status === "unhealthy" || node.status === "mostly_unhealthy",
      ),
    );

    if (unhealthyUpstreams.length > 0) {
      console.warn(`${unhealthyUpstreams.length} 个上游存在不健康节点`);
      unhealthyUpstreams.forEach((upstream) => {
        console.warn(`上游 ${upstream.name} 存在问题`);
      });
    }

    // 获取系统概览
    const overview = await client.control.getSystemOverview();
    console.log("系统统计信息:", {
      路由: overview.routes?.total || 0,
      服务: overview.services?.total || 0,
      上游: overview.upstreams?.total || 0,
      消费者: overview.consumers?.total || 0,
    });
  } catch (error) {
    console.error("健康监控失败:", error.message);
  }
}

// 每 30 秒运行一次监控
setInterval(monitorApisixHealth, 30000);
```

### 插件和 Schema 信息示例

```typescript
async function getPluginInfo() {
  try {
    // 获取可用插件
    const plugins = await client.control.getPlugins();
    const enabledPlugins = Object.entries(plugins)
      .filter(([, enabled]) => enabled)
      .map(([name]) => name);

    console.log("已启用插件:", enabledPlugins);

    // 获取 Schema 以进行验证
    const schemas = await client.control.getSchemas();

    // 检查是否存在特定插件
    const requiredPlugins = ["limit-count", "cors", "jwt-auth"];
    const missingPlugins = requiredPlugins.filter((plugin) => !plugins[plugin]);

    if (missingPlugins.length > 0) {
      console.warn("缺少所需插件:", missingPlugins);
    }

    // 获取插件 Schema 以进行验证
    const limitCountSchema = schemas.plugins["limit-count"];
    if (limitCountSchema) {
      console.log("限流插件 Schema:", limitCountSchema.schema);
    }
  } catch (error) {
    console.error("获取插件信息失败:", error.message);
  }
}
```

### 指标收集示例

```typescript
async function collectMetrics() {
  try {
    // 获取 Prometheus 指标
    const metrics = await client.control.getPrometheusMetrics();

    // 解析特定指标
    const lines = metrics.metrics.split("\n");

    // 提取 HTTP 请求指标
    const httpRequestLines = lines.filter((line) =>
      line.startsWith("apisix_http_requests_total"),
    );

    console.log("HTTP 请求指标:");
    httpRequestLines.forEach((line) => {
      const match = line.match(/apisix_http_requests_total\{([^}]+)\}\s+(\d+)/);
      if (match) {
        const labels = match[1];
        const value = match[2];
        console.log(`  ${labels}: ${value} 个请求`);
      }
    });

    // 提取延迟指标
    const latencyLines = lines.filter((line) =>
      line.startsWith("apisix_http_latency"),
    );

    console.log("延迟指标:");
    latencyLines.forEach((line) => {
      console.log(`  ${line}`);
    });
  } catch (error) {
    console.error("收集指标失败:", error.message);
  }
}
```

### 服务发现监控示例

```typescript
async function monitorDiscoveryServices() {
  try {
    // 获取服务发现服务
    const discovery = await client.control.getDiscoveryServices();

    console.log("服务发现服务状态:");
    console.log(`最后更新时间: ${new Date(discovery.last_update * 1000)}`);
    console.log(`过期时间: ${new Date(discovery.expire * 1000)}`);

    // 检查服务健康
    Object.entries(discovery.services).forEach(([serviceName, nodes]) => {
      console.log(`\n服务: ${serviceName}`);
      console.log(`  节点数: ${nodes.length}`);

      nodes.forEach((node, index) => {
        console.log(
          `    ${index + 1}. ${node.host}:${node.port} (权重: ${node.weight})`,
        );
      });
    });

    // 获取详细 Dump
    const dump = await client.control.getDiscoveryDump();

    console.log("\n服务发现配置:");
    dump.config.forEach((config) => {
      console.log(`  服务: ${config.id}`);
      console.log(`    主机: ${config.service.host}:${config.service.port}`);
      console.log(`    Schema: ${config.service.schema}`);
      console.log(`    默认权重: ${config.default_weight}`);
    });
  } catch (error) {
    console.error("监控服务发现服务失败:", error.message);
  }
}
```

## 最佳实践

### 监控策略

1. **定期健康检查**: 实现周期性健康监控
2. **上游监控**: 监控上游节点健康状态
3. **指标收集**: 收集和分析 Prometheus 指标
4. **报警**: 设置不健康状态的报警
5. **服务发现监控**: 监控服务发现状态

### 性能注意事项

1. **缓存**: 缓存 Schema 和插件信息
2. **限流**: 不要用大量请求压垮控制 API
3. **错误处理**: 实现适当的错误处理和重试机制
4. **日志记录**: 记录监控活动以供调试

### 集成示例

```typescript
// 与监控系统集成
class ApisixMonitor {
  private client: ApisixSDK;
  private alerting: AlertingService;

  constructor(client: ApisixSDK, alerting: AlertingService) {
    this.client = client;
    this.alerting = alerting;
  }

  async startMonitoring() {
    setInterval(async () => {
      try {
        const health = await this.client.control.healthCheck();

        if (health.status === "error") {
          await this.alerting.sendAlert("APISIX 不健康", "critical");
        }

        const upstreamHealth = await this.client.control.getUpstreamHealth();
        const unhealthyCount = upstreamHealth.filter((u) =>
          u.nodes.some((n) => n.status.includes("unhealthy")),
        ).length;

        if (unhealthyCount > 0) {
          await this.alerting.sendAlert(
            `${unhealthyCount} 个上游存在不健康节点`,
            "warning",
          );
        }
      } catch (error) {
        await this.alerting.sendAlert(`监控失败: ${error.message}`, "error");
      }
    }, 30000); // 每 30 秒检查一次
  }
}
```

更多示例和高级用法请参见 [playground 目录](../../playground/)。
