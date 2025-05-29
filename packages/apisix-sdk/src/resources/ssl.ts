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
    // Check if pagination is supported in current version
    const supportsPagination = await this.client.supportsPagination();

    if (!supportsPagination) {
      // Fallback: use regular list and simulate pagination
      const allCertificates = await this.list(filters);
      const start = (page - 1) * pageSize;
      const end = start + pageSize;
      const paginatedCertificates = allCertificates.slice(start, end);

      return {
        certificates: paginatedCertificates,
        total: allCertificates.length,
        hasMore: end < allCertificates.length,
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

    const response = await this.client.list<SSL>(
      this.client.getAdminEndpoint(this.endpoint),
      options,
    );

    const paginationInfo = this.client.extractPaginationInfo(response);

    return {
      certificates: this.client.extractList(response),
      total: paginationInfo.total,
      hasMore: paginationInfo.hasMore,
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
    try {
      // First, clean up any existing certificate with the target ID
      if (newId) {
        try {
          await this.delete(newId);
        } catch {
          // Ignore if it doesn't exist
        }
      }

      let source: SSL;

      try {
        // Try to get the source certificate using direct GET first
        source = await this.get(sourceId);
      } catch (error) {
        throw new Error(
          `Failed to get source SSL certificate '${sourceId}': ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }

      // Check if we have the key field - APISIX may not return it in single resource GET for security reasons
      let sourceKey = source.key;

      if (!sourceKey) {
        // This is normal APISIX behavior - single GET requests don't return private keys for security
        // Try to get the key from the list response, which includes the key field
        const allCerts = await this.list();
        const sourceFromList = allCerts.find((cert) => cert.id === sourceId);

        if (sourceFromList?.key) {
          sourceKey = sourceFromList.key;
          // Success - no need to log this as it's normal operation
        } else {
          console.warn(
            `Could not retrieve private key for SSL certificate '${sourceId}' from APISIX API (this is expected APISIX security behavior)`,
          );
        }

        // If we still don't have a key, check if modifications provide one
        if (!sourceKey && !modifications?.key) {
          throw new Error(
            `Source SSL certificate '${sourceId}' is missing 'key' field and no replacement key provided in modifications. This is due to APISIX security policies that don't return private keys in single resource GET responses. Please provide a key in the modifications parameter.`,
          );
        }

        // Use the key from modifications if we don't have the source key
        if (!sourceKey && modifications?.key) {
          sourceKey = modifications.key as string;
        }
      }

      // Validate that source has required certificate fields
      if (!source.cert) {
        throw new Error(
          `Source SSL certificate '${sourceId}' is missing 'cert' field`,
        );
      }

      // Remove fields that shouldn't be copied or are auto-generated
      const {
        id,
        create_time,
        update_time,
        validity_start,
        validity_end,
        ...sslData
      } = source;

      // Ensure we have the key field for the new certificate
      sslData.key = sourceKey;

      // Apply modifications with proper SNI handling
      const newSSL = {
        ...sslData,
        ...modifications,
      };

      // Validate required fields after applying modifications
      if (!newSSL.cert || !newSSL.key) {
        throw new Error(
          "SSL certificate must have both 'cert' and 'key' fields",
        );
      }

      // Ensure SNI is properly formatted if provided
      if (newSSL.snis) {
        if (!Array.isArray(newSSL.snis)) {
          throw new Error("SNI must be an array");
        }
        if (newSSL.snis.length === 0) {
          throw new Error("SNI array cannot be empty");
        }
      }

      return this.create(newSSL, newId);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes("then clause did not match")) {
          throw new Error(
            `SSL certificate validation failed during clone: ${error.message}. This usually indicates certificate format or SNI configuration issues.`,
          );
        }
        if (
          error.message.includes("missing") &&
          error.message.includes("field")
        ) {
          // Re-throw our custom validation errors as-is
          throw error;
        }
      }
      throw error;
    }
  }
}
