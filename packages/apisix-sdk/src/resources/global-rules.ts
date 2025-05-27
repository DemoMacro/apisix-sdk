import type { ApisixClient } from "../client";
import type {
  CreateInput,
  GlobalRule,
  ListOptions,
  UpdateInput,
} from "../types";

export class GlobalRules {
  private readonly endpoint = "/global_rules";
  private client: ApisixClient;

  constructor(client: ApisixClient) {
    this.client = client;
  }

  /**
   * List all global rules with optional pagination and filtering
   */
  async list(options?: ListOptions): Promise<GlobalRule[]> {
    const response = await this.client.list<GlobalRule>(
      this.client.getAdminEndpoint(this.endpoint),
      options,
    );
    return this.client.extractList(response);
  }

  /**
   * Get a specific global rule by ID
   */
  async get(id: string): Promise<GlobalRule> {
    const response = await this.client.getOne<GlobalRule>(
      this.client.getAdminEndpoint(this.endpoint),
      id,
    );
    return this.client.extractValue(response);
  }

  /**
   * Create a new global rule
   */
  async create(
    globalRule: CreateInput<GlobalRule>,
    id?: string,
  ): Promise<GlobalRule> {
    const response = await this.client.create<GlobalRule>(
      this.client.getAdminEndpoint(this.endpoint),
      globalRule,
      id,
    );
    return this.client.extractValue(response);
  }

  /**
   * Update an existing global rule
   */
  async update(
    id: string,
    globalRule: UpdateInput<GlobalRule>,
  ): Promise<GlobalRule> {
    const response = await this.client.update<GlobalRule>(
      this.client.getAdminEndpoint(this.endpoint),
      id,
      globalRule,
    );
    return this.client.extractValue(response);
  }

  /**
   * Partially update an existing global rule
   */
  async patch(
    id: string,
    globalRule: UpdateInput<GlobalRule>,
  ): Promise<GlobalRule> {
    const response = await this.client.partialUpdate<GlobalRule>(
      this.client.getAdminEndpoint(this.endpoint),
      id,
      globalRule,
    );
    return this.client.extractValue(response);
  }

  /**
   * Delete a global rule
   */
  async delete(id: string, options?: { force?: boolean }): Promise<boolean> {
    if (options?.force) {
      await this.client.removeWithQuery(
        this.client.getAdminEndpoint(this.endpoint),
        id,
        { force: "true" },
      );
    } else {
      await this.client.remove(this.client.getAdminEndpoint(this.endpoint), id);
    }
    return true;
  }

  /**
   * Check if global rule exists
   */
  async exists(id: string): Promise<boolean> {
    try {
      await this.get(id);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * List global rules with pagination support (v3 API)
   */
  async listPaginated(
    page = 1,
    pageSize = 10,
    filters?: Record<string, string | number | boolean | undefined>,
  ): Promise<{
    globalRules: GlobalRule[];
    total?: number;
    hasMore?: boolean;
  }> {
    const options: ListOptions = {
      page,
      page_size: pageSize,
    };

    if (filters) {
      Object.assign(options, filters);
    }

    const response = await this.client.list<GlobalRule>(
      this.client.getAdminEndpoint(this.endpoint),
      options,
    );

    return {
      globalRules: this.client.extractList(response),
      total: response.total,
      hasMore: response.has_more,
    };
  }

  /**
   * Find global rules by plugin name
   */
  async findByPlugin(pluginName: string): Promise<GlobalRule[]> {
    const rules = await this.list();
    return rules.filter((rule) => rule.plugins && pluginName in rule.plugins);
  }

  /**
   * Add plugin to global rule
   */
  async addPlugin(
    id: string,
    pluginName: string,
    config: Record<string, unknown>,
  ): Promise<GlobalRule> {
    const rule = await this.get(id);
    const plugins = { ...rule.plugins, [pluginName]: config };
    return this.patch(id, { plugins });
  }

  /**
   * Remove plugin from global rule
   */
  async removePlugin(id: string, pluginName: string): Promise<GlobalRule> {
    const rule = await this.get(id);
    if (rule.plugins && pluginName in rule.plugins) {
      const plugins = { ...rule.plugins };
      delete plugins[pluginName];
      return this.patch(id, { plugins });
    }
    return rule;
  }

  /**
   * Update plugin configuration in global rule
   */
  async updatePlugin(
    id: string,
    pluginName: string,
    config: Record<string, unknown>,
  ): Promise<GlobalRule> {
    const rule = await this.get(id);
    if (rule.plugins && pluginName in rule.plugins) {
      const plugins = {
        ...rule.plugins,
        [pluginName]: {
          ...(rule.plugins[pluginName] as Record<string, unknown>),
          ...config,
        },
      };
      return this.patch(id, { plugins });
    }
    throw new Error(`Plugin ${pluginName} not found in global rule ${id}`);
  }

  /**
   * Clone a global rule with optional modifications
   */
  async clone(
    sourceId: string,
    modifications?: Partial<GlobalRule>,
    newId?: string,
  ): Promise<GlobalRule> {
    const source = await this.get(sourceId);

    // Remove fields that shouldn't be copied
    const { id, create_time, update_time, ...ruleData } = source;

    // Apply modifications
    const newRule = {
      ...ruleData,
      ...modifications,
    };

    return this.create(newRule, newId);
  }

  /**
   * Get global rule statistics
   */
  async getStatistics(): Promise<{
    total: number;
    pluginUsage: Record<string, number>;
    topPlugins: Array<{ plugin: string; count: number }>;
  }> {
    const rules = await this.list();
    const pluginUsage: Record<string, number> = {};

    for (const rule of rules) {
      if (rule.plugins) {
        for (const plugin of Object.keys(rule.plugins)) {
          pluginUsage[plugin] = (pluginUsage[plugin] || 0) + 1;
        }
      }
    }

    const topPlugins = Object.entries(pluginUsage)
      .map(([plugin, count]) => ({ plugin, count }))
      .sort((a, b) => b.count - a.count);

    return {
      total: rules.length,
      pluginUsage,
      topPlugins,
    };
  }
}
