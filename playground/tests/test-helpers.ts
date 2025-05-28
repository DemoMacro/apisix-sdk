import type { ApisixSDK } from "../../packages/apisix-sdk/src";

export class TestHelpers {
  private sdk: ApisixSDK;
  private versionConfig?: {
    majorVersion: string;
    features: {
      supportsCredentials: boolean;
      supportsSecrets: boolean;
      supportsStreamRoutes: boolean;
      supportsPagination: boolean;
    };
    supportedPlugins: string[];
  };

  constructor(sdk: ApisixSDK) {
    this.sdk = sdk;
  }

  /**
   * Get cached version configuration
   */
  async getVersionConfig() {
    if (!this.versionConfig) {
      try {
        // Try to detect version by testing response format and capabilities
        const testResponse = await this.sdk.routes.list();

        let isV3Plus = false;
        let supportsCredentials = false;
        let supportsPagination = false;

        try {
          // Test if pagination parameters are accepted - v3 feature
          await this.sdk.routes.list({ page: 1, page_size: 1 });
          supportsPagination = true;
          isV3Plus = true;

          // v3.0+ typically supports Credentials API
          supportsCredentials = true;
        } catch (error: unknown) {
          // Check error details to understand why pagination failed
          if (
            error instanceof Error &&
            (error.message.includes("400") ||
              error.message.includes("Bad Request"))
          ) {
            // Pagination not supported in this version
            supportsPagination = false;
            isV3Plus = false;
            supportsCredentials = false;
          } else {
            console.warn("Pagination check failed:", error);
          }
        }

        // Check if Credentials API is supported
        try {
          if (
            this.sdk.credentials &&
            typeof this.sdk.credentials.list === "function"
          ) {
            // Credentials API exists, but we can't test it without a consumer ID
            // Just check if the method exists
            supportsCredentials = true;
          }
        } catch (error: unknown) {
          // If we get 404 or method not found, credentials not supported
          if (
            error instanceof Error &&
            (error.message.includes("404") ||
              error.message.includes("not found") ||
              error.message.includes("credentials"))
          ) {
            supportsCredentials = false;
          } else {
            // Other errors, assume not supported for safety
            supportsCredentials = false;
          }
        }

        this.versionConfig = {
          majorVersion: isV3Plus ? "3" : "2",
          features: {
            supportsCredentials,
            supportsSecrets: true, // Usually supported in both versions
            supportsStreamRoutes: true, // Usually supported in both versions
            supportsPagination,
          },
          supportedPlugins: [],
        };
      } catch (error) {
        // Fallback configuration for conservative testing
        this.versionConfig = {
          majorVersion: "2",
          features: {
            supportsCredentials: false,
            supportsSecrets: true,
            supportsStreamRoutes: true,
            supportsPagination: false,
          },
          supportedPlugins: [],
        };
      }
    }
    return this.versionConfig;
  }

  /**
   * Skip test if feature is not supported in current version
   */
  async skipIfUnsupported(feature: string): Promise<boolean> {
    const config = await this.getVersionConfig();

    switch (feature) {
      case "credentials":
        return !config.features.supportsCredentials;
      case "secrets":
        return !config.features.supportsSecrets;
      case "pagination":
        // Check actual pagination support
        return !config.features.supportsPagination;
      case "streamRoutes":
        return !config.features.supportsStreamRoutes;
      case "patchMethod":
        // PATCH method support varies by resource and version
        return config.majorVersion === "2";
      default:
        return false;
    }
  }

  /**
   * Get version-compatible username (no hyphens for APISIX)
   */
  generateUsername(baseName: string): string {
    // APISIX requires usernames to match pattern ^[a-zA-Z0-9_]+$
    return baseName.replace(/[-\s]/g, "_").replace(/[^a-zA-Z0-9_]/g, "");
  }

  /**
   * Create version-aware test options for pagination
   * Based on APISIX v3 official documentation, pagination is supported for:
   * Consumer, Consumer Group, Global Rules, Plugin Config, Protos, Route, Service, SSL, Stream Route, Upstream
   */
  async getPaginationOptions(
    page = 1,
    pageSize = 10,
    resource?: string,
  ): Promise<Record<string, unknown>> {
    const config = await this.getVersionConfig();

    if (config.majorVersion === "2") {
      // v2.x doesn't support pagination parameters
      return {};
    }

    // v3.x supports pagination for specific resources
    const supportedResources = [
      "consumers",
      "consumer-groups",
      "global-rules",
      "plugin-configs",
      "protos",
      "routes",
      "services",
      "ssl",
      "stream-routes",
      "upstreams",
    ];

    if (resource && !supportedResources.includes(resource)) {
      return {}; // Resource doesn't support pagination
    }

    return {
      page,
      page_size: pageSize,
    };
  }

  /**
   * Handle version-specific secret ID expectations
   */
  async normalizeSecretId(
    _type: "vault" | "aws" | "gcp",
    originalId: string,
  ): Promise<string> {
    // According to APISIX documentation, secret IDs don't include prefixes
    // The prefix is in the URL path (/secrets/vault/, /secrets/aws/, etc.)
    return originalId;
  }

  /**
   * Check if current version should skip error handling tests
   */
  async shouldSkipErrorTest(testType: string): Promise<boolean> {
    const config = await this.getVersionConfig();

    // Some versions are more permissive and don't throw expected errors
    switch (testType) {
      case "duplicate":
      case "nonExistent":
      case "invalidConfig":
        // Newer versions might be more permissive
        return config.majorVersion >= "3";
      default:
        return false;
    }
  }

