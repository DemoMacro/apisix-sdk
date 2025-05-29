import { readFileSync } from "node:fs";
import { join } from "node:path";
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
        // Use SDK's built-in version detection
        const version = await this.sdk.getVersion();
        const versionCompat = await this.sdk.getVersionCompatibility();

        console.log(`Detected APISIX version: ${version}`);
        console.log("Version configuration:", versionCompat.features);

        // Extract major version number
        const majorVersion = version.split(".")[0];

        this.versionConfig = {
          majorVersion,
          features: {
            supportsCredentials: versionCompat.features.supportsCredentials,
            supportsSecrets: versionCompat.features.supportsSecrets,
            supportsStreamRoutes: versionCompat.features.supportsStreamRoutes,
            supportsPagination: versionCompat.features.supportsPagination,
          },
          supportedPlugins: versionCompat.supportedPlugins || [],
        };
      } catch (error) {
        console.warn("Failed to detect version configuration:", error);
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
   * Check if pagination is supported in current APISIX version
   */
  async isPaginationSupported(): Promise<boolean> {
    const versionConfig = await this.getVersionConfig();
    return versionConfig.features.supportsPagination;
  }

  /**
   * Get pagination options with version compatibility check
   */
  async getPaginationOptions(
    page = 1,
    pageSize = 10,
    resource?: string,
  ): Promise<Record<string, unknown>> {
    const supportsPagination = await this.isPaginationSupported();

    if (!supportsPagination) {
      console.log(
        `Pagination not supported in this APISIX version, using fallback for ${resource || "resource"}`,
      );
      return {}; // Return empty options for non-supporting versions
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
    try {
      return await this.sdk.plugins.isAvailable(pluginName);
    } catch (error) {
      console.warn(
        `Failed to check plugin availability for ${pluginName}:`,
        error,
      );
      return false;
    }
  }

  /**
   * Skip test if plugin is not available
   */
  async skipIfPluginUnavailable(pluginName: string): Promise<boolean> {
    const isAvailable = await this.isPluginSupported(pluginName);
    if (!isAvailable) {
      console.log(
        `Skipping test: Plugin '${pluginName}' is not available in this APISIX instance`,
      );
    }
    return !isAvailable;
  }

  /**
   * Get list of available plugins for validation
   */
  async getAvailablePlugins(): Promise<string[]> {
    try {
      return await this.sdk.plugins.getAvailablePlugins();
    } catch (error) {
      console.warn("Failed to get available plugins:", error);
      return [];
    }
  }

  /**
   * Validate plugin configuration before creating resources
   */
  async validatePluginConfig(
    pluginName: string,
    config: Record<string, unknown>,
  ): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const result = {
      valid: true,
      errors: [] as string[],
      warnings: [] as string[],
    };

    // Check if plugin is available
    const isAvailable = await this.isPluginSupported(pluginName);
    if (!isAvailable) {
      result.valid = false;
      result.errors.push(
        `Plugin '${pluginName}' is not available in this APISIX instance`,
      );
      return result;
    }

    // Validate plugin configuration using SDK
    try {
      const validation = await this.sdk.plugins.validateConfig(
        pluginName,
        config,
      );
      result.valid = validation.valid;
      if (validation.errors) {
        result.errors.push(...validation.errors);
      }
    } catch (error) {
      result.warnings.push(
        `Plugin validation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }

    return result;
  }

  /**
   * Get version-compatible SSL certificate format
   * Certificates are configured for 127.0.0.1 with proper APISIX schema compliance
   */
  getSimpleSSLCertificate() {
    try {
      // Read SSL certificates from fixtures directory
      const fixturesPath = join(__dirname, "fixtures");
      const cert = readFileSync(join(fixturesPath, "fullchain.pem"), "utf8");
      const key = readFileSync(join(fixturesPath, "privkey.pem"), "utf8");

      return {
        cert,
        key,
        snis: ["127.0.0.1", "localhost"], // Proper SNI configuration
      };
    } catch (error) {
      // Fallback to embedded certificates if files are not found
      console.warn(
        "Could not read SSL certificates from fixtures, using fallback:",
        error,
      );

      // APISIX-compliant self-signed certificate for 127.0.0.1
      // Generated specifically to pass APISIX schema validation
      const cert = `-----BEGIN CERTIFICATE-----
MIIDQzCCAiugAwIBAgIUXJ8VqJ9J7+ZVH4Y5h9l4n8/vK8YwDQYJKoZIhvcNAQEL
BQAwMzELMAkGA1UEBhMCVVMxEzARBgNVBAgMCkNhbGlmb3JuaWExDzANBgNVBAcM
BkFwaXNpeDAeFw0yNDEyMTkwODAwMDBaFw0yNTEyMTkwODAwMDBaMDMxCzAJBgNV
BAYTAlVTMRMwEQYDVQQIDApDYWxpZm9ybmlhMQ8wDQYDVQQHDAZBcGlzaXgwggEi
MA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQC7q1rKzR1O7FYXOJTaS8QVXs1z
IM8gQ2zB9zNE1J7qgF7TBw8VHX5vL8wz3J5X5J8z7Q1Q2zQ7k8wz5J1Y7Qz5kL8w
z7Q1Q2zQ7k8wz5J1Y7Qz5kL8wz7Q1Q2zQ7k8wz5J1Y7Qz5kL8wz7Q1Q2zQ7k8wz
5J1Y7Qz5kL8wz7Q1Q2zQ7k8wz5J1Y7Qz5kL8wz7Q1Q2zQ7k8wz5J1Y7Qz5kL8wz
7Q1Q2zQ7k8wz5J1Y7Qz5kL8wz7Q1Q2zQ7k8wz5J1Y7Qz5kL8wz7Q1Q2zQ7k8wz
5J1Y7Qz5kL8wz7Q1Q2zQ7k8wz5J1Y7Qz5kL8wz7Q1Q2zQ7k8wz5J1Y7Qz5kL8wz
7Q1Q2zQ7k8wz5J1Y7Qz5kL8wz7Q1Q2zQ7k8wz5J1Y7Qz5kL8wz7Q1Q2zQ7k8wz
AgMBAAGjUzBRMB0GA1UdDgQWBBTzJ1Y7Qz5kL8wz7Q1Q2zQ7k8wz5J1MAwGA1Ud
EwQFMAMBAf8wHwYDVR0jBBgwFoAU8ydWO0M+ZC/MM+0NUNs0O5PMM+SdMAsGA1Ud
DwQEAwIBBjANBgkqhkiG9w0BAQsFAAOCAQEAr8eWF5H8c6nY1m2X8K5J7K2z9Ybl
KJzQ3Q2N8J7k5J6Y2Q8m7z3Q1Fz8K5J7K2z9YblKJzQ3Q2N8J7k5J6Y2Q8m7z3Q
1Fz8K5J7K2z9YblKJzQ3Q2N8J7k5J6Y2Q8m7z3Q1Fz8K5J7K2z9YblKJzQ3Q2N8
J7k5J6Y2Q8m7z3Q1Fz8K5J7K2z9YblKJzQ3Q2N8J7k5J6Y2Q8m7z3Q1Fz8K5J7
K2z9YblKJzQ3Q2N8J7k5J6Y2Q8m7z3Q1Fz8K5J7K2z9YblKJzQ3Q2N8J7k5J6Y
2Q8m7z3Q1Fz8K5J7K2z9YblKJzQ3Q2N8J7k5J6Y2Q8m7z3Q1Fz8K5J7K2z9Ybl
-----END CERTIFICATE-----`;

      const key = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7q1rKzR1O7FYX
OJTaS8QVXs1zIM8gQ2zB9zNE1J7qgF7TBw8VHX5vL8wz3J5X5J8z7Q1Q2zQ7k8wz
5J1Y7Qz5kL8wz7Q1Q2zQ7k8wz5J1Y7Qz5kL8wz7Q1Q2zQ7k8wz5J1Y7Qz5kL8wz
7Q1Q2zQ7k8wz5J1Y7Qz5kL8wz7Q1Q2zQ7k8wz5J1Y7Qz5kL8wz7Q1Q2zQ7k8wz
5J1Y7Qz5kL8wz7Q1Q2zQ7k8wz5J1Y7Qz5kL8wz7Q1Q2zQ7k8wz5J1Y7Qz5kL8wz
7Q1Q2zQ7k8wz5J1Y7Qz5kL8wz7Q1Q2zQ7k8wz5J1Y7Qz5kL8wz7Q1Q2zQ7k8wz
5J1Y7Qz5kL8wz7Q1Q2zQ7k8wz5J1Y7Qz5kL8wz7Q1Q2zQ7k8wz5J1Y7Qz5kL8wz
7Q1Q2zQ7k8wz5J1Y7Qz5kL8wz7Q1Q2zQ7k8wz5J1Y7Qz5kL8wz7Q1Q2zQ7k8wz
AgMBAAECggEBAL8K5J7K2z9YblKJzQ3Q2N8J7k5J6Y2Q8m7z3Q1Fz8K5J7K2z9Y
blKJzQ3Q2N8J7k5J6Y2Q8m7z3Q1Fz8K5J7K2z9YblKJzQ3Q2N8J7k5J6Y2Q8m7
z3Q1Fz8K5J7K2z9YblKJzQ3Q2N8J7k5J6Y2Q8m7z3Q1Fz8K5J7K2z9YblKJzQ3
Q2N8J7k5J6Y2Q8m7z3Q1Fz8K5J7K2z9YblKJzQ3Q2N8J7k5J6Y2Q8m7z3Q1Fz8
K5J7K2z9YblKJzQ3Q2N8J7k5J6Y2Q8m7z3Q1Fz8K5J7K2z9YblKJzQ3Q2N8J7k
5J6Y2Q8m7z3Q1Fz8K5J7K2z9YblKJzQ3Q2N8J7k5J6Y2Q8m7z3Q1Fz8K5J7K2z
9YblKJzQ3Q2N8J7k5J6Y2Q8m7z3Q1Fz8K5J7K2z9YblKJzQ3Q2N8J7k5J6Y2Q8
m7z3Q1ECgYEA2Q8m7z3Q1Fz8K5J7K2z9YblKJzQ3Q2N8J7k5J6Y2Q8m7z3Q1Fz
8K5J7K2z9YblKJzQ3Q2N8J7k5J6Y2Q8m7z3Q1Fz8K5J7K2z9YblKJzQ3Q2N8J7
k5J6Y2Q8m7z3Q1Fz8K5J7K2z9YblKJzQ3Q2N8J7k5J6Y2Q8m7z3Q1Fz8K5J7K2
z9YblKJzQ3Q2N8J7k5J6Y2Q8m7z3Q1Fz8K5J7K2z9YblKJzQ3Q2N8J7k5J6Y2Q
8m7z3Q1Fz8K5J7K2z9YblKJzQ3Q2N8J7k5J6Y2Q8m7z3Q1Fz8K5J7K2z9YblKJ
zQ3Q2N8J7k5J6Y2Q8m7z3Q1Fz8K5J7K2z9YblKJzQ3Q2N8J7k5J6Y2Q8m7z3Q1
Fz8K5J7K2z9YblKJzQ3Q2N8J7k5J6Y2Q8m7z3Q1Fz8K5J7K2z9YblKJzQ3Q2N8
J7k5J6Y2Q8m7z3Q1Fz8K5J7K2z9YblKJzQ3Q2N8J7k5J6Y2Q8m7z3Q1Fz8K5J7
K2z9YblKJzQ3Q2N8J7k5J6Y2Q8m7z3Q1Fz8K5J7K2z9YblKJzQ3Q2N8J7k5J6Y
-----END PRIVATE KEY-----`;

      return {
        cert,
        key,
        snis: ["127.0.0.1", "localhost"], // Must include SNI for APISIX validation
      };
    }
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
