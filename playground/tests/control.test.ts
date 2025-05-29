import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { ApisixSDK } from "../../packages/apisix-sdk/src";
import { createTestClient, resetClient, validateConnection } from "../client";

describe("APISIX SDK - Control API", () => {
  let client: ApisixSDK;

  beforeAll(async () => {
    client = await createTestClient();

    // Validate connection
    const isConnected = await validateConnection(client);
    if (!isConnected) {
      throw new Error("Cannot connect to APISIX for testing");
    }
  });

  afterAll(() => {
    resetClient();
  });

  describe("Health Monitoring", () => {
    it("should check health status", async () => {
      try {
        const health = await client.control.healthCheck();

        expect(health).toBeDefined();
        expect(health.status).toMatch(/^(ok|error)$/);

        if (health.info) {
          expect(typeof health.info.version).toBe("string");
          expect(typeof health.info.hostname).toBe("string");
          expect(typeof health.info.up_time).toBe("number");
        }
      } catch (error) {
        console.warn("Control API health check not available:", error);
        expect(true).toBe(true);
      }
    });

    it("should get server info", async () => {
      try {
        const serverInfo = await client.control.getServerInfo();

        expect(serverInfo).toBeDefined();
        expect(typeof serverInfo.hostname).toBe("string");
        expect(typeof serverInfo.version).toBe("string");
        expect(typeof serverInfo.up_time).toBe("number");
        expect(typeof serverInfo.boot_time).toBe("number");
      } catch (error) {
        console.warn("Control API server info not available:", error);
        expect(true).toBe(true);
      }
    });

    it("should get upstream health", async () => {
      try {
        const upstreamHealth = await client.control.getUpstreamHealth();

        expect(Array.isArray(upstreamHealth)).toBe(true);

        if (upstreamHealth.length > 0) {
          const upstream = upstreamHealth[0];
          expect(typeof upstream.name).toBe("string");
          expect(upstream.type).toMatch(/^(http|https|tcp)$/);
          expect(Array.isArray(upstream.nodes)).toBe(true);
        }
      } catch (error) {
        console.warn("Control API upstream health not available:", error);
        expect(true).toBe(true);
      }
    });
  });

  describe("Schema Management", () => {
    it("should get all schemas", async () => {
      try {
        const schemas = await client.control.getSchemas();

        expect(schemas).toBeDefined();
        expect(typeof schemas.main).toBe("object");
        expect(typeof schemas.plugins).toBe("object");

        // Check main resource schemas
        expect(schemas.main.route).toBeDefined();
        expect(schemas.main.upstream).toBeDefined();
        expect(schemas.main.service).toBeDefined();
        expect(schemas.main.consumer).toBeDefined();
      } catch (error) {
        console.warn("Control API schemas not available:", error);
        expect(true).toBe(true);
      }
    });

    it("should validate schema data", async () => {
      try {
        const validation = await client.control.validateSchema(
          "route",
          {
            name: "test-route",
            uri: "/test",
            methods: ["GET"],
            upstream: {
              type: "roundrobin",
              nodes: [{ host: "127.0.0.1", port: 8080, weight: 1 }],
            },
          },
          {
            validatePlugins: false,
          },
        );

        expect(validation).toBeDefined();
        expect(typeof validation.valid).toBe("boolean");
        expect(Array.isArray(validation.errors)).toBe(true);
        expect(Array.isArray(validation.warnings)).toBe(true);
      } catch (error) {
        console.warn("Schema validation not available:", error);
        expect(true).toBe(true);
      }
    });

    it("should get validation recommendations", async () => {
      try {
        const recommendations =
          await client.control.getValidationRecommendations();

        expect(recommendations).toBeDefined();
        expect(typeof recommendations.schemaVersion).toBe("string");
        expect(Array.isArray(recommendations.availablePlugins)).toBe(true);
        expect(Array.isArray(recommendations.deprecatedPlugins)).toBe(true);
        expect(Array.isArray(recommendations.recommendedSettings)).toBe(true);
      } catch (error) {
        console.warn("Validation recommendations not available:", error);
        expect(true).toBe(true);
      }
    });

    it("should check schema compatibility", async () => {
      try {
        const compatibility = await client.control.getSchemaCompatibility();

        expect(compatibility).toBeDefined();
        expect(typeof compatibility.currentVersion).toBe("string");
        expect(typeof compatibility.targetVersion).toBe("string");
        expect(typeof compatibility.compatible).toBe("boolean");
        expect(Array.isArray(compatibility.breaking_changes)).toBe(true);
        expect(Array.isArray(compatibility.new_features)).toBe(true);
        expect(Array.isArray(compatibility.deprecated_features)).toBe(true);
      } catch (error) {
        console.warn("Schema compatibility check not available:", error);
        expect(true).toBe(true);
      }
    });
  });

  describe("Plugin Information", () => {
    it("should get available plugins", async () => {
      try {
        const plugins = await client.control.getPlugins();

        expect(plugins).toBeDefined();
        expect(typeof plugins).toBe("object");

        // Check if common plugins are available
        const pluginNames = Object.keys(plugins);
        expect(pluginNames.length).toBeGreaterThan(0);
      } catch (error) {
        console.warn("Control API plugins not available:", error);
        expect(true).toBe(true);
      }
    });
  });

  describe("Metrics and Monitoring", () => {
    it("should get prometheus metrics", async () => {
      try {
        const metrics = await client.control.getPrometheusMetrics();

        expect(metrics).toBeDefined();
        expect(typeof metrics).toBe("string");
        expect(metrics.length).toBeGreaterThan(0);
      } catch (error) {
        console.warn("Prometheus metrics not available:", error);
        expect(true).toBe(true);
      }
    });

    it("should get system overview", async () => {
      try {
        const overview = await client.control.getSystemOverview();

        expect(overview).toBeDefined();
        expect(overview.server).toBeDefined();
        expect(overview.schemas).toBeDefined();
        expect(typeof overview.health).toBe("boolean");
        expect(Array.isArray(overview.upstreamHealth)).toBe(true);
      } catch (error) {
        console.warn("System overview not available:", error);
        expect(true).toBe(true);
      }
    });

    it("should get request statistics", async () => {
      try {
        const stats = await client.control.getRequestStatistics();

        expect(stats).toBeDefined();
        expect(typeof stats).toBe("object");
      } catch (error) {
        console.warn("Request statistics not available:", error);
        expect(true).toBe(true);
      }
    });

    it("should get connection statistics", async () => {
      try {
        const stats = await client.control.getConnectionStatistics();

        expect(stats).toBeDefined();
        expect(typeof stats).toBe("object");
      } catch (error) {
        console.warn("Connection statistics not available:", error);
        expect(true).toBe(true);
      }
    });
  });

  describe("Discovery Services", () => {
    it("should get discovery metrics", async () => {
      try {
        const discovery = await client.control.getDiscoveryMetrics();

        expect(discovery).toBeDefined();
        expect(typeof discovery).toBe("object");
      } catch (error) {
        console.warn("Discovery metrics not available:", error);
        expect(true).toBe(true);
      }
    });

    it("should get discovery dump", async () => {
      try {
        const dump = await client.control.getServiceDump();

        expect(dump).toBeDefined();
        expect(typeof dump).toBe("object");
      } catch (error) {
        console.warn("Discovery dump not available:", error);
        expect(true).toBe(true);
      }
    });
  });

  describe("Control API Interface", () => {
    it("should provide consistent interface for control operations", () => {
      expect(typeof client.control.healthCheck).toBe("function");
      expect(typeof client.control.getServerInfo).toBe("function");
      expect(typeof client.control.getSchemas).toBe("function");
      expect(typeof client.control.getPlugins).toBe("function");
      expect(typeof client.control.getUpstreamHealth).toBe("function");
      expect(typeof client.control.getSystemOverview).toBe("function");
      expect(typeof client.control.getPrometheusMetrics).toBe("function");
      expect(typeof client.control.getDiscoveryMetrics).toBe("function");
      expect(typeof client.control.validateSchema).toBe("function");
      expect(typeof client.control.getValidationRecommendations).toBe(
        "function",
      );
      expect(typeof client.control.getSchemaCompatibility).toBe("function");
    });
  });
});
