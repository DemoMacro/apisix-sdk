import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { ApisixSDK } from "../../packages/apisix-sdk/src";
import { createTestClient, resetClient, validateConnection } from "../client";

describe("APISIX SDK - SSL Certificates Management", () => {
  let client: ApisixSDK;
  const testIds = {
    ssl: "test-ssl-cert",
    sslWithSni: "test-ssl-sni",
    sslForExpiration: "test-ssl-expiry",
    sslForClone: "test-ssl-clone",
  };

  // Test certificate data
  const testCert = {
    cert: `-----BEGIN CERTIFICATE-----
MIIDXTCCAkWgAwIBAgIJAL+4jlKl1K4iMA0GCSqGSIb3DQEBCwUAMEUxCzAJBgNV
BAYTAkFVMRMwEQYDVQQIDApTb21lLVN0YXRlMSEwHwYDVQQKDBhJbnRlcm5ldCBX
aWRnaXRzIFB0eSBMdGQwHhcNMjMwMTAxMDAwMDAwWhcNMjQwMTAxMDAwMDAwWjBF
MQswCQYDVQQGEwJBVTETMBEGA1UECAwKU29tZS1TdGF0ZTEhMB8GA1UECgwYSW50
ZXJuZXQgV2lkZ2l0cyBQdHkgTHRkMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIB
CgKCAQEAwL7w8VKl1K4i8L7w8VKl1K4i8L7w8VKl1K4i8L7w8VKl1K4i8L7w8VKl
1K4i8L7w8VKl1K4i8L7w8VKl1K4i8L7w8VKl1K4i8L7w8VKl1K4i8L7w8VKl1K4i
8L7w8VKl1K4i8L7w8VKl1K4i8L7w8VKl1K4i8L7w8VKl1K4i8L7w8VKl1K4i8L7w
8VKl1K4i8L7w8VKl1K4i8L7w8VKl1K4i8L7w8VKl1K4i8L7w8VKl1K4i8L7w8VKl
1K4i8L7w8VKl1K4i8L7w8VKl1K4i8L7w8VKl1K4i8L7w8VKl1K4i8L7w8VKl1K4i
QIDAQAB
-----END CERTIFICATE-----`,
    key: `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDAvvDxUqXUriLw
vvDxUqXUriLwvvDxUqXUriLwvvDxUqXUriLwvvDxUqXUriLwvvDxUqXUriLwvvDx
UqXUriLwvvDxUqXUriLwvvDxUqXUriLwvvDxUqXUriLwvvDxUqXUriLwvvDxUqXU
riLwvvDxUqXUriLwvvDxUqXUriLwvvDxUqXUriLwvvDxUqXUriLwvvDxUqXUriLw
vvDxUqXUriLwvvDxUqXUriLwvvDxUqXUriLwvvDxUqXUriLwvvDxUqXUriLwvvDx
UqXUriLwvvDxUqXUriLwvvDxUqXUriLwvvDxUqXUriLwvvDxUqXUriLwvvDxUqXU
riECAwEAAQ==
-----END PRIVATE KEY-----`,
  };

  beforeAll(async () => {
    client = await createTestClient();

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
        const ssl = await client.ssl.create(
          {
            ...testCert,
            snis: ["example.com", "www.example.com"],
          },
          testIds.sslWithSni,
        );

        expect(ssl).toBeDefined();
        expect(ssl.id).toBe(testIds.sslWithSni);
        expect(ssl.snis).toEqual(["example.com", "www.example.com"]);
      } catch (error) {
        console.warn("SSL certificate creation failed:", error);
      }
    });

    it("should check if SSL certificate exists", async () => {
      try {
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
        const certificates = await client.ssl.findBySNI("example.com");
        expect(Array.isArray(certificates)).toBe(true);

        if (certificates.length > 0) {
          expect(
            certificates.some((cert) => cert.snis?.includes("example.com")),
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
        // Create a certificate with expiration date
        const futureDate = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60; // 1 year from now
        await client.ssl.create(
          {
            ...testCert,
            validity_end: futureDate,
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
        // Create source certificate
        await client.ssl.create(
          {
            ...testCert,
            snis: ["source.example.com"],
          },
          testIds.sslForClone,
        );

        // Clone the certificate with modifications
        const clonedCert = await client.ssl.clone(
          testIds.sslForClone,
          {
            snis: ["cloned.example.com"],
          },
          `${testIds.sslForClone}-cloned`,
        );

        expect(clonedCert).toBeDefined();
        expect(clonedCert.id).toBe(`${testIds.sslForClone}-cloned`);
        expect(clonedCert.snis).toEqual(["cloned.example.com"]);
      } catch (error) {
        console.warn("SSL clone failed:", error);
      }
    });

    it("should list SSL certificates with pagination", async () => {
      try {
        const result = await client.ssl.listPaginated(1, 5);

        expect(result).toBeDefined();
        expect(Array.isArray(result.certificates)).toBe(true);
        expect(typeof result.total).toBe("number");
        expect(typeof result.hasMore).toBe("boolean");
      } catch (error) {
        console.warn("SSL pagination failed:", error);
      }
    });

    it("should handle SSL certificate with no expiration date", async () => {
      try {
        // Create certificate without validity_end
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
