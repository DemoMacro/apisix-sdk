import type { ApisixClient } from "../client";
import type {
  ConsumerGroup,
  CreateInput,
  ListOptions,
  UpdateInput,
} from "../types";

export class ConsumerGroups {
  private readonly endpoint = "/consumer_groups";
  private client: ApisixClient;

  constructor(client: ApisixClient) {
    this.client = client;
  }

  /**
   * List all consumer groups with optional pagination and filtering
   */
  async list(options?: ListOptions): Promise<ConsumerGroup[]> {
    const response = await this.client.list<ConsumerGroup>(
      this.client.getAdminEndpoint(this.endpoint),
      options,
    );
    return this.client.extractList(response);
  }

  /**
   * Get a specific consumer group by ID
   */
  async get(id: string): Promise<ConsumerGroup> {
    const response = await this.client.getOne<ConsumerGroup>(
      this.client.getAdminEndpoint(this.endpoint),
      id,
    );
    return this.client.extractValue(response);
  }

  /**
   * Create a new consumer group
   */
  async create(
    consumerGroup: CreateInput<ConsumerGroup>,
    id?: string,
  ): Promise<ConsumerGroup> {
    const response = await this.client.create<ConsumerGroup>(
      this.client.getAdminEndpoint(this.endpoint),
      consumerGroup,
      id,
    );
    return this.client.extractValue(response);
  }

  /**
   * Update an existing consumer group
   */
  async update(
    id: string,
    consumerGroup: UpdateInput<ConsumerGroup>,
  ): Promise<ConsumerGroup> {
    const response = await this.client.update<ConsumerGroup>(
      this.client.getAdminEndpoint(this.endpoint),
      id,
      consumerGroup,
    );
    return this.client.extractValue(response);
  }

  /**
   * Partially update an existing consumer group
   */
  async patch(
    id: string,
    consumerGroup: UpdateInput<ConsumerGroup>,
  ): Promise<ConsumerGroup> {
    const response = await this.client.partialUpdate<ConsumerGroup>(
      this.client.getAdminEndpoint(this.endpoint),
      id,
      consumerGroup,
    );
    return this.client.extractValue(response);
  }

  /**
   * Delete a consumer group
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
   * Check if consumer group exists
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
   * List consumer groups with pagination support (v3 API)
   */
  async listPaginated(
    page = 1,
    pageSize = 10,
    filters?: Record<string, string | number | boolean | undefined>,
  ): Promise<{
    consumerGroups: ConsumerGroup[];
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

    const response = await this.client.list<ConsumerGroup>(
      this.client.getAdminEndpoint(this.endpoint),
      options,
    );

    return {
      consumerGroups: this.client.extractList(response),
      total: response.total,
      hasMore: response.has_more,
    };
  }

  /**
   * Find consumer groups by label
   */
  async findByLabel(key: string, value?: string): Promise<ConsumerGroup[]> {
    const groups = await this.list();
    return groups.filter((group) => {
      if (!group.labels) return false;
      if (value) {
        return group.labels[key] === value;
      }
      return key in group.labels;
    });
  }

  /**
   * Find consumer groups by plugin name
   */
  async findByPlugin(pluginName: string): Promise<ConsumerGroup[]> {
    const groups = await this.list();
    return groups.filter(
      (group) => group.plugins && pluginName in group.plugins,
    );
  }

  /**
   * Add plugin to consumer group
   */
  async addPlugin(
    id: string,
    pluginName: string,
    config: Record<string, unknown>,
  ): Promise<ConsumerGroup> {
    const group = await this.get(id);
    const plugins = { ...group.plugins, [pluginName]: config };
    return this.patch(id, { plugins });
  }

  /**
   * Remove plugin from consumer group
   */
  async removePlugin(id: string, pluginName: string): Promise<ConsumerGroup> {
    const group = await this.get(id);
    if (group.plugins && pluginName in group.plugins) {
      const plugins = { ...group.plugins };
      delete plugins[pluginName];
      return this.patch(id, { plugins });
    }
    return group;
  }

  /**
   * Update plugin configuration in consumer group
   */
  async updatePlugin(
    id: string,
    pluginName: string,
    config: Record<string, unknown>,
  ): Promise<ConsumerGroup> {
    const group = await this.get(id);
    if (group.plugins && pluginName in group.plugins) {
      const plugins = {
        ...group.plugins,
        [pluginName]: {
          ...(group.plugins[pluginName] as Record<string, unknown>),
          ...config,
        },
      };
      return this.patch(id, { plugins });
    }
    throw new Error(`Plugin ${pluginName} not found in consumer group ${id}`);
  }

  /**
   * Add label to consumer group
   */
  async addLabel(
    id: string,
    key: string,
    value: string,
  ): Promise<ConsumerGroup> {
    const group = await this.get(id);
    const labels = { ...group.labels, [key]: value };
    return this.patch(id, { labels });
  }

  /**
   * Remove label from consumer group
   */
  async removeLabel(id: string, key: string): Promise<ConsumerGroup> {
    const group = await this.get(id);
    if (group.labels && key in group.labels) {
      const labels = { ...group.labels };
      delete labels[key];
      return this.patch(id, { labels });
    }
    return group;
  }

  /**
   * Clone a consumer group with optional modifications
   */
  async clone(
    sourceId: string,
    modifications?: Partial<ConsumerGroup>,
    newId?: string,
  ): Promise<ConsumerGroup> {
    const source = await this.get(sourceId);

    // Remove fields that shouldn't be copied
    const { id, create_time, update_time, ...groupData } = source;

    // Apply modifications
    const newGroup = {
      ...groupData,
      ...modifications,
    };

    return this.create(newGroup, newId);
  }

  /**
   * Get consumer group statistics
   */
  async getStatistics(): Promise<{
    total: number;
    pluginUsage: Record<string, number>;
    labelUsage: Record<string, number>;
    topPlugins: Array<{ plugin: string; count: number }>;
    topLabels: Array<{ label: string; count: number }>;
  }> {
    const groups = await this.list();
    const pluginUsage: Record<string, number> = {};
    const labelUsage: Record<string, number> = {};

    for (const group of groups) {
      // Count plugin usage
      if (group.plugins) {
        for (const plugin of Object.keys(group.plugins)) {
          pluginUsage[plugin] = (pluginUsage[plugin] || 0) + 1;
        }
      }

      // Count label usage
      if (group.labels) {
        for (const label of Object.keys(group.labels)) {
          labelUsage[label] = (labelUsage[label] || 0) + 1;
        }
      }
    }

    const topPlugins = Object.entries(pluginUsage)
      .map(([plugin, count]) => ({ plugin, count }))
      .sort((a, b) => b.count - a.count);

    const topLabels = Object.entries(labelUsage)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);

    return {
      total: groups.length,
      pluginUsage,
      labelUsage,
      topPlugins,
      topLabels,
    };
  }
}
