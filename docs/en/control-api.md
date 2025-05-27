# Apache APISIX Control API Documentation

The Apache APISIX Control API provides runtime information, health checks, monitoring data, and operational insights about your APISIX instance. Unlike the Admin API which manages configuration, the Control API is focused on real-time status information and debugging capabilities.

## Overview

The Control API exposes various operational endpoints that help monitor APISIX runtime status, plugin information, health checks, and debugging data. It's primarily used for monitoring, troubleshooting, and integrating with external monitoring systems.

## Configuration

### Base Configuration

- **Default Port**: 9090
- **Default Base Path**: `/`
- **Access**: Usually unrestricted (configure for security)
- **Authentication**: Generally not required

### Setup Configuration (config.yaml)

```yaml
apisix:
  enable_control: true
  control:
    ip: "127.0.0.1" # Control API listen IP
    port: 9090 # Control API port
    router: # Optional: enable parameter matching
      match:
        - "/v1/plugin/example-plugin/hello"
```

### SDK Configuration

```typescript
const client = new ApisixSDK({
  baseURL: "http://127.0.0.1:9090", // Control API port
  // No API key required for most endpoints
});
```

## Core Endpoints

### Health Check

Monitor the health status of APISIX instance and upstreams.

#### Health Check Operations

- `GET /v1/healthcheck` - Get overall health status
- `GET /v1/healthcheck/upstreams` - Get all upstream health status
- `GET /v1/healthcheck/upstreams/{upstream_id}` - Get specific upstream health

#### Health Check Interfaces

```typescript
interface HealthCheck {
  status: "ok" | "error";
  info?: {
    version: string;
    hostname: string;
    up_time: number;
  };
}

interface UpstreamHealthNode {
  host: string;
  port: number;
  status: "healthy" | "unhealthy";
  counter: {
    http_failure: number;
    tcp_failure: number;
    timeout_failure: number;
    success: number;
  };
}

interface UpstreamHealth {
  name: string;
  nodes: UpstreamHealthNode[];
}
```

#### Health Check Examples

```bash
# Check overall health
curl http://127.0.0.1:9090/v1/healthcheck

# Check upstream health
curl http://127.0.0.1:9090/v1/healthcheck/upstreams

# Check specific upstream
curl http://127.0.0.1:9090/v1/healthcheck/upstreams/1
```

### Server Information

Get detailed server information and runtime statistics.

#### Server Info Operations

- `GET /v1/server_info` - Get comprehensive server information
- `GET /v1/upstreams` - List all upstreams with real-time status
- `GET /v1/upstreams/{upstream_id}` - Get specific upstream runtime info

#### Server Info Interface

```typescript
interface ServerInfo {
  hostname: string; // Server hostname
  version: string; // APISIX version
  up_time: number; // Uptime in seconds
  boot_time: number; // Boot timestamp
  last_report_time: number; // Last report timestamp
  etcd_version: string; // etcd version
}
```

#### Server Info Examples

```bash
# Get server information
curl http://127.0.0.1:9090/v1/server_info -s | jq .

# Example response
{
  "hostname": "apisix-server",
  "version": "3.12.0",
  "up_time": 3600,
  "boot_time": 1701234567,
  "last_report_time": 1701238167,
  "etcd_version": "3.5.4"
}
```

### Schema Information

Retrieve schema definitions for resources and plugins.

#### Schema Operations

- `GET /v1/schema` - Get all available schemas
- `GET /v1/schema/route` - Get route schema
- `GET /v1/schema/service` - Get service schema
- `GET /v1/schema/upstream` - Get upstream schema
- `GET /v1/schema/consumer` - Get consumer schema
- `GET /v1/schema/ssl` - Get SSL schema
- `GET /v1/schema/plugin/{plugin_name}` - Get specific plugin schema

#### Schema Examples

```bash
# Get all schemas
curl http://127.0.0.1:9090/v1/schema

# Get route schema
curl http://127.0.0.1:9090/v1/schema/route

# Get plugin schema
curl http://127.0.0.1:9090/v1/schema/plugin/rate-limit
```

### Plugin Information

Access plugin-related information and metadata.

#### Plugin Operations

