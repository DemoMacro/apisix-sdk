import type { ApisixClient } from "../client";
import type { CreateInput, ListOptions, Route, UpdateInput } from "../types";

export class Routes {
  private readonly endpoint = "/routes";
  private client: ApisixClient;

  constructor(client: ApisixClient) {
    this.client = client;
  }

  /**
   * List all routes with optional pagination and filtering
   */
  async list(options?: ListOptions): Promise<Route[]> {
    const response = await this.client.list<Route>(
      this.client.getAdminEndpoint(this.endpoint),
      options,
    );
    return this.client.extractList(response);
  }

  /**
   * Get a specific route by ID
   */
  async get(id: string): Promise<Route> {
    const response = await this.client.getOne<Route>(
      this.client.getAdminEndpoint(this.endpoint),
      id,
    );
    return this.client.extractValue(response);
  }

  /**
   * Create a new route
   */
  async create(route: CreateInput<Route>, id?: string): Promise<Route> {
    const response = await this.client.create<Route>(
      this.client.getAdminEndpoint(this.endpoint),
      route,
      id,
    );
    return this.client.extractValue(response);
  }

  /**
   * Update an existing route
   */
  async update(id: string, route: UpdateInput<Route>): Promise<Route> {
    const response = await this.client.update<Route>(
      this.client.getAdminEndpoint(this.endpoint),
      id,
      route,
    );
    return this.client.extractValue(response);
  }

  /**
   * Partially update an existing route
   */
  async patch(id: string, route: UpdateInput<Route>): Promise<Route> {
    const response = await this.client.partialUpdate<Route>(
      this.client.getAdminEndpoint(this.endpoint),
      id,
      route,
    );
    return this.client.extractValue(response);
  }

  /**
   * Delete a route
   */
  async delete(id: string, options?: { force?: boolean }): Promise<boolean> {
    // Check if version supports features before using them
    const versionConfig = await this.client.getApiVersionConfig();

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
   * Check if route exists
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
   * List routes with pagination support (v3 API)
   */
  async listPaginated(
    page = 1,
    pageSize = 10,
    filters?: Record<string, string | number | boolean | undefined>,
  ): Promise<{
    routes: Route[];
    total?: number;
    hasMore?: boolean;
  }> {
    const options: ListOptions = {
      page,
      page_size: pageSize,
      ...filters,
    };

    const response = await this.client.list<Route>(
      this.client.getAdminEndpoint(this.endpoint),
      options,
    );

    return {
      routes: await this.client.extractList(response),
      total: response.total,
      hasMore: response.has_more,
    };
  }

  /**
   * Find routes by URI pattern
   */
  async findByUri(uriPattern: string): Promise<Route[]> {
    const routes = await this.list();
    return routes.filter(
      (route) =>
        route.uri?.includes(uriPattern) ||
        route.uris?.some((uri) => uri.includes(uriPattern)),
    );
  }

  /**
   * Find routes by method
   */
  async findByMethod(method: string): Promise<Route[]> {
    const routes = await this.list();
    return routes.filter((route) =>
      route.methods?.includes(method.toUpperCase()),
    );
  }

  /**
   * Find routes by host
   */
  async findByHost(host: string): Promise<Route[]> {
    const routes = await this.list();
    return routes.filter(
      (route) => route.host === host || route.hosts?.includes(host),
    );
  }

  /**
   * Enable a route
   */
  async enable(id: string): Promise<Route> {
    return this.patch(id, { status: 1 });
  }

  /**
   * Disable a route
   */
  async disable(id: string): Promise<Route> {
    return this.patch(id, { status: 0 });
  }

  /**
   * Clone a route with optional modifications
   */
  async clone(
    sourceId: string,
    modifications?: Partial<Route>,
    newId?: string,
  ): Promise<Route> {
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
   * Get route statistics
   */
  async getStatistics(): Promise<{
    total: number;
    enabledCount: number;
    disabledCount: number;
    methodDistribution: Array<{ method: string; count: number }>;
    topPlugins: Array<{ plugin: string; count: number }>;
    hostCount: number;
    serviceRoutes: number;
    upstreamRoutes: number;
  }> {
    const routes = await this.list();
    const methodCount: Record<string, number> = {};
    const pluginCount: Record<string, number> = {};
    let enabledCount = 0;
    let disabledCount = 0;
    let serviceRoutes = 0;
    let upstreamRoutes = 0;
    const hosts = new Set<string>();

    for (const route of routes) {
      // Count enabled/disabled
      if (route.status === 1) {
        enabledCount++;
      } else {
        disabledCount++;
      }

      // Count methods
      if (route.methods) {
        for (const method of route.methods) {
          methodCount[method] = (methodCount[method] || 0) + 1;
        }
      }

      // Count plugins
      if (route.plugins) {
        for (const plugin of Object.keys(route.plugins)) {
          pluginCount[plugin] = (pluginCount[plugin] || 0) + 1;
        }
      }

      // Count hosts
      if (route.host) {
        hosts.add(route.host);
      }
      if (route.hosts) {
        for (const host of route.hosts) {
          hosts.add(host);
        }
      }

      // Count route types
      if (route.service_id) {
        serviceRoutes++;
      }
      if (route.upstream || route.upstream_id) {
        upstreamRoutes++;
      }
    }

    const methodDistribution = Object.entries(methodCount).map(
      ([method, count]) => ({
        method,
        count,
      }),
    );

    const topPlugins = Object.entries(pluginCount)
      .map(([plugin, count]) => ({ plugin, count }))
      .sort((a, b) => b.count - a.count);

    return {
      total: routes.length,
      enabledCount,
      disabledCount,
      methodDistribution,
      topPlugins,
      hostCount: hosts.size,
      serviceRoutes,
      upstreamRoutes,
    };
  }
}
