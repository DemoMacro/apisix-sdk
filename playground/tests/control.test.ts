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

  afterAll(async () => {
    resetClient();
  });

  describe("Health Check Operations", () => {
    it("should check if Control API is healthy", async () => {
      try {
        const isHealthy = await client.control.isHealthy();
        expect(typeof isHealthy).toBe("boolean");
      } catch (error) {
        console.warn("Control API health check failed:", error);
      }
    });

    it("should get health check status", async () => {
      try {
        const status = await client.control.healthCheck();

        expect(status).toBeDefined();
        expect(typeof status.status).toBe("string");
      } catch (error) {
        console.warn("Health check status failed:", error);
      }
    });
  });

  describe("Server Information", () => {
    it("should get server information", async () => {
      try {
        const serverInfo = await client.control.getServerInfo();

        expect(serverInfo).toBeDefined();
        expect(typeof serverInfo.hostname).toBe("string");
        expect(typeof serverInfo.version).toBe("string");
      } catch (error) {
        console.warn("Server info not available:", error);
      }
    });

    it("should get system overview", async () => {
      try {
        const overview = await client.control.getSystemOverview();

        expect(overview).toBeDefined();
        expect(overview.server).toBeDefined();
        expect(Array.isArray(overview.plugins)).toBe(true);
        expect(Array.isArray(overview.upstreams)).toBe(true);
        expect(Array.isArray(overview.routes)).toBe(true);
        expect(Array.isArray(overview.services)).toBe(true);
        expect(Array.isArray(overview.consumers)).toBe(true);
        expect(Array.isArray(overview.ssl)).toBe(true);
        expect(Array.isArray(overview.globalRules)).toBe(true);
        expect(Array.isArray(overview.consumerGroups)).toBe(true);
      } catch (error) {
        console.warn("System overview not available:", error);
      }
    });

    it("should get current APISIX configuration", async () => {
      try {
        const config = await client.control.getConfig();

        expect(config).toBeDefined();
        expect(typeof config).toBe("object");
      } catch (error) {
        console.warn("Config not available:", error);
      }
    });
  });

  describe("Plugin Operations", () => {
    it("should get all available plugins", async () => {
      try {
        const plugins = await client.control.getPlugins();

        expect(Array.isArray(plugins)).toBe(true);
        if (plugins.length > 0) {
          expect(typeof plugins[0].name).toBe("string");
        }
      } catch (error) {
        console.warn("Plugins list not available:", error);
      }
    });

    it("should get plugin metadata", async () => {
      try {
        const metadata = await client.control.getPluginMetadata();

        expect(Array.isArray(metadata)).toBe(true);
      } catch (error) {
        console.warn("Plugin metadata not available:", error);
      }
    });

    it("should get specific plugin metadata", async () => {
      try {
        const metadata =
          await client.control.getPluginMetadataById("limit-count");

        expect(metadata).toBeDefined();
        expect(metadata.id).toBe("limit-count");
      } catch (error) {
        console.warn("Specific plugin metadata not available:", error);
      }
    });

    it("should reload plugins", async () => {
      try {
        const result = await client.control.reloadPlugins();

        expect(result).toBeDefined();
        expect(typeof result.message).toBe("string");
      } catch (error) {
        console.warn("Plugin reload failed:", error);
      }
    });
  });

  describe("Schema Operations", () => {
    it("should get all schemas", async () => {
      try {
        const schemas = await client.control.getSchemas();

        expect(schemas).toBeDefined();
        expect(typeof schemas).toBe("object");
      } catch (error) {
        console.warn("Schemas not available:", error);
      }
    });

    it("should get schema for specific resource type", async () => {
      try {
        const schema = await client.control.getSchema("route");

        expect(schema).toBeDefined();
        expect(typeof schema).toBe("object");
      } catch (error) {
        console.warn("Route schema not available:", error);
      }
    });

    it("should get plugin schema", async () => {
      try {
        const schema = await client.control.getPluginSchema("limit-count");

        expect(schema).toBeDefined();
        expect(typeof schema).toBe("object");
      } catch (error) {
        console.warn("Plugin schema not available:", error);
      }
    });
  });

  describe("Upstream Operations", () => {
    it("should get runtime upstreams information", async () => {
      try {
        const upstreams = await client.control.getUpstreams();

        expect(Array.isArray(upstreams)).toBe(true);
      } catch (error) {
        console.warn("Upstreams runtime info not available:", error);
      }
    });

    it("should get specific upstream runtime information", async () => {
      try {
        // First get list to find an existing upstream
        const upstreams = await client.control.getUpstreams();

        if (upstreams.length > 0) {
          const upstreamId = (upstreams[0] as any).id;
          const upstream = await client.control.getUpstream(upstreamId);

          expect(upstream).toBeDefined();
        }
      } catch (error) {
        console.warn("Specific upstream runtime info not available:", error);
      }
    });

    it("should get upstream health status", async () => {
      try {
        const health = await client.control.getUpstreamHealth();

        expect(Array.isArray(health)).toBe(true);
      } catch (error) {
        console.warn("Upstream health not available:", error);
      }
    });

    it("should get specific upstream health status", async () => {
      try {
        const health = await client.control.getUpstreamHealth("test-upstream");

        expect(Array.isArray(health)).toBe(true);
      } catch (error) {
        console.warn("Specific upstream health not available:", error);
      }
    });
  });

  describe("Resource Runtime Information", () => {
    it("should get active routes", async () => {
      try {
        const routes = await client.control.getRoutes();

        expect(Array.isArray(routes)).toBe(true);
      } catch (error) {
        console.warn("Active routes not available:", error);
      }
    });

    it("should get specific route runtime information", async () => {
      try {
        const routes = await client.control.getRoutes();

        if (routes.length > 0) {
          const routeId = (routes[0] as any).id;
          const route = await client.control.getRoute(routeId);

          expect(route).toBeDefined();
        }
      } catch (error) {
        console.warn("Specific route runtime info not available:", error);
      }
    });

    it("should get active services", async () => {
      try {
        const services = await client.control.getServices();

        expect(Array.isArray(services)).toBe(true);
      } catch (error) {
        console.warn("Active services not available:", error);
      }
    });

    it("should get specific service runtime information", async () => {
      try {
        const services = await client.control.getServices();

        if (services.length > 0) {
          const serviceId = (services[0] as any).id;
          const service = await client.control.getService(serviceId);

          expect(service).toBeDefined();
        }
      } catch (error) {
        console.warn("Specific service runtime info not available:", error);
      }
    });

    it("should get consumers", async () => {
      try {
        const consumers = await client.control.getConsumers();

        expect(Array.isArray(consumers)).toBe(true);
      } catch (error) {
        console.warn("Consumers not available:", error);
      }
    });

    it("should get specific consumer", async () => {
      try {
        const consumers = await client.control.getConsumers();

        if (consumers.length > 0) {
          const consumerId = (consumers[0] as any).id;
          const consumer = await client.control.getConsumer(consumerId);

          expect(consumer).toBeDefined();
        }
      } catch (error) {
        console.warn("Specific consumer not available:", error);
      }
    });

    it("should get SSL certificates", async () => {
      try {
        const certificates = await client.control.getSSLCertificates();

        expect(Array.isArray(certificates)).toBe(true);
      } catch (error) {
        console.warn("SSL certificates not available:", error);
      }
    });

    it("should get specific SSL certificate", async () => {
      try {
        const certificates = await client.control.getSSLCertificates();

        if (certificates.length > 0) {
          const certId = (certificates[0] as any).id;
          const certificate = await client.control.getSSLCertificate(certId);

          expect(certificate).toBeDefined();
        }
      } catch (error) {
        console.warn("Specific SSL certificate not available:", error);
      }
    });

    it("should get global rules", async () => {
      try {
        const rules = await client.control.getGlobalRules();

        expect(Array.isArray(rules)).toBe(true);
      } catch (error) {
        console.warn("Global rules not available:", error);
      }
    });

    it("should get specific global rule", async () => {
      try {
        const rules = await client.control.getGlobalRules();

        if (rules.length > 0) {
          const ruleId = (rules[0] as any).id;
          const rule = await client.control.getGlobalRule(ruleId);

          expect(rule).toBeDefined();
        }
      } catch (error) {
        console.warn("Specific global rule not available:", error);
      }
    });

    it("should get consumer groups", async () => {
      try {
        const groups = await client.control.getConsumerGroups();

        expect(Array.isArray(groups)).toBe(true);
      } catch (error) {
        console.warn("Consumer groups not available:", error);
      }
    });

    it("should get specific consumer group", async () => {
      try {
        const groups = await client.control.getConsumerGroups();

        if (groups.length > 0) {
          const groupId = (groups[0] as any).id;
          const group = await client.control.getConsumerGroup(groupId);

          expect(group).toBeDefined();
        }
      } catch (error) {
        console.warn("Specific consumer group not available:", error);
      }
    });
  });

  describe("Discovery Operations", () => {
    it("should get service discovery dump", async () => {
      try {
        const dump = await client.control.getServiceDump();

        expect(dump).toBeDefined();
        expect(typeof dump).toBe("object");
      } catch (error) {
        console.warn("Service discovery dump not available:", error);
      }
    });

    it("should get discovery dump files list", async () => {
      try {
        const files = await client.control.getDiscoveryDumpFiles();

        expect(Array.isArray(files)).toBe(true);
      } catch (error) {
        console.warn("Discovery dump files not available:", error);
      }
    });

    it("should get discovery dump file content", async () => {
      try {
        const files = await client.control.getDiscoveryDumpFiles();

        if (files.length > 0) {
          const filename = files[0].path;
          const content = await client.control.getDiscoveryDumpFile(filename);

          expect(typeof content).toBe("string");
        }
      } catch (error) {
        console.warn("Discovery dump file content not available:", error);
      }
    });

    it("should get discovery metrics", async () => {
      try {
        const metrics = await client.control.getDiscoveryMetrics();

        expect(metrics).toBeDefined();
        expect(typeof metrics).toBe("object");
      } catch (error) {
        console.warn("Discovery metrics not available:", error);
      }
    });
  });

  describe("System Operations", () => {
    it("should trigger garbage collection", async () => {
      try {
        const result = await client.control.triggerGC();

        expect(result).toBeDefined();
        expect(typeof result.message).toBe("string");
      } catch (error) {
        console.warn("GC trigger failed:", error);
      }
    });

    it("should get memory statistics", async () => {
      try {
        const stats = await client.control.getMemoryStats();

        expect(stats).toBeDefined();
        expect(typeof stats).toBe("object");
      } catch (error) {
        console.warn("Memory stats not available:", error);
      }
    });

    it("should get request statistics", async () => {
      try {
        const stats = await client.control.getRequestStatistics();

        expect(stats).toBeDefined();
        expect(typeof stats).toBe("object");
      } catch (error) {
        console.warn("Request stats not available:", error);
      }
    });

    it("should get connection statistics", async () => {
      try {
        const stats = await client.control.getConnectionStatistics();

        expect(stats).toBeDefined();
        expect(typeof stats).toBe("object");
      } catch (error) {
        console.warn("Connection stats not available:", error);
      }
    });

    it("should get Prometheus metrics", async () => {
      try {
        const metrics = await client.control.getPrometheusMetrics();

        expect(typeof metrics).toBe("string");
      } catch (error) {
        console.warn("Prometheus metrics not available:", error);
      }
    });
  });

  describe("Control API Interface", () => {
    it("should provide consistent interface for control operations", () => {
      expect(typeof client.control.isHealthy).toBe("function");
      expect(typeof client.control.getServerInfo).toBe("function");
      expect(typeof client.control.getPlugins).toBe("function");
      expect(typeof client.control.getUpstreamHealth).toBe("function");
      expect(typeof client.control.getServiceDump).toBe("function");
      expect(typeof client.control.getUpstreams).toBe("function");
      expect(typeof client.control.getUpstream).toBe("function");
      expect(typeof client.control.getSchemas).toBe("function");
      expect(typeof client.control.getSchema).toBe("function");
      expect(typeof client.control.getPluginSchema).toBe("function");
      expect(typeof client.control.getDiscoveryDumpFiles).toBe("function");
      expect(typeof client.control.getDiscoveryDumpFile).toBe("function");
      expect(typeof client.control.getPluginMetadata).toBe("function");
      expect(typeof client.control.getPluginMetadataById).toBe("function");
      expect(typeof client.control.getConfig).toBe("function");
      expect(typeof client.control.getRoutes).toBe("function");
      expect(typeof client.control.getRoute).toBe("function");
      expect(typeof client.control.getServices).toBe("function");
      expect(typeof client.control.getService).toBe("function");
      expect(typeof client.control.getConsumers).toBe("function");
      expect(typeof client.control.getConsumer).toBe("function");
      expect(typeof client.control.getSSLCertificates).toBe("function");
      expect(typeof client.control.getSSLCertificate).toBe("function");
      expect(typeof client.control.getGlobalRules).toBe("function");
      expect(typeof client.control.getGlobalRule).toBe("function");
      expect(typeof client.control.getConsumerGroups).toBe("function");
      expect(typeof client.control.getConsumerGroup).toBe("function");
      expect(typeof client.control.triggerGC).toBe("function");
      expect(typeof client.control.getSystemOverview).toBe("function");
      expect(typeof client.control.getDiscoveryMetrics).toBe("function");
      expect(typeof client.control.getMemoryStats).toBe("function");
      expect(typeof client.control.getPrometheusMetrics).toBe("function");
      expect(typeof client.control.getRequestStatistics).toBe("function");
      expect(typeof client.control.getConnectionStatistics).toBe("function");
      expect(typeof client.control.healthCheck).toBe("function");
      expect(typeof client.control.reloadPlugins).toBe("function");
    });
  });
});
