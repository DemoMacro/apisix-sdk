import type { ApisixClient } from "../client";
import type { PluginConfig } from "../types";

export class PluginConfigs {
  private client: ApisixClient;

  constructor(client: ApisixClient) {
    this.client = client;
  }

  /**
   * List all plugin configs
   */
  async list(options?: {
    page?: number;
    page_size?: number;
    name?: string;
    label?: string;
  }): Promise<PluginConfig[]> {
    const response = await this.client.list<PluginConfig>(
      this.client.getAdminEndpoint("/plugin_configs"),
      options,
    );
    return this.client.extractList(response);
  }

  /**
   * Get plugin config by id
   */
  async get(id: string): Promise<PluginConfig> {
    const response = await this.client.getOne<PluginConfig>(
      this.client.getAdminEndpoint("/plugin_configs"),
      id,
    );
    return this.client.extractValue(response);
  }

  /**
   * Create plugin config
   */
  async create(
    data: Omit<PluginConfig, "id" | "create_time" | "update_time">,
    id?: string,
  ): Promise<PluginConfig> {
    const response = await this.client.create<PluginConfig>(
      this.client.getAdminEndpoint("/plugin_configs"),
      data,
      id,
    );
    return this.client.extractValue(response);
  }

  /**
   * Update plugin config
   */
  async update(
    id: string,
    data: Partial<Omit<PluginConfig, "id" | "create_time" | "update_time">>,
  ): Promise<PluginConfig> {
    const response = await this.client.partialUpdate<PluginConfig>(
      this.client.getAdminEndpoint("/plugin_configs"),
      id,
      data,
    );
    return this.client.extractValue(response);
  }

  /**
   * Delete plugin config
   */
  async delete(id: string): Promise<boolean> {
    await this.client.remove(
      this.client.getAdminEndpoint("/plugin_configs"),
      id,
    );
    return true;
  }

  /**
   * Add plugin to config
   */
  async addPlugin(
    id: string,
    pluginName: string,
    config: Record<string, unknown>,
  ): Promise<PluginConfig> {
    const pluginConfig = await this.get(id);
    const plugins = { ...pluginConfig.plugins, [pluginName]: config };
    return this.update(id, { plugins });
  }

  /**
   * Remove plugin from config
   */
  async removePlugin(id: string, pluginName: string): Promise<PluginConfig> {
    const pluginConfig = await this.get(id);
    const plugins = { ...pluginConfig.plugins };
    delete plugins[pluginName];
    return this.update(id, { plugins });
  }

  /**
   * Update plugin configuration in plugin config
   */
  async updatePlugin(
    id: string,
    pluginName: string,
    config: Record<string, unknown>,
  ): Promise<PluginConfig> {
    const pluginConfig = await this.get(id);
    const plugins = { ...pluginConfig.plugins, [pluginName]: config };
    return this.update(id, { plugins });
  }

  /**
   * Enable/disable plugin in config
   */
  async togglePlugin(
    id: string,
    pluginName: string,
    enabled: boolean,
  ): Promise<PluginConfig> {
    const pluginConfig = await this.get(id);
    if (!pluginConfig.plugins?.[pluginName]) {
      throw new Error(`Plugin ${pluginName} not found in config ${id}`);
    }

    const plugins = {
      ...pluginConfig.plugins,
      [pluginName]: {
        ...(pluginConfig.plugins[pluginName] as Record<string, unknown>),
        _meta: {
          disable: !enabled,
        },
      },
    };

    return this.update(id, { plugins });
  }

  /**
   * Get plugin configs by label
   */
  async getByLabel(label: string, value?: string): Promise<PluginConfig[]> {
    const allConfigs = await this.list();
    return allConfigs.filter((config) => {
      if (!config.labels) return false;
      if (value) {
        return config.labels[label] === value;
      }
      return label in config.labels;
    });
  }

  /**
   * Clone plugin config
   */
  async clone(
    sourceId: string,
    newId: string,
    overrides?: Partial<
      Omit<PluginConfig, "id" | "create_time" | "update_time">
    >,
  ): Promise<PluginConfig> {
    const sourceConfig = await this.get(sourceId);
    const cloneData = {
      plugins: sourceConfig.plugins || {},
      desc: sourceConfig.desc,
      labels: sourceConfig.labels,
      ...overrides,
    };
    return this.create(cloneData, newId);
  }

