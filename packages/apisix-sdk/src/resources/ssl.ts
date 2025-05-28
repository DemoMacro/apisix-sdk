import type { ApisixClient } from "../client";
import type { CreateInput, ListOptions, SSL, UpdateInput } from "../types";

export class SSLCertificates {
  private readonly endpoint = "/ssls";
  private client: ApisixClient;

  constructor(client: ApisixClient) {
    this.client = client;
  }

  /**
   * List all SSL certificates with optional pagination and filtering
   */
  async list(options?: ListOptions): Promise<SSL[]> {
    const response = await this.client.list<SSL>(
      this.client.getAdminEndpoint(this.endpoint),
      options,
    );
    return this.client.extractList(response);
  }

  /**
   * Get a specific SSL certificate by ID
   */
  async get(id: string): Promise<SSL> {
    const response = await this.client.getOne<SSL>(
      this.client.getAdminEndpoint(this.endpoint),
      id,
    );
    return this.client.extractValue(response);
  }

  /**
   * Create a new SSL certificate
   */
  async create(ssl: CreateInput<SSL>, id?: string): Promise<SSL> {
    const response = await this.client.create<SSL>(
      this.client.getAdminEndpoint(this.endpoint),
      ssl,
      id,
    );
    return this.client.extractValue(response);
  }

  /**
   * Update an existing SSL certificate
   */
  async update(id: string, ssl: UpdateInput<SSL>): Promise<SSL> {
    const response = await this.client.update<SSL>(
      this.client.getAdminEndpoint(this.endpoint),
      id,
      ssl,
    );
    return this.client.extractValue(response);
  }

  /**
   * Partially update an existing SSL certificate
   */
  async patch(id: string, ssl: UpdateInput<SSL>): Promise<SSL> {
    const response = await this.client.partialUpdate<SSL>(
      this.client.getAdminEndpoint(this.endpoint),
      id,
      ssl,
    );
    return this.client.extractValue(response);
  }

  /**
   * Delete an SSL certificate
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
   * Check if SSL certificate exists
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
   * List SSL certificates with pagination support (v3 API)
   */
  async listPaginated(
    page = 1,
    pageSize = 10,
    filters?: Record<string, string | number | boolean | undefined>,
  ): Promise<{
    certificates: SSL[];
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

    const response = await this.client.list<SSL>(
      this.client.getAdminEndpoint(this.endpoint),
      options,
    );

    return {
      certificates: await this.client.extractList(response),
      total: response.total,
      hasMore: response.has_more,
    };
  }

  /**
   * Find SSL certificates by SNI (Server Name Indication)
   */
  async findBySNI(sni: string): Promise<SSL[]> {
    const certificates = await this.list();
    return certificates.filter((cert) => cert.snis?.includes(sni));
  }

  /**
   * Find SSL certificates by status
   */
  async findByStatus(status: 0 | 1): Promise<SSL[]> {
    const certificates = await this.list();
    return certificates.filter((cert) => cert.status === status);
  }

  /**
   * Enable an SSL certificate
   */
  async enable(id: string): Promise<SSL> {
    return this.patch(id, { status: 1 });
  }

  /**
   * Disable an SSL certificate
   */
  async disable(id: string): Promise<SSL> {
    return this.patch(id, { status: 0 });
  }

  /**
   * Check if SSL certificate is expired or will expire soon
   */
  async checkExpiration(
    id: string,
    daysToExpire = 30,
  ): Promise<{
    isExpired: boolean;
    willExpireSoon: boolean;
    daysRemaining?: number;
    validityEnd?: number;
  }> {
    const cert = await this.get(id);
    const now = Date.now() / 1000; // Convert to seconds
    const warningThreshold = now + daysToExpire * 24 * 60 * 60;

    if (!cert.validity_end) {
      return {
        isExpired: false,
        willExpireSoon: false,
      };
    }

    const isExpired = cert.validity_end < now;
    const willExpireSoon = cert.validity_end < warningThreshold && !isExpired;
    const daysRemaining = Math.max(
      0,
      Math.floor((cert.validity_end - now) / (24 * 60 * 60)),
    );

    return {
      isExpired,
      willExpireSoon,
      daysRemaining,
      validityEnd: cert.validity_end,
    };
  }

  /**
   * Get all expiring certificates
   */
  async getExpiringCertificates(daysToExpire = 30): Promise<
    Array<
      SSL & {
        expirationInfo: {
          isExpired: boolean;
          willExpireSoon: boolean;
          daysRemaining?: number;
          validityEnd?: number;
        };
      }
    >
  > {
    const certificates = await this.list();
    const expiringCerts = [];

    for (const cert of certificates) {
      if (cert.id) {
        const expirationInfo = await this.checkExpiration(
          cert.id,
          daysToExpire,
        );
        if (expirationInfo.isExpired || expirationInfo.willExpireSoon) {
          expiringCerts.push({
            ...cert,
            expirationInfo,
          });
        }
      }
    }

    return expiringCerts;
  }

  /**
   * Clone an SSL certificate with optional modifications
   */
  async clone(
    sourceId: string,
    modifications?: Partial<SSL>,
    newId?: string,
  ): Promise<SSL> {
    const source = await this.get(sourceId);

    // Remove fields that shouldn't be copied
    const {
      id,
      create_time,
      update_time,
      validity_start,
      validity_end,
      ...sslData
    } = source;

    // Apply modifications
    const newSSL = {
      ...sslData,
      ...modifications,
    };

    return this.create(newSSL, newId);
  }
}
