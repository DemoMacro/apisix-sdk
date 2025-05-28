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
  baseURL: "http://127.0.0.1:9180",
  apiKey: "edd1c9f034335f136f87ad84b625c8f1", // Change in production!
  timeout: 30000,
});
```

## Configuration

### SDK Configuration Options

```typescript
interface ApisixSDKConfig {
  baseURL: string; // APISIX Admin API base URL
  apiKey?: string; // API key for authentication
  timeout?: number; // Request timeout in milliseconds (default: 30000)
  headers?: Record<string, string>; // Additional headers
}
```

### Environment Variables

```typescript
const client = new ApisixSDK({
  baseURL: process.env.APISIX_BASE_URL || "http://127.0.0.1:9180",
  apiKey: process.env.APISIX_API_KEY,
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

SSL certificates for HTTPS termination.

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
