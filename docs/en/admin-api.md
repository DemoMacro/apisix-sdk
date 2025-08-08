# Apache APISIX Admin API Documentation

The Apache APISIX Admin API provides RESTful endpoints for managing all aspects of your API gateway configuration. This SDK covers all major Admin API functionalities with full TypeScript support.

## Table of Contents

- [Overview](#overview)
- [Configuration](#configuration)
- [Core Resources](#core-resources)
  - [Routes](#routes)
  - [Services](#services)
  - [Upstreams](#upstreams)
  - [Consumers](#consumers)
  - [SSL Certificates](#ssl-certificates)
  - [Plugins](#plugins)
  - [Global Rules](#global-rules)
  - [Consumer Groups](#consumer-groups)
  - [Plugin Configs](#plugin-configs)
  - [Stream Routes](#stream-routes)
  - [Secrets](#secrets)
  - [Credentials](#credentials)
  - [Protos](#protos)
- [Advanced Features](#advanced-features)
  - [Connection Pool Management](#connection-pool-management)
  - [Query Caching Mechanism](#query-caching-mechanism)
  - [Smart Retry Mechanism](#smart-retry-mechanism)
  - [Version Compatibility Detection](#version-compatibility-detection)
  - [Request Cancellation](#request-cancellation)
  - [System Monitoring and Statistics](#system-monitoring-and-statistics)
  - [Configuration Validation and Recommendation System](#configuration-validation-and-recommendation-system)
  - [Plugin Metadata Management](#plugin-metadata-management)
  - [Prometheus Integration](#prometheus-integration)
  - [SSL Certificates](#ssl-certificates)
  - [Plugins](#plugins)
  - [Global Rules](#global-rules)
  - [Consumer Groups](#consumer-groups)
  - [Plugin Configs](#plugin-configs)
  - [Stream Routes](#stream-routes)
  - [Secrets](#secrets)
  - [Credentials](#credentials)
  - [Protos](#protos)
- [API Features](#api-features)
- [Error Handling](#error-handling)
- [Examples](#examples)

## Overview

The Admin API allows users to control their deployed Apache APISIX instance through RESTful endpoints. It provides complete management capabilities for routes, services, upstreams, consumers, SSL certificates, plugins, and other APISIX resources.

### Base Configuration

- **Default Port**: 9180
- **Default Base Path**: `/apisix/admin`
- **API Version**: v1 (with support for v3 features)
- **Default IP**: 0.0.0.0 (configurable)

### API Key Authentication

All Admin API requests require authentication using the `X-API-KEY` header:

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

## Configuration

### SDK Configuration Options

```typescript
interface ApisixSDKConfig {
  adminAPI: {
    baseURL: string; // APISIX Admin API base URL
    apiKey?: string; // API key for authentication
    timeout?: number; // Request timeout in milliseconds
    headers?: Record<string, string>; // Additional headers
  };
  controlAPI?: {
    baseURL: string; // Control API base URL
    timeout?: number; // Timeout for Control API
    headers?: Record<string, string>; // Additional headers
  };
}
```

### Environment Variables

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

## Core Resources

### Routes

Routes define how incoming requests are matched and handled.

#### Route Interface

```typescript
interface Route {
  id?: string;
  name?: string;
  desc?: string;
  uri?: string; // Single URI pattern
  uris?: string[]; // Multiple URI patterns
  methods?: string[]; // HTTP methods
  host?: string; // Single host
  hosts?: string[]; // Multiple hosts
  remote_addr?: string; // Single client IP
  remote_addrs?: string[]; // Multiple client IPs
  vars?: Array<[string, string, string]>; // Conditional matching
  filter_func?: string; // Custom Lua function
  plugins?: Record<string, unknown>; // Plugin configurations
  upstream?: Upstream; // Inline upstream
  upstream_id?: string; // Reference to upstream
  service_id?: string; // Reference to service
  plugin_config_id?: string; // Reference to plugin config
  priority?: number; // Route priority (default: 0)
  enable_websocket?: boolean; // Enable WebSocket
  timeout?: {
    connect?: number;
    send?: number;
    read?: number;
  };
  status?: 0 | 1; // 0=disabled, 1=enabled
  labels?: Record<string, string>;
  create_time?: number;
  update_time?: number;
}
```

#### Route Operations

```typescript
// List all routes
const routes = await client.routes.list();

// List with pagination
const { routes, total, hasMore } = await client.routes.listPaginated(1, 10);

// Get specific route
const route = await client.routes.get("route-id");

// Create new route
const newRoute = await client.routes.create({
  name: "api-route",
  uri: "/api/v1/*",
  methods: ["GET", "POST"],
  upstream: {
    type: "roundrobin",
    nodes: { "127.0.0.1:8080": 1 },
  },
});

// Update route
const updatedRoute = await client.routes.update("route-id", {
  desc: "Updated description",
});

// Partial update
await client.routes.patch("route-id", { priority: 10 });

// Delete route
await client.routes.delete("route-id");

// Force delete (even if in use)
await client.routes.delete("route-id", { force: true });

// Check existence
const exists = await client.routes.exists("route-id");

// Enable/disable routes
await client.routes.enable("route-id");
await client.routes.disable("route-id");

// Find routes by criteria
const apiRoutes = await client.routes.findByUri("/api");
const getRoutes = await client.routes.findByMethod("GET");
const hostRoutes = await client.routes.findByHost("api.example.com");

// Clone route
const cloned = await client.routes.clone("source-id", {
  name: "cloned-route",
  uri: "/new-path/*",
});

// Get statistics
const stats = await client.routes.getStatistics();

// Advanced route search
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

// Batch operations
const batchResult = await client.routes.batchOperations([
  {
    operation: "create",
    data: { name: "api-1", uri: "/api/1", methods: ["GET"] },
  },
  {
    operation: "update",
    id: "route-1",
    data: { desc: "Updated route" },
  },
  {
    operation: "delete",
    id: "route-2",
  },
]);

// Import from OpenAPI
const importResult = await client.routes.importFromOpenAPI(openApiSpec, {
  strategy: "merge",
  validateBeforeImport: true,
});

// Export to OpenAPI
const openApiExport = await client.routes.exportToOpenAPI({
  title: "My API Routes",
  version: "1.0.0",
  includeDisabled: false,
});

// Enhanced statistics with more details
const stats = await client.routes.getStatistics();
console.log("Route statistics:", {
  total: stats.total,
  enabled: stats.enabledCount,
  disabled: stats.disabledCount,
  methodDistribution: stats.methodDistribution,
  topPlugins: stats.topPlugins,
  hostCount: stats.hostCount,
  serviceRoutes: stats.serviceRoutes,
  upstreamRoutes: stats.upstreamRoutes,
});
```

### Services

Services provide an abstraction layer for upstream management.

#### Service Interface

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

#### Service Operations

```typescript
// List all services
const services = await client.services.list();

// Get specific service
const service = await client.services.get("service-id");

// Create service
const newService = await client.services.create({
  name: "user-service",
  upstream: {
    type: "roundrobin",
    nodes: { "127.0.0.1:8080": 1 },
  },
});

// Update service
await client.services.update("service-id", {
  desc: "Updated service",
});

// Delete service
await client.services.delete("service-id");

// Find services by name
const userServices = await client.services.findByName("user");

// Clone service
const cloned = await client.services.clone("source-id", {
  name: "cloned-service",
});
```

### Upstreams

Upstreams define backend server clusters with health checking and load balancing.

#### Upstream Interface

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

#### Upstream Operations

```typescript
// List all upstreams
const upstreams = await client.upstreams.list();

// Create upstream with health checks
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

// Add/remove nodes
await client.upstreams.addNode("upstream-id", "127.0.0.1", 8082, 1);
await client.upstreams.removeNode("upstream-id", "127.0.0.1", 8082);

// Update node weight
await client.upstreams.updateNodeWeight("upstream-id", "127.0.0.1", 8080, 3);

// Get statistics
const stats = await client.upstreams.getStatistics();
```

### Consumers

Consumers represent API users with authentication credentials.

#### Consumer Interface

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

#### Consumer Operations

```typescript
// List all consumers
const consumers = await client.consumers.list();

// Create consumer
const consumer = await client.consumers.create({
  username: "api-user",
  desc: "API user for mobile app",
});

// Add authentication plugins
await client.consumers.addKeyAuth("api-user", "user-api-key-123");
await client.consumers.addJwtAuth("api-user", "jwt-key", "secret");
await client.consumers.addBasicAuth("api-user", "username", "password");

// List consumer credentials
const credentials = await client.consumers.listCredentials("api-user");

// Find consumers by group
const groupConsumers = await client.consumers.findByGroup("premium-users");
```

### SSL Certificates

SSL certificates for HTTPS termination with security handling.

#### SSL Interface

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

#### SSL Operations

```typescript
// Create SSL certificate
const ssl = await client.ssl.create({
  cert: "-----BEGIN CERTIFICATE-----\n...",
  key: "-----BEGIN PRIVATE KEY-----\n...",
  snis: ["api.example.com", "*.api.example.com"],
});

// Find certificates by SNI
const certs = await client.ssl.findBySNI("api.example.com");

// Check certificate expiration
const expiration = await client.ssl.checkExpiration("ssl-id", 30);
if (expiration.willExpireSoon) {
  console.log(`Certificate expires in ${expiration.daysRemaining} days`);
}

// Get expiring certificates
const expiringCerts = await client.ssl.getExpiringCertificates(30);
console.log(
  `Found ${expiringCerts.length} certificates expiring within 30 days`,
);

// Clone SSL certificate (handles APISIX security behavior)
// Note: APISIX doesn't return private keys in single GET requests for security
// The clone method automatically retrieves keys from list responses when needed
const clonedCert = await client.ssl.clone(
  "source-cert-id",
  {
    snis: ["new-domain.example.com"],
    // Optional: provide new key if you want to replace the original
    // key: "-----BEGIN PRIVATE KEY-----\n...",
  },
  "new-cert-id",
);

// Alternative: Clone with explicit key replacement
const clonedWithNewKey = await client.ssl.clone(
  "source-cert-id",
  {
    snis: ["another-domain.example.com"],
    key: "-----BEGIN PRIVATE KEY-----\n...", // New private key
  },
  "another-cert-id",
);

// Enable/disable certificates
await client.ssl.enable("ssl-id");
await client.ssl.disable("ssl-id");

// Find by status
const enabledCerts = await client.ssl.findByStatus(1);
const disabledCerts = await client.ssl.findByStatus(0);
```

#### SSL Security Behavior

**Important**: APISIX implements security measures regarding private key exposure:

- **Single GET requests** (`/apisix/admin/ssls/{id}`) do not return the `key` field for security reasons
- **List requests** (`/apisix/admin/ssls`) do include the `key` field in responses

The SDK automatically handles this behavior:

1. **Automatic Key Retrieval**: When cloning certificates, if the source certificate's key is not available from a single GET request, the SDK automatically retrieves it from the list endpoint
2. **Graceful Fallback**: If automatic retrieval fails, you can provide a replacement key in the clone modifications
3. **Clear Error Messages**: Informative error messages guide you when manual key provision is required

```typescript
// Example of automatic key retrieval (recommended approach)
try {
  const cloned = await client.ssl.clone("source-id", {
    snis: ["new.example.com"],
  });
  console.log("Certificate cloned successfully with automatic key retrieval");
} catch (error) {
  console.error("Clone failed:", error.message);
  // Error message will indicate if manual key provision is needed
}
```

### Plugins

Plugin management and configuration.

#### Plugin Operations

```typescript
// List available plugins
const plugins = await client.plugins.list();

// Get plugin schema
const schema = await client.plugins.getSchema("limit-count");

// Get plugins by category
const authPlugins = await client.plugins.getPluginsByCategory("authentication");

// Validate plugin configuration
const validation = await client.plugins.validateConfig("limit-count", {
  count: 100,
  time_window: 60,
});
```

### Global Rules

Global plugin rules applied across all routes.

#### Global Rule Operations

```typescript
// Create global rule
const globalRule = await client.globalRules.create({
  plugins: {
    prometheus: { prefer_name: true },
    cors: { allow_origins: "*" },
  },
});

// Add plugin to global rule
await client.globalRules.addPlugin("rule-id", "rate-limit", {
  count: 1000,
  time_window: 3600,
});

// Remove plugin from global rule
await client.globalRules.removePlugin("rule-id", "rate-limit");
```

### Consumer Groups

Consumer grouping for shared plugin configurations.

#### Consumer Group Operations

```typescript
// Create consumer group
const group = await client.consumerGroups.create({
  desc: "Premium users",
  plugins: {
    "limit-count": { count: 1000, time_window: 60 },
  },
  labels: { tier: "premium" },
});

// Add/remove labels
await client.consumerGroups.addLabel("group-id", "env", "production");
await client.consumerGroups.removeLabel("group-id", "env");
```

### Plugin Configs

Reusable plugin configurations.

#### Plugin Config Operations

```typescript
// Create plugin config
const pluginConfig = await client.pluginConfigs.create({
  desc: "Rate limiting config",
  plugins: {
    "limit-count": { count: 100, time_window: 60 },
    cors: { allow_origins: "*" },
  },
});

// Find by plugin type
const rateLimitConfigs = await client.pluginConfigs.findByPlugin("limit-count");
```

### Stream Routes

TCP/UDP proxy routing configuration.

#### Stream Route Operations

```typescript
// Create TCP stream route
const tcpRoute = await client.streamRoutes.createTCPRoute({
  server_port: 9100,
  upstream_id: "tcp-upstream-1",
  plugins: {
    "limit-conn": { conn: 100 },
  },
});

// Create UDP stream route
const udpRoute = await client.streamRoutes.createUDPRoute({
  server_port: 9200,
  server_addr: "0.0.0.0",
  upstream: {
    type: "roundrobin",
    nodes: [{ host: "127.0.0.1", port: 8080, weight: 1 }],
  },
});

// Find by protocol
const tcpRoutes = await client.streamRoutes.findByProtocol("tcp");

// Validate configuration
const validation = client.streamRoutes.validateConfig({
  server_port: 9100,
  upstream_id: "test-upstream",
});
```

### Secrets

Secret store management for Vault, AWS, and GCP.

#### Secret Operations

```typescript
// Vault Secret Management
const vaultSecret = await client.secrets.createVaultSecret(
  {
    uri: "https://vault.example.com",
    prefix: "/apisix/kv",
    token: "vault-token-123",
    namespace: "apisix-ns",
  },
  "vault-secret-1",
);

// Test Vault connection
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

// List all secrets by type
const allSecrets = await client.secrets.listAllSecrets();
```

### Credentials

Standalone credential management (APISIX 3.0+).

#### Credential Operations

```typescript
// Create standalone credentials
const credential = await client.credentials.create("consumer-id", "cred-id", {
  plugins: {
    "key-auth": { key: "user-api-key-123" },
    "jwt-auth": { key: "user-key", secret: "user-secret" },
  },
  desc: "API user credentials",
});

// List credentials for consumer
const credentials = await client.credentials.list("consumer-id");

// Update credentials
await client.credentials.update("consumer-id", "cred-id", {
  plugins: {
    "key-auth": { key: "updated-key" },
  },
});
```

### Protos

Protocol buffer definitions for gRPC services.

#### Proto Operations

```typescript
// Create proto definition
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

// Find by content
const grpcProtos = await client.protos.findByContent("UserService");
```

## Advanced Features

### Connection Pool Management

The SDK implements efficient connection pool management with automatic connection reuse and cleanup to improve performance and reduce resource consumption.

```typescript
// Get connection pool statistics
const poolStats = client.getConnectionPoolStats();
console.log("Connection pool stats:", {
  adminConnections: poolStats.adminConnections,
  controlConnections: poolStats.controlConnections,
  totalConnections: poolStats.totalConnections,
  maxPoolSize: poolStats.maxPoolSize,
  connectionTTL: poolStats.ttl + "ms",
});

// Clear connection pool
client.clearConnectionPool();

// Connection pool is automatically configured during client initialization
const client = new ApisixSDK({
  adminAPI: {
    baseURL: "http://127.0.0.1:9180",
    apiKey: "your-api-key",
  },
  // Connection pool auto-initializes with max 10 connections, 5-minute TTL
});
```

**Connection Pool Features:**

- Automatic connection reuse to reduce connection establishment overhead
- Intelligent expiration cleanup to remove idle connections
- Connection pool size limits to prevent excessive resource consumption
- Separate management of Admin API and Control API connections

### Query Caching Mechanism

The SDK includes intelligent query caching that automatically caches GET request results to reduce redundant requests and improve response speed.

```typescript
// Get cache statistics
const cacheStats = client.getCacheStats();
console.log("Cache statistics:", {
  totalEntries: cacheStats.totalEntries,
  expiredEntries: cacheStats.expiredEntries,
  memoryUsage: cacheStats.sizeInBytes + " bytes",
});

// Clear all cache
client.clearCache();

// Clear cache for specific endpoint
client.clearCacheForEndpoint("/routes");

// Skip cache for fresh requests
const freshData = await client.routes.list(undefined, { skipCache: true });

// Configure cache settings
client.configureCache({
  ttl: 60000, // 60-second cache
  maxSize: 1000, // Maximum 1000 cache entries
});
```

**Caching Features:**

- 30-second default TTL (configurable)
- Automatic expiration cleanup
- Smart cache keys based on request method and parameters
- Support for manual cache clearing and statistics queries

### Smart Retry Mechanism

The SDK implements a smart retry mechanism with exponential backoff to automatically handle network failures and temporary errors.

```typescript
// Configure retry settings
client.configureRetry({
  maxAttempts: 5, // Maximum retry attempts
  baseDelay: 2000, // Base delay of 2 seconds
});

// Retries are automatically applied to all requests
try {
  const route = await client.routes.get("route-id");
  // If request fails, SDK automatically retries (up to 5 times)
} catch (error) {
  // Error thrown only after all retries fail
  console.log("All retries failed:", error.message);
}

// Retry mechanism intelligently skips certain error types:
// - Authentication errors (401)
// - Authorization errors (403)
// - Resource not found (404)
// - Data validation errors
// - Resource already exists conflicts
```

**Retry Features:**

- Exponential backoff algorithm to prevent request storms
- Smart error classification, only retrying recoverable errors
- Configurable retry count and delay
- Random jitter to prevent synchronized retries

### Version Compatibility Detection

The SDK automatically detects APISIX version and provides compatibility support to ensure it works across different versions.

```typescript
// Get current APISIX version
const version = await client.getVersion();
console.log("APISIX version:", version);

// Check version compatibility
const isCompatible = await client.isVersionCompatible("3.2.0");
console.log("Compatible with 3.2.0:", isCompatible);

// Check if version is 3.0 or later
const isV3Plus = await client.isVersion3OrLater();
console.log("Supports v3+ features:", isV3Plus);

// Get version-specific configuration
const versionConfig = await client.getApiVersionConfig();
console.log("Version features:", {
  supportsCredentials: versionConfig.supportsCredentials,
  supportsSecrets: versionConfig.supportsSecrets,
  supportsNewResponseFormat: versionConfig.supportsNewResponseFormat,
  supportsStreamRoutes: versionConfig.supportsStreamRoutes,
  supportsPagination: versionConfig.supportsPagination,
});
```

**Version Detection Features:**

- Automatic version detection and caching
- Version comparison functionality
- API feature compatibility checking
- Downgrade support for older versions

### Request Cancellation

The SDK supports request cancellation, allowing long-running operations to be terminated mid-execution.

```typescript
// Create AbortController
const controller = client.createAbortController();

// Make cancellable request
const requestPromise = client.routes.list(undefined, {
  signal: controller.signal,
});

// Cancel request
setTimeout(() => {
  controller.abort();
  console.log("Request cancelled");
}, 1000);

try {
  const routes = await requestPromise;
} catch (error) {
  if (error.name === "AbortError") {
    console.log("Request was cancelled");
  } else {
    console.log("Other error:", error.message);
  }
}
```

### System Monitoring and Statistics

Get detailed system monitoring information and statistics through the Control API.

```typescript
// Get system overview
const overview = await client.control.getSystemOverview();
console.log("System overview:", {
  serverInfo: overview.server,
  schemaInfo: overview.schemas,
  healthStatus: overview.health,
  upstreamHealth: overview.upstreamHealth,
  discoveryServices: overview.discoveryServices,
});

// Get memory statistics
const memoryStats = await client.control.getMemoryStats();
console.log("Memory usage:", memoryStats);

// Get Prometheus metrics
const metrics = await client.control.getPrometheusMetrics();
console.log("Prometheus metrics:", metrics.substring(0, 200) + "...");

// Health check
const isHealthy = await client.control.isHealthy();
console.log("System health status:", isHealthy);

// Trigger garbage collection
const gcResult = await client.control.triggerGC();
console.log("GC result:", gcResult);
```

### Configuration Validation and Recommendation System

The SDK provides configuration validation and recommendation features to help optimize APISIX configuration.

```typescript
// Validate route configuration
const validation = await client.control.validateSchema("route", routeConfig, {
  validatePlugins: true,
  pluginName: "limit-count",
});

if (!validation.valid) {
  console.log("Validation errors:", validation.errors);
  console.log("Validation warnings:", validation.warnings);
}

// Get configuration recommendations
const recommendations = await client.control.getValidationRecommendations();
console.log("Available plugins:", recommendations.availablePlugins);
console.log("Deprecated plugins:", recommendations.deprecatedPlugins);
console.log("Recommended settings:", recommendations.recommendedSettings);

// Check schema compatibility
const compatibility = await client.control.getSchemaCompatibility("3.6.0");
console.log("Compatibility check:", {
  currentVersion: compatibility.currentVersion,
  targetVersion: compatibility.targetVersion,
  compatible: compatibility.compatible,
  breakingChanges: compatibility.breaking_changes,
  newFeatures: compatibility.new_features,
});
```

### Plugin Metadata Management

Manage and query plugin metadata information.

```typescript
// Get all plugin metadata
const pluginMetadata = await client.control.getPluginMetadata();
console.log("Plugin metadata:", pluginMetadata);

// Get specific plugin metadata
const pluginInfo = await client.control.getPluginMetadataById("limit-count");
console.log("limit-count plugin info:", pluginInfo);

// Reload plugins
const reloadResult = await client.control.reloadPlugins();
console.log("Plugin reload result:", reloadResult);
```

### Prometheus Integration

Integrate with Prometheus monitoring to collect detailed performance metrics.

```typescript
// Get Prometheus metrics
const metrics = await client.control.getPrometheusMetrics();

// Parse key metrics
const lines = metrics.split("\n");
const httpRequests = lines.find((line) =>
  line.startsWith("http_requests_total"),
);
const responseTime = lines.find((line) =>
  line.startsWith("apisix_http_latency_seconds"),
);

console.log("HTTP total requests:", httpRequests);
console.log("Response time:", responseTime);

// Metric types include:
// - http_requests_total: Total HTTP requests
// - apisix_http_latency_seconds: Response time
// - apisix_bandwidth_bytes: Bandwidth usage
// - apisix_connections_active: Active connections
// - apisix_etcd_reachable: etcd connection status
```

## API Features

### Pagination Support

```typescript
// Use built-in pagination
const { routes, total, hasMore } = await client.routes.listPaginated(1, 20, {
  name: "api-*", // Filter by name pattern
});

console.log(`Found ${total} routes`);
console.log(`Page 1 has ${routes.length} routes`);
```

### Filtering

```typescript
// Filter resources by various criteria
const filteredRoutes = await client.routes.list({
  name: "api",
  uri: "/v1",
  label: "env:prod",
});
```

### Force Operations

```typescript
// Force delete (even if resource is in use)
await client.upstreams.delete("upstream-id", { force: true });
```

### Resource Cloning

```typescript
// Clone a route with modifications
const clonedRoute = await client.routes.clone(
  "source-route-id",
  {
    name: "cloned-api",
    uri: "/api/v2/*",
  },
  "new-route-id",
);
```

### Batch Operations

Perform multiple operations in a single request with error handling and validation.

```typescript
// Batch operations on routes
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
  `Total: ${result.total}, Successful: ${result.successful}, Failed: ${result.failed}`,
);
result.results.forEach((res, idx) => {
  if (res.success) {
    console.log(`Operation ${idx + 1}: Success`, res.data);
  } else {
    console.log(`Operation ${idx + 1}: Failed`, res.error);
  }
});

// Batch operations at SDK level
const batchResult = await client.batchOperations("routes", operations, {
  continueOnError: true,
  validateBeforeExecution: true,
});
```

### Import/Export Data

Import and export configuration data in multiple formats with conflict resolution.

```typescript
// Export routes to JSON
const jsonData = await client.exportData("routes", {
  format: "json",
  pretty: true,
  exclude: ["create_time", "update_time"],
});

// Export to YAML
const yamlData = await client.exportData("routes", {
  format: "yaml",
  include: ["name", "uri", "methods", "upstream"],
});

// Import data with strategy
const importResult = await client.importData("routes", jsonData, {
  strategy: "merge", // 'replace' | 'merge' | 'skip_existing'
  validate: true,
  dryRun: false,
});

console.log(
  `Imported: ${importResult.created} created, ${importResult.updated} updated`,
);
if (importResult.errors.length > 0) {
  console.log("Import errors:", importResult.errors);
}
```

### OpenAPI Integration

Import routes from OpenAPI specifications and export APISIX routes as OpenAPI specs.

```typescript
// Import from OpenAPI specification
const openApiSpec = {
  openapi: "3.0.0",
  info: { title: "My API", version: "1.0.0" },
  paths: {
    "/users": {
      get: {
        operationId: "getUsers",
        summary: "Get all users",
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
        summary: "Create user",
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

// Export to OpenAPI specification
const exportedSpec = await client.exportToOpenAPI({
  title: "APISIX Routes API",
  version: "1.0.0",
  serverUrl: "https://api.example.com",
  includeDisabled: false,
  filterByLabels: { env: "production" },
});
```

### Advanced Search

Search routes with multiple criteria and complex filtering.

```typescript
// Advanced route search
const searchResults = await client.searchRoutes({
  uriPattern: "/api/v1",
  methods: ["GET", "POST"],
  hosts: ["api.example.com"],
  plugins: ["limit-count", "cors"],
  status: 1, // only enabled routes
  hasUpstream: true,
  labels: { env: "production", team: "backend" },
  createdAfter: new Date("2024-01-01"),
  createdBefore: new Date("2024-12-31"),
});

// Using route-specific advanced search
const routes = await client.routes.search({
  uri: "/api/users",
  methods: ["GET"],
  hasService: true,
  plugins: ["jwt-auth"],
});
```

### Data Validation

Validate configuration data against APISIX schemas before applying changes.

```typescript
// Validate route configuration
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
  console.log("Validation errors:", validation.errors);
  console.log("Validation warnings:", validation.warnings);
} else {
  console.log("Configuration is valid");
}

// Get configuration recommendations
const recommendations = await client.getConfigurationRecommendations();
console.log("Available plugins:", recommendations.availablePlugins);
console.log("Deprecated plugins:", recommendations.deprecatedPlugins);
console.log("Recommended settings:", recommendations.recommendedSettings);
```

### Schema Compatibility

Check schema compatibility and migration recommendations.

```typescript
// Check schema compatibility
const compatibility = await client.getSchemaCompatibility("3.6.0");

console.log(
  `Current: ${compatibility.currentVersion}, Target: ${compatibility.targetVersion}`,
);
console.log(`Compatible: ${compatibility.compatible}`);

if (compatibility.breaking_changes.length > 0) {
  console.log("Breaking changes:", compatibility.breaking_changes);
}

if (compatibility.new_features.length > 0) {
  console.log("New features:", compatibility.new_features);
}
```

## Error Handling

```typescript
try {
  const route = await client.routes.get("non-existent-id");
} catch (error) {
  if (error.message.includes("APISIX API Error")) {
    console.log("APISIX returned an error:", error.message);
  } else {
    console.log("Network or other error:", error.message);
  }
}
```

## Examples

### Complete Route Setup

```typescript
// Create upstream
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

// Create service
const service = await client.services.create({
  name: "api-service",
  upstream_id: upstream.id,
  plugins: {
    "rate-limit": { count: 1000, time_window: 3600 },
  },
});

// Create route
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

console.log("API setup complete:", route.id);
```

### Consumer with Authentication

```typescript
// Create consumer
const consumer = await client.consumers.create({
  username: "api-user",
  desc: "Mobile app user",
});

// Add multiple authentication methods
await client.consumers.addKeyAuth("api-user", "mobile-app-key-123");
await client.consumers.addJwtAuth("api-user", "mobile-jwt-key", "secret");

// Create consumer group
const group = await client.consumerGroups.create({
  desc: "Mobile users",
  plugins: {
    "limit-count": { count: 500, time_window: 60 },
  },
});

// Assign consumer to group
await client.consumers.update("api-user", {
  group_id: group.id,
});
```

For more examples, see the [playground directory](../../playground/).
