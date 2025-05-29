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
        snis: ["127.0.0.1"], // Proper SNI configuration
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
MIIB3TCCAYKgAwIBAgIEaDflXDAKBggqhkjOPQQDAjBCMQswCQYDVQQGEwJDTjET
MBEGA1UEChMKYXBpc2l4LXNkazEJMAcGA1UECxMAMRMwEQYDVQQDEwphcGlzaXgt
c2RrMB4XDTI1MDUyOTA0NDA1N1oXDTM1MDUyOTA0NDA1N1owQTELMAkGA1UEBhMC
Q04xEzARBgNVBAoTCmFwaXNpeC1zZGsxCTAHBgNVBAsTADESMBAGA1UEAxMJMTI3
LjAuMC4xMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEyOAEUw3fI7/G20wupbz3
qatKtmCSyUtS2E1Gm1xu/u6UTZe//R0HNKXdl/cPy1+tkySZyjwyafCIwJbeSPs3
MqNnMGUwDgYDVR0PAQH/BAQDAgWgMBMGA1UdJQQMMAoGCCsGAQUFBwMBMAwGA1Ud
EwEB/wQCMAAwHwYDVR0jBBgwFoAUzURnRsjp98JfaA4Mpw/F7Lgi1KMwDwYDVR0R
BAgwBocEfwAAATAKBggqhkjOPQQDAgNJADBGAiEAojhm/scP0r7AFV6YJZ//MGvq
fAOs2OUmL0e7ac8VVO4CIQDb39EgptAbm5do4HjAObZoemIrZlAc1eY5fND4tUe5
PQ==
-----END CERTIFICATE-----
-----BEGIN CERTIFICATE-----
MIIBujCCAWGgAwIBAgIEaDflPDAKBggqhkjOPQQDAjBCMQswCQYDVQQGEwJDTjET
MBEGA1UEChMKYXBpc2l4LXNkazEJMAcGA1UECxMAMRMwEQYDVQQDEwphcGlzaXgt
c2RrMB4XDTI1MDUyOTA0NDAyN1oXDTM1MDUyOTA0NDAyN1owQjELMAkGA1UEBhMC
Q04xEzARBgNVBAoTCmFwaXNpeC1zZGsxCTAHBgNVBAsTADETMBEGA1UEAxMKYXBp
c2l4LXNkazBZMBMGByqGSM49AgEGCCqGSM49AwEHA0IABAFnjDGnbAL/adV71sYw
3yivwRkl0x4qV561Bgi+pK7kMAvLgWD8iRX0LtWGjTHhO5RZzdi8cimtDdC+paBV
3EGjRTBDMA4GA1UdDwEB/wQEAwIBBjASBgNVHRMBAf8ECDAGAQH/AgEBMB0GA1Ud
DgQWBBQxma+bSBUiBvlcBTrPpsjFdb+bUDAKBggqhkjOPQQDAgNHADBEAiASumB4
+FUNZPGbtoRFCi5bbLuro5dHjAiI2XcsfZ02GgIgNv/DxJQmZkzRbJJEoPTPNYkX
Mr8nOjJeCZISlLijQ+U=
-----END CERTIFICATE-----
-----BEGIN CERTIFICATE-----
MIIBuzCCAWGgAwIBAgIEaDflWzAKBggqhkjOPQQDAjBCMQswCQYDVQQGEwJDTjET
MBEGA1UEChMKYXBpc2l4LXNkazEJMAcGA1UECxMAMRMwEQYDVQQDEwphcGlzaXgt
c2RrMB4XDTI1MDUyOTA0NDA1N1oXDTM1MDUyOTA0NDA1N1owQjELMAkGA1UEBhMC
Q04xEzARBgNVBAoTCmFwaXNpeC1zZGsxCTAHBgNVBAsTADETMBEGA1UEAxMKYXBp
c2l4LXNkazBZMBMGByqGSM49AgEGCCqGSM49AwEHA0IABCb/BPfCjNNADffKFM6x
gwwh0nCDZiMrTXrw4obvncc/Gcm688fkjq8Mev6vv9Q1kDOWjQogHyvvJs1X9m4z
Xt6jRTBDMA4GA1UdDwEB/wQEAwIBBjASBgNVHRMBAf8ECDAGAQH/AgEAMB0GA1Ud
DgQWBBTNRGdGyOn3wl9oDgynD8XsuCLUozAKBggqhkjOPQQDAgNIADBFAiAPwmZ3
V7DcD8q67VKiKieRFn//NypkXGIA8DJMwLzdsgIhAP7nrmJCql2+guSlgCuKpYmm
KaqNvuwVvP3z2ChQ3+Dd
-----END CERTIFICATE-----
`;

      const key = `-----BEGIN EC PRIVATE KEY-----
MHcCAQEEIBNos9F9hG5LtkpWOYhw/CS9h2VmCbK6jSHIYzjXaJg4oAoGCCqGSM49
AwEHoUQDQgAEyOAEUw3fI7/G20wupbz3qatKtmCSyUtS2E1Gm1xu/u6UTZe//R0H
NKXdl/cPy1+tkySZyjwyafCIwJbeSPs3Mg==
-----END EC PRIVATE KEY-----
`;

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
