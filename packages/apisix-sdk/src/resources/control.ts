import type { ApisixClient } from "../client";
import type {
  DiscoveryDump,
  DiscoveryDumpFile,
  HealthCheckStatus,
  PluginInfo,
  SchemaInfo,
  ServerInfo,
  UpstreamHealth,
} from "../types";

export class Control {
  private client: ApisixClient;

  constructor(client: ApisixClient) {
    this.client = client;
  }

  /**
   * Check if Control API is healthy
   */
  async isHealthy(): Promise<boolean> {
    try {
      const response =
        await this.client.controlRequest<HealthCheckStatus>("/v1/healthcheck");
      return response.status === "ok";
    } catch {
      return false;
    }
  }

  /**
   * Get server information
   */
  async getServerInfo(): Promise<ServerInfo> {
    return this.client.controlRequest<ServerInfo>("/v1/server_info");
  }

  /**
   * Get all available plugins information
   * Note: This endpoint is not available via Control API, use Admin API instead
   */
  async getPlugins(): Promise<PluginInfo[]> {
    try {
      // Use Admin API endpoint instead of Control API
      const response = await this.client.get<
        string[] | Record<string, boolean>
      >(this.client.getAdminEndpoint("/plugins/list"));

      // Handle different response formats
      if (Array.isArray(response)) {
        // If response is an array of plugin names
        return response.map((name) => ({
          name,
          enabled: true, // Assume enabled if listed
        })) as PluginInfo[];
      }
      // If response is an object with plugin states
      return Object.entries(response).map(([name, enabled]) => ({
        name,
        enabled,
      })) as PluginInfo[];
    } catch (error) {
      console.warn("Failed to get plugins from Admin API:", error);
      return [];
    }
  }

  /**
   * Get upstream health check status
   * Note: APISIX requires specific upstream ID for health check queries
   */
  async getUpstreamHealth(upstreamName?: string): Promise<UpstreamHealth[]> {
    try {
      if (upstreamName) {
        // Get specific upstream health
        const result = await this.client.controlRequest<UpstreamHealth>(
          `/v1/healthcheck/upstreams/${upstreamName}`,
        );
        return [result];
      }
      // Get all health check statuses (without specific upstream filter)
      const result =
        await this.client.controlRequest<UpstreamHealth[]>("/v1/healthcheck");
      return result;
    } catch (error) {
      console.warn("Upstream health check not available:", error);
      return [];
    }
  }

