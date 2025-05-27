# Apache APISIX Admin API Documentation

The Apache APISIX Admin API provides RESTful endpoints for managing all aspects of your API gateway configuration. This SDK covers all major Admin API functionalities.

## Overview

The Admin API allows users to control their deployed Apache APISIX instance through RESTful endpoints. It provides complete management capabilities for routes, services, upstreams, consumers, SSL certificates, plugins, and other APISIX resources.

## Configuration

### Base Configuration

- **Default Port**: 9180
- **Default Base Path**: `/apisix/admin`
- **API Version**: v1 (with support for v3 features)
- **Default IP**: 0.0.0.0 (configurable)

### API Key Authentication

All Admin API requests require authentication using the `X-API-KEY` header:

```typescript
const client = new ApisixSDK({
  baseURL: "http://127.0.0.1:9180",
  apiKey: "edd1c9f034335f136f87ad84b625c8f1", // Change in production!
});
```

### Admin API Configuration (config.yaml)

```yaml
deployment:
  admin:
    admin_key:
      - name: admin
        key: edd1c9f034335f136f87ad84b625c8f1 # Change this in production!
        role: admin
    allow_admin: # IP access control
      - 127.0.0.0/24
    admin_listen:
      ip: 0.0.0.0 # Specific IP for Admin API
      port: 9180 # Specific port for Admin API
```

### Environment Variables

You can use environment variables in configuration:

```yaml
deployment:
  admin:
    admin_key:
      - name: admin
        key: ${{ADMIN_KEY:=edd1c9f034335f136f87ad84b625c8f1}}
        role: admin
```

### Force Delete

Add `force=true` query parameter to delete resources even if they are in use:

```bash
curl "http://127.0.0.1:9180/apisix/admin/upstreams/1?force=true" \
  -H "X-API-KEY: $admin_key" -X DELETE
```

## API v3 Features

### New Response Format

**Single Resource Response:**

```json
{
  "modifiedIndex": 2685183,
  "value": {
    "id": "1"
    // ... resource data
  },
  "key": "/apisix/routes/1",
  "createdIndex": 2684956
}
```

**Multiple Resources Response:**

```json
{
  "list": [
    {
      "modifiedIndex": 2685183,
      "value": {
        "id": "1"
        // ... resource data
      },
      "key": "/apisix/routes/1",
      "createdIndex": 2684956
    }
  ],
  "total": 2
}
```

### Pagination Support

Use pagination for list operations:

```bash
curl "http://127.0.0.1:9180/apisix/admin/routes?page=1&page_size=10" \
  -H "X-API-KEY: $admin_key" -X GET
```

**Pagination Parameters:**

- `page`: Page number (default: 1)
- `page_size`: Items per page (default: 10, range: [1, 500])

### Filtering Support

Filter resources by name, label, URI, etc.:

```bash
curl 'http://127.0.0.1:9180/apisix/admin/routes?name=test&uri=foo&label=env:prod' \
  -H "X-API-KEY: $admin_key" -X GET
```

## Core Resources

### Routes

Routes define how incoming requests are matched and handled.

#### Route Operations

- `GET /apisix/admin/routes` - List all routes
- `GET /apisix/admin/routes/{id}` - Get specific route
- `POST /apisix/admin/routes` - Create new route
- `PUT /apisix/admin/routes/{id}` - Create or update route
- `PATCH /apisix/admin/routes/{id}` - Partially update route
- `DELETE /apisix/admin/routes/{id}` - Delete route

