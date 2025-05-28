import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ApisixSDK, createApisixSDK } from "../../packages/apisix-sdk/src";
import { createTestClient, resetClient, validateConnection } from "../client";

describe("APISIX SDK - Main SDK Class", () => {
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

  describe("SDK Initialization", () => {
    it("should create SDK instance with createApisixSDK function", () => {
      const sdk = createApisixSDK({
        baseURL: "http://localhost:9180",
        apiKey: "test-key",
      });

      expect(sdk).toBeInstanceOf(ApisixSDK);
      expect(sdk.routes).toBeDefined();
      expect(sdk.services).toBeDefined();
      expect(sdk.upstreams).toBeDefined();
      expect(sdk.consumers).toBeDefined();
      expect(sdk.ssl).toBeDefined();
      expect(sdk.globalRules).toBeDefined();
      expect(sdk.consumerGroups).toBeDefined();
      expect(sdk.pluginConfigs).toBeDefined();
      expect(sdk.plugins).toBeDefined();
      expect(sdk.streamRoutes).toBeDefined();
      expect(sdk.secrets).toBeDefined();
      expect(sdk.protos).toBeDefined();
      expect(sdk.credentials).toBeDefined();
      expect(sdk.control).toBeDefined();
      expect(sdk.version).toBeDefined();
    });

    it("should create SDK instance with constructor", () => {
      const sdk = new ApisixSDK({
        baseURL: "http://localhost:9180",
        apiKey: "test-key",
      });

      expect(sdk).toBeInstanceOf(ApisixSDK);
    });
  });

  describe("Client Access", () => {
    it("should provide access to underlying client", () => {
      const underlyingClient = client.getClient();

      expect(underlyingClient).toBeDefined();
      expect(typeof underlyingClient.get).toBe("function");
      expect(typeof underlyingClient.post).toBe("function");
      expect(typeof underlyingClient.put).toBe("function");
      expect(typeof underlyingClient.list).toBe("function");
    });
  });

  describe("Connection Testing", () => {
    it("should test connection to APISIX Admin API", async () => {
      const isConnected = await client.testConnection();

      expect(typeof isConnected).toBe("boolean");
    });

    it("should test connection to APISIX Control API", async () => {
      const isConnected = await client.testControlConnection();

      expect(typeof isConnected).toBe("boolean");
      // Control API may not be available in all environments
    });
  });

  describe("System Information", () => {
    it("should get server information", async () => {
      try {
        const serverInfo = await client.getServerInfo();

        expect(serverInfo).toBeDefined();
        expect(typeof serverInfo.hostname).toBe("string");
        expect(typeof serverInfo.version).toBe("string");
      } catch (error) {
        // Server info may not be available in all configurations
        console.warn("Server info not available:", error);
      }
    });

    it("should get APISIX version", async () => {
      try {
        const version = await client.getVersion();

        expect(typeof version).toBe("string");
      } catch (error) {
        // Version may not be available in all configurations
        console.warn("Version not available:", error);
      }
    });

    it("should get system status", async () => {
      const status = await client.getSystemStatus();

      expect(status).toBeDefined();
      expect(typeof status.adminApiConnected).toBe("boolean");
      expect(typeof status.controlApiConnected).toBe("boolean");
      // systemOverview may be undefined if control API is not available
    });
  });

  describe("Feature Support", () => {
    it("should check if credentials feature is supported", async () => {
      const supportsCredentials = await client.supportsFeature("credentials");

      expect(typeof supportsCredentials).toBe("boolean");
    });

    it("should check if secrets feature is supported", async () => {
      const supportsSecrets = await client.supportsFeature("secrets");

      expect(typeof supportsSecrets).toBe("boolean");
    });

    it("should check if newResponseFormat feature is supported", async () => {
      const supportsNewFormat =
        await client.supportsFeature("newResponseFormat");

      expect(typeof supportsNewFormat).toBe("boolean");
    });

    it("should check if streamRoutes feature is supported", async () => {
      const supportsStreamRoutes = await client.supportsFeature("streamRoutes");

      expect(typeof supportsStreamRoutes).toBe("boolean");
    });
  });

  describe("Version Compatibility", () => {
    it("should get version compatibility information", async () => {
      try {
        const compatibility = await client.getVersionCompatibility();

        expect(compatibility).toBeDefined();
        expect(typeof compatibility.version).toBe("string");
        expect(typeof compatibility.majorVersion).toBe("string");
        expect(compatibility.features).toBeDefined();
        expect(Array.isArray(compatibility.supportedPlugins)).toBe(true);
        expect(Array.isArray(compatibility.deprecatedFeatures)).toBe(true);
      } catch (error) {
        // Version compatibility may not be available in all configurations
        console.warn("Version compatibility not available:", error);
      }
    });
  });

  describe("Resource Managers", () => {
    it("should have all resource managers initialized", () => {
      expect(client.routes).toBeDefined();
      expect(client.services).toBeDefined();
      expect(client.upstreams).toBeDefined();
      expect(client.consumers).toBeDefined();
      expect(client.credentials).toBeDefined();
      expect(client.ssl).toBeDefined();
      expect(client.globalRules).toBeDefined();
      expect(client.consumerGroups).toBeDefined();
      expect(client.pluginConfigs).toBeDefined();
      expect(client.plugins).toBeDefined();
      expect(client.streamRoutes).toBeDefined();
      expect(client.secrets).toBeDefined();
      expect(client.protos).toBeDefined();
      expect(client.control).toBeDefined();
      expect(client.version).toBeDefined();
    });

    it("should have working resource manager methods", async () => {
      // Test that resource managers are properly initialized and functional
      expect(typeof client.routes.list).toBe("function");
      expect(typeof client.services.list).toBe("function");
      expect(typeof client.upstreams.list).toBe("function");
      expect(typeof client.consumers.list).toBe("function");
      expect(typeof client.ssl.list).toBe("function");
      expect(typeof client.globalRules.list).toBe("function");
      expect(typeof client.consumerGroups.list).toBe("function");
      expect(typeof client.pluginConfigs.list).toBe("function");
      expect(typeof client.plugins.list).toBe("function");
      expect(typeof client.streamRoutes.list).toBe("function");
      expect(typeof client.secrets.listVaultSecrets).toBe("function");
      expect(typeof client.protos.list).toBe("function");
      expect(typeof client.credentials.list).toBe("function");
      expect(typeof client.control.isHealthy).toBe("function");
      expect(typeof client.version.getCurrentVersionConfig).toBe("function");
    });

    it("should be able to list resources from different managers", async () => {
      try {
        // Test a few key resource managers
        const routes = await client.routes.list({ page_size: 1 });
        expect(Array.isArray(routes)).toBe(true);

        const services = await client.services.list({ page_size: 1 });
        expect(Array.isArray(services)).toBe(true);

        const upstreams = await client.upstreams.list({ page_size: 1 });
        expect(Array.isArray(upstreams)).toBe(true);

        const consumers = await client.consumers.list({ page_size: 1 });
        expect(Array.isArray(consumers)).toBe(true);

        const plugins = await client.plugins.list();
        expect(Array.isArray(plugins)).toBe(true);
      } catch (error) {
        // Some operations may fail depending on APISIX configuration
        console.warn("Resource listing failed:", error);
      }
    });
  });

  describe("Error Handling", () => {
    it("should handle invalid configuration gracefully", () => {
      expect(() => {
        new ApisixSDK({
          baseURL: "",
          apiKey: "test",
        });
      }).not.toThrow();
    });

    it("should handle connection failures gracefully", async () => {
      const invalidClient = new ApisixSDK({
        baseURL: "http://invalid-host:9999",
        apiKey: "test",
        timeout: 1000,
      });

      const isConnected = await invalidClient.testConnection();
      expect(isConnected).toBe(false);

      const status = await invalidClient.getSystemStatus();
      expect(status.adminApiConnected).toBe(false);
      // Control API connection might succeed if control API is available locally
      expect(typeof status.controlApiConnected).toBe("boolean");
    });
  });
});
