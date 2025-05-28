// Export types
export type * from "./types";

// Import dependencies
import { ApisixClient } from "./client";
import { ConsumerGroups } from "./resources/consumer-groups";
import { Consumers } from "./resources/consumers";
import { Control } from "./resources/control";
import { Credentials } from "./resources/credentials";
import { GlobalRules } from "./resources/global-rules";
import { PluginConfigs } from "./resources/plugin-configs";
import { Plugins } from "./resources/plugins";
import { Protos } from "./resources/protos";
import { Routes } from "./resources/routes";
import { Secrets } from "./resources/secrets";
import { Services } from "./resources/services";
import { SSLCertificates } from "./resources/ssl";
import { StreamRoutes } from "./resources/stream-routes";
import { Upstreams } from "./resources/upstreams";
import type { ApisixSDKConfig } from "./types";
import { VersionManager } from "./version";

/**
 * Apache APISIX SDK for Node.js
 *
 * Provides comprehensive access to APISIX Admin API and Control API
 */
export class ApisixSDK {
  private client: ApisixClient;

  // Admin API resource managers
  public readonly routes: Routes;
  public readonly services: Services;
  public readonly upstreams: Upstreams;
  public readonly consumers: Consumers;
  public readonly credentials: Credentials;
  public readonly ssl: SSLCertificates;
  public readonly globalRules: GlobalRules;
  public readonly consumerGroups: ConsumerGroups;
  public readonly pluginConfigs: PluginConfigs;
  public readonly plugins: Plugins;
  public readonly streamRoutes: StreamRoutes;
  public readonly secrets: Secrets;
  public readonly protos: Protos;

  // Control API manager
  public readonly control: Control;

  // Version manager
  public readonly version: VersionManager;

  constructor(config: ApisixSDKConfig) {
    this.client = new ApisixClient(config);

    // Initialize Admin API resource managers
    this.routes = new Routes(this.client);
    this.services = new Services(this.client);
    this.upstreams = new Upstreams(this.client);
    this.consumers = new Consumers(this.client);
    this.credentials = new Credentials(this.client);
    this.ssl = new SSLCertificates(this.client);
    this.globalRules = new GlobalRules(this.client);
    this.consumerGroups = new ConsumerGroups(this.client);
    this.pluginConfigs = new PluginConfigs(this.client);
    this.plugins = new Plugins(this.client);
    this.streamRoutes = new StreamRoutes(this.client);
    this.secrets = new Secrets(this.client);
    this.protos = new Protos(this.client);

    // Initialize Control API manager
    this.control = new Control(this.client);

    // Initialize Version manager
    this.version = new VersionManager(this.client);
  }

  /**
   * Get the underlying client for direct API access
   */
  getClient(): ApisixClient {
    return this.client;
  }

  /**
   * Test connection to APISIX Admin API
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.routes.list({ page_size: 1 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Test connection to APISIX Control API
   */
  async testControlConnection(): Promise<boolean> {
    try {
      await this.control.isHealthy();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get comprehensive system status
   */
  async getSystemStatus(): Promise<{
    adminApiConnected: boolean;
    controlApiConnected: boolean;
    systemOverview?: Awaited<ReturnType<Control["getSystemOverview"]>>;
  }> {
    const [adminConnected, controlConnected] = await Promise.all([
      this.testConnection(),
      this.testControlConnection(),
    ]);

    let systemOverview:
      | Awaited<ReturnType<Control["getSystemOverview"]>>
      | undefined;
    if (controlConnected) {
      try {
        systemOverview = await this.control.getSystemOverview();
      } catch {
        // Ignore error if system overview fails
      }
    }

    return {
      adminApiConnected: adminConnected,
      controlApiConnected: controlConnected,
      systemOverview,
    };
  }

  /**
   * Get APISIX server information
   */
  async getServerInfo() {
    return this.client.getServerInfo();
  }

  /**
   * Get APISIX version
   */
  async getVersion() {
    return this.client.getVersion();
  }

  /**
   * Check if current APISIX version supports a specific feature
   */
  async supportsFeature(
    feature: "credentials" | "secrets" | "newResponseFormat" | "streamRoutes",
  ) {
    const config = await this.client.getApiVersionConfig();
    const featureMap = {
      credentials: config.supportsCredentials,
      secrets: config.supportsSecrets,
      newResponseFormat: config.supportsNewResponseFormat,
      streamRoutes: config.supportsStreamRoutes,
    };
    return featureMap[feature];
  }

  /**
   * Get version compatibility information
   */
  async getVersionCompatibility() {
    const version = await this.getVersion();
    const config = await this.client.getApiVersionConfig();
    const versionConfig = await this.version.getCurrentVersionConfig();

    return {
      version,
      majorVersion: version.split(".")[0],
      features: config,
      supportedPlugins: versionConfig.supportedPlugins,
      deprecatedFeatures: versionConfig.deprecatedFeatures,
    };
  }
}

/**
 * Create a new APISIX SDK instance
 */
export function createApisixSDK(config: ApisixSDKConfig): ApisixSDK {
  return new ApisixSDK(config);
}

// Default export
export default ApisixSDK;

// Export types and classes
export { ApisixClient } from "./client";
export { VersionManager } from "./version";
export { Routes } from "./resources/routes";
export { Services } from "./resources/services";
export { Upstreams } from "./resources/upstreams";
export { Consumers } from "./resources/consumers";
export { Credentials } from "./resources/credentials";
export { SSLCertificates } from "./resources/ssl";
export { GlobalRules } from "./resources/global-rules";
export { ConsumerGroups } from "./resources/consumer-groups";
export { PluginConfigs } from "./resources/plugin-configs";
export { Plugins } from "./resources/plugins";
export { StreamRoutes } from "./resources/stream-routes";
export { Secrets } from "./resources/secrets";
export { Protos } from "./resources/protos";
export { Control } from "./resources/control";
