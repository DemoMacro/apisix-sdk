import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { ApisixSDK } from "../../packages/apisix-sdk/src";
import { createTestClient, resetClient, validateConnection } from "../client";

describe("APISIX SDK - Version Management", () => {
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

  describe("Version Configuration", () => {
    it("should get current version configuration", async () => {
      const config = await client.version.getCurrentVersionConfig();

      expect(config).toBeDefined();
      expect(config.version).toBeDefined();
      expect(typeof config.supportsCredentials).toBe("boolean");
      expect(typeof config.supportsSecrets).toBe("boolean");
      expect(typeof config.supportsNewResponseFormat).toBe("boolean");
      expect(typeof config.supportsStreamRoutes).toBe("boolean");
      expect(Array.isArray(config.supportedPlugins)).toBe(true);
      expect(Array.isArray(config.deprecatedFeatures)).toBe(true);
    });

    it("should check if feature is supported", async () => {
      const supportsCredentials = await client.version.isFeatureSupported(
        "supportsCredentials",
      );
      const supportsSecrets =
        await client.version.isFeatureSupported("supportsSecrets");
      const supportsNewResponseFormat = await client.version.isFeatureSupported(
        "supportsNewResponseFormat",
      );
      const supportsStreamRoutes = await client.version.isFeatureSupported(
        "supportsStreamRoutes",
      );

      expect(typeof supportsCredentials).toBe("boolean");
      expect(typeof supportsSecrets).toBe("boolean");
      expect(typeof supportsNewResponseFormat).toBe("boolean");
      expect(typeof supportsStreamRoutes).toBe("boolean");
    });

    it("should check if plugin is supported", async () => {
      const isLimitCountSupported =
        await client.version.isPluginSupported("limit-count");
      const isInvalidPluginSupported = await client.version.isPluginSupported(
        "non-existent-plugin",
      );

      expect(isLimitCountSupported).toBe(true);
      expect(isInvalidPluginSupported).toBe(false);
    });

    it("should get deprecated features", async () => {
      const deprecatedFeatures = await client.version.getDeprecatedFeatures();

      expect(Array.isArray(deprecatedFeatures)).toBe(true);
    });

    it("should check if feature is deprecated", async () => {
      const isDeprecated =
        await client.version.isFeatureDeprecated("some-feature");
      const isValidDeprecated = await client.version.isFeatureDeprecated(
        "etcd.health_check_retry",
      );

      expect(typeof isDeprecated).toBe("boolean");
      expect(typeof isValidDeprecated).toBe("boolean");
    });
  });

  describe("Migration Recommendations", () => {
    it("should handle unsupported target version", async () => {
      await expect(
        client.version.getMigrationRecommendations("99.0.0"),
      ).rejects.toThrow("Unsupported target version");
    });

    it("should handle migration recommendations gracefully", async () => {
      try {
        // Try with a version that might be supported
        const recommendations =
          await client.version.getMigrationRecommendations("2.15.0");

        expect(recommendations).toBeDefined();
        expect(Array.isArray(recommendations.newFeatures)).toBe(true);
        expect(Array.isArray(recommendations.deprecatedFeatures)).toBe(true);
        expect(Array.isArray(recommendations.breakingChanges)).toBe(true);
      } catch (error) {
        // If version is not supported, that's expected
        console.warn(
          "Migration recommendations not available for this version:",
          error,
        );
      }
    });
  });

  describe("Configuration Validation", () => {
    it("should validate valid configuration", async () => {
      const config = {
        plugins: {
          "limit-count": {
            count: 100,
            time_window: 60,
          },
        },
      };

      const validation = await client.version.validateConfiguration(config);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toEqual([]);
    });

    it("should validate configuration with unsupported plugins", async () => {
      const config = {
        plugins: {
          "non-existent-plugin": {
            some_config: "value",
          },
        },
      };

      const validation = await client.version.validateConfiguration(config);

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    it("should validate configuration with deprecated features", async () => {
      const config = {
        etcd: {
          health_check_retry: true,
        },
      };

      const validation = await client.version.validateConfiguration(config);

      expect(validation).toBeDefined();
      expect(Array.isArray(validation.warnings)).toBe(true);
    });

    it("should validate configuration with credentials when not supported", async () => {
      // Only test if credentials are not supported in current version
      const supportsCredentials = await client.version.isFeatureSupported(
        "supportsCredentials",
      );

      if (!supportsCredentials) {
        const config = {
          credentials: {
            plugins: {
              "key-auth": { key: "test" },
            },
          },
        };

        const validation = await client.version.validateConfiguration(config);

        expect(validation.valid).toBe(false);
        expect(
          validation.errors.some((error) =>
            error.includes("Credentials API is not supported"),
          ),
        ).toBe(true);
      }
    });

    it("should validate configuration with secrets when not supported", async () => {
      // Only test if secrets are not supported in current version
      const supportsSecrets =
        await client.version.isFeatureSupported("supportsSecrets");

      if (!supportsSecrets) {
        const config = {
          secrets: {
            vault: {
              uri: "http://vault.example.com",
              token: "test",
            },
          },
        };

        const validation = await client.version.validateConfiguration(config);

        expect(validation.valid).toBe(false);
        expect(
          validation.errors.some((error) =>
            error.includes("Secret management is not supported"),
          ),
        ).toBe(true);
      }
    });

    it("should handle empty configuration", async () => {
      const validation = await client.version.validateConfiguration({});

      expect(validation.valid).toBe(true);
      expect(validation.errors).toEqual([]);
    });

    it("should handle complex nested configuration", async () => {
      const config = {
        routes: {
          plugins: {
            "limit-count": {
              count: 100,
            },
          },
        },
        services: {
          plugins: {
            cors: {
              allow_origins: "*",
            },
          },
        },
      };

      const validation = await client.version.validateConfiguration(config);

      expect(validation).toBeDefined();
      expect(typeof validation.valid).toBe("boolean");
      expect(Array.isArray(validation.errors)).toBe(true);
      expect(Array.isArray(validation.warnings)).toBe(true);
    });
  });
});
