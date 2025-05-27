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

    return {
      upstreams: this.client.extractList(response),
      total: response.total,
      hasMore: response.has_more,
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
}
