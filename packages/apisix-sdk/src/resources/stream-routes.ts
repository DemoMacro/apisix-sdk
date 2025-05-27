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
    const response = await this.client.create<StreamRoute>(
      this.client.getAdminEndpoint(this.endpoint),
      streamRoute,
      id,
    );
    return this.client.extractValue(response);
  }

  /**
   * Update an existing stream route
   */
  async update(
    id: string,
    streamRoute: UpdateInput<StreamRoute>,
  ): Promise<StreamRoute> {
    const response = await this.client.update<StreamRoute>(
      this.client.getAdminEndpoint(this.endpoint),
      id,
      streamRoute,
    );
    return this.client.extractValue(response);
  }

  /**
   * Partially update an existing stream route
   */
  async patch(
    id: string,
    streamRoute: UpdateInput<StreamRoute>,
  ): Promise<StreamRoute> {
    const response = await this.client.partialUpdate<StreamRoute>(
      this.client.getAdminEndpoint(this.endpoint),
      id,
      streamRoute,
    );
    return this.client.extractValue(response);
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
   * List stream routes with pagination support
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
    const options: ListOptions = {
      page,
      page_size: pageSize,
      ...filters,
    };

    const response = await this.client.list<StreamRoute>(
      this.client.getAdminEndpoint(this.endpoint),
      options,
    );

    return {
      streamRoutes: this.client.extractList(response),
      total: response.total,
      hasMore: response.has_more,
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
   * Find stream routes by SNI (Server Name Indication)
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
   * Create a TCP stream route
   */
  async createTCPRoute(
    config: {
      server_addr?: string;
      server_port: number;
      remote_addr?: string;
      upstream_id?: string;
      upstream?: object;
      plugins?: Record<string, unknown>;
    },
    id?: string,
  ): Promise<StreamRoute> {
    const streamRoute: CreateInput<StreamRoute> = {
      ...config,
      protocol: {
        name: "tcp",
      },
    };

    return this.create(streamRoute, id);
  }

  /**
   * Create a UDP stream route
   */
  async createUDPRoute(
    config: {
      server_addr?: string;
      server_port: number;
      remote_addr?: string;
      upstream_id?: string;
      upstream?: object;
      plugins?: Record<string, unknown>;
    },
    id?: string,
  ): Promise<StreamRoute> {
    const streamRoute: CreateInput<StreamRoute> = {
      ...config,
      protocol: {
        name: "udp",
      },
    };

    return this.create(streamRoute, id);
  }

  /**
   * Create a TLS stream route
   */
  async createTLSRoute(
    config: {
      server_addr?: string;
      server_port: number;
      sni?: string;
      remote_addr?: string;
      upstream_id?: string;
      upstream?: object;
      plugins?: Record<string, unknown>;
    },
    id?: string,
  ): Promise<StreamRoute> {
    const streamRoute: CreateInput<StreamRoute> = {
      ...config,
      protocol: {
        name: "tls",
      },
    };

    return this.create(streamRoute, id);
  }

  /**
   * Get stream routes with specific plugin
   */
  async getByPlugin(pluginName: string): Promise<StreamRoute[]> {
    const routes = await this.list();
    return routes.filter(
      (route) =>
        route.plugins && Object.keys(route.plugins).includes(pluginName),
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

    // Check required fields
    if (!config.server_port) {
      errors.push("server_port is required");
    }

    // Validate port range
    if (
      config.server_port &&
      (config.server_port < 1 || config.server_port > 65535)
    ) {
      errors.push("server_port must be between 1 and 65535");
    }

    // Check upstream configuration
    if (!config.upstream_id && !config.upstream && !config.service_id) {
      errors.push(
        "Either upstream_id, upstream object, or service_id must be provided",
      );
    }

    // Validate protocol configuration
    if (
      config.protocol?.name &&
      !["tcp", "udp", "tls"].includes(config.protocol.name)
    ) {
      errors.push("Protocol name must be one of: tcp, udp, tls");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
