import type { ApisixClient } from "../client";
import type {
  AWSSecret,
  CreateInput,
  GCPSecret,
  ListOptions,
  UpdateInput,
  VaultSecret,
} from "../types";

export class Secrets {
  private client: ApisixClient;

  constructor(client: ApisixClient) {
    this.client = client;
  }

  // Vault Secret Management
  async listVaultSecrets(options?: ListOptions): Promise<VaultSecret[]> {
    const response = await this.client.list<VaultSecret>(
      this.client.getAdminEndpoint("/secrets/vault"),
      options,
    );
    return this.client.extractList(response);
  }

  async getVaultSecret(id: string): Promise<VaultSecret> {
    const response = await this.client.getOne<VaultSecret>(
      this.client.getAdminEndpoint("/secrets/vault"),
      id,
    );
    return this.client.extractValue(response);
  }

  async createVaultSecret(
    secret: CreateInput<VaultSecret>,
    id?: string,
  ): Promise<VaultSecret> {
    const response = await this.client.create<VaultSecret>(
      this.client.getAdminEndpoint("/secrets/vault"),
      secret,
      id,
    );
    return this.client.extractValue(response);
  }

  async updateVaultSecret(
    id: string,
    secret: UpdateInput<VaultSecret>,
  ): Promise<VaultSecret> {
    const response = await this.client.update<VaultSecret>(
      this.client.getAdminEndpoint("/secrets/vault"),
      id,
      secret,
    );
    return this.client.extractValue(response);
  }

  async deleteVaultSecret(id: string): Promise<boolean> {
    await this.client.remove(
      this.client.getAdminEndpoint("/secrets/vault"),
      id,
    );
    return true;
  }

  // AWS Secret Management
  async listAWSSecrets(options?: ListOptions): Promise<AWSSecret[]> {
    const response = await this.client.list<AWSSecret>(
      this.client.getAdminEndpoint("/secrets/aws"),
      options,
    );
    return this.client.extractList(response);
  }

  async getAWSSecret(id: string): Promise<AWSSecret> {
    const response = await this.client.getOne<AWSSecret>(
      this.client.getAdminEndpoint("/secrets/aws"),
      id,
    );
    return this.client.extractValue(response);
  }

  async createAWSSecret(
    secret: CreateInput<AWSSecret>,
    id?: string,
  ): Promise<AWSSecret> {
    const response = await this.client.create<AWSSecret>(
      this.client.getAdminEndpoint("/secrets/aws"),
      secret,
      id,
    );
    return this.client.extractValue(response);
  }

  async updateAWSSecret(
    id: string,
    secret: UpdateInput<AWSSecret>,
  ): Promise<AWSSecret> {
    const response = await this.client.update<AWSSecret>(
      this.client.getAdminEndpoint("/secrets/aws"),
      id,
      secret,
    );
    return this.client.extractValue(response);
  }

  async deleteAWSSecret(id: string): Promise<boolean> {
    await this.client.remove(this.client.getAdminEndpoint("/secrets/aws"), id);
    return true;
  }

  // GCP Secret Management
  async listGCPSecrets(options?: ListOptions): Promise<GCPSecret[]> {
    const response = await this.client.list<GCPSecret>(
      this.client.getAdminEndpoint("/secrets/gcp"),
      options,
    );
    return this.client.extractList(response);
  }

  async getGCPSecret(id: string): Promise<GCPSecret> {
    const response = await this.client.getOne<GCPSecret>(
      this.client.getAdminEndpoint("/secrets/gcp"),
      id,
    );
    return this.client.extractValue(response);
  }

  async createGCPSecret(
    secret: CreateInput<GCPSecret>,
    id?: string,
  ): Promise<GCPSecret> {
    const response = await this.client.create<GCPSecret>(
      this.client.getAdminEndpoint("/secrets/gcp"),
      secret,
      id,
    );
    return this.client.extractValue(response);
  }

  async updateGCPSecret(
    id: string,
    secret: UpdateInput<GCPSecret>,
  ): Promise<GCPSecret> {
    const response = await this.client.update<GCPSecret>(
      this.client.getAdminEndpoint("/secrets/gcp"),
      id,
      secret,
    );
    return this.client.extractValue(response);
  }

