import type { ApisixClient } from "../client";
import type {
  CreateInput,
  ListOptions,
  StreamRoute,
  UpdateInput,
} from "../types";

export class StreamRoutes {
  private readonly endpoint = "/stream_routes";
  private client: ApisixClient;

  constructor(client: ApisixClient) {
    this.client = client;
  }

  /**
   * List all stream routes with optional pagination and filtering
   */
  async list(options?: ListOptions): Promise<StreamRoute[]> {
    const response = await this.client.list<StreamRoute>(
      this.client.getAdminEndpoint(this.endpoint),
      options,
    );
    return this.client.extractList(response);
  }

  /**
   * Get a specific stream route by ID
   */
  async get(id: string): Promise<StreamRoute> {
    const response = await this.client.getOne<StreamRoute>(
      this.client.getAdminEndpoint(this.endpoint),
      id,
    );
    return this.client.extractValue(response);
  }

  /**
   * Create a new stream route
   */
  async create(
    streamRoute: CreateInput<StreamRoute>,
    id?: string,
  ): Promise<StreamRoute> {
    // Validate configuration before creating
    const validation = this.validateConfig(streamRoute);
    if (!validation.valid) {
      throw new Error(
        `Invalid stream route configuration: ${validation.errors.join(", ")}`,
      );
    }

    const response = await this.client.create<StreamRoute>(
      this.client.getAdminEndpoint(this.endpoint),
      streamRoute,
      id,
    );
    return this.client.extractValue(response);
  }

  /**
   * Update an existing stream route (full update)
   */
  async update(
    id: string,
    streamRoute: UpdateInput<StreamRoute>,
  ): Promise<StreamRoute> {
    // Validate configuration before updating
    if (Object.keys(streamRoute).length > 0) {
      const validation = this.validateConfig(
        streamRoute as CreateInput<StreamRoute>,
      );
      if (!validation.valid) {
        throw new Error(
          `Invalid stream route configuration: ${validation.errors.join(", ")}`,
        );
      }
    }

    const response = await this.client.update<StreamRoute>(
      this.client.getAdminEndpoint(this.endpoint),
      id,
      streamRoute,
    );
    return this.client.extractValue(response);
  }

  /**
   * Partially update an existing stream route
   * Note: PATCH method is not supported for stream routes in APISIX
   * This method will fall back to using PUT method
   */
  async patch(
    id: string,
    streamRoute: UpdateInput<StreamRoute>,
  ): Promise<StreamRoute> {
    console.warn(
      "PATCH method not supported for stream routes, using PUT instead",
    );

    try {
      // Get current stream route first
      const current = await this.get(id);

      // Merge with current data for complete update
      const mergedData = {
        ...current,
        ...streamRoute,
      };

      // Remove fields that shouldn't be in update request
      const { id: _, create_time, update_time, ...updateData } = mergedData;

      // Ensure we have either upstream, upstream_id, or service_id
      if (
        !updateData.upstream &&
        !updateData.upstream_id &&
        !updateData.service_id
      ) {
        // If none are provided, create a minimal upstream configuration
        updateData.upstream = {
          type: "roundrobin",
          nodes: {
            "127.0.0.1:1980": 1,
          },
        };
      }

      // Validate the merged configuration
      const validation = this.validateConfig(
        updateData as CreateInput<StreamRoute>,
      );
      if (!validation.valid) {
        throw new Error(
          `Invalid stream route configuration: ${validation.errors.join(", ")}`,
        );
      }

      return this.update(id, updateData);
    } catch (error) {
      if (error instanceof Error && error.message.includes("not supported")) {
        throw new Error("PATCH method is not supported for stream routes");
      }
      throw error;
    }
  }

