# APISIX SDK

![npm version](https://img.shields.io/npm/v/apisix-sdk)
![npm downloads](https://img.shields.io/npm/dw/apisix-sdk)
![npm license](https://img.shields.io/npm/l/apisix-sdk)
[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-2.1-4baaaa.svg)](https://www.contributor-covenant.org/version/2/1/code_of_conduct/)

> A comprehensive TypeScript/JavaScript SDK for [Apache APISIX](https://apisix.apache.org/) API Gateway. This SDK provides complete access to both the Admin API and Control API, making it easy to manage routes, services, upstreams, consumers, SSL certificates, plugins, and more.

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

## Documentation

For comprehensive API documentation and usage examples, please refer to:

- **[Admin API Documentation](../../docs/en/admin-api.md)** - Complete guide to APISIX Admin API
- **[Control API Documentation](../../docs/en/control-api.md)** - Control API for monitoring and management
- **[Examples](../../playground/)** - Practical usage examples

## API Overview

### Core Resources

- **Routes** - HTTP route management and configuration
- **Services** - Service abstraction for upstream management
- **Upstreams** - Backend server cluster management
- **Consumers** - API consumer and authentication management
- **SSL Certificates** - SSL/TLS certificate management
- **Plugins** - Plugin configuration and management
- **Global Rules** - Global plugin rules across all routes
- **Consumer Groups** - Consumer grouping and management
- **Plugin Configs** - Reusable plugin configurations
- **Stream Routes** - TCP/UDP proxy routing
- **Secrets** - Secret store management (Vault, AWS, GCP)
- **Credentials** - Standalone credential management

### Control API

- **Health Monitoring** - System health checks and status
- **Runtime Information** - Server info and metrics
- **Schema Management** - Configuration schema access
- **Discovery Services** - Service discovery integration

## Support

- 📖 [Apache APISIX Documentation](https://apisix.apache.org/docs/)
- 🐛 [Report Issues](https://github.com/DemoMacro/apisix-sdk/issues)
- 💬 [Discussions](https://github.com/DemoMacro/apisix-sdk/discussions)

## License

- [MIT](LICENSE) &copy; [Demo Macro](https://imst.xyz/)