  async deleteGCPSecret(id: string): Promise<boolean> {
    await this.client.remove(this.client.getAdminEndpoint("/secrets/gcp"), id);
    return true;
  }

  // Generic methods for all secret types
  async listAllSecrets(): Promise<{
    vault: VaultSecret[];
    aws: AWSSecret[];
    gcp: GCPSecret[];
  }> {
    const [vault, aws, gcp] = await Promise.all([
      this.listVaultSecrets(),
      this.listAWSSecrets(),
      this.listGCPSecrets(),
    ]);

    return { vault, aws, gcp };
  }

  async testVaultConnection(
    id: string,
  ): Promise<{ connected: boolean; error?: string }> {
    try {
      // Test Vault connection by attempting to fetch secret info
      await this.getVaultSecret(id);
      return { connected: true };
    } catch (error) {
      return {
        connected: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async testAWSConnection(
    id: string,
  ): Promise<{ connected: boolean; error?: string }> {
    try {
      // Test AWS connection by attempting to fetch secret info
      await this.getAWSSecret(id);
      return { connected: true };
    } catch (error) {
      return {
        connected: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async testGCPConnection(
    id: string,
  ): Promise<{ connected: boolean; error?: string }> {
    try {
      // Test GCP connection by attempting to fetch secret info
      await this.getGCPSecret(id);
      return { connected: true };
    } catch (error) {
      return {
        connected: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Utility methods
  async findVaultSecretsByNamespace(namespace: string): Promise<VaultSecret[]> {
    const secrets = await this.listVaultSecrets();
    return secrets.filter((secret) => secret.namespace === namespace);
  }

  async findAWSSecretsByRegion(region: string): Promise<AWSSecret[]> {
    const secrets = await this.listAWSSecrets();
    return secrets.filter((secret) => secret.region === region);
  }

  async findSecretsByPrefix(prefix: string): Promise<VaultSecret[]> {
    const secrets = await this.listVaultSecrets();
    return secrets.filter((secret) => secret.prefix.startsWith(prefix));
  }

  /**
   * Create a Vault secret with validation
   */
  async createVaultSecretWithValidation(
    config: {
      uri: string;
      prefix: string;
      token: string;
      namespace?: string;
    },
    id?: string,
  ): Promise<VaultSecret> {
    // Basic validation
    if (!config.uri || !config.prefix || !config.token) {
      throw new Error("URI, prefix, and token are required for Vault secrets");
    }

    if (!config.uri.startsWith("http")) {
      throw new Error("Vault URI must start with http:// or https://");
    }

    return this.createVaultSecret(config, id);
  }

  /**
   * Create an AWS secret with validation
   */
  async createAWSSecretWithValidation(
    config: {
      access_key_id: string;
      secret_access_key: string;
      session_token?: string;
      region?: string;
      endpoint_url?: string;
    },
    id?: string,
  ): Promise<AWSSecret> {
    // Basic validation
    if (!config.access_key_id || !config.secret_access_key) {
      throw new Error(
        "Access key ID and secret access key are required for AWS secrets",
      );
    }

    return this.createAWSSecret(config, id);
  }

  /**
   * Create a GCP secret with validation
   */
  async createGCPSecretWithValidation(
    config: {
      auth_config?: {
        client_email: string;
        private_key: string;
        project_id: string;
        token_uri?: string;
        entries_uri?: string;
        scope?: string[];
      };
      auth_file?: string;
      ssl_verify?: boolean;
    },
    id?: string,
  ): Promise<GCPSecret> {
    // Basic validation
    if (!config.auth_config && !config.auth_file) {
      throw new Error(
        "Either auth_config or auth_file is required for GCP secrets",
      );
    }

    if (config.auth_config) {
      const { client_email, private_key, project_id } = config.auth_config;
      if (!client_email || !private_key || !project_id) {
        throw new Error(
          "client_email, private_key, and project_id are required in auth_config",
        );
      }
    }

    return this.createGCPSecret(config, id);
  }
}
