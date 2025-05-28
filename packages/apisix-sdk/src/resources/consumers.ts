import type { ApisixClient } from "../client";
import type {
  Consumer,
  ConsumerCredential,
  CreateInput,
  ListOptions,
  UpdateInput,
} from "../types";

export class Consumers {
  private readonly endpoint = "/consumers";
  private client: ApisixClient;

  constructor(client: ApisixClient) {
    this.client = client;
  }

  /**
   * List all consumers with optional pagination and filtering
   */
  async list(options?: ListOptions): Promise<Consumer[]> {
    const response = await this.client.list<Consumer>(
      this.client.getAdminEndpoint(this.endpoint),
      options,
    );
    return await this.client.extractList(response);
  }

  /**
   * Get a specific consumer by username
   */
  async get(username: string): Promise<Consumer> {
    const response = await this.client.getOne<Consumer>(
      this.client.getAdminEndpoint(this.endpoint),
      username,
    );
    return await this.client.extractValue(response);
  }

  /**
   * Create a new consumer
   */
  async create(consumer: CreateInput<Consumer>): Promise<Consumer> {
    const response = await this.client.create<Consumer>(
      this.client.getAdminEndpoint(this.endpoint),
      consumer,
      consumer.username,
    );
    return await this.client.extractValue(response);
  }

  /**
   * Update an existing consumer
   */
  async update(
    username: string,
    consumer: UpdateInput<Consumer>,
  ): Promise<Consumer> {
    const response = await this.client.update<Consumer>(
      this.client.getAdminEndpoint(this.endpoint),
      username,
      consumer,
    );
    return await this.client.extractValue(response);
  }

  /**
   * Partially update an existing consumer
   */
  async patch(
    username: string,
    consumer: UpdateInput<Consumer>,
  ): Promise<Consumer> {
    const response = await this.client.partialUpdate<Consumer>(
      this.client.getAdminEndpoint(this.endpoint),
      username,
      consumer,
    );
    return await this.client.extractValue(response);
  }

  /**
   * Delete a consumer
   */
  async delete(
    username: string,
    options?: { force?: boolean },
  ): Promise<boolean> {
    if (options?.force) {
      await this.client.removeWithQuery(
        this.client.getAdminEndpoint(this.endpoint),
        username,
        { force: "true" },
      );
    } else {
      await this.client.remove(
        this.client.getAdminEndpoint(this.endpoint),
        username,
      );
    }
    return true;
  }

  /**
   * Check if consumer exists
   */
  async exists(username: string): Promise<boolean> {
    try {
      await this.get(username);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * List consumers with pagination support (v3 API)
   */
  async listPaginated(
    page = 1,
    pageSize = 10,
    filters?: Record<string, string | number | boolean | undefined>,
  ): Promise<{
    consumers: Consumer[];
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

    const response = await this.client.list<Consumer>(
      this.client.getAdminEndpoint(this.endpoint),
      options,
    );

    return {
      consumers: await this.client.extractList(response),
      total: response.total,
      hasMore: response.has_more,
    };
  }

  /**
   * Find consumers by label
   */
  async findByLabel(key: string, value?: string): Promise<Consumer[]> {
    const consumers = await this.list();
    return consumers.filter((consumer) => {
      if (!consumer.labels) return false;
      if (value) {
        return consumer.labels[key] === value;
      }
      return key in consumer.labels;
    });
  }

  // Credential Management Methods

  /**
   * List credentials for a consumer
   */
  async listCredentials(username: string): Promise<ConsumerCredential[]> {
    const response = await this.client.list<ConsumerCredential>(
      this.client.getAdminEndpoint(`${this.endpoint}/${username}/credentials`),
    );
    return await this.client.extractList(response);
  }

  /**
   * Get a specific credential for a consumer
   */
  async getCredential(
    username: string,
    credentialId: string,
  ): Promise<ConsumerCredential> {
    const response = await this.client.getOne<ConsumerCredential>(
      this.client.getAdminEndpoint(`${this.endpoint}/${username}/credentials`),
      credentialId,
    );
    return await this.client.extractValue(response);
  }

  /**
   * Create or update a credential for a consumer
   */
  async createCredential(
    username: string,
    credentialId: string,
    credential: Omit<ConsumerCredential, "id" | "create_time" | "update_time">,
  ): Promise<ConsumerCredential> {
    const response = await this.client.create<ConsumerCredential>(
      this.client.getAdminEndpoint(`${this.endpoint}/${username}/credentials`),
      credential,
      credentialId,
    );
    return await this.client.extractValue(response);
  }

  /**
   * Update a credential for a consumer
   */
  async updateCredential(
    username: string,
    credentialId: string,
    credential: Partial<
      Omit<ConsumerCredential, "id" | "create_time" | "update_time">
    >,
  ): Promise<ConsumerCredential> {
    const response = await this.client.update<ConsumerCredential>(
      this.client.getAdminEndpoint(`${this.endpoint}/${username}/credentials`),
      credentialId,
      credential,
    );
    return await this.client.extractValue(response);
  }

  /**
   * Delete a credential for a consumer
   */
  async deleteCredential(
    username: string,
    credentialId: string,
  ): Promise<boolean> {
    await this.client.remove(
      this.client.getAdminEndpoint(`${this.endpoint}/${username}/credentials`),
      credentialId,
    );
    return true;
  }

  // Convenience methods for common credential types

  /**
   * Add key-auth credential to consumer
   */
  async addKeyAuth(
    username: string,
    key: string,
    credentialId?: string,
  ): Promise<ConsumerCredential> {
    const id = credentialId || `key-auth-${Date.now()}`;
    return this.createCredential(username, id, {
      plugins: {
        "key-auth": { key },
      },
    });
  }

  /**
   * Add basic-auth credential to consumer
   */
  async addBasicAuth(
    username: string,
    authUsername: string,
    password: string,
    credentialId?: string,
  ): Promise<ConsumerCredential> {
    const id = credentialId || `basic-auth-${Date.now()}`;
    return this.createCredential(username, id, {
      plugins: {
        "basic-auth": {
          username: authUsername,
          password,
        },
      },
    });
  }

  /**
   * Add JWT auth credential to consumer
   */
  async addJwtAuth(
    username: string,
    key: string,
    secret?: string,
    credentialId?: string,
  ): Promise<ConsumerCredential> {
    const id = credentialId || `jwt-auth-${Date.now()}`;
    const jwtConfig: Record<string, unknown> = { key };
    if (secret) {
      jwtConfig.secret = secret;
    }

    return this.createCredential(username, id, {
      plugins: {
        "jwt-auth": jwtConfig,
      },
    });
  }

  /**
   * Add HMAC auth credential to consumer
   */
  async addHmacAuth(
    username: string,
    accessKey: string,
    secretKey: string,
    credentialId?: string,
  ): Promise<ConsumerCredential> {
    const id = credentialId || `hmac-auth-${Date.now()}`;
    return this.createCredential(username, id, {
      plugins: {
        "hmac-auth": {
          key_id: accessKey,
          secret_key: secretKey,
        },
      },
    });
  }
}
