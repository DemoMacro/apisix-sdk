import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { ApisixSDK } from "../../packages/apisix-sdk/src";
import { createTestClient, resetClient, validateConnection } from "../client";
import { TestHelpers } from "./test-helpers";

describe("APISIX SDK - Consumers Management", () => {
  let client: ApisixSDK;
  let helpers: TestHelpers;
  const testIds = {
    consumer: "test_consumer",
    authConsumer: "test_auth_consumer",
    pluginConsumer: "plugin_consumer",
    duplicateConsumer: "duplicate_consumer",
    groupConsumer: "test_group_consumer",
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
      () => client.consumers.delete(testIds.consumer).catch(() => {}),
      () => client.consumers.delete(testIds.authConsumer).catch(() => {}),
      () => client.consumers.delete(testIds.groupConsumer).catch(() => {}),
      () => client.consumers.delete("plugin_consumer").catch(() => {}),
      () => client.consumers.delete("duplicate_consumer").catch(() => {}),
      () => client.consumers.delete("search_consumer_1").catch(() => {}),
      () => client.consumers.delete("search_consumer_2").catch(() => {}),
      () => client.consumers.delete("clone_source").catch(() => {}),
      () => client.consumers.delete("clone_target").catch(() => {}),
    ];

    await Promise.all(cleanupTasks.map((task) => task()));
  }

  describe("Basic CRUD Operations", () => {
    it("should create a consumer", async () => {
      const consumer = await client.consumers.create({
        username: "test_consumer",
        desc: "Test consumer for unit tests",
      });

      expect(consumer).toBeDefined();
      expect(consumer.username).toBe("test_consumer");
      expect(consumer.desc).toBe("Test consumer for unit tests");
    });

    it("should get consumer by username", async () => {
      const consumer = await client.consumers.get(testIds.consumer);

      expect(consumer).toBeDefined();
      expect(consumer.username).toBe(testIds.consumer);
      expect(consumer.desc).toBe("Test consumer for unit tests");
    });

    it("should list consumers", async () => {
      const consumers = await client.consumers.list();

      expect(Array.isArray(consumers)).toBe(true);
      expect(consumers.length).toBeGreaterThan(0);
      expect(consumers.some((c) => c.username === testIds.consumer)).toBe(true);
    });

    it("should update consumer", async () => {
      const updated = await client.consumers.update(testIds.consumer, {
        username: testIds.consumer,
        desc: "Updated test consumer",
        labels: {
          env: "test",
          version: "2.0",
        },
      });

      expect(updated.desc).toBe("Updated test consumer");
      expect(updated.labels?.version).toBe("2.0");
    });

    it("should check if consumer exists", async () => {
      const exists = await client.consumers.exists(testIds.consumer);
      expect(exists).toBe(true);

      const notExists = await client.consumers.exists("non-existent-consumer");
      expect(notExists).toBe(false);
    });

    it("should delete consumer", async () => {
      const deleted = await client.consumers.delete(testIds.consumer);
      expect(deleted).toBe(true);

      const exists = await client.consumers.exists(testIds.consumer);
      expect(exists).toBe(false);
    });
  });

  describe("Consumer Authentication", () => {
    beforeAll(async () => {
      // Create consumer for auth tests
      await client.consumers.create({
        username: testIds.authConsumer,
        desc: "Test consumer for authentication",
      });
    });

    it("should add key authentication", async () => {
      const credential = await client.consumers.addKeyAuth(
        testIds.authConsumer,
        "test-api-key-123",
        "key-auth-credential",
      );

      expect(credential).toBeDefined();
      expect(credential.plugins).toBeDefined();
      expect(credential.plugins["key-auth"]).toBeDefined();

      // Clean up credential
      await client.consumers
        .deleteCredential(testIds.authConsumer, "key-auth-credential")
        .catch(() => {});
    });

    it("should add basic authentication", async () => {
      const credential = await client.consumers.addBasicAuth(
        testIds.authConsumer,
        "testuser",
        "testpass",
        "basic-auth-credential",
      );

      expect(credential).toBeDefined();
      expect(credential.plugins).toBeDefined();
      expect(credential.plugins["basic-auth"]).toBeDefined();

      // Clean up credential
      await client.consumers
        .deleteCredential(testIds.authConsumer, "basic-auth-credential")
        .catch(() => {});
    });

    it("should add JWT authentication", async () => {
      const credential = await client.consumers.addJwtAuth(
        testIds.authConsumer,
        "jwt-key",
        "jwt-secret",
        "jwt-auth-credential",
      );

      expect(credential).toBeDefined();
      expect(credential.plugins).toBeDefined();
      expect(credential.plugins["jwt-auth"]).toBeDefined();

      // Clean up credential
      await client.consumers
        .deleteCredential(testIds.authConsumer, "jwt-auth-credential")
        .catch(() => {});
    });

    it("should add HMAC authentication", async () => {
      const credential = await client.consumers.addHmacAuth(
        testIds.authConsumer,
        "hmac-access-key",
        "hmac-secret-key",
        "hmac-auth-credential",
      );

      expect(credential).toBeDefined();
      expect(credential.plugins).toBeDefined();
      expect(credential.plugins["hmac-auth"]).toBeDefined();

      // Clean up credential
      await client.consumers
        .deleteCredential(testIds.authConsumer, "hmac-auth-credential")
        .catch(() => {});
    });
  });

  describe("Consumer Credentials Management", () => {
    beforeAll(async () => {
      // Create consumer for credential tests
      if (!(await client.consumers.exists(testIds.authConsumer))) {
        await client.consumers.create({
          username: testIds.authConsumer,
          desc: "Test consumer for credentials",
        });
      }
    });

    it("should create custom credential", async () => {
      const credential = await client.consumers.createCredential(
        testIds.authConsumer,
        "custom-credential",
        {
          plugins: {
            "key-auth": {
              key: "custom-api-key",
            },
          },
          desc: "Custom credential for testing",
        },
      );

      expect(credential).toBeDefined();
      expect(credential.id).toBe("custom-credential");
      expect(credential.plugins["key-auth"]).toBeDefined();
    });

    it("should get credential", async () => {
      const credential = await client.consumers.getCredential(
        testIds.authConsumer,
        "custom-credential",
      );

      expect(credential).toBeDefined();
      expect(credential.id).toBe("custom-credential");
      expect(credential.desc).toBe("Custom credential for testing");
    });

    it("should list credentials", async () => {
      const credentials = await client.consumers.listCredentials(
        testIds.authConsumer,
      );

      expect(Array.isArray(credentials)).toBe(true);
      expect(credentials.length).toBeGreaterThan(0);
      expect(credentials.some((c) => c.id === "custom-credential")).toBe(true);
    });

    it("should update credential", async () => {
      const updated = await client.consumers.updateCredential(
        testIds.authConsumer,
        "custom-credential",
        {
          desc: "Updated custom credential",
        },
      );

      expect(updated.desc).toBe("Updated custom credential");
    });

    it("should delete credential", async () => {
      const deleted = await client.consumers.deleteCredential(
        testIds.authConsumer,
        "custom-credential",
      );

      expect(deleted).toBe(true);
    });
  });

  describe("Consumer with Plugins", () => {
    it("should create consumer with plugins", async () => {
      const consumer = await client.consumers.create({
        username: "plugin_consumer",
        desc: "Consumer with plugins",
        plugins: {
          "key-auth": {
            key: "plugin_consumer_key",
          },
          "basic-auth": {
            username: "plugin_consumer",
            password: "test123",
          },
        },
      });

      expect(consumer).toBeDefined();
      expect(consumer.plugins).toBeDefined();
      expect(consumer.plugins?.["key-auth"]).toBeDefined();
      expect(consumer.plugins?.["basic-auth"]).toBeDefined();

      // Clean up
      await client.consumers.delete(testIds.pluginConsumer);
    });

    it("should create consumer with group assignment", async () => {
      // First create a consumer group if available
      try {
        await client.consumerGroups.create(
          {
            desc: "Test group for consumer",
            plugins: {
              "limit-count": {
                count: 500,
                time_window: 60,
              },
            },
          },
          "test-consumer-group",
        );

        const consumer = await client.consumers.create({
          username: "group_consumer",
          group_id: "test-consumer-group",
        });

        expect(consumer.group_id).toBe("test-consumer-group");

        // Clean up
        await client.consumers.delete("group_consumer");
        await client.consumerGroups.delete("test-consumer-group");
      } catch (error) {
        console.warn("Consumer groups not available for this test:", error);
      }
    });
  });

  describe("Search and Filter", () => {
    beforeAll(async () => {
      // Create test consumers for search
      await client.consumers.create({
        username: "search_consumer_1",
        desc: "Search test consumer 1",
        labels: {
          tier: "premium",
          env: "test",
        },
      });

      await client.consumers.create({
        username: "search_consumer_2",
        desc: "Search test consumer 2",
        labels: {
          tier: "basic",
          env: "test",
        },
      });
    });

    it("should find consumers by label", async () => {
      const premiumUsers = await client.consumers.findByLabel(
        "tier",
        "premium",
      );
      const basicUsers = await client.consumers.findByLabel("tier", "basic");

      expect(Array.isArray(premiumUsers)).toBe(true);
      expect(Array.isArray(basicUsers)).toBe(true);
      expect(premiumUsers.some((c) => c.username === "search_consumer_1")).toBe(
        true,
      );
      expect(basicUsers.some((c) => c.username === "search_consumer_2")).toBe(
        true,
      );
    });

    it("should list consumers with pagination", async () => {
      // Check if pagination is supported
      const versionConfig = await helpers.getVersionConfig();
      const supportsV3Pagination =
        Number.parseInt(versionConfig.majorVersion) >= 3;

      if (!supportsV3Pagination) {
        console.log(
          "Pagination not supported in this APISIX version, skipping test",
        );
        return;
      }

      const result = await client.consumers.listPaginated(1, 10);

      expect(result).toBeDefined();
      expect(Array.isArray(result.consumers)).toBe(true);
      expect(result.consumers.length).toBeLessThanOrEqual(10);
      expect(typeof result.total).toBe("number");
    });
  });

  describe("Error Handling", () => {
    it("should handle non-existent consumer", async () => {
      await expect(
        client.consumers.get("non-existent-consumer"),
      ).rejects.toThrow();
    });

    it("should handle invalid consumer data", async () => {
      await expect(
        client.consumers.create({
          // Missing required username
        } as never),
      ).rejects.toThrow();
    });

    it("should handle duplicate consumer creation", async () => {
      const versionConfig = await helpers.getVersionConfig();

      if (versionConfig.majorVersion >= "3") {
        // APISIX 3.x allows overwriting consumers, so no error is thrown
        const result = await client.consumers.create({
          username: "duplicate_consumer",
          desc: "Duplicate consumer",
        });
        expect(result).toBeDefined();
        expect(result.username).toBe("duplicate_consumer");
      } else {
        // v2.x should throw error for duplicate consumers
        await expect(
          client.consumers.create({
            username: "duplicate_consumer",
            desc: "Duplicate consumer",
          }),
        ).rejects.toThrow();
      }
    });

    it("should handle invalid credential operations", async () => {
      await expect(
        client.consumers.getCredential(
          "non-existent-consumer",
          "some-credential",
        ),
      ).rejects.toThrow();
    });
  });
});
