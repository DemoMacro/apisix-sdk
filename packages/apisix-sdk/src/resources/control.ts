import type { ApisixClient } from "../client";
import type {
  HealthCheckStatus,
  PluginInfo,
  ServerInfo,
  UpstreamHealth,
} from "../types";

export interface DiscoveryDumpNode {
  host: string;
  port: number;
  weight: number;
  default_weight: number;
  id: string;
  client: Record<string, unknown>;
  service: {
    host: string;
    port: number;
    proto: string;
    enable_ipv6: boolean;
  };
}

export interface DiscoveryDump {
  services: Record<string, DiscoveryDumpNode[]>;
}

export interface DiscoveryDumpFile {
  path: string;
  size: number;
  last_modified: string;
}

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
  async getSchemas(): Promise<Record<string, Record<string, unknown>>> {
    return this.client.get<Record<string, Record<string, unknown>>>(
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
    plugins: PluginInfo[];
    upstreams: Record<string, unknown>[];
    routes: Record<string, unknown>[];
    services: Record<string, unknown>[];
    consumers: Record<string, unknown>[];
    ssl: Record<string, unknown>[];
    globalRules: Record<string, unknown>[];
    consumerGroups: Record<string, unknown>[];
  }> {
    const [
      server,
      plugins,
      upstreams,
      routes,
      services,
      consumers,
      ssl,
      globalRules,
      consumerGroups,
    ] = await Promise.all([
      this.getServerInfo(),
      this.getPlugins(),
      this.getUpstreams(),
      this.getRoutes(),
      this.getServices(),
      this.getConsumers(),
      this.getSSLCertificates(),
      this.getGlobalRules(),
      this.getConsumerGroups(),
    ]);

    return {
      server,
      plugins,
      upstreams,
      routes,
      services,
      consumers,
      ssl,
      globalRules,
      consumerGroups,
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
}
