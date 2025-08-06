import type { ApisixClient } from "../client";
import type { CreateInput, ListOptions, Proto, UpdateInput } from "../types";

export class Protos {
  private readonly endpoint = "/protos";
  private client: ApisixClient;

  constructor(client: ApisixClient) {
    this.client = client;
  }

  /**
   * List all proto definitions with optional pagination and filtering
   */
  async list(options?: ListOptions): Promise<Proto[]> {
    const response = await this.client.list<Proto>(
      this.client.getAdminEndpoint(this.endpoint),
      options,
    );
    return this.client.extractList(response);
  }

  /**
   * Get a specific proto by ID
   */
  async get(id: string): Promise<Proto> {
    const response = await this.client.getOne<Proto>(
      this.client.getAdminEndpoint(this.endpoint),
      id,
    );
    return this.client.extractValue(response);
  }

  /**
   * Create a new proto definition
   */
  async create(proto: CreateInput<Proto>, id?: string): Promise<Proto> {
    const response = await this.client.create<Proto>(
      this.client.getAdminEndpoint(this.endpoint),
      proto,
      id,
    );
    return this.client.extractValue(response);
  }

  /**
   * Update an existing proto definition
   */
  async update(id: string, proto: UpdateInput<Proto>): Promise<Proto> {
    const response = await this.client.update<Proto>(
      this.client.getAdminEndpoint(this.endpoint),
      id,
      proto,
    );
    return this.client.extractValue(response);
  }

  /**
   * Partially update an existing proto definition
   */
  async patch(id: string, proto: UpdateInput<Proto>): Promise<Proto> {
    const response = await this.client.partialUpdate<Proto>(
      this.client.getAdminEndpoint(this.endpoint),
      id,
      proto,
    );
    return this.client.extractValue(response);
  }

  /**
   * Delete a proto definition
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
   * Check if proto exists
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
   * List protos with pagination support (v3 API)
   */
  async listPaginated(
    page = 1,
    pageSize = 10,
    filters?: Record<string, string | number | boolean | undefined>,
  ): Promise<{
    protos: Proto[];
    total?: number;
    hasMore?: boolean;
  }> {
    // Check if pagination is supported in current version
    const supportsPagination = await this.client.supportsPagination();

    if (!supportsPagination) {
      // Fallback: use regular list and simulate pagination
      const allProtos = await this.list(filters);
      const start = (page - 1) * pageSize;
      const end = start + pageSize;
      const paginatedProtos = allProtos.slice(start, end);

      return {
        protos: paginatedProtos,
        total: allProtos.length,
        hasMore: end < allProtos.length,
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

    const response = await this.client.list<Proto>(
      this.client.getAdminEndpoint(this.endpoint),
      options,
    );

    const paginationInfo = this.client.extractPaginationInfo(response);

    return {
      protos: this.client.extractList(response),
      total: paginationInfo.total,
      hasMore: paginationInfo.hasMore,
    };
  }

  /**
   * Find protos by label
   */
  async findByLabel(label: string, value?: string): Promise<Proto[]> {
    const protos = await this.list();
    return protos.filter((proto) => {
      if (!proto.labels) return false;
      if (value) {
        return proto.labels[label] === value;
      }
      return label in proto.labels;
    });
  }

  /**
   * Clone a proto with optional modifications
   */
  async clone(
    sourceId: string,
    modifications?: Partial<Proto>,
    newId?: string,
  ): Promise<Proto> {
    const source = await this.get(sourceId);

    // Remove fields that shouldn't be copied
    const {
      id: _id,
      create_time: _create_time,
      update_time: _update_time,
      ...protoData
    } = source;

    // Apply modifications
    const newProto = {
      ...protoData,
      ...modifications,
    };

    return this.create(newProto, newId);
  }

  /**
   * Validate protobuf content
   */
  validateProtobufContent(content: string): {
    valid: boolean;
    errors?: string[];
  } {
    const errors: string[] = [];

    if (!content || content.trim().length === 0) {
      errors.push("Protobuf content cannot be empty");
    }

    // Basic protobuf syntax validation
    if (!content.includes("syntax") && !content.includes("package")) {
      errors.push(
        "Protobuf content should include syntax or package declaration",
      );
    }

    // Check for basic protobuf structure
    if (!content.includes("service") && !content.includes("message")) {
      errors.push(
        "Protobuf content should define at least one service or message",
      );
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Create proto with validation
   */
  async createWithValidation(
    proto: CreateInput<Proto>,
    id?: string,
  ): Promise<Proto> {
    const validation = this.validateProtobufContent(proto.content);

    if (!validation.valid) {
      throw new Error(
        `Protobuf validation failed: ${validation.errors?.join(", ")}`,
      );
    }

    return this.create(proto, id);
  }

  /**
   * Get statistics for proto definitions
   */
  async getStatistics(): Promise<{
    total: number;
    labelUsage: Record<string, number>;
    topLabels: Array<{ label: string; count: number }>;
  }> {
    const protos = await this.list();
    const labelCount: Record<string, number> = {};

    for (const proto of protos) {
      if (proto.labels) {
        for (const [key, value] of Object.entries(proto.labels)) {
          const labelKey = `${key}:${value}`;
          labelCount[labelKey] = (labelCount[labelKey] || 0) + 1;
        }
      }
    }

    const topLabels = Object.entries(labelCount)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);

    return {
      total: protos.length,
      labelUsage: labelCount,
      topLabels,
    };
  }
}
