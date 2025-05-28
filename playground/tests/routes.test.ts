import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { ApisixSDK } from "../../packages/apisix-sdk/src";
import { createTestClient, resetClient, validateConnection } from "../client";
import { TestHelpers } from "./test-helpers";

describe("APISIX SDK - Routes Management", () => {
  let client: ApisixSDK;
  let helpers: TestHelpers;
  const testIds = {
    upstream: "test-routes-upstream",
    service: "test-routes-service",
    route: "test-route",
    pluginRoute: "test-plugin-route",
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
    // Create upstream
    await client.upstreams.create(
      {
        name: "test-routes-upstream",
        type: "roundrobin",
        nodes: {
          "httpbin.org:80": 1,
          "www.example.com:80": 1,
        },
      },
      testIds.upstream,
    );

    // Create service
    await client.services.create(
      {
        name: "test-routes-service",
        upstream_id: testIds.upstream,
      },
      testIds.service,
    );
  }

  async function cleanupTestResources() {
    const cleanupTasks = [
      () => client.routes.delete(testIds.route).catch(() => {}),
      () => client.routes.delete(testIds.pluginRoute).catch(() => {}),
      () => client.routes.delete("search-route-1").catch(() => {}),
      () => client.routes.delete("search-route-2").catch(() => {}),
      () => client.routes.delete("clone-source").catch(() => {}),
      () => client.routes.delete("clone-target").catch(() => {}),
      () => client.services.delete(testIds.service).catch(() => {}),
      () => client.upstreams.delete(testIds.upstream).catch(() => {}),
    ];

    await Promise.all(cleanupTasks.map((task) => task()));
  }

  describe("Basic CRUD Operations", () => {
    it("should create a route", async () => {
      const route = await client.routes.create(
        {
          name: "test-route",
          desc: "Test route for unit tests",
          uri: "/test-route",
          methods: ["GET", "POST"],
          service_id: testIds.service,
          status: 1,
          labels: {
            env: "test",
            version: "1.0",
          },
        },
        testIds.route,
      );

      expect(route).toBeDefined();
      expect(route.id).toBe(testIds.route);
      expect(route.name).toBe("test-route");
      expect(route.uri).toBe("/test-route");
      expect(route.methods).toEqual(["GET", "POST"]);
      expect(route.service_id).toBe(testIds.service);
    });

    it("should get route by id", async () => {
      const route = await client.routes.get(testIds.route);

      expect(route).toBeDefined();
      expect(route.id).toBe(testIds.route);
      expect(route.name).toBe("test-route");
      expect(route.uri).toBe("/test-route");
    });

    it("should list routes", async () => {
      const routes = await client.routes.list();

      expect(Array.isArray(routes)).toBe(true);
      expect(routes.length).toBeGreaterThan(0);
      expect(routes.some((r) => r.id === testIds.route)).toBe(true);
    });

    it("should update route", async () => {
      const updated = await client.routes.update(testIds.route, {
        desc: "Updated test route",
        uri: "/test-route-updated",
        methods: ["GET", "POST", "PUT"],
        service_id: testIds.service, // Required for valid configuration
      });

      expect(updated.desc).toBe("Updated test route");
      expect(updated.uri).toBe("/test-route-updated");
      expect(updated.methods).toEqual(["GET", "POST", "PUT"]);
    });

    it("should check if route exists", async () => {
      const exists = await client.routes.exists(testIds.route);
      expect(exists).toBe(true);

      const notExists = await client.routes.exists("non-existent-route");
      expect(notExists).toBe(false);
    });

    it("should enable and disable route", async () => {
      // Disable route
      const disabled = await client.routes.disable(testIds.route);
      expect(disabled.status).toBe(0);

      // Enable route
      const enabled = await client.routes.enable(testIds.route);
      expect(enabled.status).toBe(1);
    });

    it("should delete route", async () => {
      const deleted = await client.routes.delete(testIds.route);
      expect(deleted).toBe(true);

      const exists = await client.routes.exists(testIds.route);
      expect(exists).toBe(false);
    });
  });

  describe("Route with Plugins", () => {
    it("should create route with plugins", async () => {
      const route = await client.routes.create(
        {
          name: "test-plugin-route",
          uri: "/test-plugin-route",
          methods: ["GET"],
          service_id: testIds.service,
          plugins: {
            "limit-count": {
              count: 100,
              time_window: 60,
              key: "remote_addr",
              policy: "local",
            },
            cors: {
              allow_origins: "*",
              allow_methods: "GET,POST,PUT,DELETE",
              allow_headers: "Content-Type,Authorization",
            },
            prometheus: {
              disable: false,
            },
          },
        },
        testIds.pluginRoute,
      );

      expect(route).toBeDefined();
      expect(route.plugins).toBeDefined();
      expect(route.plugins?.["limit-count"]).toBeDefined();
      expect(route.plugins?.cors).toBeDefined();
      expect(route.plugins?.prometheus).toBeDefined();
    });

    it("should create route with upstream configuration", async () => {
      const route = await client.routes.create(
        {
          name: "upstream-route",
          uri: "/upstream-route",
          methods: ["GET"],
          upstream: {
            type: "roundrobin",
            nodes: {
              "httpbin.org:80": 1,
            },
            timeout: {
              connect: 6,
              send: 6,
              read: 6,
            },
          },
        },
        "upstream-route",
      );

      expect(route).toBeDefined();
      expect(route.upstream).toBeDefined();
      expect(route.upstream?.type).toBe("roundrobin");

      // Clean up
      await client.routes.delete("upstream-route");
    });
  });

  describe("Search and Filter", () => {
    beforeAll(async () => {
      // Create test routes for search
      await client.routes.create(
        {
          name: "search-route-1",
          uri: "/api/users",
          methods: ["GET"],
          hosts: ["api.example.com"],
          service_id: testIds.service,
        },
        "search-route-1",
      );

      await client.routes.create(
        {
          name: "search-route-2",
          uri: "/api/orders",
          methods: ["POST"],
          hosts: ["api.example.com"],
          service_id: testIds.service,
        },
        "search-route-2",
      );
    });

    it("should find routes by URI pattern", async () => {
      const found = await client.routes.findByUri("/api");

      expect(Array.isArray(found)).toBe(true);
      expect(found.length).toBeGreaterThanOrEqual(2);
      expect(found.some((r) => r.uri?.includes("/api"))).toBe(true);
    });

    it("should find routes by method", async () => {
      const getRoutes = await client.routes.findByMethod("GET");
      const postRoutes = await client.routes.findByMethod("POST");

      expect(Array.isArray(getRoutes)).toBe(true);
      expect(Array.isArray(postRoutes)).toBe(true);
      expect(getRoutes.some((r) => r.methods?.includes("GET"))).toBe(true);
      expect(postRoutes.some((r) => r.methods?.includes("POST"))).toBe(true);
    });

    it("should find routes by host", async () => {
      const found = await client.routes.findByHost("api.example.com");

      expect(Array.isArray(found)).toBe(true);
      expect(found.length).toBeGreaterThanOrEqual(2);
      expect(found.some((r) => r.hosts?.includes("api.example.com"))).toBe(
        true,
      );
    });

    it("should list routes with pagination", async () => {
      const shouldSkip = await helpers.skipIfUnsupported("pagination");
      if (shouldSkip) {
        console.log(
          "Pagination not supported in this APISIX version, skipping test",
        );
        return;
      }

      const result = await client.routes.listPaginated(1, 5);

      expect(result).toBeDefined();
      expect(Array.isArray(result.routes)).toBe(true);
      expect(result.routes.length).toBeLessThanOrEqual(5);
    });
  });

  describe("Route Patterns and Matching", () => {
    it("should create route with wildcard URI", async () => {
      const route = await client.routes.create(
        {
          name: "wildcard-route",
          uri: "/api/v1/*",
          methods: ["GET", "POST"],
          service_id: testIds.service,
        },
        "wildcard-route",
      );

      expect(route.uri).toBe("/api/v1/*");

      // Clean up
      await client.routes.delete("wildcard-route");
    });

    it("should create route with regex URI", async () => {
      const route = await client.routes.create(
        {
          name: "regex-route",
          uris: ["/users/\\d+", "/orders/\\d+"],
          methods: ["GET"],
          service_id: testIds.service,
        },
        "regex-route",
      );

      expect(route.uris).toEqual(["/users/\\d+", "/orders/\\d+"]);

      // Clean up
      await client.routes.delete("regex-route");
    });

    it("should create route with multiple hosts", async () => {
      const route = await client.routes.create(
        {
          name: "multi-host-route",
          uri: "/test",
          hosts: ["api.example.com", "api2.example.com"],
          methods: ["GET"],
          service_id: testIds.service,
        },
        "multi-host-route",
      );

      expect(route.hosts).toEqual(["api.example.com", "api2.example.com"]);

      // Clean up
      await client.routes.delete("multi-host-route");
    });
  });

  describe("Route Variables and Conditions", () => {
    it("should create route with variables", async () => {
      const route = await client.routes.create(
        {
          name: "variable-route",
          uri: "/conditional",
          methods: ["GET"],
          vars: [["http_user_agent", "~*", "curl/.*"]],
          service_id: testIds.service,
        },
        "variable-route",
      );

      expect(route.vars).toEqual([["http_user_agent", "~*", "curl/.*"]]);

      // Clean up
      await client.routes.delete("variable-route");
    });

    it("should create route with remote address filtering", async () => {
      const route = await client.routes.create(
        {
          name: "ip-filtered-route",
          uri: "/admin",
          methods: ["GET"],
          remote_addrs: ["127.0.0.1", "192.168.1.0/24"],
          service_id: testIds.service,
        },
        "ip-filtered-route",
      );

      expect(route.remote_addrs).toEqual(["127.0.0.1", "192.168.1.0/24"]);

      // Clean up
      await client.routes.delete("ip-filtered-route");
    });
  });

  describe("Utility Functions", () => {
    it("should clone route", async () => {
      // First create source route
      await client.routes.create(
        {
          name: "source-route",
          uri: "/source",
          methods: ["GET"],
          service_id: testIds.service,
        },
        "clone-source",
      );

      const cloned = await client.routes.clone(
        "clone-source",
        {
          name: "cloned-route",
          uri: "/cloned",
          desc: "Cloned from source",
          service_id: testIds.service, // Required for valid configuration
        },
        "clone-target",
      );

      expect(cloned).toBeDefined();
      expect(cloned.id).toBe("clone-target");
      expect(cloned.name).toBe("cloned-route");
      expect(cloned.uri).toBe("/cloned");
      expect(cloned.desc).toBe("Cloned from source");
    });

    it("should get route statistics", async () => {
      const stats = await client.routes.getStatistics();

      expect(stats).toBeDefined();
      expect(typeof stats.total).toBe("number");
      expect(stats.total).toBeGreaterThan(0);
      expect(Array.isArray(stats.methodDistribution)).toBe(true);
      expect(Array.isArray(stats.topPlugins)).toBe(true);
      expect(typeof stats.enabledCount).toBe("number");
      expect(typeof stats.disabledCount).toBe("number");
    });
  });

  describe("Error Handling", () => {
    it("should handle non-existent route", async () => {
      await expect(client.routes.get("non-existent-route")).rejects.toThrow();
    });

    it("should handle invalid route data", async () => {
      await expect(
        client.routes.create({
          // Missing required fields
        } as never),
      ).rejects.toThrow();
    });

    it("should handle conflicting route URIs", async () => {
      // Create first route
      await client.routes.create(
        {
          name: "conflict-route-1",
          uri: "/conflict",
          methods: ["GET"],
          service_id: testIds.service,
        },
        "conflict-route-1",
      );

      // APISIX allows creating routes with same URI but different IDs
      const conflictRoute = await client.routes.create(
        {
          name: "conflict-route-2",
          uri: "/conflict",
          methods: ["GET"],
          service_id: testIds.service,
        },
        "conflict-route-2",
      );

      expect(conflictRoute).toBeDefined();
      expect(conflictRoute.id).toBe("conflict-route-2");
      expect(conflictRoute.uri).toBe("/conflict");

      // Clean up
      await client.routes.delete("conflict-route-1").catch(() => {});
      await client.routes.delete("conflict-route-2").catch(() => {});
    });
  });
});
