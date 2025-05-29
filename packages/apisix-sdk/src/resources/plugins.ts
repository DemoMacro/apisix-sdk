import type { ApisixClient } from "../client";
import type { PluginMetadata } from "../types";

export class Plugins {
  private client: ApisixClient;
  private pluginCache: string[] | null = null;

  constructor(client: ApisixClient) {
    this.client = client;
  }

  /**
   * List all available plugins
   */
  async list(): Promise<string[]> {
    try {
      const response = await this.client.get<Record<string, boolean>>(
        this.client.getAdminEndpoint("/plugins/list"),
      );
      return Object.keys(response);
    } catch (_error) {
      // Fallback to empty array if endpoint is not available
      return [];
    }
  }

  /**
   * Get plugin schema
   */
  async getSchema(pluginName: string): Promise<Record<string, unknown>> {
    try {
      return await this.client.controlRequest<Record<string, unknown>>(
        `/v1/schema/plugin/${pluginName}`,
      );
    } catch (error) {
      throw new Error(
        `Failed to get schema for plugin ${pluginName}: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Set plugin global state (enable/disable globally)
   * Note: This feature may not be available in all APISIX versions
   */
  async setGlobalState(pluginName: string, enabled: boolean): Promise<boolean> {
    try {
      const endpoint = enabled
        ? this.client.getAdminEndpoint(`/plugins/${pluginName}/enable`)
        : this.client.getAdminEndpoint(`/plugins/${pluginName}/disable`);

      await this.client.post(endpoint);
      return true;
    } catch (error) {
      console.warn(
        `Plugin state management not available: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      return false;
    }
  }

  /**
   * Enable plugin globally
   */
  async enable(pluginName: string): Promise<boolean> {
    return this.setGlobalState(pluginName, true);
  }

  /**
   * Disable plugin globally
   */
  async disable(pluginName: string): Promise<boolean> {
    return this.setGlobalState(pluginName, false);
  }

  /**
   * Get plugin metadata
   */
  async getMetadata(pluginName: string): Promise<PluginMetadata> {
    try {
      const response = await this.client.getOne<PluginMetadata>(
        this.client.getAdminEndpoint("/plugin_metadata"),
        pluginName,
      );
      return await this.client.extractValue(response);
    } catch (error) {
      throw new Error(
        `Failed to get metadata for plugin ${pluginName}: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Update plugin metadata
   */
  async updateMetadata(
    pluginName: string,
    metadata: Omit<PluginMetadata, "id">,
  ): Promise<PluginMetadata> {
    try {
      const response = await this.client.create<PluginMetadata>(
        this.client.getAdminEndpoint("/plugin_metadata"),
        metadata,
        pluginName,
      );
      return await this.client.extractValue(response);
    } catch (error) {
      throw new Error(
        `Failed to update metadata for plugin ${pluginName}: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Delete plugin metadata
   */
  async deleteMetadata(pluginName: string): Promise<boolean> {
    try {
      await this.client.remove(
        this.client.getAdminEndpoint("/plugin_metadata"),
        pluginName,
      );
      return true;
    } catch (error) {
      // If the metadata doesn't exist, consider it as successful deletion
      if (error instanceof Error && error.message.includes("404")) {
        return true;
      }
      console.warn(
        `Plugin metadata deletion failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      return false;
    }
  }

  /**
   * List all plugin metadata
   */
  async listMetadata(): Promise<PluginMetadata[]> {
    try {
      const response = await this.client.list<PluginMetadata>(
        this.client.getAdminEndpoint("/plugin_metadata"),
      );
      return this.client.extractList(response);
    } catch (_error) {
      // Return empty array if metadata listing is not available
      return [];
    }
  }

  /**
   * Check if plugin is available
   */
  async isAvailable(pluginName: string): Promise<boolean> {
    try {
      // Use cached plugins list if available
      if (!this.pluginCache) {
        this.pluginCache = await this.list();
      }
      return this.pluginCache.includes(pluginName);
    } catch (error) {
      console.warn(
        `Failed to check plugin availability for ${pluginName}:`,
        error,
      );
      return false;
    }
  }

  /**
   * Validate plugin configuration
   */
  async validateConfig(
    pluginName: string,
    config: Record<string, unknown>,
  ): Promise<{
    valid: boolean;
    errors?: string[];
  }> {
    try {
      const _schema = await this.getSchema(pluginName);

      // Basic validation - check if config is an object
      if (typeof config !== "object" || config === null) {
        return {
          valid: false,
          errors: ["Plugin configuration must be an object"],
        };
      }

      // Check for common plugin patterns
      const errors: string[] = [];

      // Validate common plugin patterns
      if (pluginName === "limit-req" || pluginName === "limit-count") {
        if (
          typeof config.rate !== "number" &&
          typeof config.count !== "number"
        ) {
          errors.push("Missing required rate or count parameter");
        }
      }

      if (pluginName === "cors") {
        if (!config.allow_origins && !config.origin) {
          errors.push("Missing allow_origins configuration");
        }
      }

      return {
        valid: errors.length === 0,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      return {
        valid: false,
        errors: [
          `Validation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        ],
      };
    }
  }

  /**
   * Get plugin configuration template
   */
  async getConfigTemplate(
    pluginName: string,
  ): Promise<Record<string, unknown>> {
    // Common plugin templates
    const templates: Record<string, Record<string, unknown>> = {
      "key-auth": {
        header: "X-API-KEY",
        query: "api-key",
      },
      "basic-auth": {
        hide_credentials: false,
      },
      "jwt-auth": {
        header: "authorization",
        query: "token",
        cookie: "jwt",
      },
      cors: {
        allow_origins: "*",
        allow_methods: "GET,POST,PUT,DELETE,PATCH,HEAD,OPTIONS",
        allow_headers: "*",
        max_age: 5,
      },
      "limit-count": {
        count: 10,
        time_window: 60,
        key_type: "var",
        key: "remote_addr",
        rejected_code: 503,
      },
      "limit-req": {
        rate: 10,
        burst: 20,
        key_type: "var",
        key: "remote_addr",
        rejected_code: 503,
      },
    };

    return templates[pluginName] || {};
  }

  /**
   * Get plugins by category
   */
  getPluginCategories(): Record<string, string[]> {
    return {
      authentication: [
        "key-auth",
        "basic-auth",
        "jwt-auth",
        "hmac-auth",
        "oauth",
        "openid-connect",
        "authz-keycloak",
        "authz-casbin",
        "ldap-auth",
      ],
      security: [
        "cors",
        "ip-restriction",
        "ua-restriction",
        "referer-restriction",
        "csrf",
        "uri-blocker",
        "consumer-restriction",
      ],
      traffic: [
        "limit-count",
        "limit-req",
        "limit-conn",
        "proxy-cache",
        "request-validation",
        "response-rewrite",
        "proxy-rewrite",
      ],
      observability: [
        "prometheus",
        "zipkin",
        "skywalking",
        "node-status",
        "datadog",
        "wolf-rbac",
      ],
      logging: [
        "http-logger",
        "tcp-logger",
        "kafka-logger",
        "udp-logger",
        "file-logger",
        "loggly",
        "sls-logger",
        "syslog",
      ],
      transformation: [
        "response-rewrite",
        "proxy-rewrite",
        "redirect",
        "grpc-transcode",
        "fault-injection",
        "mocking",
      ],
      serverless: ["azure-functions", "aws-lambda", "openwhisk"],
    };
  }

  /**
   * Get plugins by category
   */
  async getPluginsByCategory(category: string): Promise<string[]> {
    const categories = this.getPluginCategories();
    const categoryPlugins = categories[category] || [];

    try {
      const availablePlugins = await this.list();
      return categoryPlugins.filter((plugin) =>
        availablePlugins.includes(plugin),
      );
    } catch (_error) {
      return categoryPlugins;
    }
  }

  /**
   * Get plugin documentation URL
   */
  getPluginDocUrl(pluginName: string): string {
    return `https://apisix.apache.org/docs/apisix/plugins/${pluginName}`;
  }

  /**
   * Get comprehensive plugin information
   */
  async getPluginInfo(pluginName: string): Promise<{
    name: string;
    available: boolean;
    schema?: Record<string, unknown>;
    metadata?: PluginMetadata;
    category?: string;
    docUrl: string;
  }> {
    const available = await this.isAvailable(pluginName);

    let schema: Record<string, unknown> | undefined;
    let metadata: PluginMetadata | undefined;
    let category: string | undefined;

    if (available) {
      try {
        schema = await this.getSchema(pluginName);
      } catch {
        // Schema not available
      }

      try {
        metadata = await this.getMetadata(pluginName);
      } catch {
        // Metadata not available
      }

      // Find category
      const categories = this.getPluginCategories();
      for (const [cat, plugins] of Object.entries(categories)) {
        if (plugins.includes(pluginName)) {
          category = cat;
          break;
        }
      }
    }

    return {
      name: pluginName,
      available,
      schema,
      metadata,
      category,
      docUrl: this.getPluginDocUrl(pluginName),
    };
  }

  /**
   * Clear plugin cache (useful when plugins are reloaded)
   */
  clearCache(): void {
    this.pluginCache = null;
  }

  /**
   * Get list of available plugins with caching
   */
  async getAvailablePlugins(): Promise<string[]> {
    if (!this.pluginCache) {
      this.pluginCache = await this.list();
    }
    return [...this.pluginCache];
  }
}
