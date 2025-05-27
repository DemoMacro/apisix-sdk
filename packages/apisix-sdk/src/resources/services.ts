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
    const options: ListOptions = {
      page,
      page_size: pageSize,
      ...filters,
    };

    const response = await this.client.list<Service>(
      this.client.getAdminEndpoint(this.endpoint),
      options,
    );

    return {
      services: this.client.extractList(response),
      total: response.total,
      hasMore: response.has_more,
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
}
