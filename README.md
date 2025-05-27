# Apache APISIX SDK for Node.js

A modern TypeScript/JavaScript SDK for Apache APISIX, providing comprehensive support for both Admin API and Control API.

[![npm version](https://img.shields.io/npm/v/apisix-sdk)](https://www.npmjs.com/package/apisix-sdk)
[![npm downloads](https://img.shields.io/npm/dw/apisix-sdk)](https://www.npmjs.com/package/apisix-sdk)
[![license](https://img.shields.io/npm/l/apisix-sdk)](https://github.com/DemoMacro/apisix-sdk/blob/main/LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue)](https://www.typescriptlang.org/)

## Features

- 🚀 **Complete API Coverage**: Full support for APISIX Admin API and Control API endpoints
- 📝 **TypeScript Support**: Complete type definitions for excellent developer experience
- 🔧 **Modern Build System**: Built with unbuild, supports both ESM and CJS
- 🌐 **Modern HTTP Client**: Uses ofetch for reliable HTTP communications
- 📖 **Comprehensive Documentation**: Detailed API documentation and examples
- 🛡️ **Error Handling**: Robust error handling with type safety
- 🔄 **Promise-based**: Async/await support throughout
- 📦 **Tree-shakeable**: Optimized bundle size with selective imports

## Installation

```bash
npm install apisix-sdk
# or
pnpm add apisix-sdk
# or
yarn add apisix-sdk
```

## Quick Start

### Basic Usage

```typescript
import { ApisixSDK } from "apisix-sdk";

// Create SDK instance
const client = new ApisixSDK({
  baseURL: "http://127.0.0.1:9180",
  apiKey: "your-api-key",
});

// Test connection
const isConnected = await client.testConnection();
console.log("Connected:", isConnected);

// Create a route
const route = await client.routes.create({
  name: "example-api",
  uri: "/api/v1/*",
  methods: ["GET", "POST"],
  upstream: {
    type: "roundrobin",
    nodes: {
      "127.0.0.1:8080": 1,
    },
  },
});

// List all routes
const routes = await client.routes.list();
console.log(`Found ${routes.length} routes`);

// Get specific route
const specificRoute = await client.routes.get(route.id!);

// Update route
await client.routes.update(route.id!, {
  desc: "Updated API route",
});

// Delete route
await client.routes.delete(route.id!);
```

### Configuration Options

```typescript
const client = new ApisixSDK({
  baseURL: "http://127.0.0.1:9180", // APISIX Admin API URL
  apiKey: "your-api-key", // API Key for authentication
  timeout: 30000, // Request timeout in milliseconds
  headers: {
    // Custom headers
    "Custom-Header": "value",
  },
});
```

## API Documentation

### Routes Management

#### Basic Operations

```typescript
// List routes
const routes = await client.routes.list();

// Paginated listing
const { routes, total, hasMore } = await client.routes.listPaginated(1, 10);

// Get specific route
const route = await client.routes.get("route-id");

// Create route
const newRoute = await client.routes.create({
  name: "api-route",
  uri: "/api/*",
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
```

#### Advanced Operations

```typescript
// Search routes
const apiRoutes = await client.routes.findByUri("/api");
const getRoutes = await client.routes.findByMethod("GET");
const hostRoutes = await client.routes.findByHost("api.example.com");

// Enable/disable routes
await client.routes.enable("route-id");
await client.routes.disable("route-id");

// Check existence
const exists = await client.routes.exists("route-id");

// Clone route
const cloned = await client.routes.clone("source-id", {
  name: "cloned-route",
  uri: "/new-path/*",
});
```

#### Complex Route Configuration

```typescript
const complexRoute = await client.routes.create({
  name: "complex-api",
  uri: "/api/v1/users",
  methods: ["GET", "POST", "PUT", "DELETE"],
  hosts: ["api.example.com"],
  vars: [
    ["arg_version", "==", "v1"],
    ["http_user_agent", "~*", "Mozilla.*"],
  ],
  priority: 100,
  upstream: {
    type: "chash",
    hash_on: "header",
    key: "user-id",
    nodes: [
      { host: "127.0.0.1", port: 8080, weight: 1 },
      { host: "127.0.0.1", port: 8081, weight: 2 },
    ],
    checks: {
      active: {
        type: "http",
        http_path: "/health",
        timeout: 5,
        healthy: {
          interval: 10,
          successes: 2,
        },
        unhealthy: {
          interval: 5,
          http_failures: 3,
        },
      },
    },
  },
  plugins: {
    "rate-limit": {
      count: 100,
      time_window: 60,
      rejected_code: 429,
    },
    cors: {
      allow_origins: "*",
      allow_methods: "GET,POST,PUT,DELETE",
      allow_headers: "Content-Type,Authorization",
    },
    "jwt-auth": {
      secret: "my-secret-key",
    },
  },
  enable_websocket: false,
  status: 1,
});
```

### Services Management

```typescript
// Create service
const service = await client.services.create({
  name: "user-service",
  upstream: {
    type: "roundrobin",
    nodes: { "127.0.0.1:8080": 1 },
  },
  plugins: {
    "rate-limit": {
      count: 200,
      time_window: 60,
    },
  },
});

// List services
const services = await client.services.list();

// Update service
await client.services.update("service-id", {
  desc: "Updated service",
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
      healthy: {
        interval: 10,
        successes: 2,
      },
    },
  },
});

// Update upstream nodes
await client.upstreams.patch("upstream-id", {
  nodes: {
    "127.0.0.1:8082": 1, // Add new node
  },
});
```

### Consumers and Authentication

```typescript
// Create consumer
const consumer = await client.consumers.create({
  username: "api-user",
  desc: "API user for mobile app",
});

// Add authentication credentials
await client.consumers.createCredential("api-user", "key-auth-1", {
  plugins: {
    "key-auth": {
      key: "user-api-key",
    },
  },
});

// List consumer credentials
const credentials = await client.consumers.listCredentials("api-user");
```

### SSL Certificates

```typescript
// Create SSL certificate
const ssl = await client.ssl.create({
  cert: "-----BEGIN CERTIFICATE-----\n...",
  key: "-----BEGIN PRIVATE KEY-----\n...",
  snis: ["api.example.com", "*.api.example.com"],
});

// List SSL certificates
const certificates = await client.ssl.list();
```

### Control API Usage

```typescript
// Health monitoring
const health = await client.control.healthCheck();
console.log("APISIX Status:", health.status);

// Server information
const serverInfo = await client.control.getServerInfo();
console.log("Version:", serverInfo.version);
console.log("Uptime:", serverInfo.up_time);

// Upstream health
const upstreamHealth = await client.control.getUpstreamHealth();
upstreamHealth.forEach((upstream) => {
  console.log(`Upstream: ${upstream.name}`);
  upstream.nodes.forEach((node) => {
    console.log(`  ${node.host}:${node.port} - ${node.status}`);
  });
});

// Prometheus metrics
const metrics = await client.control.getPrometheusMetrics();
console.log("Metrics:", metrics);
```

## Error Handling

```typescript
try {
  const route = await client.routes.get("non-existent-id");
} catch (error) {
  if (error.message.includes("APISIX API Error")) {
    console.log("APISIX specific error:", error.message);
  } else {
    console.log("Network or other error:", error.message);
  }
}
```

## Advanced Features

### Pagination

```typescript
// Using built-in pagination
const { routes, total, hasMore } = await client.routes.listPaginated(2, 25);
console.log(
  `Page 2: ${routes.length} routes, Total: ${total}, Has more: ${hasMore}`,
);

// Manual pagination
const routes = await client.routes.list({
  page: 1,
  page_size: 10,
});
```

### Filtering

```typescript
// Filter routes by name and URI
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

## Development

### Project Structure

```
apisix-sdk/
├── packages/apisix-sdk/     # SDK source code
│   ├── src/
│   │   ├── types.ts         # TypeScript type definitions
│   │   ├── client.ts        # HTTP client
│   │   ├── resources/       # Resource managers
│   │   │   ├── routes.ts    # Routes management
│   │   │   ├── services.ts  # Services management
│   │   │   └── ...          # Other resources
│   │   └── index.ts         # Main entry point
│   └── package.json
├── docs/                    # Documentation
│   ├── en/                  # English documentation
│   │   ├── admin-api.md     # Admin API documentation
│   │   └── control-api.md   # Control API documentation
│   └── zh/                  # Chinese documentation
├── playground/              # Examples and testing
│   └── example.ts           # Usage examples
└── package.json
```

### Building

```bash
# Install dependencies
pnpm install

# Build SDK
cd packages/apisix-sdk
pnpm build

# Development mode (watch for changes)
pnpm dev
```

### Running Examples

```bash
# Make sure APISIX is running on http://127.0.0.1:9180
# Run examples
cd playground
npx tsx example.ts
```

## API Reference

### Admin API Resources

- **Routes**: `/apisix/admin/routes` - Route management
- **Services**: `/apisix/admin/services` - Service configuration
- **Upstreams**: `/apisix/admin/upstreams` - Backend server management
- **Consumers**: `/apisix/admin/consumers` - API consumer management
- **SSL**: `/apisix/admin/ssls` - SSL certificate management
- **Plugins**: `/apisix/admin/plugins` - Plugin configuration
- **Global Rules**: `/apisix/admin/global_rules` - Global plugin rules
- **Consumer Groups**: `/apisix/admin/consumer_groups` - Consumer grouping
- **Plugin Configs**: `/apisix/admin/plugin_configs` - Reusable plugin configs
- **Stream Routes**: `/apisix/admin/stream_routes` - TCP/UDP routing
- **Secrets**: `/apisix/admin/secrets` - Secret management

### Control API Endpoints

- **Health**: `/v1/healthcheck` - Health monitoring
- **Server Info**: `/v1/server_info` - Runtime information
- **Schemas**: `/v1/schema` - Configuration schemas
- **Plugins**: `/v1/plugins` - Plugin information
- **Metrics**: `/apisix/prometheus/metrics` - Prometheus metrics
- **Discovery**: `/v1/discovery` - Service discovery

## Requirements

- Node.js 16+ or higher
- Apache APISIX 2.15+ (recommended 3.0+)

## Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Write TypeScript with proper type definitions
- Add tests for new features
- Update documentation for API changes
- Follow the existing code style
- Ensure all tests pass before submitting PR

## Related Links

- [Apache APISIX](https://apisix.apache.org/)
- [APISIX Admin API Documentation](https://apisix.apache.org/docs/apisix/admin-api/)
- [APISIX Control API Documentation](https://apisix.apache.org/docs/apisix/control-api/)
- [APISIX Plugin Hub](https://apisix.apache.org/plugins/)

## Support

- 📖 [Documentation](./docs/en/)
- 🐛 [Issue Tracker](https://github.com/DemoMacro/apisix-sdk/issues)
- 💬 [Discussions](https://github.com/DemoMacro/apisix-sdk/discussions)

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) file for details.