#### Route Schema

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
  plugins?: Record<string, any>; // Plugin configurations
  upstream?: Upstream; // Inline upstream
  upstream_id?: string; // Reference to upstream
  service_id?: string; // Reference to service
  priority?: number; // Route priority (default: 0)
  enable_websocket?: boolean; // Enable WebSocket
  timeout?: {
    // Timeout settings
    connect?: number;
    send?: number;
    read?: number;
  };
  status?: 0 | 1; // 0=disabled, 1=enabled
  create_time?: number;
  update_time?: number;
}
```

#### Example Route Configuration

```json
{
  "name": "api-route",
  "uri": "/api/v1/*",
  "methods": ["GET", "POST"],
  "hosts": ["api.example.com"],
  "vars": [["arg_version", "==", "v1"]],
  "priority": 100,
  "upstream": {
    "type": "roundrobin",
    "nodes": {
      "127.0.0.1:8080": 1,
      "127.0.0.1:8081": 2
    }
  },
  "plugins": {
    "limit-count": {
      "count": 100,
      "time_window": 60
    }
  },
  "enable_websocket": false,
  "status": 1
}
```

### Services

Services provide abstraction for backend services with reusable configurations.

#### Service Operations

- `GET /apisix/admin/services` - List all services
- `GET /apisix/admin/services/{id}` - Get specific service
- `POST /apisix/admin/services` - Create new service
- `PUT /apisix/admin/services/{id}` - Create or update service
- `PATCH /apisix/admin/services/{id}` - Partially update service
- `DELETE /apisix/admin/services/{id}` - Delete service

#### Service Schema

```typescript
interface Service {
  id?: string;
  name?: string;
  desc?: string;
  upstream?: Upstream; // Inline upstream
  upstream_id?: string; // Reference to upstream
  plugins?: Record<string, any>; // Plugin configurations
  hosts?: string[]; // Host restrictions
  enable_websocket?: boolean; // Enable WebSocket
  create_time?: number;
  update_time?: number;
}
```

#### Example Service Configuration

```json
{
  "name": "user-service",
  "desc": "User management service",
  "plugins": {
    "limit-count": {
      "count": 200,
      "time_window": 60,
      "rejected_code": 503
    }
  },
  "upstream": {
    "type": "roundrobin",
    "nodes": {
      "127.0.0.1:1980": 1
    }
  },
  "enable_websocket": true
}
```

### Upstreams

Upstreams define backend server configurations with load balancing and health checking.

#### Upstream Operations

- `GET /apisix/admin/upstreams` - List all upstreams
- `GET /apisix/admin/upstreams/{id}` - Get specific upstream
- `POST /apisix/admin/upstreams` - Create new upstream
- `PUT /apisix/admin/upstreams/{id}` - Create or update upstream
- `PATCH /apisix/admin/upstreams/{id}` - Partially update upstream
- `DELETE /apisix/admin/upstreams/{id}` - Delete upstream

#### Upstream Schema

```typescript
interface Upstream {
  id?: string;
  name?: string;
  desc?: string;
  type?: "roundrobin" | "chash" | "ewma" | "least_conn";
  nodes?:
    | Record<string, number>
    | Array<{
        // Backend nodes
        host: string;
        port: number;
        weight: number;
        priority?: number;
        metadata?: Record<string, any>;
      }>;
  hash_on?: "vars" | "header" | "cookie" | "consumer";
  key?: string; // Hash key
  checks?: {
    // Health checks
    active?: {
      type?: "http" | "https" | "tcp";
      timeout?: number;
      concurrency?: number;
      http_path?: string;
      https_verify_certificate?: boolean;
      healthy?: {
        interval?: number;
        http_statuses?: number[];
        successes?: number;
      };
      unhealthy?: {
        interval?: number;
        http_statuses?: number[];
        http_failures?: number;
        tcp_failures?: number;
        timeouts?: number;
      };
    };
    passive?: {
      type?: "http" | "https" | "tcp";
      healthy?: {
        http_statuses?: number[];
        successes?: number;
      };
      unhealthy?: {
        http_statuses?: number[];
        http_failures?: number;
        tcp_failures?: number;
        timeouts?: number;
      };
    };
  };
  retries?: number; // Retry attempts
  retry_timeout?: number; // Retry timeout
  timeout?: {
    // Request timeouts
    connect?: number;
    send?: number;
    read?: number;
  };
  keepalive_pool?: {
    // Connection pooling
    size?: number;
    idle_timeout?: number;
    requests?: number;
  };
  scheme?: "http" | "https"; // Protocol scheme
  tls?: {
    // TLS configuration
    client_cert?: string;
    client_key?: string;
  };
  labels?: Record<string, string>; // Metadata labels
  create_time?: number;
  update_time?: number;
}
```

#### Example Upstream Configuration

```json
{
  "name": "backend-cluster",
  "desc": "Production backend cluster",
  "type": "roundrobin",
  "nodes": [
    {
      "host": "127.0.0.1",
      "port": 8080,
      "weight": 1
    },
    {
      "host": "127.0.0.1",
      "port": 8081,
      "weight": 2
    }
  ],
  "checks": {
    "active": {
      "type": "http",
      "http_path": "/health",
      "timeout": 5,
      "healthy": {
        "interval": 10,
        "successes": 2
      },
      "unhealthy": {
        "interval": 5,
        "http_failures": 3
      }
    }
  },
  "timeout": {
    "connect": 15,
    "send": 15,
    "read": 15
  },
  "scheme": "http",
  "labels": {
    "env": "production",
    "version": "v2"
  }
}
```

### Consumers

Consumers represent API clients that can be authenticated and authorized.

#### Consumer Operations

- `GET /apisix/admin/consumers` - List all consumers
- `GET /apisix/admin/consumers/{username}` - Get specific consumer
- `POST /apisix/admin/consumers` - Create new consumer
- `PUT /apisix/admin/consumers/{username}` - Create or update consumer
- `DELETE /apisix/admin/consumers/{username}` - Delete consumer

#### Consumer Schema

```typescript
interface Consumer {
  username: string; // Unique username
  desc?: string; // Description
  plugins?: Record<string, any>; // Authentication plugins
  labels?: Record<string, string>; // Metadata labels
  create_time?: number;
  update_time?: number;
}
```

#### Consumer Credentials

Manage consumer authentication credentials:

- `GET /apisix/admin/consumers/{username}/credentials` - List credentials
- `GET /apisix/admin/consumers/{username}/credentials/{id}` - Get credential
- `PUT /apisix/admin/consumers/{username}/credentials/{id}` - Create/update credential
- `DELETE /apisix/admin/consumers/{username}/credentials/{id}` - Delete credential

#### Example Consumer Configuration

```json
{
  "username": "api-user",
  "desc": "API user for mobile app",
  "plugins": {
    "key-auth": {
      "key": "user-api-key-123"
    }
  },
  "labels": {
    "team": "mobile",
    "env": "production"
  }
}
```

### SSL Certificates

SSL certificates for HTTPS configuration.

#### SSL Operations

- `GET /apisix/admin/ssls` - List all SSL certificates
- `GET /apisix/admin/ssls/{id}` - Get specific SSL certificate
- `POST /apisix/admin/ssls` - Create new SSL certificate
- `PUT /apisix/admin/ssls/{id}` - Create or update SSL certificate
- `DELETE /apisix/admin/ssls/{id}` - Delete SSL certificate

#### SSL Schema

```typescript
interface SSL {
  id?: string;
  cert: string; // Certificate content
  key: string; // Private key content
  snis?: string[]; // Server Name Indicators
  labels?: Record<string, string>; // Metadata labels
  status?: 0 | 1; // 0=disabled, 1=enabled
  validity_start?: number; // Valid from timestamp
  validity_end?: number; // Valid until timestamp
  create_time?: number;
  update_time?: number;
}
```

### Global Rules

Global rules apply to all requests.

#### Global Rule Operations

- `GET /apisix/admin/global_rules` - List all global rules
- `GET /apisix/admin/global_rules/{id}` - Get specific global rule
- `PUT /apisix/admin/global_rules/{id}` - Create or update global rule
- `DELETE /apisix/admin/global_rules/{id}` - Delete global rule

### Consumer Groups

Consumer groups for managing multiple consumers with shared configurations.

#### Consumer Group Operations

- `GET /apisix/admin/consumer_groups` - List all consumer groups
- `GET /apisix/admin/consumer_groups/{id}` - Get specific consumer group
- `PUT /apisix/admin/consumer_groups/{id}` - Create or update consumer group
- `DELETE /apisix/admin/consumer_groups/{id}` - Delete consumer group

### Plugin Configs

Reusable plugin configurations.

#### Plugin Config Operations

- `GET /apisix/admin/plugin_configs` - List all plugin configs
- `GET /apisix/admin/plugin_configs/{id}` - Get specific plugin config
- `PUT /apisix/admin/plugin_configs/{id}` - Create or update plugin config
- `DELETE /apisix/admin/plugin_configs/{id}` - Delete plugin config

### Plugins

Plugin management and metadata.

#### Plugin Operations

- `GET /apisix/admin/plugins/list` - List all available plugins
- `GET /apisix/admin/plugins/{plugin_name}` - Get plugin schema
- `PUT /apisix/admin/plugins/{plugin_name}` - Enable/disable plugin globally

#### Plugin Metadata Operations

- `GET /apisix/admin/plugin_metadata/{plugin_name}` - Get plugin metadata
- `PUT /apisix/admin/plugin_metadata/{plugin_name}` - Update plugin metadata
- `DELETE /apisix/admin/plugin_metadata/{plugin_name}` - Delete plugin metadata

### Stream Routes

TCP/UDP proxy configurations.

#### Stream Route Operations

- `GET /apisix/admin/stream_routes` - List all stream routes
- `GET /apisix/admin/stream_routes/{id}` - Get specific stream route
- `PUT /apisix/admin/stream_routes/{id}` - Create or update stream route
- `DELETE /apisix/admin/stream_routes/{id}` - Delete stream route

### Credentials

Credential management for consumers.

#### Credential Operations

- `GET /apisix/admin/credentials` - List all credentials
- `GET /apisix/admin/credentials/{id}` - Get specific credential
- `PUT /apisix/admin/credentials/{id}` - Create or update credential
- `DELETE /apisix/admin/credentials/{id}` - Delete credential

#### Credential Configuration Example

```json
{
  "id": "credential-1",
  "plugins": {
    "key-auth": {
      "key": "user-api-key-123"
    },
    "jwt-auth": {
      "key": "user-key",
      "secret": "user-secret"
    }
  },
  "desc": "API user credentials",
  "labels": {
    "env": "production",
    "team": "backend"
  }
}
```

### Secrets

Secret management for external secret stores (Vault, AWS Secrets Manager, GCP Secret Manager).

#### Secret Operations

**Vault Secrets:**

- `GET /apisix/admin/secrets/vault` - List all Vault secrets
- `GET /apisix/admin/secrets/vault/{id}` - Get specific Vault secret
- `PUT /apisix/admin/secrets/vault/{id}` - Create or update Vault secret
- `DELETE /apisix/admin/secrets/vault/{id}` - Delete Vault secret

**AWS Secrets:**

- `GET /apisix/admin/secrets/aws` - List all AWS secrets
- `GET /apisix/admin/secrets/aws/{id}` - Get specific AWS secret
- `PUT /apisix/admin/secrets/aws/{id}` - Create or update AWS secret
- `DELETE /apisix/admin/secrets/aws/{id}` - Delete AWS secret

**GCP Secrets:**

- `GET /apisix/admin/secrets/gcp` - List all GCP secrets
- `GET /apisix/admin/secrets/gcp/{id}` - Get specific GCP secret
- `PUT /apisix/admin/secrets/gcp/{id}` - Create or update GCP secret
- `DELETE /apisix/admin/secrets/gcp/{id}` - Delete GCP secret

#### Secret Providers

**Vault Configuration:**

```json
{
  "uri": "https://vault.example.com",
  "prefix": "/apisix/kv",
  "token": "vault-token-123",
  "namespace": "apisix-ns"
}
```

**AWS Secrets Manager Configuration:**

```json
{
  "endpoint_url": "https://secretsmanager.us-east-1.amazonaws.com",
  "region": "us-east-1",
  "access_key_id": "AKIAIOSFODNN7EXAMPLE",
  "secret_access_key": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
}
```

**GCP Secret Manager Configuration:**

```json
{
  "auth_config": {
    "client_email": "service@project.iam.gserviceaccount.com",
    "private_key": "-----BEGIN PRIVATE KEY-----\n...",
    "project_id": "my-project",
    "token_uri": "https://oauth2.googleapis.com/token",
    "entries_uri": "https://secretmanager.googleapis.com/v1"
  }
}
```

### Proto

Protocol buffer definitions for gRPC services.

#### Proto Operations

- `GET /apisix/admin/protos` - List all proto definitions
- `GET /apisix/admin/protos/{id}` - Get specific proto
- `PUT /apisix/admin/protos/{id}` - Create or update proto
- `DELETE /apisix/admin/protos/{id}` - Delete proto

## Schema Validation

Validate resource configurations before applying them:

```bash
curl http://127.0.0.1:9180/apisix/admin/schema/validate/routes \
  -H "X-API-KEY: $admin_key" -X POST -d '{
    "uri": "/api/*",
    "upstream": {
      "type": "roundrobin",
      "nodes": {
        "127.0.0.1:8080": 1
      }
    }
  }'
