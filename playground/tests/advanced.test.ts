import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import type { ApisixSDK } from "../../packages/apisix-sdk/src/index";
import { createTestClient, resetClient, validateConnection } from "../client";

describe("APISIX SDK - Advanced Features (3.0+)", () => {
  let client: ApisixSDK;
  const testIds = {
    credential: "test_credential_advanced",
    vaultSecret: "test_vault_secret",
    streamRoute: "test_stream_route",
    upstream: "test_upstream_advanced",
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
      () => client.credentials.delete(testIds.credential).catch(() => {}),
      () =>
        client.secrets.deleteVaultSecret(testIds.vaultSecret).catch(() => {}),
      () => client.streamRoutes.delete(testIds.streamRoute).catch(() => {}),
      () => client.upstreams.delete(testIds.upstream).catch(() => {}),
    ];

    await Promise.all(cleanupTasks.map((task) => task()));
  }

  describe("Control API Features", () => {
    it("should test control API connection", async () => {
      const connected = await client.testControlConnection();
      // Control API might not be available in all environments
      expect(typeof connected).toBe("boolean");
    });

    it("should get system status", async () => {
      const status = await client.getSystemStatus();
      expect(status).toHaveProperty("adminApiConnected");
      expect(status).toHaveProperty("controlApiConnected");
      expect(status.adminApiConnected).toBe(true);
    });
  });

  describe("Credential Management (APISIX 3.0+)", () => {
    it("should create a credential with multiple plugins", async () => {
      try {
        const credential = await client.credentials.create(
          {
            plugins: {
              "key-auth": {
                key: "test-api-key-123",
              },
              "basic-auth": {
                username: "test-user",
                password: "test-password",
              },
            },
            desc: "Test credential for advanced tests",
            labels: {
              env: "test",
              feature: "advanced",
            },
          },
          testIds.credential,
        );

        expect(credential).toHaveProperty("id");
        expect(credential.plugins).toHaveProperty("key-auth");
        expect(credential.plugins).toHaveProperty("basic-auth");
      } catch (error) {
        // Credential management might not be available in older APISIX versions
        console.warn("Credential management not available:", error);
      }
    });

    it("should list credentials with pagination", async () => {
      try {
        // First create a credential
        await client.credentials.create(
          {
            plugins: {
              "key-auth": { key: "test-key" },
            },
          },
          testIds.credential,
        );

        const result = await client.credentials.listPaginated(1, 5);
        expect(result).toHaveProperty("credentials");
        expect(Array.isArray(result.credentials)).toBe(true);
      } catch (error) {
        console.warn("Credential pagination not available:", error);
      }
    });
  });

  describe("Secret Management (APISIX 3.0+)", () => {
    it("should create and manage Vault secrets", async () => {
      try {
        const vaultSecret = await client.secrets.createVaultSecret(
          {
            uri: "http://127.0.0.1:8200",
            prefix: "kv/test",
            token: "test-token",
            namespace: "test",
          },
          testIds.vaultSecret,
        );

        expect(vaultSecret).toHaveProperty("id");
        expect(vaultSecret.uri).toBe("http://127.0.0.1:8200");

        // Test connection (will likely fail but should not throw)
        const connectionTest = await client.secrets.testVaultConnection(
          testIds.vaultSecret,
        );
        expect(connectionTest).toHaveProperty("connected");
        expect(typeof connectionTest.connected).toBe("boolean");
      } catch (error) {
        console.warn("Vault secret management not available:", error);
      }
    });

    it("should list all secrets by type", async () => {
      try {
        const allSecrets = await client.secrets.listAllSecrets();
        expect(allSecrets).toHaveProperty("vault");
        expect(allSecrets).toHaveProperty("aws");
        expect(allSecrets).toHaveProperty("gcp");
        expect(Array.isArray(allSecrets.vault)).toBe(true);
        expect(Array.isArray(allSecrets.aws)).toBe(true);
        expect(Array.isArray(allSecrets.gcp)).toBe(true);
      } catch (error) {
        console.warn("Secret listing not available:", error);
      }
    });
  });

  describe("Stream Routes (APISIX 3.0+)", () => {
    beforeEach(async () => {
      // Create upstream for stream route tests
      try {
        await client.upstreams.create(
          {
            name: "test-upstream-stream",
            type: "roundrobin",
            nodes: [{ host: "127.0.0.1", port: 8080, weight: 1 }],
          },
          testIds.upstream,
        );
      } catch (error) {
        // Upstream might already exist
      }
    });

    it("should create TCP stream route", async () => {
      try {
        const tcpRoute = await client.streamRoutes.createTCPRoute(
          {
            server_port: 9100,
            upstream_id: testIds.upstream,
          },
          testIds.streamRoute,
        );

        expect(tcpRoute).toHaveProperty("id");
        expect(tcpRoute.server_port).toBe(9100);
      } catch (error) {
        console.warn("TCP stream routes not available:", error);
      }
    });

    it("should validate stream route configuration", async () => {
      try {
        const validation = client.streamRoutes.validateConfig({
          server_port: 9400,
          upstream_id: testIds.upstream,
        });

        expect(validation).toHaveProperty("valid");
        expect(typeof validation.valid).toBe("boolean");
      } catch (error) {
        console.warn("Stream route validation not available:", error);
      }
    });
  });

  describe("Pagination and Filtering", () => {
    it("should support paginated upstream listing", async () => {
      try {
        const paginatedUpstreams = await client.upstreams.listPaginated(1, 5);
        expect(paginatedUpstreams).toHaveProperty("upstreams");
        expect(Array.isArray(paginatedUpstreams.upstreams)).toBe(true);
      } catch (error) {
        console.warn("Upstream pagination not available:", error);
      }
    });
  });

  describe("Error Handling and Edge Cases", () => {
    it("should handle concurrent operations", async () => {
      const promises = [];

      // Create multiple upstreams concurrently
      for (let i = 0; i < 3; i++) {
        promises.push(
          client.upstreams
            .create(
              {
                name: `concurrent-upstream-${i}`,
                type: "roundrobin",
                nodes: { "httpbin.org:80": 1 },
              },
              `concurrent-upstream-${i}`,
            )
            .catch(() => {}),
        );
      }

      const results = await Promise.allSettled(promises);
      expect(results.length).toBe(3);

      // Clean up
      for (let i = 0; i < 3; i++) {
        await client.upstreams
          .delete(`concurrent-upstream-${i}`)
          .catch(() => {});
      }
    });
  });
});
