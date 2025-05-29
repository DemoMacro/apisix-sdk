# Apache APISIX Control API Documentation

The Apache APISIX Control API provides monitoring, health checking, and runtime information endpoints. This SDK provides comprehensive access to all Control API features with full TypeScript support.

## Table of Contents

- [Overview](#overview)
- [Configuration](#configuration)
- [Health Monitoring](#health-monitoring)
- [Server Information](#server-information)
- [Schema Management](#schema-management)
- [Plugin Information](#plugin-information)
- [Metrics and Monitoring](#metrics-and-monitoring)
- [Discovery Services](#discovery-services)
- [System Overview](#system-overview)
- [Error Handling](#error-handling)
- [Examples](#examples)

## Overview

The Control API is designed for monitoring and managing APISIX runtime status. Unlike the Admin API which is used for configuration management, the Control API provides read-only access to runtime information, health status, and metrics.

### Base Configuration

- **Default Port**: 9090 (configurable)
- **Default Base Path**: `/v1`
- **Protocol**: HTTP/HTTPS
- **Authentication**: Usually not required (internal use)

### Enabling Control API

The Control API is enabled by default but can be configured in `config.yaml`:

```yaml
apisix:
  enable_control: true
  control:
    ip: "0.0.0.0"
    port: 9090
```

## Configuration

### SDK Configuration

```typescript
import { ApisixSDK } from "apisix-sdk";

const client = new ApisixSDK({
  baseURL: "http://127.0.0.1:9180", // Admin API URL
  controlURL: "http://127.0.0.1:9090", // Control API URL (optional)
  apiKey: "your-api-key",
});
```

### Control API Interface

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

## Health Monitoring

### Health Check

Monitor the overall health status of APISIX.

```typescript
// Basic health check
const health = await client.control.healthCheck();

console.log("Status:", health.status); // "ok" | "error"
if (health.info) {
  console.log("Version:", health.info.version);
  console.log("Hostname:", health.info.hostname);
  console.log("Uptime:", health.info.up_time);
}
```

#### Health Check Response

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

### Upstream Health

Monitor the health status of upstream nodes.

```typescript
// Get upstream health status
const upstreamHealth = await client.control.getUpstreamHealth();

upstreamHealth.forEach((upstream) => {
  console.log(`Upstream: ${upstream.name}`);
  console.log(`Type: ${upstream.type}`);

  upstream.nodes.forEach((node) => {
    console.log(`  ${node.host}:${node.port} - ${node.status}`);
    console.log(`    Success: ${node.counter.success}`);
    console.log(`    HTTP Failures: ${node.counter.http_failure}`);
    console.log(`    TCP Failures: ${node.counter.tcp_failure}`);
    console.log(`    Timeouts: ${node.counter.timeout_failure}`);
  });
});
```

#### Upstream Health Response

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

## Server Information

Get detailed information about the APISIX server instance.

```typescript
// Get server information
const serverInfo = await client.control.getServerInfo();

console.log("Hostname:", serverInfo.hostname);
console.log("Version:", serverInfo.version);
console.log("Boot Time:", new Date(serverInfo.boot_time * 1000));
console.log("Uptime:", serverInfo.up_time, "seconds");
console.log("Last Report:", new Date(serverInfo.last_report_time * 1000));
console.log("etcd Version:", serverInfo.etcd_version);
```

### Server Info Response

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

## Schema Management

Access configuration schemas for validation and documentation.

```typescript
// Get all schemas
const schemas = await client.control.getSchemas();

// Main resource schemas
console.log("Route schema:", schemas.main.route.properties);
console.log("Upstream schema:", schemas.main.upstream.properties);
console.log("Service schema:", schemas.main.service.properties);

// Plugin schemas
Object.entries(schemas.plugins).forEach(([name, schema]) => {
  console.log(`Plugin ${name}:`, {
    type: schema.type,
    priority: schema.priority,
    version: schema.version,
  });
});

// Stream plugin schemas
Object.entries(schemas["stream-plugins"]).forEach(([name, schema]) => {
  console.log(`Stream plugin ${name}:`, schema);
});

// Validate configuration data
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
  console.log("Validation errors:", validation.errors);
  console.log("Validation warnings:", validation.warnings);
}

// Get validation recommendations
const recommendations = await client.control.getValidationRecommendations();
console.log("Available plugins:", recommendations.availablePlugins);
console.log("Deprecated plugins:", recommendations.deprecatedPlugins);
console.log("Recommended settings:", recommendations.recommendedSettings);

// Check schema compatibility
const compatibility = await client.control.getSchemaCompatibility("3.6.0");
console.log("Schema compatibility:", compatibility);
```

### Schema Info Response

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

## Plugin Information

Get information about available plugins and their status.

```typescript
// Get plugin list
const plugins = await client.control.getPlugins();

Object.entries(plugins).forEach(([name, enabled]) => {
  console.log(`Plugin ${name}: ${enabled ? "enabled" : "disabled"}`);
});

// Check specific plugin
if (plugins["limit-count"]) {
  console.log("Rate limiting is available");
}
```

### Plugin List Response

```typescript
interface PluginList {
  [pluginName: string]: boolean;
}
```

## Metrics and Monitoring

### Prometheus Metrics

Get Prometheus-formatted metrics for monitoring and alerting.

```typescript
// Get Prometheus metrics
const metrics = await client.control.getPrometheusMetrics();

console.log("Raw metrics:", metrics.metrics);

// Parse metrics for specific values
const lines = metrics.metrics.split("\n");
const httpRequests = lines.find((line) =>
  line.startsWith("apisix_http_requests_total"),
);
console.log("HTTP requests metric:", httpRequests);
```

### Prometheus Metrics Response

```typescript
interface PrometheusMetrics {
  metrics: string; // Raw Prometheus metrics format
}
```

### System Overview

Get a comprehensive overview of system status and statistics.

```typescript
// Get system overview
const overview = await client.control.getSystemOverview();

console.log("System Overview:", {
  totalRoutes: overview.routes?.total,
  totalServices: overview.services?.total,
  totalUpstreams: overview.upstreams?.total,
  totalConsumers: overview.consumers?.total,
  healthyUpstreams: overview.upstreams?.healthy,
  unhealthyUpstreams: overview.upstreams?.unhealthy,
});
```

## Discovery Services

Monitor service discovery integration and status.

### Discovery Services Status

```typescript
// Get discovery services
const discovery = await client.control.getDiscoveryServices();

console.log("Discovery Services:");
Object.entries(discovery.services).forEach(([serviceName, nodes]) => {
  console.log(`Service: ${serviceName}`);
  nodes.forEach((node) => {
    console.log(`  ${node.host}:${node.port} (weight: ${node.weight})`);
  });
});

console.log("Last Update:", new Date(discovery.last_update * 1000));
console.log("Expires:", new Date(discovery.expire * 1000));
```

### Discovery Services Response

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

### Discovery Dump

Get detailed discovery service configuration and endpoints.

```typescript
// Get discovery dump
const dump = await client.control.getDiscoveryDump();

console.log("Discovery Endpoints:");
dump.endpoints.forEach((endpoint) => {
  console.log(`ID: ${endpoint.id}`);
  endpoint.endpoints.forEach((ep) => {
    console.log(`  ${ep.name}: ${ep.value}`);
  });
});

console.log("Discovery Config:");
dump.config.forEach((config) => {
  console.log(`Service ID: ${config.id}`);
  console.log(`Default Weight: ${config.default_weight}`);
  console.log(`Service: ${config.service.host}:${config.service.port}`);
});
```

### Discovery Dump Response

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

## Error Handling

```typescript
try {
  const health = await client.control.healthCheck();
  if (health.status === "error") {
    console.error("APISIX is not healthy");
    // Handle unhealthy state
  }
} catch (error) {
  console.error("Failed to check health:", error.message);
  // Handle network or other errors
}
```

## Examples

### Complete Health Monitoring

```typescript
async function monitorApisixHealth() {
  try {
    // Check overall health
    const health = await client.control.healthCheck();
    console.log("APISIX Health:", health.status);

    if (health.status === "error") {
      console.error("APISIX is unhealthy!");
      return;
    }

    // Get server info
    const serverInfo = await client.control.getServerInfo();
    console.log(
      `APISIX ${serverInfo.version} running on ${serverInfo.hostname}`,
    );
    console.log(`Uptime: ${Math.floor(serverInfo.up_time / 3600)} hours`);

    // Check upstream health
    const upstreamHealth = await client.control.getUpstreamHealth();
    const unhealthyUpstreams = upstreamHealth.filter((upstream) =>
      upstream.nodes.some(
        (node) =>
          node.status === "unhealthy" || node.status === "mostly_unhealthy",
      ),
    );

    if (unhealthyUpstreams.length > 0) {
      console.warn(
        `${unhealthyUpstreams.length} upstreams have unhealthy nodes`,
      );
      unhealthyUpstreams.forEach((upstream) => {
        console.warn(`Upstream ${upstream.name} has issues`);
      });
    }

    // Get system overview
    const overview = await client.control.getSystemOverview();
    console.log("System Stats:", {
      routes: overview.routes?.total || 0,
      services: overview.services?.total || 0,
      upstreams: overview.upstreams?.total || 0,
      consumers: overview.consumers?.total || 0,
    });
  } catch (error) {
    console.error("Health monitoring failed:", error.message);
  }
}

// Run monitoring every 30 seconds
setInterval(monitorApisixHealth, 30000);
```

### Plugin and Schema Information

```typescript
async function getPluginInfo() {
  try {
    // Get available plugins
    const plugins = await client.control.getPlugins();
    const enabledPlugins = Object.entries(plugins)
      .filter(([, enabled]) => enabled)
      .map(([name]) => name);

    console.log("Enabled Plugins:", enabledPlugins);

    // Get schemas for validation
    const schemas = await client.control.getSchemas();

    // Check if specific plugins are available
    const requiredPlugins = ["limit-count", "cors", "jwt-auth"];
    const missingPlugins = requiredPlugins.filter((plugin) => !plugins[plugin]);

    if (missingPlugins.length > 0) {
      console.warn("Missing required plugins:", missingPlugins);
    }

    // Get plugin schema for validation
    const limitCountSchema = schemas.plugins["limit-count"];
    if (limitCountSchema) {
      console.log("Rate limiting plugin schema:", limitCountSchema.schema);
    }
  } catch (error) {
    console.error("Failed to get plugin info:", error.message);
  }
}
```

### Metrics Collection

```typescript
async function collectMetrics() {
  try {
    // Get Prometheus metrics
    const metrics = await client.control.getPrometheusMetrics();

    // Parse specific metrics
    const lines = metrics.metrics.split("\n");

    // Extract HTTP request metrics
    const httpRequestLines = lines.filter((line) =>
      line.startsWith("apisix_http_requests_total"),
    );

    console.log("HTTP Request Metrics:");
    httpRequestLines.forEach((line) => {
      const match = line.match(/apisix_http_requests_total\{([^}]+)\}\s+(\d+)/);
      if (match) {
        const labels = match[1];
        const value = match[2];
        console.log(`  ${labels}: ${value} requests`);
      }
    });

    // Extract latency metrics
    const latencyLines = lines.filter((line) =>
      line.startsWith("apisix_http_latency"),
    );

    console.log("Latency Metrics:");
    latencyLines.forEach((line) => {
      console.log(`  ${line}`);
    });
  } catch (error) {
    console.error("Failed to collect metrics:", error.message);
  }
}
```

### Discovery Service Monitoring

```typescript
async function monitorDiscoveryServices() {
  try {
    // Get discovery services
    const discovery = await client.control.getDiscoveryServices();

    console.log("Discovery Services Status:");
    console.log(`Last Update: ${new Date(discovery.last_update * 1000)}`);
    console.log(`Expires: ${new Date(discovery.expire * 1000)}`);

    // Check service health
    Object.entries(discovery.services).forEach(([serviceName, nodes]) => {
      console.log(`\nService: ${serviceName}`);
      console.log(`  Nodes: ${nodes.length}`);

      nodes.forEach((node, index) => {
        console.log(
          `    ${index + 1}. ${node.host}:${node.port} (weight: ${node.weight})`,
        );
      });
    });

    // Get detailed dump
    const dump = await client.control.getDiscoveryDump();

    console.log("\nDiscovery Configuration:");
    dump.config.forEach((config) => {
      console.log(`  Service: ${config.id}`);
      console.log(`    Host: ${config.service.host}:${config.service.port}`);
      console.log(`    Schema: ${config.service.schema}`);
      console.log(`    Default Weight: ${config.default_weight}`);
    });
  } catch (error) {
    console.error("Failed to monitor discovery services:", error.message);
  }
}
```

## Best Practices

### Monitoring Strategy

1. **Regular Health Checks**: Implement periodic health monitoring
2. **Upstream Monitoring**: Monitor upstream node health status
3. **Metrics Collection**: Collect and analyze Prometheus metrics
4. **Alerting**: Set up alerts for unhealthy states
5. **Discovery Monitoring**: Monitor service discovery status

### Performance Considerations

1. **Caching**: Cache schema and plugin information
2. **Rate Limiting**: Don't overwhelm the Control API with requests
3. **Error Handling**: Implement proper error handling and retries
4. **Logging**: Log monitoring activities for debugging

### Integration Examples

```typescript
// Integration with monitoring systems
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
          await this.alerting.sendAlert("APISIX is unhealthy", "critical");
        }

        const upstreamHealth = await this.client.control.getUpstreamHealth();
        const unhealthyCount = upstreamHealth.filter((u) =>
          u.nodes.some((n) => n.status.includes("unhealthy")),
        ).length;

        if (unhealthyCount > 0) {
          await this.alerting.sendAlert(
            `${unhealthyCount} upstreams have unhealthy nodes`,
            "warning",
          );
        }
      } catch (error) {
        await this.alerting.sendAlert(
          `Monitoring failed: ${error.message}`,
          "error",
        );
      }
    }, 30000); // Check every 30 seconds
  }
}
```

For more examples and advanced usage, see the [playground directory](../../playground/).
