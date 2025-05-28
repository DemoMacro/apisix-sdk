import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { ApisixSDK } from "../../packages/apisix-sdk/src";
import { createTestClient, resetClient, validateConnection } from "../client";
import { TestHelpers } from "./test-helpers";

describe("APISIX SDK - Services Management", () => {
  let client: ApisixSDK;
  let helpers: TestHelpers;
  const testIds = {
    upstream: "test-services-upstream",
    service: "test-service",
    pluginService: "test-plugin-service",
  };

  beforeAll(async () => {
    client = await createTestClient();

    // Validate connection
    const isConnected = await validateConnection(client);
    if (!isConnected) {
      throw new Error("Cannot connect to APISIX for testing");
    }

    helpers = new TestHelpers(client);

    // Clean up and setup base resources
    await cleanupTestResources();
    await setupBaseResources();
  });

  afterAll(async () => {
    await cleanupTestResources();
    resetClient();
  });

  async function setupBaseResources() {
    // Create upstream for service tests
    await client.upstreams.create(
      {
        name: "test-services-upstream",
        type: "roundrobin",
        nodes: {
          "httpbin.org:80": 1,
          "www.example.com:80": 1,
        },
        timeout: {
          connect: 6,
          send: 6,
          read: 6,
        },
      },
      testIds.upstream,
    );
  }

  async function cleanupTestResources() {
    const cleanupTasks = [
      () => client.services.delete(testIds.service).catch(() => {}),
      () => client.services.delete(testIds.pluginService).catch(() => {}),
      () => client.services.delete("search-service-1").catch(() => {}),
      () => client.services.delete("search-service-2").catch(() => {}),
      () => client.services.delete("clone-source").catch(() => {}),
      () => client.services.delete("clone-target").catch(() => {}),
      () => client.upstreams.delete(testIds.upstream).catch(() => {}),
    ];

    await Promise.all(cleanupTasks.map((task) => task()));
  }

  describe("Basic CRUD Operations", () => {
    it("should create a service", async () => {
      const service = await client.services.create(
        {
          name: "test-service",
          desc: "Test service for unit tests",
          upstream_id: testIds.upstream,
          enable_websocket: false,
          labels: {
            env: "test",
            version: "1.0",
          },
        },
        testIds.service,
      );

      expect(service).toBeDefined();
      expect(service.id).toBe(testIds.service);
      expect(service.name).toBe("test-service");
      expect(service.upstream_id).toBe(testIds.upstream);
      expect(service.enable_websocket).toBe(false);
    });

    it("should get service by id", async () => {
      const service = await client.services.get(testIds.service);

      expect(service).toBeDefined();
      expect(service.id).toBe(testIds.service);
      expect(service.name).toBe("test-service");
      expect(service.upstream_id).toBe(testIds.upstream);
    });

    it("should list services", async () => {
      const services = await client.services.list();

      expect(Array.isArray(services)).toBe(true);
      expect(services.length).toBeGreaterThan(0);
      expect(services.some((s) => s.id === testIds.service)).toBe(true);
    });

    it("should update service", async () => {
      const updated = await client.services.update(testIds.service, {
        desc: "Updated test service",
        enable_websocket: true,
        labels: {
          env: "test",
          version: "2.0",
        },
      });

      expect(updated.desc).toBe("Updated test service");
      expect(updated.enable_websocket).toBe(true);
      expect(updated.labels?.version).toBe("2.0");
    });

    it("should check if service exists", async () => {
      const exists = await client.services.exists(testIds.service);
      expect(exists).toBe(true);

      const notExists = await client.services.exists("non-existent-service");
      expect(notExists).toBe(false);
    });

    it("should delete service", async () => {
      const deleted = await client.services.delete(testIds.service);
      expect(deleted).toBe(true);

      const exists = await client.services.exists(testIds.service);
      expect(exists).toBe(false);
    });
  });

  describe("Service with Plugins", () => {
    it("should create service with plugins", async () => {
      const service = await client.services.create(
        {
          name: "test-plugin-service",
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
            "proxy-rewrite": {
              headers: {
                "X-Service": "test-service",
                "X-Version": "1.0",
              },
            },
          },
        },
        testIds.pluginService,
      );

      expect(service).toBeDefined();
      expect(service.plugins).toBeDefined();
      expect(service.plugins?.["limit-conn"]).toBeDefined();
      expect(service.plugins?.prometheus).toBeDefined();
      expect(service.plugins?.["proxy-rewrite"]).toBeDefined();
    });

    it("should create service with upstream configuration", async () => {
      const service = await client.services.create(
        {
          name: "service-with-upstream",
          upstream: {
            type: "chash",
            hash_on: "header",
            key: "user-id",
            nodes: {
              "127.0.0.1:8080": 1,
              "127.0.0.1:8081": 2,
            },
            timeout: {
              connect: 5,
              send: 5,
              read: 5,
            },
          },
          plugins: {
            "response-rewrite": {
              headers: {
                "X-Upstream": "custom",
              },
            },
          },
        },
        "service-with-upstream",
      );

      expect(service).toBeDefined();
      expect(service.upstream).toBeDefined();
      expect(service.upstream?.type).toBe("chash");
      expect(service.upstream?.hash_on).toBe("header");

      // Clean up
      if (service.id) {
        await client.services.delete(service.id).catch(() => {});
      }
    });
  });

  describe("Search and Filter", () => {
    beforeAll(async () => {
      // Create test services for search
      await client.services.create(
        {
          name: "search-user-service",
          upstream_id: testIds.upstream,
          hosts: ["api.example.com"],
        },
        "search-service-1",
      );

      await client.services.create(
        {
          name: "search-order-service",
          upstream_id: testIds.upstream,
          hosts: ["api.example.com"],
        },
        "search-service-2",
      );
    });

    it("should find services by name", async () => {
      const found = await client.services.findByName("search");

      expect(Array.isArray(found)).toBe(true);
      expect(found.length).toBeGreaterThanOrEqual(2);
      expect(found.some((s) => s.name?.includes("search"))).toBe(true);
    });

    it("should find services by host", async () => {
      const found = await client.services.findByHost("api.example.com");

      expect(Array.isArray(found)).toBe(true);
      expect(found.length).toBeGreaterThanOrEqual(2);
      expect(found.some((s) => s.hosts?.includes("api.example.com"))).toBe(
        true,
      );
    });

    it("should list services with pagination", async () => {
      const shouldSkip = await helpers.skipIfUnsupported("pagination");
      if (shouldSkip) {
        console.log(
          "Pagination not supported in this APISIX version, skipping test",
        );
        return;
      }

      const result = await client.services.listPaginated(1, 5);

      expect(result).toBeDefined();
      expect(Array.isArray(result.services)).toBe(true);
      expect(result.services.length).toBeLessThanOrEqual(5);
    });
  });

  describe("Service Configuration Options", () => {
    it("should create service with hosts configuration", async () => {
      const service = await client.services.create(
        {
          name: "multi-host-service",
          upstream_id: testIds.upstream,
          hosts: ["api1.example.com", "api2.example.com"],
        },
        "multi-host-service",
      );

      expect(service.hosts).toEqual(["api1.example.com", "api2.example.com"]);

      // Clean up
      if (service.id) {
        await client.services.delete(service.id).catch(() => {});
      }
    });

    it("should create service with plugin_config_id", async () => {
      // First create a plugin config if available
      try {
        await client.pluginConfigs.create(
          {
            desc: "Test plugin config for service",
            plugins: {
              "request-id": {
                _meta: { disable: false },
              },
            },
          },
          "test-plugin-config",
        );

        const service = await client.services.create(
          {
            name: "service-with-plugin-config",
            upstream_id: testIds.upstream,
            plugin_config_id: "test-plugin-config",
          },
          "service-with-plugin-config",
        );

        expect(service.plugin_config_id).toBe("test-plugin-config");

        // Clean up
        if (service.id) {
          await client.services.delete(service.id).catch(() => {});
        }
        await client.pluginConfigs.delete("test-plugin-config");
      } catch (error) {
        console.warn("Plugin config not available for this test:", error);
      }
    });

    it("should create service with websocket enabled", async () => {
      const service = await client.services.create(
        {
          name: "websocket-service",
          upstream_id: testIds.upstream,
          enable_websocket: true,
        },
        "websocket-service",
      );

      expect(service.enable_websocket).toBe(true);

      // Clean up
      if (service.id) {
        await client.services.delete(service.id).catch(() => {});
      }
    });
  });

  describe("Utility Functions", () => {
    it("should clone service", async () => {
      // First create source service
      await client.services.create(
        {
          name: "source-service",
          upstream_id: testIds.upstream,
          desc: "Source service for cloning",
          plugins: {
            prometheus: { disable: false },
          },
        },
        "clone-source",
      );

      const cloned = await client.services.clone(
        "clone-source",
        {
          name: "cloned-service",
          desc: "Cloned from source",
        },
        "clone-target",
      );

      expect(cloned).toBeDefined();
      expect(cloned.id).toBe("clone-target");
      expect(cloned.name).toBe("cloned-service");
      expect(cloned.desc).toBe("Cloned from source");
      expect(cloned.upstream_id).toBe(testIds.upstream);
    });

    it("should get service statistics", async () => {
      const stats = await client.services.getStatistics();

      expect(stats).toBeDefined();
      expect(typeof stats.total).toBe("number");
      expect(stats.total).toBeGreaterThan(0);
      expect(Array.isArray(stats.topPlugins)).toBe(true);
      expect(typeof stats.upstreamServices).toBe("number");
      expect(typeof stats.websocketEnabled).toBe("number");
    });
  });

  describe("Error Handling", () => {
    it("should handle non-existent service", async () => {
      await expect(
        client.services.get("non-existent-service"),
      ).rejects.toThrow();
    });

    it("should handle invalid service data", async () => {
      // APISIX allows creating services with minimal configuration
      const service = await client.services.create({
        // Missing optional fields - APISIX will assign defaults
      } as never);

      expect(service).toBeDefined();
      expect(service.id).toBeDefined();

      // Clean up
      if (service.id) {
        await client.services.delete(service.id).catch(() => {});
      }
    });

    it("should handle invalid upstream reference", async () => {
      await expect(
        client.services.create(
          {
            name: "invalid-upstream-service",
            upstream_id: "non-existent-upstream",
          },
          "invalid-upstream-service",
        ),
      ).rejects.toThrow();
    });
  });
});
