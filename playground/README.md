# APISIX SDK Playground

> Test environment and configuration management directory, containing comprehensive APISIX SDK test cases and configuration examples.

## Overview

Playground serves as the test environment for the APISIX SDK, providing:

- 🧪 **Complete Test Suite**: Test cases covering all SDK functionalities
- ⚙️ **Configuration Management**: Flexible configuration system supporting environment variables and configuration files
- 🔧 **Client Management**: Unified SDK client creation and management
- 📋 **Test Helpers**: Version compatibility checks and testing tools
- 🔐 **SSL Certificates**: Real SSL certificates for testing

## Directory Structure

```
playground/
├── tests/                   # Directory for test cases
│   ├── test-helpers.ts      # Test helper functions and tools
│   ├── consumer*.test.ts    # Consumer related tests
│   ├── routes.test.ts       # Route tests
│   ├── services.test.ts     # Service tests
│   ├── ssl.test.ts          # SSL certificate tests
│   └── ...                  # Other test files
├── fixtures/                # Directory for test resource files
│   ├── fullchain.pem        # SSL certificate
│   └── privkey.pem          # SSL private key
├── client.ts                # SDK client configuration
├── config.ts                # Configuration management
├── package.json             # Dependency declaration
└── tsconfig.json            # TypeScript configuration
```

## Configuration

### Environment Variables

Create a `.env` file in the root directory or set the following environment variables:

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

### Configuration Files