  /**
   * Get services dump for service discovery
   * Note: Requires service discovery to be configured (nacos, consul, eureka)
   */
  async getServiceDump(service = "nacos"): Promise<DiscoveryDump> {
    try {
      return await this.client.controlRequest<DiscoveryDump>(
        `/v1/discovery/${service}/dump`,
      );
    } catch (error) {
      throw new Error(
        `Service discovery '${service}' not configured or not available: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Get runtime upstreams information
   */
  async getUpstreams(): Promise<Record<string, unknown>[]> {
    return this.client.controlRequest<Record<string, unknown>[]>(
      "/v1/upstreams",
    );
  }

  /**
   * Get specific upstream runtime information
   */
  async getUpstream(upstreamId: string): Promise<Record<string, unknown>> {
    return this.client.controlRequest<Record<string, unknown>>(
      `/v1/upstreams/${upstreamId}`,
    );
  }

  /**
   * Get all available schemas
   */
  async getSchemas(): Promise<SchemaInfo> {
    return this.client.controlRequest<SchemaInfo>("/v1/schema");
  }

  /**
   * Get schema for a specific resource type
   */
  async getSchema(resourceType: string): Promise<Record<string, unknown>> {
    return this.client.controlRequest<Record<string, unknown>>(
      `/v1/schema/${resourceType}`,
    );
  }

  /**
   * Get schema for a specific plugin
   */
  async getPluginSchema(pluginName: string): Promise<Record<string, unknown>> {
    return this.client.controlRequest<Record<string, unknown>>(
      `/v1/schema/plugin/${pluginName}`,
    );
  }

  /**
   * Get discovery dump files list
   * Note: Requires service discovery to be configured
   */
  async getDiscoveryDumpFiles(service = "nacos"): Promise<DiscoveryDumpFile[]> {
    try {
      return await this.client.controlRequest<DiscoveryDumpFile[]>(
        `/v1/discovery/${service}/dump_files`,
      );
    } catch (error) {
      throw new Error(
        `Service discovery '${service}' dump files not available: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Get discovery dump file content
   */
  async getDiscoveryDumpFile(filename: string): Promise<string> {
    return this.client.controlRequest<string>(
      `/v1/discovery/nacos/dump_file/${filename}`,
    );
  }

  /**
   * Get all plugin metadata
   */
  async getPluginMetadata(): Promise<
    Array<{ id: string; [key: string]: unknown }>
  > {
    return this.client.controlRequest<
      Array<{ id: string; [key: string]: unknown }>
    >("/v1/plugin_metadatas");
  }

  /**
   * Get specific plugin metadata
   */
  async getPluginMetadataById(
    pluginName: string,
  ): Promise<{ id: string; [key: string]: unknown }> {
    return this.client.controlRequest<{ id: string; [key: string]: unknown }>(
      `/v1/plugin_metadata/${pluginName}`,
    );
  }

  /**
   * Get current APISIX configuration
   */
  async getConfig(): Promise<Record<string, unknown>> {
    return this.client.controlRequest<Record<string, unknown>>("/v1/config");
  }

  /**
   * Get active routes
   */
  async getRoutes(): Promise<Record<string, unknown>[]> {
    return this.client.controlRequest<Record<string, unknown>[]>("/v1/routes");
  }

  /**
   * Get specific route runtime information
   */
  async getRoute(routeId: string): Promise<Record<string, unknown>> {
    return this.client.controlRequest<Record<string, unknown>>(
      `/v1/routes/${routeId}`,
    );
  }

  /**
   * Get active services
   */
  async getServices(): Promise<Record<string, unknown>[]> {
    return this.client.controlRequest<Record<string, unknown>[]>(
      "/v1/services",
    );
  }

  /**
   * Get specific service runtime information
   */
  async getService(serviceId: string): Promise<Record<string, unknown>> {
    return this.client.controlRequest<Record<string, unknown>>(
      `/v1/services/${serviceId}`,
    );
  }

  /**
   * Get active consumers
   */
  async getConsumers(): Promise<Record<string, unknown>[]> {
    return this.client.controlRequest<Record<string, unknown>[]>(
      "/v1/consumers",
    );
  }

  /**
   * Get specific consumer runtime information
   */
  async getConsumer(consumerId: string): Promise<Record<string, unknown>> {
    return this.client.controlRequest<Record<string, unknown>>(
      `/v1/consumers/${consumerId}`,
    );
  }

  /**
   * Get SSL certificates
   */
  async getSSLCertificates(): Promise<Record<string, unknown>[]> {
    return this.client.controlRequest<Record<string, unknown>[]>("/v1/ssl");
  }

  /**
   * Get specific SSL certificate
   */
  async getSSLCertificate(certId: string): Promise<Record<string, unknown>> {
    return this.client.controlRequest<Record<string, unknown>>(
      `/v1/ssl/${certId}`,
    );
  }

  /**
   * Get global rules
   */
  async getGlobalRules(): Promise<Record<string, unknown>[]> {
    return this.client.controlRequest<Record<string, unknown>[]>(
      "/v1/global_rules",
    );
  }

  /**
   * Get specific global rule
   */
  async getGlobalRule(ruleId: string): Promise<Record<string, unknown>> {
    return this.client.controlRequest<Record<string, unknown>>(
      `/v1/global_rules/${ruleId}`,
    );
  }

  /**
   * Get consumer groups
   */
  async getConsumerGroups(): Promise<Record<string, unknown>[]> {
    return this.client.controlRequest<Record<string, unknown>[]>(
      "/v1/consumer_groups",
    );
  }

  /**
   * Get specific consumer group
   */
  async getConsumerGroup(groupId: string): Promise<Record<string, unknown>> {
    return this.client.controlRequest<Record<string, unknown>>(
      `/v1/consumer_groups/${groupId}`,
    );
  }

  /**
   * Trigger garbage collection
   */
  async triggerGC(): Promise<{ message: string }> {
    return this.client.controlRequest<{ message: string }>("/v1/gc", {
      method: "POST",
    });
  }

  /**
   * Get system overview with proper error handling for unavailable endpoints
   */
  async getSystemOverview(): Promise<{
    server: ServerInfo;
    schemas: SchemaInfo;
    health: boolean;
    upstreamHealth: UpstreamHealth[];
    discoveryServices?: Record<string, unknown>;
  }> {
    const [server, schemas] = await Promise.all([
      this.getServerInfo(),
      this.getSchemas(),
    ]);

    let health = false;
    try {
      const healthStatus = await this.healthCheck();
      health = healthStatus.status === "ok";
    } catch {
      // Health check not available
      health = false;
    }

    let upstreamHealth: UpstreamHealth[] = [];
    try {
      upstreamHealth = await this.getUpstreamHealth();
    } catch (error) {
      // Upstream health not available or requires specific ID
      console.warn("Upstream health check not available:", error);
      upstreamHealth = [];
    }

    const result = {
      server,
      schemas,
      health,
      upstreamHealth,
    };

    // Try to get discovery services via service dump instead of non-existent metrics endpoint
    try {
      const discoveryDump = await this.getServiceDump();
      (result as Record<string, unknown>).discoveryServices = discoveryDump;
    } catch {
      // Discovery services not available
    }

    return result;
  }

  /**
   * Get memory usage statistics
   */
  async getMemoryStats(): Promise<Record<string, unknown>> {
    return this.client.controlRequest<Record<string, unknown>>(
      "/v1/memory_stats",
    );
  }

  /**
   * Get Prometheus metrics (from Prometheus export server on port 9091)
   * Note: Prometheus metrics are NOT available via Control API port 9090
   */
  async getPrometheusMetrics(): Promise<string> {
    try {
      // Try the default Prometheus export server on port 9091
      const prometheusUrl = "http://127.0.0.1:9091/apisix/prometheus/metrics";
      const response = await fetch(prometheusUrl);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.text();
    } catch (error) {
      // Fallback: try via public API on port 9080 if export server is disabled
      try {
        const publicApiUrl = "http://127.0.0.1:9080/apisix/prometheus/metrics";
        const response = await fetch(publicApiUrl);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.text();
      } catch (fallbackError) {
        throw new Error(
          `Prometheus metrics not available on both 9091 and 9080 ports. Original error: ${error instanceof Error ? error.message : "Unknown error"}. Fallback error: ${fallbackError instanceof Error ? fallbackError.message : "Unknown error"}`,
        );
      }
    }
  }

  /**
   * Health check endpoint
   */
  async healthCheck(): Promise<HealthCheckStatus> {
    return this.client.controlRequest<HealthCheckStatus>("/v1/healthcheck");
  }

  /**
   * Trigger plugins reload
   */
  async reloadPlugins(): Promise<{ message: string }> {
    return this.client.controlRequest<{ message: string }>(
      "/v1/plugins/reload",
    );
  }

  /**
   * Validate data against APISIX schemas
   */
  async validateSchema(
    entityType:
      | "route"
      | "service"
      | "upstream"
      | "consumer"
      | "ssl"
      | "plugin",
    data: Record<string, unknown>,
    options?: {
      pluginName?: string;
      validatePlugins?: boolean;
    },
  ): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const result = {
      valid: true,
      errors: [] as string[],
      warnings: [] as string[],
    };

    try {
      const schemas = await this.getSchemas();
      const entitySchema = schemas.main[entityType];

      if (!entitySchema) {
        result.valid = false;
        result.errors.push(`Schema not found for entity type: ${entityType}`);
        return result;
      }

      // Basic validation (this would typically use a JSON schema validator)
      const validation = this.performBasicValidation(
        data,
        entitySchema.properties as Record<string, unknown>,
      );
      result.valid = validation.valid;
      result.errors.push(...validation.errors);
      result.warnings.push(...validation.warnings);

      // Validate plugins if requested
      if (options?.validatePlugins && data.plugins) {
        const pluginValidation = await this.validatePlugins(
          data.plugins as Record<string, unknown>,
          schemas.plugins,
        );
        if (!pluginValidation.valid) {
          result.valid = false;
        }
        result.errors.push(...pluginValidation.errors);
        result.warnings.push(...pluginValidation.warnings);
      }

      // Validate specific plugin if provided
      if (options?.pluginName && data[options.pluginName]) {
        const pluginSchema = schemas.plugins[options.pluginName];
        if (pluginSchema?.schema) {
          const pluginValidation = this.performBasicValidation(
            data[options.pluginName] as Record<string, unknown>,
            pluginSchema.schema as Record<string, unknown>,
          );
          if (!pluginValidation.valid) {
            result.valid = false;
          }
          result.errors.push(...pluginValidation.errors);
          result.warnings.push(...pluginValidation.warnings);
        }
      }
    } catch (error) {
      result.valid = false;
      const errorMessage =
        error instanceof Error ? error.message : "Validation error";
      result.errors.push(errorMessage);
    }

    return result;
  }

  /**
   * Validate multiple plugins configuration
   */
  private async validatePlugins(
    plugins: Record<string, unknown>,
    pluginSchemas: SchemaInfo["plugins"],
  ): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const result = {
      valid: true,
      errors: [] as string[],
      warnings: [] as string[],
    };

    for (const [pluginName, pluginConfig] of Object.entries(plugins)) {
      const schema = pluginSchemas[pluginName];

      if (!schema) {
        result.warnings.push(`Schema not found for plugin: ${pluginName}`);
        continue;
      }

      if (
        schema.schema &&
        typeof pluginConfig === "object" &&
        pluginConfig !== null
      ) {
        const validation = this.performBasicValidation(
          pluginConfig as Record<string, unknown>,
          schema.schema as Record<string, unknown>,
        );

        if (!validation.valid) {
          result.valid = false;
          result.errors.push(
            ...validation.errors.map((err) => `${pluginName}: ${err}`),
          );
        }

        result.warnings.push(
          ...validation.warnings.map((warn) => `${pluginName}: ${warn}`),
        );
      }
    }

    return result;
  }

  /**
   * Basic validation logic (placeholder for proper JSON schema validation)
   */
  private performBasicValidation(
    data: Record<string, unknown>,
    schema: Record<string, unknown>,
  ): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const result = {
      valid: true,
      errors: [] as string[],
      warnings: [] as string[],
    };

    // This is a simplified validation - in practice, you'd use a proper JSON schema validator
    // like ajv or similar

    // Check required fields (if schema defines them)
    const required = schema.required as string[] | undefined;
    if (required) {
      for (const field of required) {
        if (
          !(field in data) ||
          data[field] === undefined ||
          data[field] === null
        ) {
          result.valid = false;
          result.errors.push(`Required field missing: ${field}`);
        }
      }
    }

    // Check for unknown fields (if schema is strict)
    const properties = schema.properties as Record<string, unknown> | undefined;
    if (properties) {
      for (const field of Object.keys(data)) {
        if (!(field in properties)) {
          result.warnings.push(`Unknown field: ${field}`);
        }
      }
    }

    return result;
  }

