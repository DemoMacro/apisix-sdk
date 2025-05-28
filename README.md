# Apache APISIX SDK

![GitHub](https://img.shields.io/github/license/DemoMacro/everything-client)
[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-2.1-4baaaa.svg)](https://www.contributor-covenant.org/version/2/1/code_of_conduct/)

> A comprehensive TypeScript/JavaScript SDK for [Apache APISIX](https://apisix.apache.org/) API Gateway. This SDK provides complete access to both the Admin API and Control API, making it easy to manage routes, services, upstreams, consumers, SSL certificates, plugins, and more.

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

console.log("Route created:", route.id);
```

## Configuration

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

## Documentation

For detailed API documentation and usage examples, please refer to:

- **[Admin API Documentation](./docs/en/admin-api.md)** - Complete guide to APISIX Admin API
- **[Control API Documentation](./docs/en/control-api.md)** - Control API for monitoring and management
- **[Examples](./playground/)** - Practical usage examples

## Development

### Project Structure

```
apisix-sdk/
├── packages/apisix-sdk/     # SDK source code
│   ├── src/
│   │   ├── types.ts         # TypeScript type definitions
│   │   ├── client.ts        # HTTP client
│   │   ├── resources/       # Resource managers
│   │   └── index.ts         # Main entry point
│   └── package.json
├── docs/                    # Documentation
│   ├── en/                  # English documentation
│   └── zh/                  # Chinese documentation
├── playground/              # Examples and testing
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

- [MIT](LICENSE) &copy; [Demo Macro](https://imst.xyz/)
