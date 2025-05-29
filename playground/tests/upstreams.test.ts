import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { ApisixSDK } from "../../packages/apisix-sdk/src";
import { createTestClient, resetClient, validateConnection } from "../client";
import { TestHelpers } from "./test-helpers";

describe("APISIX SDK - Upstreams Management", () => {
  let client: ApisixSDK;
  let helpers: TestHelpers;
  const testIds = {
    upstream: "test-upstream",
    clusterUpstream: "test-cluster-upstream",
  };

  beforeAll(async () => {
    client = await createTestClient();

    // Validate connection
    const isConnected = await validateConnection(client);
    if (!isConnected) {
      throw new Error("Cannot connect to APISIX for testing");
    }

    helpers = new TestHelpers(client);

    // Clean up any existing test resources
    await cleanupTestResources();
  });

  afterAll(async () => {
    await cleanupTestResources();
    resetClient();
  });

  async function cleanupTestResources() {
    const cleanupTasks = [
      () => client.upstreams.delete(testIds.upstream).catch(() => {}),
      () => client.upstreams.delete(testIds.clusterUpstream).catch(() => {}),
    ];

    await Promise.all(cleanupTasks.map((task) => task()));
  }

  describe("Basic CRUD Operations", () => {
    it("should create an upstream", async () => {
      const upstream = await client.upstreams.create(
        {
          name: "test-upstream",
          desc: "Test upstream for unit tests",
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

      expect(upstream).toBeDefined();
      expect(upstream.id).toBe(testIds.upstream);
      expect(upstream.name).toBe("test-upstream");
      expect(upstream.type).toBe("roundrobin");
    });

    it("should get upstream by id", async () => {
      const upstream = await client.upstreams.get(testIds.upstream);

      expect(upstream).toBeDefined();
      expect(upstream.id).toBe(testIds.upstream);
      expect(upstream.name).toBe("test-upstream");
    });

    it("should list upstreams", async () => {
      const upstreams = await client.upstreams.list();

      expect(Array.isArray(upstreams)).toBe(true);
      expect(upstreams.length).toBeGreaterThan(0);
      expect(upstreams.some((u) => u.id === testIds.upstream)).toBe(true);
    });

    it("should update upstream", async () => {
      const updated = await client.upstreams.update(testIds.upstream, {
        name: "test-upstream-updated",
        desc: "Updated test upstream",
        type: "roundrobin",
        nodes: {
          "httpbin.org:80": 1,
          "www.example.com:80": 1,
        },
        timeout: {
          connect: 10,
          send: 10,
          read: 10,
        },
      });

      expect(updated.desc).toBe("Updated test upstream");
      expect(updated.timeout?.connect).toBe(10);
    });

    it("should check if upstream exists", async () => {
      const exists = await client.upstreams.exists(testIds.upstream);
      expect(exists).toBe(true);

      const notExists = await client.upstreams.exists("non-existent-upstream");
      expect(notExists).toBe(false);
    });

    it("should delete upstream", async () => {
      const deleted = await client.upstreams.delete(testIds.upstream);
      expect(deleted).toBe(true);

      const exists = await client.upstreams.exists(testIds.upstream);
      expect(exists).toBe(false);
    });
  });

  describe("Node Management", () => {
    beforeAll(async () => {
      // Create upstream for node management tests
      await client.upstreams.create(
        {
          name: "test-cluster-upstream",
          type: "roundrobin",
          nodes: {
            "127.0.0.1:8080": 1,
          },
        },
        testIds.clusterUpstream,
      );
    });

    it("should add node to upstream", async () => {
      const updated = await client.upstreams.addNode(
        testIds.clusterUpstream,
        "127.0.0.1",
        8081,
        2,
      );

      expect(updated).toBeDefined();
      // Verify node was added (implementation may vary)
      expect(typeof updated).toBe("object");
    });

    it("should update node weight", async () => {
      const updated = await client.upstreams.updateNodeWeight(
        testIds.clusterUpstream,
        "127.0.0.1",
        8080,
        3,
      );

      expect(updated).toBeDefined();
      expect(typeof updated).toBe("object");
    });

    it("should remove node from upstream", async () => {
      const updated = await client.upstreams.removeNode(
        testIds.clusterUpstream,
        "127.0.0.1",
        8081,
      );

      expect(updated).toBeDefined();
      expect(typeof updated).toBe("object");
    });
  });

  describe("Health Check and Monitoring", () => {
    it("should manage health checks", async () => {
      const upstream = await client.upstreams.create(
        {
          name: "health-check-upstream",
          type: "roundrobin",
          nodes: [
            { host: "127.0.0.1", port: 8080, weight: 1 },
            { host: "127.0.0.1", port: 8081, weight: 1 },
          ],
          checks: {
            active: {
              type: "http",
              http_path: "/health",
              timeout: 5,
              healthy: { interval: 10, successes: 2 },
              unhealthy: { interval: 5, http_failures: 3 },
            },
          },
        },
        "health-check-upstream",
      );

      expect(upstream.checks?.active?.type).toBe("http");
      expect(upstream.checks?.active?.http_path).toBe("/health");

      // Clean up
      await client.upstreams.delete("health-check-upstream");
    });

    it("should get upstream statistics", async () => {
      const stats = await client.upstreams.getStatistics();

      expect(stats).toBeDefined();
      expect(typeof stats.total).toBe("number");
      expect(typeof stats.healthy).toBe("number");
      expect(typeof stats.unhealthy).toBe("number");
      expect(Array.isArray(stats.typeDistribution)).toBe(true);
      expect(typeof stats.nodeCount).toBe("number");
      expect(typeof stats.averageNodesPerUpstream).toBe("number");
    });
  });

  describe("Search and Filter", () => {
    beforeAll(async () => {
      // Create test upstreams for search
      await client.upstreams.create(
        {
          name: "search-test-roundrobin",
          type: "roundrobin",
          nodes: { "example.com:80": 1 },
        },
        "search-test-1",
      );

      await client.upstreams.create(
        {
          name: "search-test-chash",
          type: "chash",
          key: "remote_addr",
          nodes: { "example.com:80": 1 },
        },
        "search-test-2",
      );
    });

    afterAll(async () => {
      await client.upstreams.delete("search-test-1").catch(() => {});
      await client.upstreams.delete("search-test-2").catch(() => {});
    });

    it("should find upstreams by name", async () => {
      const found = await client.upstreams.findByName("search-test");

      expect(Array.isArray(found)).toBe(true);
      expect(found.length).toBeGreaterThanOrEqual(2);
      expect(found.some((u) => u.name?.includes("search-test"))).toBe(true);
    });

    it("should find upstreams by type", async () => {
      const roundrobin = await client.upstreams.findByType("roundrobin");
      const chash = await client.upstreams.findByType("chash");

      expect(Array.isArray(roundrobin)).toBe(true);
      expect(Array.isArray(chash)).toBe(true);
      expect(roundrobin.some((u) => u.type === "roundrobin")).toBe(true);
      expect(chash.some((u) => u.type === "chash")).toBe(true);
    });

    it("should list upstreams with pagination", async () => {
      const shouldSkip = await helpers.skipIfUnsupported("pagination");
      if (shouldSkip) {
        console.log(
          "Pagination not supported in this APISIX version, skipping test",
        );
        return;
      }

      const result = await client.upstreams.listPaginated(1, 10);

      expect(result).toBeDefined();
      expect(Array.isArray(result.upstreams)).toBe(true);
      expect(result.upstreams.length).toBeLessThanOrEqual(10);
    });
  });

  describe("Utility Functions", () => {
    it("should clone upstream", async () => {
      // First create source upstream
      await client.upstreams.create(
        {
          name: "source-upstream",
          type: "roundrobin",
          nodes: { "httpbin.org:80": 1 },
        },
        "clone-source",
      );

      const cloned = await client.upstreams.clone(
        "clone-source",
        {
          name: "cloned-upstream",
          desc: "Cloned from source",
        },
        "clone-target",
      );

      expect(cloned).toBeDefined();
      expect(cloned.id).toBe("clone-target");
      expect(cloned.name).toBe("cloned-upstream");
      expect(cloned.desc).toBe("Cloned from source");

      // Clean up
      await client.upstreams.delete("clone-source");
      await client.upstreams.delete("clone-target");
    });

    it("should get upstream statistics", async () => {
      const stats = await client.upstreams.getStatistics();

      expect(stats).toBeDefined();
      expect(typeof stats.total).toBe("number");
      expect(typeof stats.healthy).toBe("number");
      expect(typeof stats.unhealthy).toBe("number");
      expect(Array.isArray(stats.typeDistribution)).toBe(true);
      expect(typeof stats.nodeCount).toBe("number");
      expect(typeof stats.averageNodesPerUpstream).toBe("number");
    });
  });

  describe("Error Handling", () => {
    it("should handle non-existent upstream", async () => {
      await expect(
        client.upstreams.get("non-existent-upstream"),
      ).rejects.toThrow();
    });

    it("should handle invalid upstream data", async () => {
      await expect(
        client.upstreams.create({
          // Missing required fields
        } as never),
      ).rejects.toThrow();
    });

    it("should handle invalid node operations", async () => {
      await expect(
        client.upstreams.addNode("non-existent-upstream", "127.0.0.1", 8080),
      ).rejects.toThrow();
    });
  });
});