Configuration management is based on [c12](https://github.com/unjs/c12) and supports multiple configuration sources:

```typescript
interface ApisixConfig {
  adminURL: string; // Admin API Address
  controlURL: string; // Control API Address
  apiKey: string; // API Key
  timeout: number; // Request Timeout
  logLevel: "debug" | "info" | "warn" | "error";
}

interface TestConfig {
  cleanupEnabled: boolean; // Whether to enable test cleanup
  timeout: number; // Test Timeout
}
```

### APISIX Configuration

To run all tests in the playground, you need a properly configured APISIX instance. Here's the configuration based on the official Apache APISIX Docker example:

#### APISIX Configuration File

Create or update your `conf/config.yaml` file with the following configuration:

```yaml
#
# Licensed to the Apache Software Foundation (ASF) under one or more
# contributor license agreements.  See the NOTICE file distributed with
# this work for additional information regarding copyright ownership.
# The ASF licenses this file to You under the Apache License, Version 2.0
# (the "License"); you may not use this file except in compliance with
# the License.  You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#

apisix:
  node_listen: 9080 # APISIX listening port
  enable_ipv6: false

  ssl:
    enable: true
    listen:
      - port: 9443
        ssl_protocols: "TLSv1.2 TLSv1.3"

  proxy_mode: http&stream # Enable both HTTP and Stream proxy
  stream_proxy: # Stream proxy configuration for TCP/UDP traffic
    tcp:
      - 9100 # TCP proxy port
      - 9101 # Additional TCP port for testing
    udp:
      - 9200 # UDP proxy port
      - 9211 # Additional UDP port for testing

  enable_control: true # Enable Control API
  control:
    ip: "0.0.0.0" # Listen on all interfaces
    port: 9090 # Control API port (standard APISIX port)

  router:
    http: "radixtree_uri" # HTTP router
    ssl: "radixtree_sni" # SSL/SNI router

deployment:
  role: traditional
  role_traditional:
    config_provider: etcd

  admin:
    admin_key:
      - name: "admin"
        key: edd1c9f034335f136f87ad84b625c8f1
        role: admin
      - name: "viewer"
        key: 4054f7cf07e344346cd3f287985e76a2
        role: viewer
    allow_admin:
      - 127.0.0.0/24
      - 0.0.0.0/0 # Allow all (for development only)

  etcd:
    host:
      - "http://127.0.0.1:2379"
    prefix: "/apisix"
    timeout: 30

plugins:
  - jwt-auth
  - key-auth
  - basic-auth
  - hmac-auth
  - ip-restriction
  - cors
  - limit-req
  - limit-count
  - limit-conn
  - echo
  - request-id
  - prometheus
  - proxy-rewrite
  - response-rewrite
  - proxy-cache
  - grpc-transcode

stream_plugins:
  - mqtt-proxy
  - prometheus

plugin_attr:
  prometheus:
    export_uri: /apisix/prometheus/metrics
    metric_prefix: apisix_
    enable_export_server: true
    export_addr:
      ip: 0.0.0.0
      port: 9091

dns_resolver:
  - 114.114.114.114
  - 8.8.8.8
  - 1.1.1.1
```

#### Installation Steps

1. **Install APISIX with etcd:**

```bash
# Using Docker Compose (recommended for development)
curl https://raw.githubusercontent.com/apache/apisix/master/example/docker-compose.yml -o docker-compose.yml
docker-compose up -d

# Or using package managers
# Ubuntu/Debian
curl https://raw.githubusercontent.com/apache/apisix/master/utils/install-apisix.sh | sudo bash

# macOS
brew install apisix
```

2. **Replace the configuration file:**

```bash
# Backup original config
cp /usr/local/apisix/conf/config.yaml /usr/local/apisix/conf/config.yaml.backup

# Copy one of the above configurations to config.yaml
sudo nano /usr/local/apisix/conf/config.yaml
```

3. **Start APISIX:**

```bash
# Start APISIX with the new configuration
sudo apisix start

# Or restart if already running
sudo apisix restart
```

#### Verification Commands

Verify that APISIX is properly configured by running these commands:

```bash
# Check Admin API (port 9180)
curl -H "X-API-KEY: edd1c9f034335f136f87ad84b625c8f1" \
  http://127.0.0.1:9180/apisix/admin/routes

# Check Control API (port 9090)
curl http://127.0.0.1:9090/v1/healthcheck

# Check main HTTP proxy (port 9080)
curl http://127.0.0.1:9080

# Check HTTPS proxy (port 9443) - will show certificate error, but should connect
curl -k https://127.0.0.1:9443

# Check stream proxy ports are listening
netstat -tlnp | grep -E "(9100|9200)"
```

#### Required Services

Before running the tests, ensure these services are running:

1. **etcd** (default port 2379)
2. **APISIX** (configured as above)

```bash
# Check etcd status
curl http://127.0.0.1:2379/health

# Check APISIX processes
ps aux | grep apisix
```

#### Environment Variables

Set up your environment for testing:

```bash
# Create .env file in project root
cat > .env << EOF
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
EOF
```

#### Running Tests

Once APISIX is configured and running:

```bash
# Run all tests
pnpm test

# Run specific test suites
pnpm vitest playground/tests/routes.test.ts
pnpm vitest playground/tests/ssl.test.ts
pnpm vitest playground/tests/stream-routes.test.ts

# Run tests in watch mode
pnpm test:watch

# Generate coverage report
pnpm test:coverage
```

#### Troubleshooting

**Common Issues and Solutions:**

1. **Control API connection errors (port 9090):**

   - Ensure `enable_control: true` is set in config.yaml
   - Verify the port 9090 is not blocked by firewall
   - Check APISIX logs: `tail -f logs/error.log`

2. **Stream route tests failing:**

   - Ensure `proxy_mode: http&stream` is configured
   - Verify stream_proxy TCP/UDP ports are configured
   - Stream proxy requires APISIX 2.10.0+

3. **SSL certificate tests failing:**

   - Ensure SSL is enabled in the configuration
   - Check that port 9443 is configured with SSL
   - Verify SSL certificates are present in playground/tests/fixtures/

4. **Pagination tests failing:**

   - Pagination requires APISIX 3.0+
   - Some resources may not support pagination in older versions

5. **Plugin tests failing:**
   - Ensure required plugins are enabled in the `plugins` section
   - Some plugins may require additional configuration

**Log Files:**

```bash
# APISIX error logs
tail -f /usr/local/apisix/logs/error.log

# APISIX access logs
tail -f /usr/local/apisix/logs/access.log
```

**Port Usage Summary:**

- **9080**: HTTP proxy (main APISIX port)
- **9443**: HTTPS proxy (SSL/TLS)
- **9180**: Admin API
- **9090**: Control API
- **9100-9101**: TCP stream proxy ports
- **9200**: UDP stream proxy port
- **9211**: Additional UDP port for testing
- **2379**: etcd
- **9091**: Prometheus metrics export (optional)

### Test Best Practices

1. **Resource Cleanup**: Always clean up resources created by tests
2. **Version Compatibility**: Use `TestHelpers` to check for feature support
3. **Error Handling**: Gracefully handle expected error conditions
4. **Isolation**: Ensure tests do not depend on each other
5. **Descriptive**: Use clear test names and descriptions

## Usage

### Running Tests

Run all tests from the root directory:

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Generate test coverage report
pnpm test:coverage
```

### Running Specific Tests

```bash
# Run route tests
pnpm vitest playground/tests/routes.test.ts

# Run SSL tests
pnpm vitest playground/tests/ssl.test.ts

# Run consumer tests
pnpm vitest playground/tests/consumers.test.ts
```

### Client Usage

```typescript
import { createClient, createTestClient } from "./client";

// Create production client
const client = await createClient();

// Create test client
const testClient = await createTestClient();

// Validate connection
const isConnected = await validateConnection(client);
```

### Test Helpers

```typescript
import { TestHelpers } from "./tests/test-helpers";

const helpers = new TestHelpers(client);

// Version compatibility check
const isV3 = await helpers.skipIfUnsupported("credentials");

// Get test SSL certificate
const sslCert = helpers.getSimpleSSLCertificate();

// Clean up test resources
await helpers.cleanupResource("routes", "test-route-id");
```

## Test Features

### Core Feature Tests

- **Route Management** (`routes.test.ts`) - Route creation, update, deletion, query
- **Service Management** (`services.test.ts`) - Service abstraction layer tests
- **Upstream Management** (`upstreams.test.ts`) - Load balancing and health checks
- **Consumer Management** (`consumers.test.ts`) - User authentication and authorization
- **SSL Certificates** (`ssl.test.ts`) - Certificate management and validation
- **Plugin Configuration** (`plugins.test.ts`) - Plugin enablement and configuration

### Advanced Feature Tests

- **Stream Routes** (`stream-routes.test.ts`) - TCP/UDP proxy
- **Credential Management** (`credentials.test.ts`) - Standalone credential system
- **Secret Management** (`secrets.test.ts`) - Vault/AWS/GCP integration
- **Global Rules** (`global-rules.test.ts`) - Global plugin rules
- **Control API** (`control.test.ts`) - Monitoring and health checks

### Version Compatibility

Test helpers automatically detect the APISIX version and skip unsupported features:

```typescript
// Automatically detect version and skip unsupported features
await helpers.conditionalTest("credentials", async () => {
  // Runs only on APISIX 3.0+
  const credential = await client.credentials.create(...);
});
```

## SSL Certificate

For SSL certificate testing, the SDK includes:

- **Embedded Certificates**: Built-in test certificates in `test-helpers.ts` for basic testing
- **External Certificate Support**: Place real certificates in `tests/fixtures/` directory:
  - `tests/fixtures/fullchain.pem` - Full certificate chain
  - `tests/fixtures/privkey.pem` - Private key file

If external certificate files are found, they will be used automatically. Otherwise, the embedded test certificates are used as fallback.

**Embedded Certificate Information:**

- **Subject**: CN=127.0.0.1, O=apisix-sdk
- **Issuer**: CN=apisix-sdk
- **Validity**: 2025-05-29 to 2035-05-29
- **Supported Domains**: 127.0.0.1, localhost

**To use your own certificates:**

```bash
# Create fixtures directory if it doesn't exist
mkdir -p playground/tests/fixtures

# Copy your certificate files
cp /path/to/your/fullchain.pem playground/tests/fixtures/
cp /path/to/your/privkey.pem playground/tests/fixtures/
```

## Troubleshooting

### Connection Issues

Ensure APISIX is running and accessible:

```bash
# Check Admin API
curl http://127.0.0.1:9180/apisix/admin/routes \
  -H "X-API-KEY: edd1c9f034335f136f87ad84b625c8f1"

# Check Control API
curl http://127.0.0.1:9090/v1/healthcheck
```

### Test Failures

Common reasons for test failures:

1. **APISIX Not Running**: Ensure the APISIX service is running
2. **Incorrect API Key**: Check the `APISIX_API_KEY` environment variable
3. **Port Conflicts**: Ensure ports 9180 (Admin) and 9090 (Control) are available
4. **Version Incompatibility**: Some features require APISIX 3.0+

### Configuration Issues

Check configuration loading:

```typescript
import { getClientConfig } from "./client";

const config = getClientConfig();
console.log("Current config:", config);
```

## Development Guide

### Adding New Tests

1. Create a test file in the `tests/` directory
2. Import test helpers and the client
3. Use a consistent test structure
4. Add appropriate cleanup logic

```typescript
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestClient, resetClient, validateConnection } from "../client";
import { TestHelpers } from "./test-helpers";

describe("My Feature Test", () => {
  let client: ApisixSDK;
  let helpers: TestHelpers;

  beforeAll(async () => {
    client = await createTestClient();
    helpers = new TestHelpers(client);

    const isConnected = await validateConnection(client);
    if (!isConnected) {
      throw new Error("Cannot connect to APISIX for testing");
    }
  });

  afterAll(async () => {
    // Clean up test resources
    resetClient();
  });

  it("should test feature", async () => {
    // Test logic
  });
});
```

## Support

- 📖 [APISIX Documentation](https://apisix.apache.org/docs/)
- 🔧 [SDK Documentation](../docs/en/)
- 🐛 [Issue Tracker](https://github.com/DemoMacro/apisix-sdk/issues)
- 💬 [Discussions](https://github.com/DemoMacro/apisix-sdk/discussions)

## License

- [MIT](LICENSE) &copy; [Demo Macro](https://imst.xyz/)
