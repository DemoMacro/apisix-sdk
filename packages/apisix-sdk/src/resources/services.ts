import type { ApisixClient } from "../client";
import type { CreateInput, ListOptions, Service, UpdateInput } from "../types";

export class Services {
  private readonly endpoint = "/services";
  private client: ApisixClient;

  constructor(client: ApisixClient) {
    this.client = client;
  }

  /**
   * List all services with optional pagination and filtering
   */
  async list(options?: ListOptions): Promise<Service[]> {
    const response = await this.client.list<Service>(
      this.client.getAdminEndpoint(this.endpoint),
      options,
    );
    return this.client.extractList(response);
  }

  /**
   * Get a specific service by ID
   */
  async get(id: string): Promise<Service> {
    const response = await this.client.getOne<Service>(
      this.client.getAdminEndpoint(this.endpoint),
      id,
    );
    return this.client.extractValue(response);
  }

  /**
   * Create a new service
   */
  async create(service: CreateInput<Service>, id?: string): Promise<Service> {
    const response = await this.client.create<Service>(
      this.client.getAdminEndpoint(this.endpoint),
      service,
      id,
    );
    return this.client.extractValue(response);
  }

  /**
   * Update an existing service
   */
  async update(id: string, service: UpdateInput<Service>): Promise<Service> {
    const response = await this.client.update<Service>(
      this.client.getAdminEndpoint(this.endpoint),
      id,
      service,
    );
    return this.client.extractValue(response);
  }

  /**
   * Partially update an existing service
   */
  async patch(id: string, service: UpdateInput<Service>): Promise<Service> {
    const response = await this.client.partialUpdate<Service>(
      this.client.getAdminEndpoint(this.endpoint),
      id,
      service,
    );
    return this.client.extractValue(response);
  }

  /**
   * Delete a service
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
   * Check if service exists
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
   * List services with pagination support (v3 API)
   */
  async listPaginated(
    page = 1,
    pageSize = 10,
    filters?: Record<string, string | number | boolean | undefined>,
  ): Promise<{
    services: Service[];
    total?: number;
    hasMore?: boolean;
  }> {
    // Check if pagination is supported in current version
    const supportsPagination = await this.client.supportsPagination();

    if (!supportsPagination) {
      // Fallback: use regular list and simulate pagination
      const allServices = await this.list(filters);
      const start = (page - 1) * pageSize;
      const end = start + pageSize;
      const paginatedServices = allServices.slice(start, end);

      return {
        services: paginatedServices,
        total: allServices.length,
        hasMore: end < allServices.length,
      };
    }

    // Use native pagination for v3+
    const options: ListOptions = {
      page,
      page_size: pageSize,
    };

    if (filters) {
      Object.assign(options, filters);
    }

    const response = await this.client.list<Service>(
      this.client.getAdminEndpoint(this.endpoint),
      options,
    );

    const paginationInfo = this.client.extractPaginationInfo(response);

    return {
      services: this.client.extractList(response),
      total: paginationInfo.total,
      hasMore: paginationInfo.hasMore,
    };
  }

  /**
   * Find services by name
   */
  async findByName(name: string): Promise<Service[]> {
    const services = await this.list();
    return services.filter((service) => service.name?.includes(name));
  }

  /**
   * Find services by host
   */
  async findByHost(host: string): Promise<Service[]> {
    const services = await this.list();
    return services.filter((service) => service.hosts?.includes(host));
  }

  /**
   * Clone a service with optional modifications
   */
  async clone(
    sourceId: string,
    modifications?: Partial<Service>,
    newId?: string,
  ): Promise<Service> {
    const source = await this.get(sourceId);

    // Remove fields that shouldn't be copied
    const { id, create_time, update_time, ...serviceData } = source;

    // Apply modifications
    const newService = {
      ...serviceData,
      ...modifications,
    };

    return this.create(newService, newId);
  }

  /**
   * Get service statistics
   */
  async getStatistics(): Promise<{
    total: number;
    upstreamServices: number;
    websocketEnabled: number;
    topPlugins: Array<{ plugin: string; count: number }>;
    hostCount: number;
    pluginConfigServices: number;
  }> {
    const services = await this.list();
    const pluginCount: Record<string, number> = {};
    let upstreamServices = 0;
    let websocketEnabled = 0;
    let pluginConfigServices = 0;
    const hosts = new Set<string>();

    for (const service of services) {
      // Count upstream services
      if (service.upstream_id || service.upstream) {
        upstreamServices++;
      }

      // Count websocket enabled services
      if (service.enable_websocket) {
        websocketEnabled++;
      }

      // Count plugin config services
      if (service.plugin_config_id) {
        pluginConfigServices++;
      }

      // Count plugins
      if (service.plugins) {
        for (const plugin of Object.keys(service.plugins)) {
          pluginCount[plugin] = (pluginCount[plugin] || 0) + 1;
        }
      }

      // Count hosts
      if (service.hosts) {
        for (const host of service.hosts) {
          hosts.add(host);
        }
      }
    }

    const topPlugins = Object.entries(pluginCount)
      .map(([plugin, count]) => ({ plugin, count }))
      .sort((a, b) => b.count - a.count);

    return {
      total: services.length,
      upstreamServices,
      websocketEnabled,
      topPlugins,
      hostCount: hosts.size,
      pluginConfigServices,
    };
  }
}
