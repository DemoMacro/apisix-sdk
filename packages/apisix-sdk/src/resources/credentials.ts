import type { ApisixClient } from "../client";
import type {
  CreateInput,
  Credential,
  ListOptions,
  UpdateInput,
} from "../types";

export class Credentials {
  private client: ApisixClient;

  constructor(client: ApisixClient) {
    this.client = client;
  }

  /**
   * Create a new credential for a consumer
   * @param consumerId The consumer ID
   * @param credential The credential data
   * @param credentialId Optional credential ID
   */
  async create(
    consumerId: string,
    credential: CreateInput<Credential>,
    credentialId?: string,
  ): Promise<Credential> {
    const endpoint = credentialId
      ? `/consumers/${consumerId}/credentials/${credentialId}`
      : `/consumers/${consumerId}/credentials`;

    const response = await this.client.create<Credential>(
      this.client.getAdminEndpoint(endpoint),
      credential,
      credentialId,
    );
    return this.client.extractValue(response);
  }

  /**
   * Get a specific credential by consumer ID and credential ID
   */
  async get(consumerId: string, credentialId: string): Promise<Credential> {
    const response = await this.client.getOne<Credential>(
      this.client.getAdminEndpoint(`/consumers/${consumerId}/credentials`),
      credentialId,
    );
    return this.client.extractValue(response);
  }

  /**
   * List all credentials for a consumer
   */
  async list(consumerId: string, options?: ListOptions): Promise<Credential[]> {
    const response = await this.client.list<Credential>(
      this.client.getAdminEndpoint(`/consumers/${consumerId}/credentials`),
      options,
    );
    return this.client.extractList(response);
  }

  /**
   * Update an existing credential
   */
  async update(
    consumerId: string,
    credentialId: string,
    credential: UpdateInput<Credential>,
  ): Promise<Credential> {
    const response = await this.client.update<Credential>(
      this.client.getAdminEndpoint(`/consumers/${consumerId}/credentials`),
      credentialId,
      credential,
    );
    return this.client.extractValue(response);
  }

  /**
   * Partially update an existing credential
   * Note: PATCH method is not supported for credentials in APISIX
   * This method will fall back to using PUT method
   */
  async patch(
    consumerId: string,
    credentialId: string,
    credential: UpdateInput<Credential>,
  ): Promise<Credential> {
    console.warn(
      "PATCH method not supported for credentials, using PUT instead",
    );

    try {
      // Get current credential first
      const current = await this.get(consumerId, credentialId);

      // Handle plugins merging properly
      let mergedPlugins = current.plugins || {};
      if (credential.plugins) {
        mergedPlugins = {
          ...mergedPlugins,
          ...credential.plugins,
        };
      }

      // Merge with current data for complete update
      const mergedData = {
        ...current,
        ...credential,
        plugins: mergedPlugins,
      };

      // Remove fields that shouldn't be in update request
      const { id, create_time, update_time, ...updateData } = mergedData;

      // Use PUT to update, then GET to return the correct format
      // because PUT response returns Base64 encoded keys while GET returns original keys
      await this.update(consumerId, credentialId, updateData);

      // Return the updated credential with original key values
      return this.get(consumerId, credentialId);
    } catch (error) {
      if (error instanceof Error && error.message.includes("not supported")) {
        throw new Error("PATCH method is not supported for credentials");
      }
      throw error;
    }
  }

  /**
   * Delete a credential
   */
  async delete(consumerId: string, credentialId: string): Promise<boolean> {
    await this.client.remove(
      this.client.getAdminEndpoint(`/consumers/${consumerId}/credentials`),
      credentialId,
    );
    return true;
  }