```

## Error Handling

### HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (invalid API key)
- `404` - Not Found
- `409` - Conflict (resource already exists)
- `500` - Internal Server Error

### Error Response Format

```json
{
  "error_msg": "Detailed error description"
}
```

### Common Error Scenarios

1. **Invalid API Key**: Check `X-API-KEY` header value
2. **Resource Not Found**: Verify resource ID exists
3. **Validation Errors**: Check request body against schema
4. **Resource Conflicts**: Use `force=true` for deletions if needed

## SDK Usage Examples

### Create a Route

```typescript
const route = await client.routes.create({
  name: "api-route",
  uri: "/api/v1/*",
  methods: ["GET", "POST"],
  upstream: {
    type: "roundrobin",
    nodes: {
      "127.0.0.1:8080": 1,
    },
  },
});
```

### List Routes with Pagination

```typescript
const { routes, total, hasMore } = await client.routes.listPaginated(1, 10, {
  name: "api",
});
```

### Update Service with Plugins

```typescript
await client.services.update("service-id", {
  plugins: {
    "rate-limit": {
      count: 100,
      time_window: 60,
    },
  },
});
```

### Manage Consumer Credentials

```typescript
// Create consumer
await client.consumers.create({
  username: "api-user",
});

// Add credentials (traditional way)
await client.consumers.createCredential("api-user", "cred-1", {
  plugins: {
    "key-auth": {
      key: "user-api-key",
    },
  },
});

// Create standalone credentials (APISIX 3.0+)
await client.credentials.create({
  plugins: {
    "key-auth": { key: "standalone-key-123" },
    "jwt-auth": { key: "jwt-key", secret: "jwt-secret" },
  },
  desc: "Multi-auth credentials",
  labels: { env: "production" },
});

// Manage secrets (APISIX 3.0+)
await client.secrets.createVaultSecretWithValidation(
  {
    uri: "https://vault.example.com",
    prefix: "/apisix/secrets",
    token: "vault-token",
    namespace: "production",
  },
  "vault-secret-1",
);

// Create stream routes for TCP/UDP proxy
await client.streamRoutes.createTCPRoute({
  server_port: 9100,
  upstream_id: "tcp-upstream",
  plugins: { "limit-conn": { conn: 50 } },
});
```

### Force Delete Resource

```typescript
await client.upstreams.delete("upstream-id", { force: true });
```

## Best Practices

1. **Security**: Always change default API keys in production
2. **IP Restrictions**: Configure `allow_admin` for security
3. **Validation**: Use schema validation before applying configurations
4. **Monitoring**: Implement proper logging and monitoring
5. **Backup**: Regular backup of APISIX configurations
6. **Testing**: Test configurations in staging environment first