  /**
   * Delete a stream route
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
   * Check if stream route exists
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
   * List stream routes with pagination support (v3 API)
   */
  async listPaginated(
    page = 1,
    pageSize = 10,
    filters?: Record<string, string | number | boolean | undefined>,
  ): Promise<{
    streamRoutes: StreamRoute[];
    total?: number;
    hasMore?: boolean;
  }> {
    // Check if pagination is supported in current version
    const supportsPagination = await this.client.supportsPagination();

    if (!supportsPagination) {
      // Fallback: use regular list and simulate pagination
      const allStreamRoutes = await this.list(filters);
      const start = (page - 1) * pageSize;
      const end = start + pageSize;
      const paginatedStreamRoutes = allStreamRoutes.slice(start, end);

      return {
        streamRoutes: paginatedStreamRoutes,
        total: allStreamRoutes.length,
        hasMore: end < allStreamRoutes.length,
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

    const response = await this.client.list<StreamRoute>(
      this.client.getAdminEndpoint(this.endpoint),
      options,
    );

    const paginationInfo = this.client.extractPaginationInfo(response);

    return {
      streamRoutes: this.client.extractList(response),
      total: paginationInfo.total,
      hasMore: paginationInfo.hasMore,
    };
  }

  /**
   * Find stream routes by server address
   */
  async findByServerAddress(serverAddr: string): Promise<StreamRoute[]> {
    const routes = await this.list();
    return routes.filter((route) => route.server_addr === serverAddr);
  }

  /**
   * Find stream routes by server port
   */
  async findByServerPort(serverPort: number): Promise<StreamRoute[]> {
    const routes = await this.list();
    return routes.filter((route) => route.server_port === serverPort);
  }

  /**
   * Find stream routes by protocol name
   */
  async findByProtocol(protocolName: string): Promise<StreamRoute[]> {
    const routes = await this.list();
    return routes.filter((route) => route.protocol?.name === protocolName);
  }

  /**
   * Find stream routes by SNI
   */
  async findBySNI(sni: string): Promise<StreamRoute[]> {
    const routes = await this.list();
    return routes.filter((route) => route.sni === sni);
  }

  /**
   * Find stream routes by remote address
   */
  async findByRemoteAddress(remoteAddr: string): Promise<StreamRoute[]> {
    const routes = await this.list();
    return routes.filter(
      (route) =>
        route.remote_addr === remoteAddr ||
        route.remote_addrs?.includes(remoteAddr),
    );
  }

  /**
   * Clone a stream route with optional modifications
   */
  async clone(
    sourceId: string,
    modifications?: Partial<StreamRoute>,
    newId?: string,
  ): Promise<StreamRoute> {
    const source = await this.get(sourceId);

    // Remove fields that shouldn't be copied
    const { id, create_time, update_time, ...routeData } = source;

    // Apply modifications
    const newRoute = {
      ...routeData,
      ...modifications,
    };

    return this.create(newRoute, newId);
  }

  /**
   * Create TCP stream route
   */
  async createTCPRoute(
    data: CreateInput<StreamRoute>,
    id?: string,
  ): Promise<StreamRoute> {
    // TCP routes don't need special protocol configuration
    return this.create(data, id);
  }

  /**
   * Create UDP stream route
   */
  async createUDPRoute(
    data: CreateInput<StreamRoute>,
    id?: string,
  ): Promise<StreamRoute> {
    // UDP routes don't need special protocol configuration
    return this.create(data, id);
  }

  /**
   * Create TLS stream route
   */
  async createTLSRoute(
    data: CreateInput<StreamRoute>,
    id?: string,
  ): Promise<StreamRoute> {
    // TLS routes may need upstream scheme configuration
    if (
      data.upstream &&
      typeof data.upstream === "object" &&
      !("scheme" in data.upstream)
    ) {
      data.upstream = { ...data.upstream, scheme: "tls" };
    }
    return this.create(data, id);
  }

  /**
   * Get stream routes by plugin
   */
  async getByPlugin(pluginName: string): Promise<StreamRoute[]> {
    const routes = await this.list();
    return routes.filter(
      (route) => route.plugins && pluginName in route.plugins,
    );
  }

  /**
   * Get stream routes by upstream ID
   */
  async getByUpstreamId(upstreamId: string): Promise<StreamRoute[]> {
    const routes = await this.list();
    return routes.filter((route) => route.upstream_id === upstreamId);
  }

  /**
   * Get stream routes by service ID
   */
  async getByServiceId(serviceId: string): Promise<StreamRoute[]> {
    const routes = await this.list();
    return routes.filter((route) => route.service_id === serviceId);
  }

  /**
   * Validate stream route configuration
   */
  validateConfig(config: CreateInput<StreamRoute>): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Check for basic requirements
    if (!config.upstream && !config.upstream_id && !config.service_id) {
      errors.push(
        "Stream route must have either upstream, upstream_id, or service_id",
      );
    }

    // Check for conflicting configurations
    if (config.upstream && config.upstream_id) {
      errors.push("Cannot specify both upstream and upstream_id");
    }

    if (config.upstream_id && config.service_id) {
      errors.push("Cannot specify both upstream_id and service_id");
    }

    // Validate server configuration
    if (config.server_addr && !config.server_port) {
      errors.push("server_port is required when server_addr is specified");
    }

    if (config.server_port && typeof config.server_port !== "number") {
      errors.push("server_port must be a number");
    }

    if (
      config.server_port &&
      (config.server_port < 1 || config.server_port > 65535)
    ) {
      errors.push("server_port must be between 1 and 65535");
    }

    // Validate remote address configuration
    if (config.remote_addr && config.remote_addrs) {
      errors.push("Cannot specify both remote_addr and remote_addrs");
    }

    // Validate upstream configuration if present
    if (config.upstream) {
      if (!config.upstream.nodes && !config.upstream.service_name) {
        errors.push("Upstream must have either nodes or service_name");
      }

      if (config.upstream.nodes) {
        if (Array.isArray(config.upstream.nodes)) {
          // Validate node array format
          for (const node of config.upstream.nodes) {
            if (!node.host || !node.port) {
              errors.push("Each upstream node must have host and port");
              break;
            }
          }
        } else if (typeof config.upstream.nodes === "object") {
          // Validate node object format (host:port => weight)
          for (const [nodeKey, weight] of Object.entries(
            config.upstream.nodes,
          )) {
            if (!nodeKey.includes(":") || typeof weight !== "number") {
              errors.push(
                "Upstream nodes object must be in format 'host:port': weight",
              );
              break;
            }
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