- `GET /v1/plugins` - List all loaded plugins
- `GET /v1/plugin/{plugin_name}` - Get specific plugin information
- `GET /v1/plugin_metadatas` - Get all plugin metadata
- `GET /v1/plugin_metadata/{plugin_name}` - Get specific plugin metadata

#### Plugin Interface

```typescript
interface PluginInfo {
  name: string;
  version: string;
  priority: number;
  schema: object;
  disable?: boolean;
}

interface PluginMetadata {
  id: string;
  [key: string]: any; // Plugin-specific metadata
}
```

#### Plugin Examples

```bash
# List all plugins
curl http://127.0.0.1:9090/v1/plugins

# Get plugin metadata
curl http://127.0.0.1:9090/v1/plugin_metadatas

# Example response
[
  {
    "log_format": {
      "upstream_response_time": "$upstream_response_time"
    },
    "id": "file-logger"
  },
  {
    "ikey": 1,
    "skey": "val",
    "id": "example-plugin"
  }
]
```

### Runtime Configuration

Access current runtime configuration and active resources.

#### Configuration Operations

- `GET /v1/config` - Get current APISIX configuration
- `GET /v1/routes` - List active routes
- `GET /v1/routes/{route_id}` - Get specific route runtime info
- `GET /v1/services` - List active services
- `GET /v1/services/{service_id}` - Get specific service runtime info

#### Configuration Examples

```bash
# Get current configuration
curl http://127.0.0.1:9090/v1/config

# List active routes
curl http://127.0.0.1:9090/v1/routes

# Get specific route info
curl http://127.0.0.1:9090/v1/routes/1
```

### Service Discovery

Monitor service discovery endpoints and configurations.

#### Discovery Operations

- `GET /v1/discovery` - List all discovery services
- `GET /v1/discovery/{service_name}/dump` - Get service discovery dump
- `GET /v1/discovery/{service_name}/show_dump_file` - Show service dump file

#### Discovery Examples

```bash
# Get discovery dump
curl http://127.0.0.1:9090/v1/discovery/kubernetes/dump

# Example response showing discovered services
{
  "endpoints": [
    {
      "endpoints": [
        {
          "value": "{\"https\":[{\"host\":\"172.18.164.170\",\"port\":6443,\"weight\":50}]}",
          "name": "default/kubernetes"
        }
      ],
      "id": "first"
    }
  ],
  "config": [
    {
      "default_weight": 50,
      "id": "first",
      "client": {
        "token": "xxx"
      },
      "service": {
        "host": "172.18.164.170",
        "port": "6443",
        "schema": "https"
      }
    }
  ]
}

# Show dump file
curl http://127.0.0.1:9090/v1/discovery/kubernetes/show_dump_file

# Example response
{
  "services": {
    "service_a": [
      {
        "host": "172.19.5.12",
        "port": 8000,
        "weight": 120
      },
      {
        "host": "172.19.5.13",
        "port": 8000,
        "weight": 120
      }
    ]
  },
  "expire": 0,
  "last_update": 1615877468
}
```

### Metrics and Monitoring

Access Prometheus metrics and monitoring data.

#### Metrics Operations

- `GET /apisix/prometheus/metrics` - Get Prometheus metrics
- `GET /v1/requests` - Get request statistics
- `GET /v1/connections` - Get connection statistics

#### Metrics Examples

```bash
# Get Prometheus metrics
curl http://127.0.0.1:9090/apisix/prometheus/metrics

# Example metrics (Prometheus format)
# TYPE apisix_http_requests_total counter
apisix_http_requests_total{code="200",route="1",matched_uri="/api/*",matched_host="api.example.com",node="127.0.0.1:8080"} 1543

# TYPE apisix_http_latency histogram
apisix_http_latency_bucket{type="request",route="1",le="1"} 1000
apisix_http_latency_bucket{type="request",route="1",le="2"} 1500

# TYPE apisix_upstream_status gauge
apisix_upstream_status{name="backend-cluster",ip="127.0.0.1",port="8080"} 1
```

### Debug and Development

Development and debugging utilities.

#### Debug Operations

- `GET /v1/gc` - Trigger garbage collection (development only)
- `GET /v1/debug` - Get debug information

#### Debug Examples

