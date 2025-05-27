// Export types
export * from "./types";

// Export resource managers and additional interfaces
export type { ConsumerCredential } from "./resources/consumers";
export type { DiscoveryDump, DiscoveryDumpFile } from "./resources/control";

// Import dependencies
import { ApisixClient } from "./client";
import { ConsumerGroups } from "./resources/consumer-groups";
import { Consumers } from "./resources/consumers";
import { Control } from "./resources/control";
import { Credentials } from "./resources/credentials";
import { GlobalRules } from "./resources/global-rules";
import { Plugins } from "./resources/plugins";
import { Routes } from "./resources/routes";
import { Secrets } from "./resources/secrets";
import { Services } from "./resources/services";
import { SSLCertificates } from "./resources/ssl";
import { StreamRoutes } from "./resources/stream-routes";
import { Upstreams } from "./resources/upstreams";
import type { ApisixSDKConfig } from "./types";

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
  public readonly ssl: SSLCertificates;
  public readonly plugins: Plugins;
  public readonly globalRules: GlobalRules;
  public readonly consumerGroups: ConsumerGroups;
  public readonly credentials: Credentials;
  public readonly secrets: Secrets;
  public readonly streamRoutes: StreamRoutes;

  // Control API manager
  public readonly control: Control;

  constructor(config: ApisixSDKConfig) {
    this.client = new ApisixClient(config);

    // Initialize Admin API resource managers
    this.routes = new Routes(this.client);
    this.services = new Services(this.client);
    this.upstreams = new Upstreams(this.client);
    this.consumers = new Consumers(this.client);
    this.ssl = new SSLCertificates(this.client);
    this.plugins = new Plugins(this.client);
    this.globalRules = new GlobalRules(this.client);
    this.consumerGroups = new ConsumerGroups(this.client);
    this.credentials = new Credentials(this.client);
    this.secrets = new Secrets(this.client);
    this.streamRoutes = new StreamRoutes(this.client);

    // Initialize Control API manager
    this.control = new Control(this.client);
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
}

/**
 * Create a new APISIX SDK instance
 */
export function createApisixSDK(config: ApisixSDKConfig): ApisixSDK {
  return new ApisixSDK(config);
}

// Default export
export default ApisixSDK;
