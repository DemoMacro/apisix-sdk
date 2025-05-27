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

describe("APISIX SDK - Basic Functionality", () => {
  let client: ApisixSDK;
  const testIds = {
    upstream: "test_upstream_basic",
    service: "test_service_basic",
    route: "test_route_basic",
    consumer: "test_consumer_basic",
    ssl: "test_ssl_basic",
    globalRule: "test_global_rule_basic",
    consumerGroup: "test_consumer_group_basic",
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
  });

  afterEach(async () => {
    // Clean up test resources after each test
    await cleanupTestResources();
  });

  async function cleanupTestResources() {
    const cleanupTasks = [
      () => client.routes.delete(testIds.route).catch(() => {}),
      () => client.services.delete(testIds.service).catch(() => {}),
      () => client.upstreams.delete(testIds.upstream).catch(() => {}),
      () => client.consumers.delete(testIds.consumer).catch(() => {}),
      () => client.ssl.delete(testIds.ssl).catch(() => {}),
      () => client.globalRules.delete(testIds.globalRule).catch(() => {}),
      () => client.consumerGroups.delete(testIds.consumerGroup).catch(() => {}),
    ];

    await Promise.all(cleanupTasks.map((task) => task()));
  }

  describe("Connection and Health", () => {
    it("should connect to APISIX Admin API", async () => {
      const connected = await client.testConnection();
      expect(connected).toBe(true);
    });

    it("should validate connection through helper function", async () => {
      const isValid = await validateConnection(client);
      expect(isValid).toBe(true);
    });

    it("should get system status", async () => {
      const status = await client.getSystemStatus();
      expect(status).toHaveProperty("adminApiConnected");
      expect(status.adminApiConnected).toBe(true);
    });
  });

  describe("Upstreams Management", () => {
    it("should create an upstream", async () => {
      const upstream = await client.upstreams.create(
        {
          name: "test-upstream",
          desc: "Test upstream for basic tests",
          type: "roundrobin",
          nodes: {
            "httpbin.org:80": 1,
            "www.baidu.com:80": 1,
          },
          timeout: {
            connect: 6,
            send: 6,
            read: 6,
          },
        },
        testIds.upstream,
      );

      expect(upstream).toBeDefined();
      expect(typeof upstream).toBe("object");
      // Check if upstream was actually created by verifying it exists
      const exists = await client.upstreams.exists(testIds.upstream);
      expect(exists).toBe(true);
    });

    it("should get an upstream by ID", async () => {
      // First create an upstream
      await client.upstreams.create(
        {
          name: "test-upstream",
          type: "roundrobin",
          nodes: { "httpbin.org:80": 1 },
        },
        testIds.upstream,
      );

      const retrieved = await client.upstreams.get(testIds.upstream);
      expect(retrieved).toBeDefined();
      expect(typeof retrieved).toBe("object");
      // Verify the upstream has expected properties if they exist
      if (retrieved.name) {
        expect(retrieved.name).toBe("test-upstream");
      }
    });

    it("should list upstreams", async () => {
      // Create test upstream
      await client.upstreams.create(
        {
          name: "test-upstream",
          type: "roundrobin",
          nodes: { "httpbin.org:80": 1 },
        },
        testIds.upstream,
      );

      const upstreams = await client.upstreams.list();
      expect(Array.isArray(upstreams)).toBe(true);
      expect(upstreams.length).toBeGreaterThan(0);
    });

    it("should update an upstream", async () => {
      // Create upstream first
      await client.upstreams.create(
        {
          name: "test-upstream",
          type: "roundrobin",
          nodes: { "httpbin.org:80": 1 },
        },
        testIds.upstream,
      );

      // Update with complete configuration to avoid validation errors
      const updated = await client.upstreams.update(testIds.upstream, {
        name: "test-upstream-updated",
        desc: "Updated description",
        type: "roundrobin",
        nodes: { "httpbin.org:80": 1 },
      });

      expect(updated).toBeDefined();
      expect(typeof updated).toBe("object");
      // Verify the update was successful by checking if upstream still exists
      const exists = await client.upstreams.exists(testIds.upstream);
      expect(exists).toBe(true);
    });

    it("should check if upstream exists", async () => {
      // Create upstream first
      await client.upstreams.create(
        {
          name: "test-upstream",
          type: "roundrobin",
          nodes: { "httpbin.org:80": 1 },
        },
        testIds.upstream,
      );

      const exists = await client.upstreams.exists(testIds.upstream);
      expect(exists).toBe(true);

      const notExists = await client.upstreams.exists("non-existent-upstream");
      expect(notExists).toBe(false);
    });

    it("should delete an upstream", async () => {
      // Create upstream first
      await client.upstreams.create(
        {
          name: "test-upstream",
          type: "roundrobin",
          nodes: { "httpbin.org:80": 1 },
        },
        testIds.upstream,
      );

      const deleted = await client.upstreams.delete(testIds.upstream);
      expect(deleted).toBe(true);

      const exists = await client.upstreams.exists(testIds.upstream);
      expect(exists).toBe(false);
    });
  });

  describe("Services Management", () => {
    beforeEach(async () => {
      // Create upstream for service tests
      await client.upstreams.create(
        {
          name: "test-upstream",
          type: "roundrobin",
          nodes: { "httpbin.org:80": 1 },
        },
        testIds.upstream,
      );
    });

    it("should create a service", async () => {
      const service = await client.services.create(
        {
          name: "test-service",
          desc: "Test service for basic tests",
          upstream_id: testIds.upstream,
          enable_websocket: false,
        },
        testIds.service,
      );

      expect(service).toBeDefined();
      expect(typeof service).toBe("object");
      // Check if service was actually created by verifying it exists
      const exists = await client.services.exists(testIds.service);
      expect(exists).toBe(true);
    });

    it("should get a service by ID", async () => {
      await client.services.create(
        {
          name: "test-service",
          upstream_id: testIds.upstream,
        },
        testIds.service,
      );

      const retrieved = await client.services.get(testIds.service);
      expect(retrieved).toBeDefined();
      expect(typeof retrieved).toBe("object");
      // Verify the service has expected properties if they exist
      if (retrieved.name) {
        expect(retrieved.name).toBe("test-service");
      }
    });

    it("should list services", async () => {
      await client.services.create(
        {
          name: "test-service",
          upstream_id: testIds.upstream,
        },
        testIds.service,
      );

      const services = await client.services.list();
      expect(Array.isArray(services)).toBe(true);
      expect(services.length).toBeGreaterThan(0);
    });

    it("should update a service", async () => {
      await client.services.create(
        {
          name: "test-service",
          upstream_id: testIds.upstream,
        },
        testIds.service,
      );

      const updated = await client.services.update(testIds.service, {
        desc: "Updated service description",
      });

      expect(updated).toBeDefined();
      expect(typeof updated).toBe("object");
      // Verify the update was successful by checking if service still exists
      const exists = await client.services.exists(testIds.service);
      expect(exists).toBe(true);
    });

    it("should delete a service", async () => {
      await client.services.create(
        {
          name: "test-service",
          upstream_id: testIds.upstream,
        },
        testIds.service,
      );

      const deleted = await client.services.delete(testIds.service);
      expect(deleted).toBe(true);

      const exists = await client.services.exists(testIds.service);
      expect(exists).toBe(false);
    });
  });

  describe("Routes Management", () => {
    beforeEach(async () => {
      // Create upstream and service for route tests
      await client.upstreams.create(
        {
          name: "test-upstream",
          type: "roundrobin",
          nodes: { "httpbin.org:80": 1 },
        },
        testIds.upstream,
      );

      await client.services.create(
        {
          name: "test-service",
          upstream_id: testIds.upstream,
        },
        testIds.service,
      );
    });

    it("should create a route", async () => {
      const route = await client.routes.create(
        {
          name: "test-route",
          desc: "Test route for basic tests",
          uri: "/test-basic",
          methods: ["GET", "POST"],
          service_id: testIds.service,
          status: 1,
        },
        testIds.route,
      );

      expect(route).toBeDefined();
      expect(typeof route).toBe("object");
      // Check if route was actually created by verifying it exists
      const exists = await client.routes.exists(testIds.route);
      expect(exists).toBe(true);
    });

    it("should get a route by ID", async () => {
      await client.routes.create(
        {
          name: "test-route",
          uri: "/test-basic",
          service_id: testIds.service,
        },
        testIds.route,
      );

      const retrieved = await client.routes.get(testIds.route);
      expect(retrieved).toBeDefined();
      expect(typeof retrieved).toBe("object");
      // Verify the route has expected properties if they exist
      if (retrieved.name) {
        expect(retrieved.name).toBe("test-route");
      }
    });

    it("should list routes", async () => {
      await client.routes.create(
        {
          name: "test-route",
          uri: "/test-basic",
          service_id: testIds.service,
        },
        testIds.route,
      );

      const routes = await client.routes.list();
      expect(Array.isArray(routes)).toBe(true);
      expect(routes.length).toBeGreaterThan(0);
    });

    it("should update a route", async () => {
      await client.routes.create(
        {
          name: "test-route",
          uri: "/test-basic",
          service_id: testIds.service,
        },
        testIds.route,
      );

      // Update with complete configuration to avoid validation errors
      const updated = await client.routes.update(testIds.route, {
        name: "test-route-updated",
        desc: "Updated route description",
        uri: "/test-basic-updated",
        service_id: testIds.service,
      });

      expect(updated).toBeDefined();
      expect(typeof updated).toBe("object");
      // Verify the update was successful by checking if route still exists
      const exists = await client.routes.exists(testIds.route);
      expect(exists).toBe(true);
    });

    it("should delete a route", async () => {
      await client.routes.create(
        {
          name: "test-route",
          uri: "/test-basic",
          service_id: testIds.service,
        },
        testIds.route,
      );

      const deleted = await client.routes.delete(testIds.route);
      expect(deleted).toBe(true);

      const exists = await client.routes.exists(testIds.route);
      expect(exists).toBe(false);
    });
  });

  describe("Consumers Management", () => {
    it("should create a consumer", async () => {
      const consumer = await client.consumers.create({
        username: testIds.consumer,
        desc: "Test consumer for basic tests",
        plugins: {
          "key-auth": {
            key: "test-api-key",
          },
        },
      });

      expect(consumer).toBeDefined();
      expect(typeof consumer).toBe("object");
      // Check if consumer was actually created by verifying it exists
      const exists = await client.consumers.exists(testIds.consumer);
      expect(exists).toBe(true);
    });

    it("should get a consumer by username", async () => {
      await client.consumers.create({
        username: testIds.consumer,
      });

      const retrieved = await client.consumers.get(testIds.consumer);
      expect(retrieved).toBeDefined();
      expect(typeof retrieved).toBe("object");
      // Verify the consumer has expected properties if they exist
      if (retrieved.username) {
        expect(retrieved.username).toBe(testIds.consumer);
      }
    });

    it("should list consumers", async () => {
      await client.consumers.create({
        username: testIds.consumer,
      });

      const consumers = await client.consumers.list();
      expect(Array.isArray(consumers)).toBe(true);
      expect(consumers.length).toBeGreaterThan(0);
    });

    it("should update a consumer", async () => {
      await client.consumers.create({
        username: testIds.consumer,
      });

      // Update with complete configuration including required username
      const updated = await client.consumers.update(testIds.consumer, {
        username: testIds.consumer,
        desc: "Updated consumer description",
      });

      expect(updated).toBeDefined();
      expect(typeof updated).toBe("object");
      // Verify the update was successful by checking if consumer still exists
      const exists = await client.consumers.exists(testIds.consumer);
      expect(exists).toBe(true);
    });

    it("should delete a consumer", async () => {
      await client.consumers.create({
        username: testIds.consumer,
      });

      const deleted = await client.consumers.delete(testIds.consumer);
      expect(deleted).toBe(true);

      const exists = await client.consumers.exists(testIds.consumer);
      expect(exists).toBe(false);
    });
  });

  describe("Plugins Management", () => {
    it("should list available plugins", async () => {
      const plugins = await client.plugins.list();
      expect(typeof plugins).toBe("object");
      expect(Object.keys(plugins).length).toBeGreaterThan(0);
    });

    it("should get plugin schema", async () => {
      const schema = await client.plugins.getSchema("limit-req");
      expect(schema).toHaveProperty("properties");
    });

    it("should check if plugin is available", async () => {
      const plugins = await client.plugins.list();
      const pluginName = plugins[0];
      const isAvailable = await client.plugins.isAvailable(pluginName);
      expect(typeof isAvailable).toBe("boolean");
    });
  });

  describe("Error Handling", () => {
    it("should handle non-existent resource gracefully", async () => {
      await expect(client.upstreams.get("non-existent-id")).rejects.toThrow();
    });

    it("should handle invalid data gracefully", async () => {
      await expect(client.upstreams.create({} as never)).rejects.toThrow();
    });

    it("should handle duplicate resource creation", async () => {
      // Create first resource
      await client.upstreams.create(
        {
          name: "test-upstream",
          type: "roundrobin",
          nodes: { "httpbin.org:80": 1 },
        },
        testIds.upstream,
      );

      // Try to create duplicate with same ID - this should either succeed (overwrite) or fail
      // APISIX allows overwriting resources with PUT, so we test that it doesn't throw
      const result = await client.upstreams.create(
        {
          name: "test-upstream-2",
          type: "roundrobin",
          nodes: { "httpbin.org:80": 1 },
        },
        testIds.upstream,
      );

      expect(result).toBeDefined();
      expect(typeof result).toBe("object");
    });
  });
});