```bash
# Trigger garbage collection
curl http://127.0.0.1:9090/v1/gc

# Get debug info
curl http://127.0.0.1:9090/v1/debug
```

### Custom Plugin Control APIs

Plugins can register custom control endpoints for administrative tasks.

#### Plugin Control Examples

```bash
# Example custom plugin endpoint
curl http://127.0.0.1:9090/v1/plugin/example-plugin/hello

# With JSON response
curl "http://127.0.0.1:9090/v1/plugin/example-plugin/hello?json=true"
```

## Response Formats

### Success Response

```json
{
  "status": "ok",
  "data": {
    // ... response data
  }
}
```

### Error Response

```json
{
  "status": "error",
  "message": "Error description"
}
```

### List Response

```json
{
  "total": 10,
  "list": [
    // ... array of items
  ]
}
```

## SDK Usage Examples

### Check APISIX Health

```typescript
const healthStatus = await client.control.healthCheck();
console.log("APISIX Status:", healthStatus.status);

if (healthStatus.info) {
  console.log("Version:", healthStatus.info.version);
  console.log("Uptime:", healthStatus.info.up_time, "seconds");
}
```

### Monitor Upstream Health

```typescript
const upstreamHealth = await client.control.getUpstreamHealth();
upstreamHealth.forEach((upstream) => {
  console.log(`Upstream: ${upstream.name}`);
  upstream.nodes.forEach((node) => {
    console.log(`  ${node.host}:${node.port} - ${node.status}`);
    console.log(`    Failures: ${node.counter.http_failure}`);
    console.log(`    Successes: ${node.counter.success}`);
  });
});
```

### Get Server Information

```typescript
const serverInfo = await client.control.getServerInfo();
console.log(`APISIX Version: ${serverInfo.version}`);
console.log(`Hostname: ${serverInfo.hostname}`);
console.log(`Uptime: ${serverInfo.up_time} seconds`);
console.log(`etcd Version: ${serverInfo.etcd_version}`);
```

### List Active Routes

```typescript
const activeRoutes = await client.control.getRoutes();
console.log(`Active routes: ${activeRoutes.length}`);

activeRoutes.forEach((route) => {
  console.log(`Route ${route.id}: ${route.uri} [${route.methods?.join(", ")}]`);
});
```

### Get Plugin Information

```typescript
// List all plugins
const plugins = await client.control.getPlugins();
console.log(
  "Available plugins:",
  plugins.map((p) => p.name),
);

// Get plugin metadata
const metadata = await client.control.getPluginMetadata();
console.log("Plugin metadata:", metadata);

// Get specific plugin schema
const schema = await client.control.getPluginSchema("rate-limit");
console.log("Rate limit schema:", schema);
```

### Monitor Prometheus Metrics

```typescript
const metrics = await client.control.getPrometheusMetrics();
console.log("Prometheus metrics format:");
console.log(metrics);

// Parse metrics for custom monitoring
const requestCount = parseMetric(metrics, "apisix_http_requests_total");
const latency = parseMetric(metrics, "apisix_http_latency");
```

### Service Discovery Integration

```typescript
// Get discovery dump for Kubernetes
const k8sDump = await client.control.getDiscoveryDump("kubernetes");
console.log("Discovered services:", k8sDump.endpoints.length);

// Show current service endpoints
const dumpFile = await client.control.getDiscoveryDumpFile("kubernetes");
Object.entries(dumpFile.services).forEach(([name, endpoints]) => {
  console.log(`Service ${name}:`);
  endpoints.forEach((endpoint) => {
    console.log(
      `  ${endpoint.host}:${endpoint.port} (weight: ${endpoint.weight})`,
    );
  });
});
```

## Use Cases

### Health Monitoring and Alerting

```typescript
// Automated health check for monitoring systems
async function healthCheck() {
  try {
    const health = await client.control.healthCheck();

    if (health.status !== "ok") {
      // Send alert
      await sendAlert("APISIX is unhealthy", health);
      return false;
    }

    // Check upstream health
    const upstreams = await client.control.getUpstreamHealth();
    const unhealthyUpstreams = upstreams.filter((u) =>
      u.nodes.some((n) => n.status === "unhealthy"),
    );

    if (unhealthyUpstreams.length > 0) {
      await sendAlert("Unhealthy upstreams detected", unhealthyUpstreams);
      return false;
    }

    return true;
  } catch (error) {
    await sendAlert("Control API unreachable", error);
    return false;
  }
}
```

