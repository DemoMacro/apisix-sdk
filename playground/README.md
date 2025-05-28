# APISIX SDK Playground

This is the test and example environment for the APISIX SDK, providing complete test cases and usage examples.

## 🚀 Features

- **Unified Configuration Management**: Uses [c12](https://github.com/unjs/c12) for configuration management
- **Environment Variable Support**: Configure APISIX connection information through the `.env` file
- **Comprehensive Test Coverage**: Includes complete tests for basic functionalities, advanced features, and plugin configurations
- **TypeScript Support**: Complete type safety and IntelliSense support
- **Example Code**: Practical examples covering all SDK functionalities

## 📁 Project Structure

```
playground/
├── config.ts              # Unified configuration management (using c12)
├── client.ts              # Unified client configuration
├── .env                   # Environment variable configuration
├── examples/              # Usage examples
│   ├── basic-usage.ts     # Basic usage example
│   ├── advanced-features.ts # Advanced features example
│   ├── plugin-examples.ts # Plugin configuration examples
│   └── index.ts          # Examples entry point
├── tests/                 # Test cases
│   ├── basic.test.ts     # Basic functionality tests
│   ├── advanced.test.ts  # Advanced functionality tests
│   ├── plugins.test.ts   # Plugin configuration tests
│   └── index.test.ts     # Test entry point
├── package.json          # Project configuration
├── vitest.config.ts      # Test configuration
└── tsconfig.json         # TypeScript configuration
```

## ⚙️ Configuration Management

### Environment Variables

The project uses the `.env` file for configuration, supporting the following environment variables:

```bash
# APISIX Configuration
APISIX_ADMIN_URL=http://127.0.0.1:9180
APISIX_CONTROL_URL=http://127.0.0.1:9090
APISIX_API_KEY=edd1c9f034335f136f87ad84b625c8f1

# SDK Configuration
APISIX_SDK_TIMEOUT=30000
APISIX_SDK_LOG_LEVEL=info

# Test Configuration
TEST_CLEANUP_ENABLED=true
TEST_TIMEOUT=30000

# Environment
NODE_ENV=development
```

### Unified Client Configuration

All examples and tests use a unified client configuration:

```typescript
import { createClient, validateConnection, getClientConfig } from "./client.js";

// Create a configured client
const client = await createClient();

// Validate connection
const isConnected = await validateConnection(client);

// Get configuration information
const config = getClientConfig();
```

## 🏃‍♂️ Quick Start

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Environment

Copy and modify the configuration in the `.env` file:

```bash
# Modify APISIX server address and API Key
APISIX_ADMIN_URL=http://your-apisix-host:9180
APISIX_API_KEY=your-api-key
```

### 3. Start APISIX

Ensure the APISIX service is running. If using Docker:

```bash
# Use the official Docker image
docker run -d --name apisix \
  -p 9080:9080 \
  -p 9180:9180 \
  -p 9443:9443 \
  apache/apisix:latest
```

### 4. Run Examples

```bash
# Run all examples
pnpm example:all

# Run specific example
pnpm example:basic      # Basic Usage Example
pnpm example:advanced   # Advanced Features Example
pnpm example:plugins    # Plugin Configuration Example
```

### 5. Run Tests

```bash
# Run all tests
pnpm test

# Run specific tests
pnpm test basic.test.ts
pnpm test advanced.test.ts
pnpm test plugins.test.ts

# Generate test coverage report
pnpm test:coverage

# Run tests in watch mode
pnpm test:watch
```

## 📚 Example Descriptions

### Basic Usage Example (`examples/basic-usage.ts`)

Demonstrates the core functionalities of the APISIX SDK:

- Connection validation and status check
- CRUD operations for Upstream, Service, and Route
- Resource management and cleanup
- Error handling

```typescript
import { createClient, validateConnection } from "../client.js";

async function basicExample() {
  const client = await createClient();

  // Validate connection
  const isConnected = await validateConnection(client);
  if (!isConnected) {
    throw new Error("Cannot connect to APISIX");
  }

  // Create Upstream
  const upstream = await client.upstreams.create(
    {
      name: "example-upstream",
      type: "roundrobin",
      nodes: { "httpbin.org:80": 1 },
    },
    "example-upstream-id",
  );

  // ... more operations
}
```

### Advanced Features Example (`examples/advanced-features.ts`)

Showcases advanced features in APISIX 3.0+:

- Credential Management (standalone credentials)
- Secret Management (Vault/AWS/GCP)
- Stream Routes (TCP/UDP/TLS proxy)
- Pagination and Filtering
- Control API features

```typescript
// Credential Management
const credential = await client.credentials.create(
  {
    plugins: {
      "key-auth": { key: "api-key-123" },
      "basic-auth": { username: "user", password: "pass" },
    },
  },
  "credential-id",
);

// Secret Management
const vaultSecret = await client.secrets.createVaultSecret(
  {
    uri: "http://vault:8200",
    prefix: "kv/secrets",
    token: "vault-token",
  },
  "vault-secret-id",
);

// Stream Routes
const streamRoute = await client.streamRoutes.createTCPRoute(
  {
    server_port: 9100,
    upstream_id: "upstream-id",
  },
  "stream-route-id",
);
```

### Plugin Configuration Example (`examples/plugin-examples.ts`)

Comprehensive examples of plugin configuration:

- Authentication Plugins (key-auth, basic-auth, JWT)
- Rate Limiting Plugins (limit-req, limit-conn, limit-count)
- Security Plugins (CORS, IP Restriction, UA Restriction)
- Transformation Plugins (proxy-rewrite, response-rewrite)
- Monitoring Plugins (Prometheus, Logging)

```typescript
// Create a route with multiple plugins
const route = await client.routes.create({
  name: "multi-plugin-route",
  uri: "/api/secure",
  plugins: {
    "key-auth": {},
    "limit-req": { rate: 100, burst: 50 },
    cors: { allow_origins: "*" },
    prometheus: { disable: false },
  },
});
```

## 🧪 Test Cases

### Basic Functionality Tests (`tests/basic.test.ts`)

- Connection and health check
- Upstream management (create, get, list, update, delete)
- Service management
- Route management
- Consumer management
- Plugin management
- Error handling

### Advanced Features Tests (`tests/advanced.test.ts`)

- Control API features
- Credential management
- Secret management (Vault/AWS/GCP)
- Stream Routes (TCP/UDP/TLS)
- Pagination and Filtering
- Concurrent operations handling

### Plugin Configuration Tests (`tests/plugins.test.ts`)

- Plugin management and metadata
- Route plugin configuration
- Service plugin configuration
- Consumer plugin configuration
- Global Rule plugin configuration
- Plugin categories and information
- Error handling and edge cases

## 🔧 Development Tools

### Available Scripts

```bash
# Development
pnpm dev                # Run examples (equivalent to example:all)

# Examples
pnpm example:basic      # Basic Usage Example
pnpm example:advanced   # Advanced Features Example
pnpm example:plugins    # Plugin Configuration Example
pnpm example:all        # Run all examples

# Tests
pnpm test              # Run tests in watch mode
pnpm test:run          # Run all tests once
pnpm test:watch        # Run tests in watch mode
pnpm test:coverage     # Generate coverage report

# Build
pnpm build             # Compile TypeScript
pnpm clean             # Clean build files
```

### Configuration Files

- **`vitest.config.ts`**: Test configuration, including 30-second timeouts
- **`tsconfig.json`**: TypeScript configuration, supports path mapping
- **`package.json`**: Project dependencies and scripts configuration

## 🌟 Best Practices

### 1. Configuration Management

- Use environment variables for configuration
- Use different configuration files for different environments
- Do not commit sensitive information to version control

### 2. Error Handling

- All examples include comprehensive error handling
- Test cases use try-catch to handle optional features
- Resource cleanup ensures a clean test environment

### 3. Type Safety

- All code has complete TypeScript types
- Use strict type checking
- Avoid using `any` types

### 4. Testing Strategy

- Each test is independent
- Use beforeEach/afterEach for resource cleanup
- Tests cover all major feature paths

## 🚨 Important Notes

### Connection Requirements

- Ensure the APISIX service is running
- Check network connectivity and firewall settings
- Verify the correctness of the API Key

### Feature Availability

- Some advanced features require APISIX 3.0+
- Control API may not be available in all environments
- Plugin availability depends on APISIX configuration

### Testing Environment

- It is recommended to use a dedicated testing environment
- Tests will create and delete resources
- Ensure you have sufficient permissions for operations

## 📖 Related Documentation

- [APISIX SDK Main Documentation](../README.md)
- [APISIX Official Documentation](https://apisix.apache.org/docs/)
- [Admin API Documentation](../docs/en/admin-api.md)
- [Control API Documentation](../docs/en/control-api.md)

## 🤝 Contribution

Contributions via Issues and Pull Requests are welcome to improve this playground!

## 📄 License

This project is licensed under the MIT License.
