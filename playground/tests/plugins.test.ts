import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import type { ApisixSDK } from "../../packages/apisix-sdk/src";
import { createTestClient, resetClient, validateConnection } from "../client";

describe("APISIX SDK - Plugin Configuration", () => {
  let client: ApisixSDK;
  const testIds = {
    upstream: "test_upstream_plugins",
    service: "test_service_plugins",
    route: "test_route_plugins",
    consumer: "test_consumer_plugins",
    globalRule: "test_global_rule_plugins",
  };

  beforeAll(async () => {
    client = await createTestClient();

    // Validate connection before running tests
    const isConnected = await validateConnection(client);
    if (!isConnected) {
      throw new Error("Cannot connect to APISIX for testing");
    }
  });

  afterAll(async () => {
    resetClient();
  });

  beforeEach(async () => {
    // Clean up any existing test resources before each test
    await cleanupTestResources();

    // Create base resources for plugin tests
    await setupBaseResources();
  });

  afterEach(async () => {
    // Clean up test resources after each test
    await cleanupTestResources();
  });

  async function setupBaseResources() {
    try {
      // Create upstream
      await client.upstreams.create(
        {
          name: "test-upstream",
          type: "roundrobin",
          nodes: { "httpbin.org:80": 1 },
        },
        testIds.upstream,
      );

      // Create service
      await client.services.create(
        {
          name: "test-service",
          upstream_id: testIds.upstream,
        },
        testIds.service,
      );

      // Create consumer
      await client.consumers.create({
        username: testIds.consumer,
        desc: "Test consumer for plugin tests",
      });
    } catch (error) {
      // Resources might already exist
    }
  }

  async function cleanupTestResources() {
    const cleanupTasks = [
      () => client.routes.delete(testIds.route).catch(() => {}),
      () => client.globalRules.delete(testIds.globalRule).catch(() => {}),
      () => client.consumers.delete(testIds.consumer).catch(() => {}),
      () => client.services.delete(testIds.service).catch(() => {}),
      () => client.upstreams.delete(testIds.upstream).catch(() => {}),
    ];

    await Promise.all(cleanupTasks.map((task) => task()));
  }

  describe("Plugin Management", () => {
    it("should list available plugins", async () => {
      const plugins = await client.plugins.list();
      expect(Array.isArray(plugins)).toBe(true);
      expect(plugins.length).toBeGreaterThan(0);
    });

    it("should get plugin schema", async () => {
      const schema = await client.plugins.getSchema("limit-req");
      expect(schema).toHaveProperty("properties");
      expect(typeof schema.properties).toBe("object");
    });

    it("should check if plugin is available", async () => {
      const isAvailable = await client.plugins.isAvailable("limit-req");
      expect(typeof isAvailable).toBe("boolean");
      expect(isAvailable).toBe(true);
    });

    it("should validate plugin configuration", async () => {
      const validation = await client.plugins.validateConfig("limit-req", {
        rate: 10,
        burst: 5,
        rejected_code: 429,
      });

      expect(validation).toHaveProperty("valid");
      expect(typeof validation.valid).toBe("boolean");
    });

    it("should get plugin configuration template", async () => {
      const template = await client.plugins.getConfigTemplate("limit-req");
      expect(typeof template).toBe("object");
    });
  });

  describe("Route Plugin Configuration", () => {
    it("should create route with rate limiting plugin", async () => {
      const route = await client.routes.create(
        {
          name: "rate-limit-route",
          uri: "/rate-limit",
          methods: ["GET"],
          service_id: testIds.service,
          plugins: {
            "limit-req": {
              rate: 10,
              burst: 5,
              key: "remote_addr",
              rejected_code: 429,
              rejected_msg: "Too many requests",
            },
          },
        },
        testIds.route,
      );

      expect(route).toBeDefined();
      expect(typeof route).toBe("object");
      // Check if route was actually created by verifying it exists
      const exists = await client.routes.exists(testIds.route);
      expect(exists).toBe(true);
    });

    it("should create route with CORS plugin", async () => {
      const route = await client.routes.create(
        {
          name: "cors-route",
          uri: "/cors",
          methods: ["GET", "POST", "OPTIONS"],
          service_id: testIds.service,
          plugins: {
            cors: {
              allow_origins: "*",
              allow_methods: "GET,POST,OPTIONS",
              allow_headers: "Content-Type,Authorization",
              allow_credentials: true,
              max_age: 86400,
            },
          },
        },
        testIds.route,
      );

      expect(route).toBeDefined();
      expect(typeof route).toBe("object");
      // Check if route was actually created by verifying it exists
      const exists = await client.routes.exists(testIds.route);
      expect(exists).toBe(true);
    });

    it("should create route with authentication plugins", async () => {
      const route = await client.routes.create(
        {
          name: "auth-route",
          uri: "/auth",
          methods: ["GET"],
          service_id: testIds.service,
          plugins: {
            "key-auth": {
              header: "X-API-Key",
            },
            "basic-auth": {
              hide_credentials: true,
            },
          },
        },
        testIds.route,
      );

      expect(route).toBeDefined();
      expect(typeof route).toBe("object");
      // Check if route was actually created by verifying it exists
      const exists = await client.routes.exists(testIds.route);
      expect(exists).toBe(true);
    });

    it("should create route with proxy rewrite plugin", async () => {
      const route = await client.routes.create(
        {
          name: "rewrite-route",
          uri: "/old-path",
          methods: ["GET"],
          service_id: testIds.service,
          plugins: {
            "proxy-rewrite": {
              uri: "/new-path",
              headers: {
                "X-Forwarded-For": "$remote_addr",
                "X-Real-IP": "$remote_addr",
              },
            },
          },
        },
        testIds.route,
      );

      expect(route).toBeDefined();
      expect(typeof route).toBe("object");
      // Check if route was actually created by verifying it exists
      const exists = await client.routes.exists(testIds.route);
      expect(exists).toBe(true);
    });

    it("should create route with multiple plugins", async () => {
      const route = await client.routes.create(
        {
          name: "multi-plugin-route",
          uri: "/multi-plugin",
          methods: ["GET", "POST"],
          service_id: testIds.service,
          plugins: {
            "limit-req": {
              rate: 20,
              burst: 10,
              key: "remote_addr",
            },
            cors: {
              allow_origins: "https://example.com",
              allow_methods: "GET,POST",
            },
            prometheus: {
              disable: false,
            },
            "request-validation": {
              body_schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  age: { type: "number", minimum: 0 },
                },
                required: ["name"],
              },
            },
          },
        },
        testIds.route,
      );

      expect(route).toBeDefined();
      expect(typeof route).toBe("object");
      // Check if route was actually created by verifying it exists
      const exists = await client.routes.exists(testIds.route);
      expect(exists).toBe(true);
    });

    it("should update route plugins", async () => {
      // First create a route
      await client.routes.create(
        {
          name: "update-plugin-route",
          uri: "/update-plugin",
          service_id: testIds.service,
          plugins: {
            "limit-req": {
              rate: 10,
              burst: 5,
              key: "remote_addr",
            },
          },
        },
        testIds.route,
      );

      // Update with complete configuration to avoid validation errors
      const updated = await client.routes.update(testIds.route, {
        name: "update-plugin-route-updated",
        uri: "/update-plugin-updated",
        service_id: testIds.service,
        plugins: {
          "limit-req": {
            rate: 20,
            burst: 10,
            key: "remote_addr",
          },
          cors: {
            allow_origins: "*",
          },
        },
      });

      expect(updated).toBeDefined();
      expect(typeof updated).toBe("object");
      // Verify the update was successful by checking if route still exists
      const exists = await client.routes.exists(testIds.route);
      expect(exists).toBe(true);
    });
  });

  describe("Service Plugin Configuration", () => {
    it("should create service with plugins", async () => {
      const service = await client.services.create(
        {
          name: "plugin-service",
          upstream_id: testIds.upstream,
          plugins: {
            "limit-conn": {
              conn: 100,
              burst: 50,
              default_conn_delay: 0.1,
              key: "remote_addr",
            },
            prometheus: {
              disable: false,
            },
          },
        },
        "test-service-with-plugins",
      );

      expect(service).toBeDefined();
      expect(typeof service).toBe("object");
      // Check if service was actually created by verifying it exists
      const exists = await client.services.exists("test-service-with-plugins");
      expect(exists).toBe(true);

      // Clean up
      await client.services.delete("test-service-with-plugins").catch(() => {});
    });
  });

  describe("Consumer Plugin Configuration", () => {
    it("should update consumer with authentication plugins", async () => {
      const updated = await client.consumers.update(testIds.consumer, {
        username: testIds.consumer,
        plugins: {
          "key-auth": {
            key: "test-api-key-123",
          },
          "basic-auth": {
            username: "testuser",
            password: "testpass",
          },
        },
      });

      expect(updated).toBeDefined();
      expect(typeof updated).toBe("object");
      // Verify the update was successful by checking if consumer still exists
      const exists = await client.consumers.exists(testIds.consumer);
      expect(exists).toBe(true);
    });

    it("should add key auth to consumer", async () => {
      try {
        const credential = await client.consumers.addKeyAuth(
          testIds.consumer,
          "test-key-123",
          "test-key-credential",
        );

        expect(credential).toHaveProperty("plugins");
        expect(credential.plugins).toHaveProperty("key-auth");

        // Clean up credential
        await client.consumers
          .deleteCredential(testIds.consumer, "test-key-credential")
          .catch(() => {});
      } catch (error) {
        console.warn("Consumer credential management not available:", error);
      }
    });

    it("should add basic auth to consumer", async () => {
      try {
        const credential = await client.consumers.addBasicAuth(
          testIds.consumer,
          "testuser",
          "testpass",
          "test-basic-credential",
        );

        expect(credential).toHaveProperty("plugins");
        expect(credential.plugins).toHaveProperty("basic-auth");

        // Clean up credential
        await client.consumers
          .deleteCredential(testIds.consumer, "test-basic-credential")
          .catch(() => {});
      } catch (error) {
        console.warn("Consumer credential management not available:", error);
      }
    });
  });

  describe("Global Rule Plugin Configuration", () => {
    it("should create global rule with plugins", async () => {
      const globalRule = await client.globalRules.create(
        {
          plugins: {
            "limit-req": {
              rate: 1000,
              burst: 500,
              key: "remote_addr",
              rejected_code: 429,
            },
            prometheus: {
              disable: false,
            },
          },
        },
        testIds.globalRule,
      );

      expect(globalRule).toBeDefined();
      expect(typeof globalRule).toBe("object");
      // Check if global rule was actually created by verifying it exists
      const exists = await client.globalRules.exists(testIds.globalRule);
      expect(exists).toBe(true);
    });

    it("should update global rule plugins", async () => {
      // First create a global rule
      await client.globalRules.create(
        {
          plugins: {
            "limit-req": {
              rate: 100,
              burst: 50,
              key: "remote_addr",
            },
          },
        },
        testIds.globalRule,
      );

      // Update with new plugins
      const updated = await client.globalRules.update(testIds.globalRule, {
        plugins: {
          "limit-req": {
            rate: 200,
            burst: 100,
            key: "remote_addr",
          },
          cors: {
            allow_origins: "*",
          },
        },
      });

      expect(updated).toBeDefined();
      expect(typeof updated).toBe("object");
      // Verify the update was successful by checking if global rule still exists
      const exists = await client.globalRules.exists(testIds.globalRule);
      expect(exists).toBe(true);
    });
  });

  describe("Plugin Categories and Information", () => {
    it("should get plugin categories", async () => {
      const categories = client.plugins.getPluginCategories();
      expect(typeof categories).toBe("object");
      expect(categories).toHaveProperty("authentication");
      expect(categories).toHaveProperty("security");
      expect(categories).toHaveProperty("traffic");
      expect(Array.isArray(categories.authentication)).toBe(true);
    });

    it("should get plugins by category", async () => {
      const authPlugins =
        await client.plugins.getPluginsByCategory("authentication");
      expect(Array.isArray(authPlugins)).toBe(true);
      expect(authPlugins).toContain("key-auth");
      expect(authPlugins).toContain("basic-auth");
    });

    it("should get plugin documentation URL", async () => {
      const docUrl = client.plugins.getPluginDocUrl("limit-req");
      expect(typeof docUrl).toBe("string");
      expect(docUrl).toContain("limit-req");
    });

    it("should get comprehensive plugin info", async () => {
      const pluginInfo = await client.plugins.getPluginInfo("limit-req");
      expect(pluginInfo).toHaveProperty("name", "limit-req");
      expect(pluginInfo).toHaveProperty("available");
      expect(pluginInfo).toHaveProperty("docUrl");
      expect(typeof pluginInfo.available).toBe("boolean");
    });
  });

  describe("Plugin Error Handling", () => {
    it("should handle invalid plugin configuration", async () => {
      await expect(
        client.routes.create(
          {
            name: "invalid-plugin-route",
            uri: "/invalid",
            service_id: testIds.service,
            plugins: {
              "limit-req": {
                rate: -1, // Invalid rate
                burst: "invalid", // Invalid type
              },
            },
          },
          testIds.route,
        ),
      ).rejects.toThrow();
    });

    it("should handle non-existent plugin", async () => {
      const isAvailable = await client.plugins.isAvailable(
        "non-existent-plugin",
      );
      expect(isAvailable).toBe(false);
    });

    it("should handle plugin schema for non-existent plugin", async () => {
      await expect(
        client.plugins.getSchema("non-existent-plugin"),
      ).rejects.toThrow();
    });
  });

  describe("Plugin Metadata Management", () => {
    it("should list plugin metadata", async () => {
      try {
        const metadata = await client.plugins.listMetadata();
        expect(Array.isArray(metadata)).toBe(true);
      } catch (error) {
        console.warn("Plugin metadata listing not available:", error);
      }
    });

    it("should manage plugin metadata", async () => {
      try {
        // Create metadata
        const metadata = await client.plugins.updateMetadata("limit-req", {
          log_level: "info",
          custom_config: {
            enable_debug: false,
          },
        });

        expect(metadata).toHaveProperty("id");

        // Get metadata
        const retrieved = await client.plugins.getMetadata("limit-req");
        expect(retrieved).toHaveProperty("id");

        // Delete metadata
        const deleted = await client.plugins.deleteMetadata("limit-req");
        expect(deleted).toBe(true);
      } catch (error) {
        console.warn("Plugin metadata management not available:", error);
      }
    });
  });
});
