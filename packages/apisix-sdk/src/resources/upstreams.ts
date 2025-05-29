import type { ApisixClient } from "../client";
import type {
  CreateInput,
  ListOptions,
  UpdateInput,
  Upstream,
  UpstreamNode,
} from "../types";

export class Upstreams {
  private readonly endpoint = "/upstreams";
  private client: ApisixClient;

  constructor(client: ApisixClient) {
    this.client = client;
  }

  /**
   * List all upstreams with optional pagination and filtering
   */
  async list(options?: ListOptions): Promise<Upstream[]> {
    const response = await this.client.list<Upstream>(
      this.client.getAdminEndpoint(this.endpoint),
      options,
    );
    return this.client.extractList(response);
  }

  /**
   * Get a specific upstream by ID
   */
  async get(id: string): Promise<Upstream> {
    const response = await this.client.getOne<Upstream>(
      this.client.getAdminEndpoint(this.endpoint),
      id,
    );
    return this.client.extractValue(response);
  }

  /**
   * Create a new upstream
   */
  async create(
    upstream: CreateInput<Upstream>,
    id?: string,
  ): Promise<Upstream> {
    const response = await this.client.create<Upstream>(
      this.client.getAdminEndpoint(this.endpoint),
      upstream,
      id,
    );
    return this.client.extractValue(response);
  }

  /**
   * Update an existing upstream
   */
  async update(id: string, upstream: UpdateInput<Upstream>): Promise<Upstream> {
    const response = await this.client.update<Upstream>(
      this.client.getAdminEndpoint(this.endpoint),
      id,
      upstream,
    );
    return this.client.extractValue(response);
  }

  /**
   * Partially update an existing upstream
   */
  async patch(id: string, upstream: UpdateInput<Upstream>): Promise<Upstream> {
    const response = await this.client.partialUpdate<Upstream>(
      this.client.getAdminEndpoint(this.endpoint),
      id,
      upstream,
    );
    return this.client.extractValue(response);
  }

  /**
   * Delete an upstream
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
   * Check if upstream exists
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
   * List upstreams with pagination support (v3 API)
   */
  async listPaginated(
    page = 1,
    pageSize = 10,
    filters?: Record<string, string | number | boolean | undefined>,
  ): Promise<{
    upstreams: Upstream[];
    total?: number;
    hasMore?: boolean;
  }> {
    // Check if pagination is supported in current version
    const supportsPagination = await this.client.supportsPagination();

    if (!supportsPagination) {
      // Fallback: use regular list and simulate pagination
      const allUpstreams = await this.list(filters);
      const start = (page - 1) * pageSize;
      const end = start + pageSize;
      const paginatedUpstreams = allUpstreams.slice(start, end);

      return {
        upstreams: paginatedUpstreams,
        total: allUpstreams.length,
        hasMore: end < allUpstreams.length,
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

    const response = await this.client.list<Upstream>(
      this.client.getAdminEndpoint(this.endpoint),
      options,
    );

    const paginationInfo = this.client.extractPaginationInfo(response);

    return {
      upstreams: this.client.extractList(response),
      total: paginationInfo.total,
      hasMore: paginationInfo.hasMore,
    };
  }

  /**
   * Find upstreams by name
   */
  async findByName(name: string): Promise<Upstream[]> {
    const upstreams = await this.list();
    return upstreams.filter((upstream) => upstream.name?.includes(name));
  }

  /**
   * Find upstreams by type
   */
  async findByType(
    type: "roundrobin" | "chash" | "ewma" | "least_conn",
  ): Promise<Upstream[]> {
    const upstreams = await this.list();
    return upstreams.filter((upstream) => upstream.type === type);
  }

  /**
   * Add node to upstream
   */
  async addNode(
    id: string,
    host: string,
    port: number,
    weight = 1,
  ): Promise<Upstream> {
    const upstream = await this.get(id);

    // Handle both node formats
    const nodes: Record<string, number> | UpstreamNode[] = upstream.nodes || {};

    if (Array.isArray(nodes)) {
      // Array format
      nodes.push({ host, port, weight });
    } else {
      // Object format
      nodes[`${host}:${port}`] = weight;
    }

    return this.patch(id, { nodes });
  }

  /**
   * Remove node from upstream
   */
  async removeNode(id: string, host: string, port: number): Promise<Upstream> {
    const upstream = await this.get(id);

    // Handle both node formats
    let nodes: Record<string, number | null> | UpstreamNode[] =
      upstream.nodes || {};

    if (Array.isArray(nodes)) {
      // Array format
      nodes = nodes.filter(
        (node: UpstreamNode) => !(node.host === host && node.port === port),
      );
    } else {
      // Object format - set to null to remove
      nodes[`${host}:${port}`] = null;
    }

    return this.patch(id, {
      nodes: nodes as Record<string, number> | UpstreamNode[],
    });
  }

  /**
   * Update node weight in upstream
   */
  async updateNodeWeight(
    id: string,
    host: string,
    port: number,
    weight: number,
  ): Promise<Upstream> {
    const upstream = await this.get(id);

    // Handle both node formats
    const nodes: Record<string, number> | UpstreamNode[] = upstream.nodes || {};

    if (Array.isArray(nodes)) {
      // Array format
      const nodeIndex = nodes.findIndex(
        (node: UpstreamNode) => node.host === host && node.port === port,
      );
      if (nodeIndex >= 0) {
        nodes[nodeIndex].weight = weight;
      }
    } else {
      // Object format
      nodes[`${host}:${port}`] = weight;
    }

    return this.patch(id, { nodes });
  }

  /**
   * Clone an upstream with optional modifications
   */
  async clone(
    sourceId: string,
    modifications?: Partial<Upstream>,
    newId?: string,
  ): Promise<Upstream> {
    const source = await this.get(sourceId);

    // Remove fields that shouldn't be copied
    const { id, create_time, update_time, ...upstreamData } = source;

    // Apply modifications
    const newUpstream = {
      ...upstreamData,
      ...modifications,
    };

    return this.create(newUpstream, newId);
  }

  /**
   * Get upstream statistics
   */
  async getStatistics(): Promise<{
    total: number;
    healthy: number;
    unhealthy: number;
    typeDistribution: Array<{ type: string; count: number }>;
    nodeCount: number;
    averageNodesPerUpstream: number;
  }> {
    const upstreams = await this.list();
    const typeCount: Record<string, number> = {};
    let totalNodes = 0;
    let healthyCount = 0;
    const unhealthyCount = 0;

    for (const upstream of upstreams) {
      // Count by type
      const type = upstream.type || "unknown";
      typeCount[type] = (typeCount[type] || 0) + 1;

      // Count nodes
      if (upstream.nodes) {
        if (Array.isArray(upstream.nodes)) {
          totalNodes += upstream.nodes.length;
        } else {
          totalNodes += Object.keys(upstream.nodes).length;
        }
      }

      // For now, consider all upstreams as healthy since we don't have health check info
      // In a real implementation, this would check actual health status
      healthyCount++;
    }

    const typeDistribution = Object.entries(typeCount).map(([type, count]) => ({
      type,
      count,
    }));

    return {
      total: upstreams.length,
      healthy: healthyCount,
      unhealthy: unhealthyCount,
      typeDistribution,
      nodeCount: totalNodes,
      averageNodesPerUpstream:
        upstreams.length > 0 ? totalNodes / upstreams.length : 0,
    };
  }
}