  /**
   * Check if credential exists
   */
  async exists(consumerId: string, credentialId: string): Promise<boolean> {
    try {
      await this.get(consumerId, credentialId);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * List credentials with pagination support
   */
  async listPaginated(
    consumerId: string,
    page = 1,
    pageSize = 10,
    filters?: Record<string, string | number | boolean | undefined>,
  ): Promise<{
    credentials: Credential[];
    total?: number;
    hasMore?: boolean;
  }> {
    // Check if pagination is supported in current version
    const supportsPagination = await this.client.supportsPagination();

    if (!supportsPagination) {
      // Fallback: use regular list and simulate pagination
      const allCredentials = await this.list(consumerId, filters);
      const start = (page - 1) * pageSize;
      const end = start + pageSize;
      const paginatedCredentials = allCredentials.slice(start, end);

      return {
        credentials: paginatedCredentials,
        total: allCredentials.length,
        hasMore: end < allCredentials.length,
      };
    }

    // Check version compatibility for credentials API
    const shouldSkip = await this.client.getApiVersionConfig();
    if (!shouldSkip.supportsNewResponseFormat) {
      // Skip pagination for older versions
      const credentials = await this.list(consumerId);
      return {
        credentials,
        total: credentials.length,
        hasMore: false,
      };
    }

    // Use native pagination for v3+
    const options: ListOptions = {
      page,
      page_size: pageSize,
      ...filters,
    };

    const response = await this.client.list<Credential>(
      this.client.getAdminEndpoint(`/consumers/${consumerId}/credentials`),
      options,
    );

    const paginationInfo = this.client.extractPaginationInfo(response);

    return {
      credentials: this.client.extractList(response),
      total: paginationInfo.total,
      hasMore: paginationInfo.hasMore,
    };
  }

  /**
   * Find credentials by plugin type for a consumer
   */
  async findByPlugin(
    consumerId: string,
    pluginName: string,
  ): Promise<Credential[]> {
    const credentials = await this.list(consumerId);
    return credentials.filter((cred) => cred.plugins?.[pluginName]);
  }

  /**
   * Find credentials matching a pattern for a consumer
   */
  async findByPattern(
    consumerId: string,
    pattern: RegExp,
  ): Promise<Credential[]> {
    const credentials = await this.list(consumerId);
    return credentials.filter(
      (cred) =>
        pattern.test(cred.id || "") ||
        Object.keys(cred.plugins || {}).some((plugin) => pattern.test(plugin)),
    );
  }

  /**
   * Clone a credential with optional modifications for a consumer
   */
  async clone(
    sourceConsumerId: string,
    sourceCredentialId: string,
    targetConsumerId: string,
    modifications?: Partial<Credential>,
    newCredentialId?: string,
  ): Promise<Credential> {
    const source = await this.get(sourceConsumerId, sourceCredentialId);

    // Remove fields that shouldn't be copied
    const { id, create_time, update_time, ...credentialData } = source;

    // Apply modifications
    const newCredential = {
      ...credentialData,
      ...modifications,
    };

    return this.create(targetConsumerId, newCredential, newCredentialId);
  }

  /**
   * Get credential statistics for a consumer
   */
  async getStatistics(consumerId?: string): Promise<{
    total: number;
    byPlugin: Array<{ plugin: string; count: number }>;
    byConsumer: Array<{ consumer: string; count: number }>;
  }> {
    // If consumerId is provided, get stats for that consumer only
    if (consumerId) {
      const credentials = await this.list(consumerId);
      const pluginCount: Record<string, number> = {};

      for (const credential of credentials) {
        if (credential.plugins) {
          for (const plugin of Object.keys(credential.plugins)) {
            pluginCount[plugin] = (pluginCount[plugin] || 0) + 1;
          }
        }
      }

      return {
        total: credentials.length,
        byPlugin: Object.entries(pluginCount).map(([plugin, count]) => ({
          plugin,
          count,
        })),
        byConsumer: [{ consumer: consumerId, count: credentials.length }],
      };
    }

    // This would require iterating over all consumers, which is not efficient
    // For now, return empty stats
    return {
      total: 0,
      byPlugin: [],
      byConsumer: [],
    };
  }
}
