# APISIX SDK

[![npm version](https://badge.fury.io/js/apisix-sdk.svg)](https://badge.fury.io/js/apisix-sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A comprehensive TypeScript/JavaScript SDK for [Apache APISIX](https://apisix.apache.org/) API Gateway. This SDK provides complete access to both the Admin API and Control API, making it easy to manage routes, services, upstreams, consumers, SSL certificates, plugins, and more.

## Features

- 🚀 **Complete API Coverage**: Full support for APISIX Admin API and Control API
- 📝 **TypeScript Support**: Fully typed with comprehensive TypeScript definitions
- 🔄 **Modern HTTP Client**: Built on top of `ofetch` for reliable HTTP requests
- 🛡️ **Error Handling**: Robust error handling with detailed error messages
- 📊 **Pagination Support**: Built-in support for APISIX v3 pagination
- 🔍 **Resource Filtering**: Advanced filtering and search capabilities
- 🏥 **Health Monitoring**: Built-in health checks and monitoring features
- 🔧 **Easy Configuration**: Simple and flexible configuration options
- 🔐 **Credential Management**: APISIX 3.0+ standalone credential support
- 🗝️ **Secret Management**: Vault, AWS, and GCP secret store integration
- 🌐 **Stream Routes**: TCP/UDP proxy configuration support
- 🔗 **Force Delete**: Resource dependency management with force delete
- 📋 **Configuration Validation**: Built-in validation for stream routes and secrets

## Installation

```bash
npm install apisix-sdk
# or
yarn add apisix-sdk
# or
pnpm add apisix-sdk
```

## Quick Start

```typescript
import { ApisixSDK } from "apisix-sdk";

// Initialize the SDK
const client = new ApisixSDK({
  baseURL: "http://127.0.0.1:9180",
  apiKey: "your-api-key",
  timeout: 30000,
});

// Test connection
const isConnected = await client.testConnection();
console.log("Connected:", isConnected);

// Create a route
const route = await client.routes.create({
  name: "my-api",
  uri: "/api/v1/*",
  methods: ["GET", "POST"],
  upstream: {
    type: "roundrobin",
    nodes: {
      "127.0.0.1:8080": 1,
    },
  },
});

console.log("Route created:", route.id);
```

## Configuration

```typescript
interface ApisixSDKConfig {
  baseURL: string; // APISIX Admin API base URL
  apiKey?: string; // API key for authentication
  timeout?: number; // Request timeout in milliseconds (default: 30000)
  headers?: Record<string, string>; // Additional headers
}
```

## API Reference

### Routes Management

```typescript
// Create a route
const route = await client.routes.create({
  name: "example-api",
  uri: "/api/users/*",
  methods: ["GET", "POST"],
  upstream: {
    type: "roundrobin",
    nodes: { "127.0.0.1:8080": 1 },
  },
  plugins: {
    "limit-count": {
      count: 100,
      time_window: 60,
    },
  },
});

// List all routes
const routes = await client.routes.list();

// Get a specific route
const route = await client.routes.get("route-id");

// Update a route
await client.routes.update("route-id", { desc: "Updated description" });

// Delete a route
await client.routes.delete("route-id");

// Find routes by URI pattern
const routes = await client.routes.findByUri("/api");

// Enable/disable a route
await client.routes.disable("route-id");
await client.routes.enable("route-id");
```

### Services Management

```typescript
// Create a service
const service = await client.services.create({
  name: "user-service",
  upstream: {
    type: "roundrobin",
    nodes: { "127.0.0.1:8080": 1 },
  },
});

// List services
const services = await client.services.list();

// Update service
await client.services.update("service-id", {
  desc: "User management service",
});
```

### Upstreams Management

```typescript
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
```

### Consumer Management

```typescript
// Create a consumer
const consumer = await client.consumers.create({
  username: "api-user",
  desc: "API user for mobile app",
});

// Add authentication credentials
await client.consumers.addKeyAuth("api-user", "user-api-key-123");
await client.consumers.addJwtAuth("api-user", "jwt-key", "secret");
await client.consumers.addBasicAuth("api-user", "username", "password");

// List consumer credentials
const credentials = await client.consumers.listCredentials("api-user");
```

### Credential Management

```typescript
// Create standalone credentials
const credential = await client.credentials.create({
  plugins: {
    "key-auth": {
      key: "user-api-key-123",
    },
    "jwt-auth": {
      key: "user-key",
      secret: "user-secret",
    },
  },
  desc: "API user credentials",
  labels: {
    env: "production",
    team: "backend",
  },
});

// Find credentials by plugin type
const keyAuthCredentials = await client.credentials.findByPlugin("key-auth");

// Find credentials by label
const prodCredentials = await client.credentials.findByLabel(
  "env",
  "production",
);

// Clone credentials
const clonedCredential = await client.credentials.clone(
  "source-credential-id",
  { desc: "Cloned credential" },
  "new-credential-id",
);
```

### Secret Management

```typescript
// Vault Secret Management
const vaultSecret = await client.secrets.createVaultSecretWithValidation(
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
console.log("Vault connected:", vaultConnection.connected);

// AWS Secrets Manager
const awsSecret = await client.secrets.createAWSSecretWithValidation(
  {
    access_key_id: "AKIAIOSFODNN7EXAMPLE",
    secret_access_key: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
    region: "us-east-1",
  },
  "aws-secret-1",
);

// GCP Secret Manager
const gcpSecret = await client.secrets.createGCPSecretWithValidation(
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
console.log("Vault secrets:", allSecrets.vault.length);
console.log("AWS secrets:", allSecrets.aws.length);
console.log("GCP secrets:", allSecrets.gcp.length);

// Find secrets by criteria
const vaultNamespaces =
  await client.secrets.findVaultSecretsByNamespace("apisix-ns");
const awsRegions = await client.secrets.findAWSSecretsByRegion("us-east-1");
```

### Stream Routes (TCP/UDP Proxy)

```typescript
// Create TCP stream route
const tcpRoute = await client.streamRoutes.createTCPRoute({
  server_port: 9100,
  upstream_id: "tcp-upstream-1",
  plugins: {
    "limit-conn": {
      conn: 100,
    },
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

// Create TLS stream route
const tlsRoute = await client.streamRoutes.createTLSRoute({
  server_port: 9443,
  sni: "tcp.example.com",
  upstream_id: "tls-upstream-1",
});

// Find stream routes by protocol
const tcpRoutes = await client.streamRoutes.findByProtocol("tcp");
const udpRoutes = await client.streamRoutes.findByProtocol("udp");

// Find by server port
const portRoutes = await client.streamRoutes.findByServerPort(9100);

// Find by SNI
const sniRoutes = await client.streamRoutes.findBySNI("tcp.example.com");

// Validate stream route configuration
const validation = client.streamRoutes.validateConfig({
  server_port: 9100,
  upstream_id: "test-upstream",
});
if (!validation.valid) {
  console.log("Validation errors:", validation.errors);
}
```

### SSL Certificate Management

```typescript
// Create SSL certificate
const ssl = await client.ssl.create({
  cert: "-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----",
  key: "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----",
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

### Plugin Management

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
```

### Consumer Groups

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

### Control API (Monitoring)

```typescript
// Health check
const health = await client.control.healthCheck();

// Get server info
const info = await client.control.getServerInfo();

// Get upstream health status
const upstreamHealth = await client.control.getUpstreamHealth();

// Get Prometheus metrics
const metrics = await client.control.getPrometheusMetrics();

// Get system overview
const overview = await client.control.getSystemOverview();
```

## Advanced Usage

### Pagination

```typescript
// Use built-in pagination
const result = await client.routes.listPaginated(1, 20, {
  name: "api-*", // Filter by name pattern
});

console.log(`Found ${result.total} routes`);
console.log(`Page 1 has ${result.routes.length} routes`);
```

### Error Handling

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

```typescript
// Get statistics
const routeStats = await client.routes.getStatistics();
console.log(`Total routes: ${routeStats.total}`);
console.log(`Top plugins:`, routeStats.topPlugins);

const upstreamStats = await client.upstreams.getStatistics();
console.log(`Healthy upstreams: ${upstreamStats.healthy}`);
```

## Environment Variables

You can configure the SDK using environment variables:

```bash
export APISIX_BASE_URL=http://127.0.0.1:9180
export APISIX_API_KEY=your-api-key
```

```typescript
const client = new ApisixSDK({
  baseURL: process.env.APISIX_BASE_URL || "http://127.0.0.1:9180",
  apiKey: process.env.APISIX_API_KEY,
});
```

## Examples

Check out the [examples](./playground/) directory for complete usage examples:

- [Basic Usage](./playground/example.ts) - Comprehensive example covering all features
- [Testing](./playground/test-sdk.ts) - Complete test suite demonstrating all functionality

## TypeScript Support

This SDK is written in TypeScript and provides comprehensive type definitions:

```typescript
import {
  ApisixSDK,
  Route,
  Service,
  Upstream,
  Consumer,
  SSL,
  GlobalRule,
  ConsumerGroup,
  Credential,
  StreamRoute,
  VaultSecret,
  AWSSecret,
  GCPSecret,
  CreateInput,
  UpdateInput,
} from "apisix-sdk";

// All types are fully typed
const route: CreateInput<Route> = {
  name: "typed-route",
  uri: "/api/*",
  methods: ["GET"],
  upstream: {
    type: "roundrobin",
    nodes: { "127.0.0.1:8080": 1 },
  },
};

// Credential management with full typing
const credential: CreateInput<Credential> = {
  plugins: {
    "key-auth": { key: "api-key-123" },
  },
  desc: "API credentials",
};

// Stream route with validation
const streamRoute: CreateInput<StreamRoute> = {
  server_port: 9100,
  protocol: { name: "tcp" },
  upstream_id: "tcp-upstream",
};
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

- 📖 [Apache APISIX Documentation](https://apisix.apache.org/docs/)
- 🐛 [Report Issues](https://github.com/DemoMacro/apisix-sdk/issues)
- 💬 [Discussions](https://github.com/DemoMacro/apisix-sdk/discussions)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
