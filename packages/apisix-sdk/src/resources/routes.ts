import type { ApisixClient } from "../client";
import type {
  CreateInput,
  ListOptions,
  Route,
  UpdateInput,
  Upstream,
} from "../types";

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

    const stats = {
      total: routes.length,
      enabledCount: routes.filter((r) => r.status === 1).length,
      disabledCount: routes.filter((r) => r.status === 0).length,
      methodDistribution: [] as Array<{ method: string; count: number }>,
      topPlugins: [] as Array<{ plugin: string; count: number }>,
      hostCount: new Set(routes.flatMap((r) => r.hosts || [])).size,
      serviceRoutes: routes.filter((r) => r.service_id).length,
      upstreamRoutes: routes.filter((r) => r.upstream || r.upstream_id).length,
    };

    // Calculate method distribution
    const methodCounts = new Map<string, number>();
    for (const route of routes) {
      if (route.methods) {
        for (const method of route.methods) {
          methodCounts.set(method, (methodCounts.get(method) || 0) + 1);
        }
      }
    }
    stats.methodDistribution = Array.from(methodCounts.entries())
      .map(([method, count]) => ({ method, count }))
      .sort((a, b) => b.count - a.count);

    // Calculate plugin usage
    const pluginCounts = new Map<string, number>();
    for (const route of routes) {
      if (route.plugins) {
        for (const plugin of Object.keys(route.plugins)) {
          pluginCounts.set(plugin, (pluginCounts.get(plugin) || 0) + 1);
        }
      }
    }
    stats.topPlugins = Array.from(pluginCounts.entries())
      .map(([plugin, count]) => ({ plugin, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return stats;
  }

  /**
   * Batch operations on routes
   */
  async batchOperations(
    operations: Array<{
      operation: "create" | "update" | "delete";
      id?: string;
      data?: CreateInput<Route> | UpdateInput<Route>;
    }>,
  ): Promise<{
    total: number;
    successful: number;
    failed: number;
    results: Array<{
      success: boolean;
      id?: string;
      data?: Route;
      error?: string;
    }>;
  }> {
    return this.client.batch<Route>(
      this.client.getAdminEndpoint(this.endpoint),
      operations,
    );
  }

  /**
   * Advanced search with multiple criteria
   */
  async search(criteria: {
    uri?: string;
    uriPattern?: string;
    methods?: string[];
    hosts?: string[];
    plugins?: string[];
    status?: 0 | 1;
    hasUpstream?: boolean;
    hasService?: boolean;
    labels?: Record<string, string>;
    createdAfter?: Date;
    createdBefore?: Date;
  }): Promise<Route[]> {
    const routes = await this.list();

    return routes.filter((route) => {
      // URI filtering
      if (criteria.uri && route.uri !== criteria.uri) {
        return false;
      }

      if (criteria.uriPattern) {
        const pattern = criteria.uriPattern;
        const hasMatchingUri =
          route.uri?.includes(pattern) ||
          route.uris?.some((uri) => uri.includes(pattern));
        if (!hasMatchingUri) {
          return false;
        }
      }

      // Method filtering
      if (criteria.methods && criteria.methods.length > 0) {
        const hasMatchingMethod = criteria.methods.some((method) =>
          route.methods?.includes(method.toUpperCase()),
        );
        if (!hasMatchingMethod) {
          return false;
        }
      }

      // Host filtering
      if (criteria.hosts && criteria.hosts.length > 0) {
        const hasMatchingHost = criteria.hosts.some(
          (host) => route.host === host || route.hosts?.includes(host),
        );
        if (!hasMatchingHost) {
          return false;
        }
      }

      // Plugin filtering
      if (criteria.plugins && criteria.plugins.length > 0) {
        const routePlugins = route.plugins ? Object.keys(route.plugins) : [];
        const hasMatchingPlugin = criteria.plugins.some((plugin) =>
          routePlugins.includes(plugin),
        );
        if (!hasMatchingPlugin) {
          return false;
        }
      }

      // Status filtering
      if (criteria.status !== undefined && route.status !== criteria.status) {
        return false;
      }

      // Upstream/Service filtering
      if (criteria.hasUpstream !== undefined) {
        const hasUpstream = !!(route.upstream || route.upstream_id);
        if (criteria.hasUpstream !== hasUpstream) {
          return false;
        }
      }

      if (criteria.hasService !== undefined) {
        const hasService = !!route.service_id;
        if (criteria.hasService !== hasService) {
          return false;
        }
      }

      // Label filtering
      if (criteria.labels) {
        const routeLabels = route.labels || {};
        const hasMatchingLabels = Object.entries(criteria.labels).every(
          ([key, value]) => routeLabels[key] === value,
        );
        if (!hasMatchingLabels) {
          return false;
        }
      }

      // Date filtering
      if (criteria.createdAfter && route.create_time) {
        if (route.create_time < criteria.createdAfter.getTime() / 1000) {
          return false;
        }
      }

      if (criteria.createdBefore && route.create_time) {
        if (route.create_time > criteria.createdBefore.getTime() / 1000) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Import routes from OpenAPI specification
   */
  async importFromOpenAPI(
    spec: {
      openapi: string;
      info: { title: string; version: string; description?: string };
      paths: Record<string, Record<string, Record<string, unknown>>>;
    },
    options?: {
      strategy?: "replace" | "merge" | "skip_existing";
      defaultUpstream?: Upstream;
      validateBeforeImport?: boolean;
    },
  ): Promise<{
    total: number;
    created: number;
    updated: number;
    skipped: number;
    errors: Array<{ path?: string; method?: string; error: string }>;
  }> {
    const result = {
      total: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [] as Array<{ path?: string; method?: string; error: string }>,
    };

    for (const [path, pathItem] of Object.entries(spec.paths)) {
      for (const [method, operation] of Object.entries(pathItem)) {
        if (
          ![
            "get",
            "post",
            "put",
            "delete",
            "patch",
            "head",
            "options",
          ].includes(method)
        ) {
          continue;
        }

        result.total++;

        try {
          // Helper function to safely get string property
          const getString = (value: unknown): string | undefined => {
            return typeof value === "string" ? value : undefined;
          };

          // Helper function to safely get number property
          const getNumber = (value: unknown): number | undefined => {
            return typeof value === "number" ? value : undefined;
          };

          // Helper function to safely get boolean property
          const getBoolean = (value: unknown): boolean | undefined => {
            return typeof value === "boolean" ? value : undefined;
          };

          // Helper function to safely get status (0 or 1)
          const getStatus = (value: unknown): 0 | 1 | undefined => {
            if (value === 0 || value === 1) return value;
            return undefined;
          };

          // Helper function to safely get object property
          const getObject = (
            value: unknown,
          ): Record<string, unknown> | undefined => {
            return value && typeof value === "object" && !Array.isArray(value)
              ? (value as Record<string, unknown>)
              : undefined;
          };

          // Helper function to safely get upstream object
          const getUpstream = (value: unknown): Upstream | undefined => {
            if (!value || typeof value !== "object" || Array.isArray(value)) {
              return undefined;
            }
            const obj = value as Record<string, unknown>;

            // Basic validation - at least check for common upstream properties
            if (typeof obj.type === "string" || obj.nodes || obj.service_name) {
              return obj as Upstream;
            }
            return undefined;
          };

          // Helper function to safely get string record
          const getStringRecord = (
            value: unknown,
          ): Record<string, string> | undefined => {
            if (!value || typeof value !== "object" || Array.isArray(value)) {
              return undefined;
            }
            const obj = value as Record<string, unknown>;
            const result: Record<string, string> = {};
            for (const [key, val] of Object.entries(obj)) {
              if (typeof val === "string") {
                result[key] = val;
              }
            }
            return Object.keys(result).length > 0 ? result : undefined;
          };

          // Helper function to safely get vars array
          const getVars = (
            value: unknown,
          ): [string, string, string][] | undefined => {
            if (!Array.isArray(value)) return undefined;
            const result: [string, string, string][] = [];
            for (const item of value) {
              if (
                Array.isArray(item) &&
                item.length >= 3 &&
                typeof item[0] === "string" &&
                typeof item[1] === "string" &&
                typeof item[2] === "string"
              ) {
                result.push([item[0], item[1], item[2]]);
              }
            }
            return result.length > 0 ? result : undefined;
          };

          const operationId = getString(operation.operationId);
          const summary = getString(operation.summary);
          const description = getString(operation.description);

          const route: CreateInput<Route> = {
            name:
              operationId || `${method}_${path.replace(/[^a-zA-Z0-9]/g, "_")}`,
            desc: summary || description,
            uri: path,
            methods: [method.toUpperCase()],
            upstream:
              getUpstream(operation["x-apisix-upstream"]) ||
              options?.defaultUpstream,
            service_id: getString(operation["x-apisix-service_id"]),
            plugins: getObject(operation["x-apisix-plugins"]),
            status: getStatus(operation["x-apisix-status"]) || 1,
            priority: getNumber(operation["x-apisix-priority"]),
            enable_websocket: getBoolean(operation["x-apisix-enableWebsocket"]),
            labels: getStringRecord(operation["x-apisix-labels"]),
            vars: getVars(operation["x-apisix-vars"]),
          };

          // Validate route if requested
          if (options?.validateBeforeImport) {
            if (!route.upstream && !route.service_id && !route.upstream_id) {
              throw new Error(
                "Route must have upstream, service_id, or upstream_id",
              );
            }
          }

          const routeId = operationId;
          const strategy = options?.strategy || "merge";

          if (routeId && strategy !== "replace") {
            const exists = await this.exists(routeId);

            if (exists) {
              if (strategy === "skip_existing") {
                result.skipped++;
                continue;
              }
              if (strategy === "merge") {
                await this.update(routeId, route);
                result.updated++;
                continue;
              }
            }
          }

          await this.create(route, routeId);
          result.created++;
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Import error";
          result.errors.push({
            path,
            method,
            error: errorMessage,
          });
        }
      }
    }

    return result;
  }

  /**
   * Export routes to OpenAPI specification
   */
  async exportToOpenAPI(options?: {
    title?: string;
    version?: string;
    description?: string;
    serverUrl?: string;
    includeDisabled?: boolean;
    filterByLabels?: Record<string, string>;
  }): Promise<{
    openapi: string;
    info: { title: string; version: string; description?: string };
    servers?: Array<{ url: string }>;
    paths: Record<string, Record<string, Record<string, unknown>>>;
  }> {
    let routes = await this.list();

    // Filter routes if needed
    if (!options?.includeDisabled) {
      routes = routes.filter((route) => route.status === 1);
    }

    if (options?.filterByLabels) {
      const filterLabels = options.filterByLabels;
      routes = routes.filter((route) => {
        if (!route.labels) return false;
        return Object.entries(filterLabels).every(
          ([key, value]) => route.labels?.[key] === value,
        );
      });
    }

    const spec = {
      openapi: "3.0.0",
      info: {
        title: options?.title || "APISIX Routes",
        version: options?.version || "1.0.0",
        description: options?.description || "Generated from APISIX routes",
      },
      servers: options?.serverUrl ? [{ url: options.serverUrl }] : undefined,
      paths: {} as Record<string, Record<string, Record<string, unknown>>>,
    };

    for (const route of routes) {
      const path = route.uri || route.uris?.[0];
      if (!path) continue;

      if (!spec.paths[path]) {
        spec.paths[path] = {};
      }

      const methods = route.methods || ["GET"];
      for (const method of methods) {
        const operation: Record<string, unknown> = {
          operationId: route.name || route.id,
          summary: route.desc,
          description: route.desc,
        };

        // Add APISIX extensions
        if (route.upstream) {
          operation["x-apisix-upstream"] = route.upstream;
        }
        if (route.upstream_id) {
          operation["x-apisix-upstream_id"] = route.upstream_id;
        }
        if (route.service_id) {
          operation["x-apisix-service_id"] = route.service_id;
        }
        if (route.plugins && Object.keys(route.plugins).length > 0) {
          operation["x-apisix-plugins"] = route.plugins;
        }
        if (route.status !== undefined) {
          operation["x-apisix-status"] = route.status;
        }
        if (route.priority !== undefined) {
          operation["x-apisix-priority"] = route.priority;
        }
        if (route.enable_websocket !== undefined) {
          operation["x-apisix-enableWebsocket"] = route.enable_websocket;
        }
        if (route.labels && Object.keys(route.labels).length > 0) {
          operation["x-apisix-labels"] = route.labels;
        }
        if (route.vars && route.vars.length > 0) {
          operation["x-apisix-vars"] = route.vars;
        }

        // Add basic response
        operation.responses = {
          "200": {
            description: "Successful response",
          },
          default: {
            description: "Error response",
          },
        };

        spec.paths[path][method.toLowerCase()] = operation;
      }
    }

    return spec;
  }
}
