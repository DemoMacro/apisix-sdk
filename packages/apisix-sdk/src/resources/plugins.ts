import type { ApisixClient } from "../client";
import type { PluginMetadata } from "../types";

export class Plugins {
  private client: ApisixClient;

  constructor(client: ApisixClient) {
    this.client = client;
  }

  /**
   * List all available plugins
   */
  async list(): Promise<string[]> {
    const response = await this.client.get<string[]>(
      this.client.getAdminEndpoint("/plugins/list"),
    );
    return response;
  }

  /**
   * Get plugin schema
   */
  async getSchema(pluginName: string): Promise<Record<string, unknown>> {
    const response = await this.client.get<Record<string, unknown>>(
      this.client.getAdminEndpoint(`/plugins/${pluginName}`),
    );
    return response;
  }

  /**
   * Enable or disable a plugin globally
   */
  async setGlobalState(pluginName: string, enabled: boolean): Promise<boolean> {
    await this.client.put(
      this.client.getAdminEndpoint(`/plugins/${pluginName}`),
      { disable: !enabled },
    );
    return true;
  }

  /**
   * Enable a plugin globally
   */
  async enable(pluginName: string): Promise<boolean> {
    return this.setGlobalState(pluginName, true);
  }

  /**
   * Disable a plugin globally
   */
  async disable(pluginName: string): Promise<boolean> {
    return this.setGlobalState(pluginName, false);
  }

  /**
   * Get plugin metadata
   */
  async getMetadata(pluginName: string): Promise<PluginMetadata> {
    const response = await this.client.getOne<PluginMetadata>(
      this.client.getAdminEndpoint("/plugin_metadata"),
      pluginName,
    );
    return this.client.extractValue(response);
  }

  /**
   * Update plugin metadata
   */
  async updateMetadata(
    pluginName: string,
    metadata: Omit<PluginMetadata, "id">,
  ): Promise<PluginMetadata> {
    const response = await this.client.update<PluginMetadata>(
      this.client.getAdminEndpoint("/plugin_metadata"),
      pluginName,
      metadata,
    );
    return this.client.extractValue(response);
  }

  /**
   * Delete plugin metadata
   */
  async deleteMetadata(pluginName: string): Promise<boolean> {
    await this.client.remove(
      this.client.getAdminEndpoint("/plugin_metadata"),
      pluginName,
    );
    return true;
  }

  /**
   * List all plugin metadata
   */
  async listMetadata(): Promise<PluginMetadata[]> {
    const response = await this.client.list<PluginMetadata>(
      this.client.getAdminEndpoint("/plugin_metadata"),
    );
    return this.client.extractList(response);
  }

  /**
   * Check if plugin is available
   */
  async isAvailable(pluginName: string): Promise<boolean> {
    try {
      const plugins = await this.list();
      return plugins.includes(pluginName);
    } catch {
      return false;
    }
  }

  /**
   * Validate plugin configuration against schema
   */
  async validateConfig(
    pluginName: string,
    config: Record<string, unknown>,
  ): Promise<{
    valid: boolean;
    errors?: string[];
  }> {
    try {
      // Use schema validation endpoint
      const response = await this.client.post(
        this.client.getAdminEndpoint("/schema/validate/plugin"),
        {
          plugin_name: pluginName,
          config,
        },
      );

      return { valid: true };
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Validation failed";
      return {
        valid: false,
        errors: [message],
      };
    }
  }

  /**
   * Get plugin configuration template with default values
   */
  async getConfigTemplate(
    pluginName: string,
  ): Promise<Record<string, unknown>> {
    const schema = await this.getSchema(pluginName);

    // Extract default values from schema
    const template: Record<string, unknown> = {};
    if (schema.properties && typeof schema.properties === "object") {
      for (const [key, prop] of Object.entries(schema.properties)) {
        if (prop && typeof prop === "object" && "default" in prop) {
          template[key] = (prop as { default: unknown }).default;
        }
      }
    }

    return template;
  }

  /**
   * Get available plugin categories
   */
  getPluginCategories(): Record<string, string[]> {
    return {
      authentication: [
        "key-auth",
        "basic-auth",
        "jwt-auth",
        "hmac-auth",
        "authz-keycloak",
        "oauth",
        "openid-connect",
      ],
      security: [
        "cors",
        "csrf",
        "ip-restriction",
        "ua-restriction",
        "referer-restriction",
        "consumer-restriction",
      ],
      traffic: [
        "limit-req",
        "limit-count",
        "limit-conn",
        "request-validation",
        "proxy-rewrite",
        "redirect",
      ],
      observability: [
        "prometheus",
        "node-status",
        "datadog",
        "file-logger",
        "http-logger",
        "tcp-logger",
        "kafka-logger",
        "syslog",
      ],
      transformation: [
        "response-rewrite",
        "fault-injection",
        "mocking",
        "grpc-transcode",
        "grpc-web",
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

    // Filter by available plugins
    const availablePlugins = await this.list();
    return categoryPlugins.filter((plugin) =>
      availablePlugins.includes(plugin),
    );
  }

  /**
   * Get plugin documentation URL
   */
  getPluginDocUrl(pluginName: string): string {
    return `https://apisix.apache.org/docs/apisix/plugins/${pluginName}/`;
  }

  /**
   * Get plugin information with schema and metadata
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

    if (!available) {
      return {
        name: pluginName,
        available: false,
        docUrl: this.getPluginDocUrl(pluginName),
      };
    }

    const [schema, metadata] = await Promise.all([
      this.getSchema(pluginName).catch(() => undefined),
      this.getMetadata(pluginName).catch(() => undefined),
    ]);

    // Find category
    const categories = this.getPluginCategories();
    let category: string | undefined;
    for (const [cat, plugins] of Object.entries(categories)) {
      if (plugins.includes(pluginName)) {
        category = cat;
        break;
      }
    }

    return {
      name: pluginName,
      available: true,
      schema,
      metadata,
      category,
      docUrl: this.getPluginDocUrl(pluginName),
    };
  }
}
