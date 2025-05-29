import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { ApisixSDK } from "../../packages/apisix-sdk/src";
import { createTestClient, resetClient } from "../client";
import { TestHelpers } from "./test-helpers";

describe("APISIX SDK - Credentials Management", () => {
  let client: ApisixSDK;
  let helpers: TestHelpers;

  // Test consumer for credentials
  const testConsumer = {
    username: "test_consumer_for_credentials",
  };

  // Test IDs for cleanup
  const testIds = {
    keyAuthCred: "test-key-auth-credential",
    basicAuthCred: "test-basic-auth-credential",
    jwtCred: "test-jwt-credential",
  };

  beforeAll(async () => {
    client = await createTestClient();
    helpers = new TestHelpers(client);

    // Skip all tests if credentials not supported
    const isSupported = !(await helpers.skipIfUnsupported("credentials"));
    if (!isSupported) {
      console.log("Skipping credentials tests - not supported in this version");
      return;
    }

    // Create test consumer first
    try {
      await client.consumers.create(testConsumer);
    } catch (error) {
      // Consumer might already exist
      console.warn("Test consumer creation failed:", error);
    }

    // Clean up any existing test resources
    await cleanupTestResources();
  });

  afterAll(async () => {
    await cleanupTestResources();

    // Clean up test consumer
    try {
      await client.consumers.delete(testConsumer.username);
    } catch (error) {
      console.warn("Test consumer cleanup failed:", error);
    }

    resetClient();
  });

  async function cleanupTestResources() {
    const cleanupTasks = [
      () =>
        client.credentials
          .delete(testConsumer.username, testIds.keyAuthCred)
          .catch(() => {}),
      () =>
        client.credentials
          .delete(testConsumer.username, testIds.basicAuthCred)
          .catch(() => {}),
      () =>
        client.credentials
          .delete(testConsumer.username, testIds.jwtCred)
          .catch(() => {}),
    ];

    await Promise.all(cleanupTasks.map((task) => task()));
  }

  describe("Key Authentication Credentials", () => {
    it("should create key-auth credential", async () => {
      await helpers.conditionalTest("credentials", async () => {
        const credential = await client.credentials.create(
          testConsumer.username,
          {
            plugins: {
              "key-auth": {
                key: "test-api-key-123",
              },
            },
          },
          testIds.keyAuthCred,
        );

        expect(credential).toBeDefined();
        expect(credential.id).toBe(testIds.keyAuthCred);
        expect(credential.plugins?.["key-auth"]).toBeDefined();
      });
    });

    it("should get key-auth credential by id", async () => {
      await helpers.conditionalTest("credentials", async () => {
        const credential = await client.credentials.get(
          testConsumer.username,
          testIds.keyAuthCred,
        );

        expect(credential).toBeDefined();
        expect(credential.id).toBe(testIds.keyAuthCred);
        expect(credential.plugins?.["key-auth"]).toBeDefined();
      });
    });

    it("should update key-auth credential", async () => {
      await helpers.conditionalTest("credentials", async () => {
        const updated = await client.credentials.update(
          testConsumer.username,
          testIds.keyAuthCred,
          {
            plugins: {
              "key-auth": {
                key: "updated-api-key-456",
              },
            },
          },
        );

        expect(updated.plugins?.["key-auth"]).toBeDefined();
        expect((updated.plugins?.["key-auth"] as any).key).toBeTruthy();
        expect(typeof (updated.plugins?.["key-auth"] as any).key).toBe(
          "string",
        );
      });
    });
  });

  describe("Basic Authentication Credentials", () => {
    it("should create basic-auth credential", async () => {
      await helpers.conditionalTest("credentials", async () => {
        const credential = await client.credentials.create(
          testConsumer.username,
          {
            plugins: {
              "basic-auth": {
                username: "testuser",
                password: "testpass123",
              },
            },
          },
          testIds.basicAuthCred,
        );

        expect(credential).toBeDefined();
        expect(credential.id).toBe(testIds.basicAuthCred);
        expect(credential.plugins?.["basic-auth"]).toBeDefined();
      });
    });

    it("should get basic-auth credential by id", async () => {
      await helpers.conditionalTest("credentials", async () => {
        const credential = await client.credentials.get(
          testConsumer.username,
          testIds.basicAuthCred,
        );

        expect(credential).toBeDefined();
        expect(credential.id).toBe(testIds.basicAuthCred);
        expect(credential.plugins?.["basic-auth"]).toBeDefined();
      });
    });
  });

  describe("JWT Authentication Credentials", () => {
    it("should create jwt-auth credential", async () => {
      await helpers.conditionalTest("credentials", async () => {
        const credential = await client.credentials.create(
          testConsumer.username,
          {
            plugins: {
              "jwt-auth": {
                key: "jwt-test-key",
                secret: "jwt-test-secret",
              },
            },
          },
          testIds.jwtCred,
        );

        expect(credential).toBeDefined();
        expect(credential.id).toBe(testIds.jwtCred);
        expect(credential.plugins?.["jwt-auth"]).toBeDefined();
      });
    });

    it("should get jwt-auth credential by id", async () => {
      await helpers.conditionalTest("credentials", async () => {
        const credential = await client.credentials.get(
          testConsumer.username,
          testIds.jwtCred,
        );

        expect(credential).toBeDefined();
        expect(credential.id).toBe(testIds.jwtCred);
        expect(credential.plugins?.["jwt-auth"]).toBeDefined();
      });
    });
  });

  describe("Basic CRUD Operations", () => {
    it("should list credentials", async () => {
      await helpers.conditionalTest("credentials", async () => {
        const credentials = await client.credentials.list(
          testConsumer.username,
        );

        expect(Array.isArray(credentials)).toBe(true);
        expect(credentials.length).toBeGreaterThan(0);
        expect(credentials.some((c) => c.id === testIds.keyAuthCred)).toBe(
          true,
        );
      });
    });

    it("should check if credential exists", async () => {
      await helpers.conditionalTest("credentials", async () => {
        const exists = await client.credentials.exists(
          testConsumer.username,
          testIds.keyAuthCred,
        );
        expect(exists).toBe(true);

        const notExists = await client.credentials.exists(
          testConsumer.username,
          "non-existent-credential",
        );
        expect(notExists).toBe(false);
      });
    });

    it("should partially update credential", async () => {
      await helpers.conditionalTest("credentials", async () => {
        const patched = await client.credentials.patch(
          testConsumer.username,
          testIds.keyAuthCred,
          {
            plugins: {
              "key-auth": {
                key: "patched-api-key-789",
              },
            },
          },
        );

        expect(patched.plugins?.["key-auth"]).toBeDefined();
        // APISIX returns the original key value in GET responses
        expect((patched.plugins?.["key-auth"] as any).key).toBe(
          "patched-api-key-789",
        );
      });
    });
  });

  describe("Error Handling", () => {
    it("should handle non-existent credential operations", async () => {
      await helpers.conditionalTest("credentials", async () => {
        // Get non-existent credential should throw
        await expect(
          client.credentials.get(
            testConsumer.username,
            "non-existent-credential",
          ),
        ).rejects.toThrow();

        // Update non-existent credential in APISIX creates a new one rather than throwing
        const created = await client.credentials.update(
          testConsumer.username,
          "non-existent-credential",
          {
            plugins: {
              "key-auth": {
                key: "test-key",
              },
            },
          },
        );

        // Should successfully create the credential
        expect(created).toBeDefined();
        expect(created.id).toBe("non-existent-credential");

        // Clean up
        await client.credentials
          .delete(testConsumer.username, "non-existent-credential")
          .catch(() => {});
      });
    });

    it("should delete all test credentials", async () => {
      await helpers.conditionalTest("credentials", async () => {
        const deleteResults = await Promise.allSettled([
          client.credentials.delete(testConsumer.username, testIds.keyAuthCred),
          client.credentials.delete(
            testConsumer.username,
            testIds.basicAuthCred,
          ),
          client.credentials.delete(testConsumer.username, testIds.jwtCred),
        ]);

        // At least some deletions should succeed
        const successfulDeletions = deleteResults.filter(
          (result) => result.status === "fulfilled",
        );
        expect(successfulDeletions.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Interface Consistency", () => {
    it("should provide consistent interface for credential operations", () => {
      expect(typeof client.credentials.list).toBe("function");
      expect(typeof client.credentials.get).toBe("function");
      expect(typeof client.credentials.create).toBe("function");
      expect(typeof client.credentials.update).toBe("function");
      expect(typeof client.credentials.patch).toBe("function");
      expect(typeof client.credentials.delete).toBe("function");
      expect(typeof client.credentials.exists).toBe("function");
    });
  });
});
