import type { ApisixClient } from "../client";
import type {
  ConnectionStatistics,
  DiscoveryDump,
  DiscoveryDumpFile,
  DiscoveryDumpNode,
  DiscoveryServices,
  HealthCheckStatus,
  PluginInfo,
  RequestStatistics,
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
      const response = await this.client.get<HealthCheckStatus>(
        this.client.getControlEndpoint("/v1/healthcheck"),
      );
      return response.status === "ok";
    } catch {
      return false;
    }
  }

  /**
   * Get server information
   */
  async getServerInfo(): Promise<ServerInfo> {
    return this.client.get<ServerInfo>(
      this.client.getControlEndpoint("/v1/server_info"),
    );
  }

  /**
   * Get all available plugins information
   */
  async getPlugins(): Promise<PluginInfo[]> {
    return this.client.get<PluginInfo[]>(
      this.client.getControlEndpoint("/v1/plugins"),
    );
  }

  /**
   * Get upstream health check status
   */
  async getUpstreamHealth(upstreamName?: string): Promise<UpstreamHealth[]> {
    const endpoint = upstreamName
      ? `/v1/healthcheck/upstreams/${upstreamName}`
      : "/v1/healthcheck/upstreams";

    return this.client.get<UpstreamHealth[]>(
      this.client.getControlEndpoint(endpoint),
    );
  }

  /**
   * Get services dump for service discovery
   */
  async getServiceDump(): Promise<DiscoveryDump> {
    return this.client.get<DiscoveryDump>(
      this.client.getControlEndpoint("/v1/discovery/nacos/dump"),
    );
  }

  /**
   * Get runtime upstreams information
   */
  async getUpstreams(): Promise<Record<string, unknown>[]> {
    return this.client.get<Record<string, unknown>[]>(
      this.client.getControlEndpoint("/v1/upstreams"),
    );
  }

  /**
   * Get specific upstream runtime information
   */
  async getUpstream(upstreamId: string): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(
      this.client.getControlEndpoint(`/v1/upstreams/${upstreamId}`),
    );
  }

  /**
   * Get all available schemas
   */
  async getSchemas(): Promise<SchemaInfo> {
    return this.client.get<SchemaInfo>(
      this.client.getControlEndpoint("/v1/schema"),
    );
  }

  /**
   * Get schema for a specific resource type
   */
  async getSchema(resourceType: string): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(
      this.client.getControlEndpoint(`/v1/schema/${resourceType}`),
    );
  }

  /**
   * Get schema for a specific plugin
   */
  async getPluginSchema(pluginName: string): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(
      this.client.getControlEndpoint(`/v1/schema/plugin/${pluginName}`),
    );
  }

  /**
   * Get discovery dump files list
   */
  async getDiscoveryDumpFiles(): Promise<DiscoveryDumpFile[]> {
    return this.client.get<DiscoveryDumpFile[]>(
      this.client.getControlEndpoint("/v1/discovery/nacos/dump_files"),
    );
  }

  /**
   * Get discovery dump file content
   */
  async getDiscoveryDumpFile(filename: string): Promise<string> {
    return this.client.get<string>(
      this.client.getControlEndpoint(
        `/v1/discovery/nacos/dump_file/${filename}`,
      ),
    );
  }

  /**
   * Get all plugin metadata
   */
  async getPluginMetadata(): Promise<
    Array<{ id: string; [key: string]: unknown }>
  > {
    return this.client.get<Array<{ id: string; [key: string]: unknown }>>(
      this.client.getControlEndpoint("/v1/plugin_metadatas"),
    );
  }

  /**
   * Get specific plugin metadata
   */
  async getPluginMetadataById(
    pluginName: string,
  ): Promise<{ id: string; [key: string]: unknown }> {
    return this.client.get<{ id: string; [key: string]: unknown }>(
      this.client.getControlEndpoint(`/v1/plugin_metadata/${pluginName}`),
    );
  }

  /**
   * Get current APISIX configuration
   */
  async getConfig(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(
      this.client.getControlEndpoint("/v1/config"),
    );
  }

  /**
   * Get active routes
   */
  async getRoutes(): Promise<Record<string, unknown>[]> {
    return this.client.get<Record<string, unknown>[]>(
      this.client.getControlEndpoint("/v1/routes"),
    );
  }

  /**
   * Get specific route runtime information
   */
  async getRoute(routeId: string): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(
      this.client.getControlEndpoint(`/v1/routes/${routeId}`),
    );
  }

  /**
   * Get active services
   */
  async getServices(): Promise<Record<string, unknown>[]> {
    return this.client.get<Record<string, unknown>[]>(
      this.client.getControlEndpoint("/v1/services"),
    );
  }

  /**
   * Get specific service runtime information
   */
  async getService(serviceId: string): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(
      this.client.getControlEndpoint(`/v1/services/${serviceId}`),
    );
  }

  /**
   * Get active consumers
   */
  async getConsumers(): Promise<Record<string, unknown>[]> {
    return this.client.get<Record<string, unknown>[]>(
      this.client.getControlEndpoint("/v1/consumers"),
    );
  }

  /**
   * Get specific consumer runtime information
   */
  async getConsumer(consumerId: string): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(
      this.client.getControlEndpoint(`/v1/consumers/${consumerId}`),
    );
  }

  /**
   * Get SSL certificates
   */
  async getSSLCertificates(): Promise<Record<string, unknown>[]> {
    return this.client.get<Record<string, unknown>[]>(
      this.client.getControlEndpoint("/v1/ssl"),
    );
  }

  /**
   * Get specific SSL certificate
   */
  async getSSLCertificate(certId: string): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(
      this.client.getControlEndpoint(`/v1/ssl/${certId}`),
    );
  }

  /**
   * Get global rules
   */
  async getGlobalRules(): Promise<Record<string, unknown>[]> {
    return this.client.get<Record<string, unknown>[]>(
      this.client.getControlEndpoint("/v1/global_rules"),
    );
  }

  /**
   * Get specific global rule
   */
  async getGlobalRule(ruleId: string): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(
      this.client.getControlEndpoint(`/v1/global_rules/${ruleId}`),
    );
  }

  /**
   * Get consumer groups
   */
  async getConsumerGroups(): Promise<Record<string, unknown>[]> {
    return this.client.get<Record<string, unknown>[]>(
      this.client.getControlEndpoint("/v1/consumer_groups"),
    );
  }

  /**
   * Get specific consumer group
   */
  async getConsumerGroup(groupId: string): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(
      this.client.getControlEndpoint(`/v1/consumer_groups/${groupId}`),
    );
  }

  /**
   * Trigger garbage collection
   */
  async triggerGC(): Promise<{ message: string }> {
    return this.client.post<{ message: string }>(
      this.client.getControlEndpoint("/v1/gc"),
    );
  }

  /**
   * Get comprehensive system overview
   */
  async getSystemOverview(): Promise<{
    server: ServerInfo;
    schemas: SchemaInfo;
    health: boolean;
    upstreamHealth: UpstreamHealth[];
    requestStats: Record<string, unknown>;
    connectionStats: Record<string, unknown>;
    discoveryServices?: Record<string, unknown>;
  }> {
    const [server, schemas, health, requestStats, connectionStats] =
      await Promise.all([
        this.getServerInfo(),
        this.getSchemas(),
        this.isHealthy(),
        this.getRequestStatistics(),
        this.getConnectionStatistics(),
      ]);

    // Get upstream health (this might fail on some setups)
    let upstreamHealth: UpstreamHealth[] = [];
    try {
      upstreamHealth = await this.getUpstreamHealth();
    } catch {
      // Ignore errors for upstream health
    }

    // Get discovery services if available
    let discoveryServices: Record<string, unknown> | undefined;
    try {
      discoveryServices = await this.getDiscoveryMetrics();
    } catch {
      // Ignore errors for discovery services
    }

    return {
      server,
      schemas,
      health,
      upstreamHealth,
      requestStats,
      connectionStats,
      discoveryServices,
    };
  }

  /**
   * Get service discovery metrics
   */
  async getDiscoveryMetrics(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(
      this.client.getControlEndpoint("/v1/discovery/metrics"),
    );
  }

  /**
   * Get memory usage statistics
   */
  async getMemoryStats(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(
      this.client.getControlEndpoint("/v1/memory_stats"),
    );
  }

  /**
   * Get Prometheus metrics (from Control API)
   */
  async getPrometheusMetrics(): Promise<string> {
    return this.client.get<string>(
      this.client.getControlEndpoint("/apisix/prometheus/metrics"),
    );
  }

  /**
   * Get request statistics
   */
  async getRequestStatistics(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(
      this.client.getControlEndpoint("/v1/requests"),
    );
  }

  /**
   * Get connection statistics
   */
  async getConnectionStatistics(): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(
      this.client.getControlEndpoint("/v1/connections"),
    );
  }

  /**
   * Health check endpoint
   */
  async healthCheck(): Promise<HealthCheckStatus> {
    return this.client.get<HealthCheckStatus>(
      this.client.getControlEndpoint("/v1/healthcheck"),
    );
  }

  /**
   * Trigger plugins reload
   */
  async reloadPlugins(): Promise<{ message: string }> {
    return this.client.put<{ message: string }>(
      this.client.getControlEndpoint("/v1/plugins/reload"),
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
