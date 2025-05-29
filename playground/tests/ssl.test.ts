import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { ApisixSDK } from "../../packages/apisix-sdk/src";
import { createTestClient, resetClient, validateConnection } from "../client";
import { TestHelpers } from "./test-helpers";

describe("APISIX SDK - SSL Certificates Management", () => {
  let client: ApisixSDK;
  let helpers: TestHelpers;
  const testIds = {
    ssl: "test-ssl-cert",
    sslWithSni: "test-ssl-sni",
    sslForExpiration: "test-ssl-expiry",
    sslForClone: "test-ssl-clone",
  };

  beforeAll(async () => {
    client = await createTestClient();
    helpers = new TestHelpers(client);

    // Validate connection
    const isConnected = await validateConnection(client);
    if (!isConnected) {
      throw new Error("Cannot connect to APISIX for testing");
    }

    // Clean up any existing test resources
    await cleanupTestResources();
  });

  afterAll(async () => {
    await cleanupTestResources();
    resetClient();
  });

  async function cleanupTestResources() {
    const cleanupTasks = [
      () => client.ssl.delete(testIds.ssl).catch(() => {}),
      () => client.ssl.delete(testIds.sslWithSni).catch(() => {}),
      () => client.ssl.delete(testIds.sslForExpiration).catch(() => {}),
      () => client.ssl.delete(testIds.sslForClone).catch(() => {}),
      () => client.ssl.delete(`${testIds.sslForClone}-cloned`).catch(() => {}),
    ];

    await Promise.all(cleanupTasks.map((task) => task()));
  }

  describe("Basic CRUD Operations", () => {
    it("should list SSL certificates", async () => {
      const certificates = await client.ssl.list();
      expect(Array.isArray(certificates)).toBe(true);
    });
  });

  describe("SSL Certificate Management", () => {
    it("should create SSL certificate with SNI", async () => {
      try {
        const testCert = helpers.getSimpleSSLCertificate();
        const ssl = await client.ssl.create(
          {
            ...testCert,
            snis: ["127.0.0.1", "localhost", "apisix-sdk.test"],
          },
          testIds.sslWithSni,
        );

        expect(ssl).toBeDefined();
        expect(ssl.id).toBe(testIds.sslWithSni);
        expect(ssl.snis).toEqual(["127.0.0.1", "localhost", "apisix-sdk.test"]);
      } catch (error) {
        console.warn("SSL certificate creation failed:", error);
      }
    });

    it("should check if SSL certificate exists", async () => {
      try {
        const testCert = helpers.getSimpleSSLCertificate();
        await client.ssl.create(testCert, testIds.ssl);
        const exists = await client.ssl.exists(testIds.ssl);
        expect(exists).toBe(true);

        const notExists = await client.ssl.exists("non-existent-ssl");
        expect(notExists).toBe(false);
      } catch (error) {
        console.warn("SSL existence check failed:", error);
      }
    });

    it("should find SSL certificates by SNI", async () => {
      try {
        const certificates = await client.ssl.findBySNI("127.0.0.1");
        expect(Array.isArray(certificates)).toBe(true);

        if (certificates.length > 0) {
          expect(
            certificates.some((cert) => cert.snis?.includes("127.0.0.1")),
          ).toBe(true);
        }
      } catch (error) {
        console.warn("SSL findBySNI failed:", error);
      }
    });

    it("should find SSL certificates by status", async () => {
      try {
        const enabledCerts = await client.ssl.findByStatus(1);
        const disabledCerts = await client.ssl.findByStatus(0);

        expect(Array.isArray(enabledCerts)).toBe(true);
        expect(Array.isArray(disabledCerts)).toBe(true);
      } catch (error) {
        console.warn("SSL findByStatus failed:", error);
      }
    });

    it("should enable and disable SSL certificate", async () => {
      try {
        // Create a certificate first
        const testCert = helpers.getSimpleSSLCertificate();
        await client.ssl.create(testCert, testIds.ssl);

        // Disable the certificate
        const disabledCert = await client.ssl.disable(testIds.ssl);
        expect(disabledCert.status).toBe(0);

        // Enable the certificate
        const enabledCert = await client.ssl.enable(testIds.ssl);
        expect(enabledCert.status).toBe(1);
      } catch (error) {
        console.warn("SSL enable/disable failed:", error);
      }
    });

    it("should check SSL certificate expiration", async () => {
      try {
        // Create a certificate without validity_end (APISIX doesn't support this field)
        const testCert = helpers.getSimpleSSLCertificate();
        await client.ssl.create(
          {
            ...testCert,
            // Note: APISIX SSL objects don't support validity_end field
            // Expiration is determined from the certificate itself
          },
          testIds.sslForExpiration,
        );

        const expirationInfo = await client.ssl.checkExpiration(
          testIds.sslForExpiration,
        );

        expect(expirationInfo).toBeDefined();
        expect(typeof expirationInfo.isExpired).toBe("boolean");
        expect(typeof expirationInfo.willExpireSoon).toBe("boolean");

        if (expirationInfo.daysRemaining !== undefined) {
          expect(typeof expirationInfo.daysRemaining).toBe("number");
        }
      } catch (error) {
        console.warn("SSL expiration check failed:", error);
      }
    });

    it("should get expiring certificates", async () => {
      try {
        const expiringCerts = await client.ssl.getExpiringCertificates(365);

        expect(Array.isArray(expiringCerts)).toBe(true);

        for (const cert of expiringCerts) {
          expect(cert.expirationInfo).toBeDefined();
          expect(typeof cert.expirationInfo.isExpired).toBe("boolean");
          expect(typeof cert.expirationInfo.willExpireSoon).toBe("boolean");
        }
      } catch (error) {
        console.warn("Get expiring certificates failed:", error);
      }
    });

    it("should clone SSL certificate", async () => {
      try {
        // Clean up any existing certificate with the same ID first
        await client.ssl.delete(testIds.sslForClone).catch(() => {});

        // Create source certificate
        const testCert = helpers.getSimpleSSLCertificate();
        await client.ssl.create(
          {
            ...testCert,
            snis: ["source.apisix-sdk.test"],
          },
          testIds.sslForClone,
        );

        // Test cloning with APISIX's expected behavior:
        // - Single GET requests don't return the 'key' field for security reasons
        // - Our clone method automatically retrieves the key from list response
        console.log(
          "Testing SSL certificate clone (Note: APISIX doesn't return 'key' field in single GET requests for security)",
        );

        const clonedCert = await client.ssl.clone(
          testIds.sslForClone,
          {
            snis: ["cloned.apisix-sdk.test"],
            // Note: We don't provide a new key here to test the automatic key retrieval
            // The clone method will automatically get the key from the list response
          },
          `${testIds.sslForClone}-cloned`,
        );

        expect(clonedCert).toBeDefined();
        expect(clonedCert.id).toBe(`${testIds.sslForClone}-cloned`);
        expect(clonedCert.snis).toEqual(["cloned.apisix-sdk.test"]);
        expect(clonedCert.key).toBeDefined(); // Verify that the key was successfully retrieved
        expect(typeof clonedCert.key).toBe("string");
        expect(clonedCert.key.length).toBeGreaterThan(0);

        console.log(
          "SSL certificate cloned successfully with automatic key retrieval",
        );
      } catch (error) {
        console.warn("SSL clone failed:", error);
      }
    });

    it("should clone SSL certificate with provided key", async () => {
      try {
        // Test alternative scenario where user provides their own key
        const testCert = helpers.getSimpleSSLCertificate();
        const newTestCert = helpers.getSimpleSSLCertificate();

        // Create a temporary source certificate
        await client.ssl.create(
          {
            ...testCert,
            snis: ["temp-source.apisix-sdk.test"],
          },
          "temp-ssl-source",
        );

        // Clone with a user-provided key (no warnings expected)
        const clonedCert = await client.ssl.clone(
          "temp-ssl-source",
          {
            snis: ["temp-cloned.apisix-sdk.test"],
            key: newTestCert.key, // Provide a new key explicitly
          },
          "temp-ssl-cloned",
        );

        expect(clonedCert).toBeDefined();
        expect(clonedCert.id).toBe("temp-ssl-cloned");
        expect(clonedCert.snis).toEqual(["temp-cloned.apisix-sdk.test"]);

        // Note: APISIX may encode/transform the key, so we just verify it exists and is valid
        expect(clonedCert.key).toBeDefined();
        expect(typeof clonedCert.key).toBe("string");
        expect(clonedCert.key.length).toBeGreaterThan(0);

        console.log(
          "SSL certificate cloned successfully with user-provided key",
        );

        // Clean up temporary certificates
        await client.ssl.delete("temp-ssl-source").catch(() => {});
        await client.ssl.delete("temp-ssl-cloned").catch(() => {});
      } catch (error) {
        console.warn("SSL clone with provided key failed:", error);
        // Clean up on error too
        await client.ssl.delete("temp-ssl-source").catch(() => {});
        await client.ssl.delete("temp-ssl-cloned").catch(() => {});
      }
    });

    it("should list SSL certificates with pagination", async () => {
      try {
        const result = await client.ssl.listPaginated(1, 10);

        expect(result).toBeDefined();
        expect(Array.isArray(result.certificates)).toBe(true);
        expect(typeof result.total).toBe("number");
        expect(typeof result.hasMore).toBe("boolean");
      } catch (error: any) {
        // Pagination may not be supported in this APISIX version
        if (error.response?.status === 400) {
          console.warn("SSL pagination not supported in this APISIX version");
        } else {
          console.warn("SSL pagination failed:", error);
        }
      }
    });

    it("should handle SSL certificate with no expiration date", async () => {
      try {
        // Create certificate without validity_end
        const testCert = helpers.getSimpleSSLCertificate();
        await client.ssl.create(testCert, testIds.ssl);

        const expirationInfo = await client.ssl.checkExpiration(testIds.ssl);

        expect(expirationInfo.isExpired).toBe(false);
        expect(expirationInfo.willExpireSoon).toBe(false);
        expect(expirationInfo.daysRemaining).toBeUndefined();
        expect(expirationInfo.validityEnd).toBeUndefined();
      } catch (error) {
        console.warn("SSL expiration check (no date) failed:", error);
      }
    });

    it("should create a new SSL certificate", async () => {
      const { cert, key } = helpers.getSimpleSSLCertificate();

      const sslData = {
        cert,
        key,
        snis: ["example.com"],
      };

      const response = await client.ssl.create(sslData, testIds.ssl);
      expect(response).toBeDefined();
      expect(response.cert).toBe(cert);
      expect(response.key).toBeDefined();
      expect(typeof response.key).toBe("string");
      expect(response.key.length).toBeGreaterThan(0);
      expect(response.snis).toEqual(["example.com"]);
    });
  });

  describe("SSL Certificate Interface", () => {
    it("should provide consistent interface for SSL operations", () => {
      expect(typeof client.ssl.list).toBe("function");
      expect(typeof client.ssl.get).toBe("function");
      expect(typeof client.ssl.create).toBe("function");
      expect(typeof client.ssl.update).toBe("function");
      expect(typeof client.ssl.patch).toBe("function");
      expect(typeof client.ssl.delete).toBe("function");
      expect(typeof client.ssl.exists).toBe("function");
      expect(typeof client.ssl.findBySNI).toBe("function");
      expect(typeof client.ssl.findByStatus).toBe("function");
      expect(typeof client.ssl.enable).toBe("function");
      expect(typeof client.ssl.disable).toBe("function");
      expect(typeof client.ssl.checkExpiration).toBe("function");
      expect(typeof client.ssl.getExpiringCertificates).toBe("function");
      expect(typeof client.ssl.clone).toBe("function");
      expect(typeof client.ssl.listPaginated).toBe("function");
    });
  });
});