  /**
   * Get configuration validation recommendations
   */
  async getValidationRecommendations(): Promise<{
    schemaVersion: string;
    availablePlugins: string[];
    deprecatedPlugins: string[];
    recommendedSettings: Array<{
      category: string;
      setting: string;
      description: string;
      recommended: unknown;
    }>;
  }> {
    const [schemas, serverInfo] = await Promise.all([
      this.getSchemas(),
      this.getServerInfo(),
    ]);

    const availablePlugins = Object.keys(schemas.plugins);
    const deprecatedPlugins = Object.entries(schemas.plugins)
      .filter(([, plugin]) => plugin.type === "deprecated")
      .map(([name]) => name);

    const recommendedSettings = [
      {
        category: "Security",
        setting: "enable_http2",
        description: "Enable HTTP/2 for better performance",
        recommended: true,
      },
      {
        category: "Performance",
        setting: "worker_processes",
        description: "Set worker processes to match CPU cores",
        recommended: "auto",
      },
      {
        category: "Monitoring",
        setting: "enable_prometheus",
        description: "Enable Prometheus metrics collection",
        recommended: true,
      },
    ];

    return {
      schemaVersion: serverInfo.version,
      availablePlugins,
      deprecatedPlugins,
      recommendedSettings,
    };
  }

  /**
   * Get schema compatibility information
   */
  async getSchemaCompatibility(targetVersion?: string): Promise<{
    currentVersion: string;
    targetVersion: string;
    compatible: boolean;
    breaking_changes: string[];
    new_features: string[];
    deprecated_features: string[];
  }> {
    const serverInfo = await this.getServerInfo();
    const current = serverInfo.version;
    const target = targetVersion || current;

    // This would typically involve comparing schema versions
    // For now, we'll provide a basic implementation

    return {
      currentVersion: current,
      targetVersion: target,
      compatible: this.compareVersions(current, target) >= 0,
      breaking_changes: [],
      new_features: [],
      deprecated_features: [],
    };
  }

  /**
   * Compare version strings
   */
  private compareVersions(version1: string, version2: string): number {
    const v1Parts = version1.split(".").map(Number);
    const v2Parts = version2.split(".").map(Number);

    const maxLength = Math.max(v1Parts.length, v2Parts.length);

    for (let i = 0; i < maxLength; i++) {
      const v1Part = v1Parts[i] || 0;
      const v2Part = v2Parts[i] || 0;

      if (v1Part < v2Part) return -1;
      if (v1Part > v2Part) return 1;
    }

    return 0;
  }
}