### Performance Monitoring

```typescript
// Monitor request metrics
async function monitorPerformance() {
  const metrics = await client.control.getPrometheusMetrics();

  // Parse metrics
  const totalRequests = parsePrometheusMetric(
    metrics,
    "apisix_http_requests_total",
  );
  const latencyBuckets = parsePrometheusMetric(
    metrics,
    "apisix_http_latency_bucket",
  );

  // Calculate performance indicators
  const requestRate = calculateRequestRate(totalRequests);
  const p99Latency = calculatePercentile(latencyBuckets, 99);

  // Store in monitoring system
  await storeMetrics({
    timestamp: Date.now(),
    request_rate: requestRate,
    p99_latency: p99Latency,
  });
}
```

### Development and Debugging

```typescript
// Debug route configuration
async function debugRoute(routeId: string) {
  try {
    // Get route from control API
    const routeInfo = await client.control.getRoute(routeId);
    console.log("Route runtime info:", routeInfo);

    // Get schema for validation
    const schema = await client.control.getSchema("route");
    console.log("Route schema:", schema);

    // Check server info
    const serverInfo = await client.control.getServerInfo();
    console.log("APISIX version:", serverInfo.version);
  } catch (error) {
    console.error("Debug failed:", error);
  }
}
```

### Load Balancer Integration

```typescript
// Health check endpoint for load balancers
app.get("/health", async (req, res) => {
  try {
    const health = await client.control.healthCheck();

    if (health.status === "ok") {
      res.status(200).json({ status: "healthy" });
    } else {
      res.status(503).json({ status: "unhealthy" });
    }
  } catch (error) {
    res.status(503).json({ status: "unhealthy", error: error.message });
  }
});
```

## Integration Patterns

### Prometheus Integration

The Control API provides native Prometheus metrics that can be scraped:

```yaml
# prometheus.yml
scrape_configs:
  - job_name: "apisix"
    static_configs:
      - targets: ["apisix:9090"]
    metrics_path: "/apisix/prometheus/metrics"
    scrape_interval: 15s
```

### Grafana Dashboard

Use the Prometheus metrics to build comprehensive Grafana dashboards:

- Request rates and error rates
- Response time percentiles
- Upstream health status
- Active connections
- Plugin-specific metrics

### Custom Monitoring Solutions

```typescript
// Custom monitoring integration
class ApisixMonitor {
  private client: ApisixSDK;

  constructor(controlApiUrl: string) {
    this.client = new ApisixSDK({ baseURL: controlApiUrl });
  }

  async collectMetrics() {
    const [health, serverInfo, upstreams, metrics] = await Promise.all([
      this.client.control.healthCheck(),
      this.client.control.getServerInfo(),
      this.client.control.getUpstreamHealth(),
      this.client.control.getPrometheusMetrics(),
    ]);

    return {
      timestamp: Date.now(),
      health: health.status === "ok",
      uptime: serverInfo.up_time,
      version: serverInfo.version,
      unhealthyUpstreams: upstreams.filter((u) =>
        u.nodes.some((n) => n.status === "unhealthy"),
      ).length,
      rawMetrics: metrics,
    };
  }
}
```

### Service Discovery Integration

```typescript
// Integrate with service discovery
async function syncServiceDiscovery() {
  const discoveryServices = await client.control.getDiscoveryServices();

  for (const service of discoveryServices) {
    const dump = await client.control.getDiscoveryDump(service);

    // Update external service registry
    await updateServiceRegistry(service, dump.endpoints);
  }
}
```

## Best Practices

1. **Monitoring**: Set up automated health checks using Control API endpoints
2. **Alerting**: Configure alerts based on health status and metrics
3. **Security**: Restrict Control API access in production environments
4. **Performance**: Cache frequently accessed data like schemas and plugin info
5. **Integration**: Use Control API for read-only monitoring, Admin API for configuration changes
6. **Debugging**: Leverage Control API endpoints for troubleshooting runtime issues
