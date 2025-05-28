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
   */
  async patch(
    consumerId: string,
    credentialId: string,
    credential: UpdateInput<Credential>,
  ): Promise<Credential> {
    const response = await this.client.partialUpdate<Credential>(
      this.client.getAdminEndpoint(`/consumers/${consumerId}/credentials`),
      credentialId,
      credential,
    );
    return this.client.extractValue(response);
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

    const options: ListOptions = {
      page,
      page_size: pageSize,
      ...filters,
    };

    const response = await this.client.list<Credential>(
      this.client.getAdminEndpoint(`/consumers/${consumerId}/credentials`),
      options,
    );

    return {
      credentials: await this.client.extractList(response),
      total: response.total,
      hasMore: response.has_more,
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
