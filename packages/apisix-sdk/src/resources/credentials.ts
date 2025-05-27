import type { ApisixClient } from "../client";
import type {
  CreateInput,
  Credential,
  ListOptions,
  UpdateInput,
} from "../types";

export class Credentials {
  private readonly endpoint = "/credentials";
  private client: ApisixClient;

  constructor(client: ApisixClient) {
    this.client = client;
  }

  /**
   * List all credentials with optional pagination and filtering
   */
  async list(options?: ListOptions): Promise<Credential[]> {
    const response = await this.client.list<Credential>(
      this.client.getAdminEndpoint(this.endpoint),
      options,
    );
    return this.client.extractList(response);
  }

  /**
   * Get a specific credential by ID
   */
  async get(id: string): Promise<Credential> {
    const response = await this.client.getOne<Credential>(
      this.client.getAdminEndpoint(this.endpoint),
      id,
    );
    return this.client.extractValue(response);
  }

  /**
   * Create a new credential
   */
  async create(
    credential: CreateInput<Credential>,
    id?: string,
  ): Promise<Credential> {
    const response = await this.client.create<Credential>(
      this.client.getAdminEndpoint(this.endpoint),
      credential,
      id,
    );
    return this.client.extractValue(response);
  }

  /**
   * Update an existing credential
   */
  async update(
    id: string,
    credential: UpdateInput<Credential>,
  ): Promise<Credential> {
    const response = await this.client.update<Credential>(
      this.client.getAdminEndpoint(this.endpoint),
      id,
      credential,
    );
    return this.client.extractValue(response);
  }

  /**
   * Partially update an existing credential
   */
  async patch(
    id: string,
    credential: UpdateInput<Credential>,
  ): Promise<Credential> {
    const response = await this.client.partialUpdate<Credential>(
      this.client.getAdminEndpoint(this.endpoint),
      id,
      credential,
    );
    return this.client.extractValue(response);
  }

  /**
   * Delete a credential
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
   * Check if credential exists
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
   * List credentials with pagination support
   */
  async listPaginated(
    page = 1,
    pageSize = 10,
    filters?: Record<string, string | number | boolean | undefined>,
  ): Promise<{
    credentials: Credential[];
    total?: number;
    hasMore?: boolean;
  }> {
    const options: ListOptions = {
      page,
      page_size: pageSize,
      ...filters,
    };

    const response = await this.client.list<Credential>(
      this.client.getAdminEndpoint(this.endpoint),
      options,
    );

    return {
      credentials: this.client.extractList(response),
      total: response.total,
      hasMore: response.has_more,
    };
  }

  /**
   * Find credentials by plugin type
   */
  async findByPlugin(pluginName: string): Promise<Credential[]> {
    const credentials = await this.list();
    return credentials.filter(
      (credential) =>
        credential.plugins &&
        Object.keys(credential.plugins).includes(pluginName),
    );
  }

  /**
   * Find credentials by label
   */
  async findByLabel(label: string, value?: string): Promise<Credential[]> {
    const credentials = await this.list();
    return credentials.filter((credential) => {
      if (!credential.labels) return false;
      if (value) {
        return credential.labels[label] === value;
      }
      return label in credential.labels;
    });
  }

  /**
   * Clone a credential with optional modifications
   */
  async clone(
    sourceId: string,
    modifications?: Partial<Credential>,
    newId?: string,
  ): Promise<Credential> {
    const source = await this.get(sourceId);

    // Remove fields that shouldn't be copied
    const { id, create_time, update_time, ...credentialData } = source;

    // Apply modifications
    const newCredential = {
      ...credentialData,
      ...modifications,
    };

    return this.create(newCredential, newId);
  }

  /**
   * Get credentials with specific plugin configuration
   */
  async getByPluginConfig(
    pluginName: string,
    configKey: string,
    configValue: unknown,
  ): Promise<Credential[]> {
    const credentials = await this.list();
    return credentials.filter((credential) => {
      const plugin = credential.plugins?.[pluginName];
      if (!plugin || typeof plugin !== "object") return false;
      return (plugin as Record<string, unknown>)[configKey] === configValue;
    });
  }
}