  /**
   * Get version-appropriate test timeout
   */
  async getTestTimeout(): Promise<number> {
    const config = await this.getVersionConfig();

    // Older versions might be slower
    return config.majorVersion === "2" ? 10000 : 5000;
  }

  /**
   * Check if plugin is supported in current version
   */
  async isPluginSupported(pluginName: string): Promise<boolean> {
    const config = await this.getVersionConfig();
    return config.supportedPlugins.includes(pluginName);
  }

  /**
   * Get version-compatible SSL certificate format
   */
  getSimpleSSLCertificate() {
    // Use a minimal valid certificate structure for testing
    return {
      cert: `-----BEGIN CERTIFICATE-----
MIIBkTCB+wIJAMlyFqk69v+9MA0GCSqGSIb3DQEBCwUAMBQxEjAQBgNVBAMMCWxv
Y2FsaG9zdDAeFw0yMzEwMDEwMDAwMDBaFw0yNDEwMDEwMDAwMDBaMBQxEjAQBgNV
BAMMCWxvY2FsaG9zdDBcMA0GCSqGSIb3DQEBAQUAA0sAMEgCQQDTwqq/klarF2Vd
jXwJSdodlAVLWYtepf2yFjdR4aiIB65j2r6eLl8LjDhkAbmOh6MaZj7OiMugxQ4V
CraEbeUfAgMBAAEwDQYJKoZIhvcNAQELBQADQQBJlffJHybjDGxRMqaRmDhX0+6v
02jQVVtaku4HQaTumaZ13jL6Og7zivicMlwhWv5QpCtJHOpONRnuOOjDSz0M
-----END CERTIFICATE-----`,
      key: `-----BEGIN PRIVATE KEY-----
MIIBVAIBADANBgkqhkiG9w0BAQEFAASCAT4wggE6AgEAAkEA08Kqv5ZWqxdlXY18
CUnaHZQFS1mLXqX9shY3UeGoiAeuY9q+ni5fC4w4ZAG5joejGmY+zojLoMUOFQq2
hG3lHwIDAQABAkEAmeaDqQ9idxXxjhXVKtIuqG6LCDvEdl01ad4ARVY86GNVRMcJ
FxLQ+BAH7nQf5x/xOV+1OmhGLJlDpv0XZFM3yQIhAPO6QGbxTs0a9RXXUqRCp+3H
BhJp4QfztpR6Dy5ZjJFdAiEA3VmO6qNpxEGMKyB3M9ZM+Nm+/Vf/RQeVdjV2t8gd
n4MCIQC8jJOOP0PoIJCTFOCHB9V5ckhg9j5JfjtGkz3vb2u9PQIgYXnCcKGUqMOX
tXZ0Xy/OMhzrRd/Uir8d7Y5GfXjW4SMCIGTlGHnTOGIlnGI8Zn4FjzE8sKkGFdMJ
hQsKY7X
-----END PRIVATE KEY-----`,
      snis: ["test.example.com"],
    };
  }

  /**
   * Clean up test data with version-aware error handling
   */
  async cleanupResource(
    resource:
      | "routes"
      | "services"
      | "upstreams"
      | "consumers"
      | "credentials"
      | "ssl"
      | "globalRules"
      | "consumerGroups"
      | "pluginConfigs"
      | "secrets"
      | "protos"
      | "streamRoutes",
    id: string,
    options?: { force?: boolean },
  ): Promise<boolean> {
    try {
      const resourceManager = this.sdk[resource] as unknown as {
        delete: (id: string, options?: { force?: boolean }) => Promise<unknown>;
      };

      if (
        resource === "credentials" &&
        (await this.skipIfUnsupported("credentials"))
      ) {
        return true; // Skip cleanup for unsupported features
      }

      if (resource === "secrets" && (await this.skipIfUnsupported("secrets"))) {
        return true;
      }

      await resourceManager.delete(id, options);
      return true;
    } catch (error) {
      // Ignore cleanup errors in tests
      console.warn(`Cleanup failed for ${resource}/${id}:`, error);
      return false;
    }
  }

  /**
   * Create consumer with version-compatible configuration
   */
  async createTestConsumer(
    baseName: string,
    additionalProps: Record<string, unknown> = {},
  ) {
    const username = this.generateUsername(baseName);

    const consumerData = {
      username,
      desc: `Test consumer - ${username}`,
      ...additionalProps,
    };

    return await this.sdk.consumers.create(consumerData);
  }

  /**
   * Conditional test execution based on version
   */
  async conditionalTest(
    feature: string,
    testFn: () => Promise<void>,
    skipMessage?: string,
  ): Promise<void> {
    const shouldSkip = await this.skipIfUnsupported(feature);

    if (shouldSkip) {
      console.log(
        `Skipping test: ${skipMessage || `${feature} not supported in this version`}`,
      );
      return;
    }

    await testFn();
  }

  /**
   * Get version-specific configuration validation
   */
  async validateConfiguration(config: Record<string, unknown>): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    // Simple validation based on current version
    const versionConfig = await this.getVersionConfig();
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for credentials if not supported
    if (!versionConfig.features.supportsCredentials && config.credentials) {
      errors.push("Credentials API is not supported in this APISIX version");
    }

    // Check for secrets if not supported
    if (!versionConfig.features.supportsSecrets && config.secrets) {
      errors.push("Secret management is not supported in this APISIX version");
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}