  /**
   * Validate plugin config
   */
  async validate(config: PluginConfig): Promise<{
    valid: boolean;
    errors?: string[];
  }> {
    try {
      const plugins = config.plugins || {};
      const errors: string[] = [];

      for (const [pluginName, pluginConfig] of Object.entries(plugins)) {
        try {
          // Basic validation - check if plugin config is an object
          if (typeof pluginConfig !== "object" || pluginConfig === null) {
            errors.push(`${pluginName}: Invalid plugin configuration format`);
            continue;
          }

          // Check for common required fields based on plugin type
          const pluginObj = pluginConfig as Record<string, unknown>;

          // Validate common plugin patterns
          if (pluginName === "limit-req" || pluginName === "limit-count") {
            if (
              typeof pluginObj.rate !== "number" &&
              typeof pluginObj.count !== "number"
            ) {
              errors.push(
                `${pluginName}: Missing required rate or count parameter`,
              );
            }
          }

          if (pluginName === "cors") {
            if (!pluginObj.allow_origins && !pluginObj.origin) {
              errors.push(`${pluginName}: Missing allow_origins configuration`);
            }
          }

          if (
            pluginName === "key-auth" &&
            !pluginObj.key &&
            !pluginObj.header
          ) {
            errors.push(`${pluginName}: Missing key or header configuration`);
          }
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Validation failed";
          errors.push(`${pluginName}: ${message}`);
        }
      }

      return {
        valid: errors.length === 0,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Validation failed";
      return {
        valid: false,
        errors: [message],
      };
    }
  }

  /**
   * Get plugin config template with common plugins
   */
  getTemplate(
    type: "basic" | "security" | "observability" | "traffic",
  ): Partial<PluginConfig> {
    const templates = {
      basic: {
        desc: "Basic plugin configuration",
        plugins: {
          "request-id": {
            _meta: { disable: false },
          },
          "response-rewrite": {
            _meta: { disable: false },
            headers: {
              "X-Server": "APISIX",
            },
          },
        },
      },
      security: {
        desc: "Security plugin configuration",
        plugins: {
          cors: {
            _meta: { disable: false },
            allow_origins: "*",
            allow_methods: "GET,POST,PUT,DELETE,PATCH,HEAD,OPTIONS",
            allow_headers: "*",
          },
          "ip-restriction": {
            _meta: { disable: false },
            whitelist: ["127.0.0.1", "::1"],
          },
        },
      },
      observability: {
        desc: "Observability plugin configuration",
        plugins: {
          prometheus: {
            _meta: { disable: false },
          },
          zipkin: {
            _meta: { disable: false },
            endpoint: "http://zipkin:9411/api/v2/spans",
            sample_ratio: 1,
          },
        },
      },
      traffic: {
        desc: "Traffic management plugin configuration",
        plugins: {
          "limit-req": {
            _meta: { disable: false },
            rate: 10,
            burst: 20,
            key: "remote_addr",
          },
          "limit-count": {
            _meta: { disable: false },
            count: 100,
            time_window: 60,
            key: "remote_addr",
          },
        },
      },
    };

    return templates[type];
  }

  /**
   * Batch operations for plugin configs
   */
  async batchCreate(
    configs: Array<{
      id?: string;
      data: Omit<PluginConfig, "id" | "create_time" | "update_time">;
    }>,
  ): Promise<PluginConfig[]> {
    const results: PluginConfig[] = [];
    for (const { id, data } of configs) {
      try {
        const result = await this.create(data, id);
        results.push(result);
      } catch (error) {
        console.error(`Failed to create plugin config ${id}:`, error);
        throw error;
      }
    }
    return results;
  }

  /**
   * Export plugin config to JSON
   */
  async export(id: string): Promise<string> {
    const config = await this.get(id);
    return JSON.stringify(config, null, 2);
  }

  /**
   * Import plugin config from JSON
   */
  async import(jsonString: string, newId?: string): Promise<PluginConfig> {
    try {
      const config = JSON.parse(jsonString) as PluginConfig;
      const {
        id,
        create_time: _create_time,
        update_time: _update_time,
        ...data
      } = config;
      return this.create(data, newId || id);
    } catch (error) {
      console.error("Error parsing JSON:", error);
      throw new Error("Invalid JSON format for plugin config");
    }
  }
}
