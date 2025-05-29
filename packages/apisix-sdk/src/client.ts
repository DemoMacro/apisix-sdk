import { $fetch } from "ofetch";
import type {
  ApisixListResponse,
  ApisixResponse,
  ApisixSDKConfig,
  ErrorResponse,
  ListOptions,
  ServerInfo,
} from "./types";

export class ApisixClient {
  private baseURL: string;
  private apiKey?: string;
  private timeout: number;
  private headers: Record<string, string>;
  private _serverInfo?: ServerInfo;
  private _apiVersion?: string;

  constructor(config: ApisixSDKConfig) {
    this.baseURL = config.baseURL.replace(/\/$/, ""); // Remove trailing slash
    this.apiKey = config.apiKey;
    this.timeout = config.timeout || 30000;
    this.headers = config.headers || {};
  }

  /**
   * Get cached server information or fetch if not available
   */
  public async getServerInfo(): Promise<ServerInfo> {
    if (!this._serverInfo) {
      try {
        this._serverInfo = await this.get<ServerInfo>(
          this.getControlEndpoint("/v1/server_info"),
        );
      } catch (error) {
        // Fallback: try to get version from server header
        try {
          const response = await this.request<string>("/", { method: "HEAD" });
          this._serverInfo = {
            hostname: "unknown",
            version: "unknown",
            up_time: 0,
            boot_time: 0,
            last_report_time: 0,
            etcd_version: "unknown",
          };
        } catch {
          // If all fails, assume default
          this._serverInfo = {
            hostname: "unknown",
            version: "3.0.0",
            up_time: 0,
            boot_time: 0,
            last_report_time: 0,
            etcd_version: "unknown",
          };
        }
      }
    }
    return this._serverInfo;
  }

  /**
   * Get APISIX version
   */
  public async getVersion(): Promise<string> {
    if (!this._apiVersion) {
      const serverInfo = await this.getServerInfo();
      this._apiVersion = serverInfo.version;
    }
    return this._apiVersion;
  }

  /**
   * Check if current APISIX version is compatible with specified version
   */
  public async isVersionCompatible(minVersion: string): Promise<boolean> {
    const currentVersion = await this.getVersion();
    return this.compareVersions(currentVersion, minVersion) >= 0;
  }

  /**
   * Compare two version strings (returns -1, 0, or 1)
   */
  private compareVersions(version1: string, version2: string): number {
    const v1Parts = version1.split(".").map(Number);
    const v2Parts = version2.split(".").map(Number);

    const maxLength = Math.max(v1Parts.length, v2Parts.length);

    for (let i = 0; i < maxLength; i++) {
      const v1Part = v1Parts[i] || 0;
      const v2Part = v2Parts[i] || 0;

      if (v1Part < v2Part) return -1;
      if (v1Part > v2Part) return 1;
    }

    return 0;
  }

  /**
   * Check if APISIX version is 3.0 or later
   */
  public async isVersion3OrLater(): Promise<boolean> {
    return this.isVersionCompatible("3.0.0");
  }

  /**
   * Get API version-specific configuration
   */
  public async getApiVersionConfig(): Promise<{
    supportsCredentials: boolean;
    supportsSecrets: boolean;
    supportsNewResponseFormat: boolean;
    supportsStreamRoutes: boolean;
  }> {
    const version = await this.getVersion();
    const isV3Plus = await this.isVersion3OrLater();

    return {
      supportsCredentials: isV3Plus,
      supportsSecrets: isV3Plus,
      supportsNewResponseFormat: isV3Plus,
      supportsStreamRoutes: this.compareVersions(version, "2.10.0") >= 0,
    };
  }

  /**
   * Make HTTP request with proper authentication and error handling
   */
  protected async request<T>(
    endpoint: string,
    options: {
      method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD";
      headers?: Record<string, string>;
      body?: Record<string, unknown> | string;
      params?: Record<string, string | number | boolean | string[] | undefined>;
    } = {},
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;

    const requestConfig = {
      timeout: this.timeout,
      headers: {
        "Content-Type": "application/json",
        ...this.headers,
        ...(this.apiKey && { "X-API-KEY": this.apiKey }),
        ...options.headers,
      },
      method: options.method || "GET",
      body: options.body,
      params: options.params,
    };

    try {
      const response = await $fetch<T>(url, requestConfig);
      return response;
    } catch (error: unknown) {
      // Handle APISIX specific error responses
      if (error && typeof error === "object" && "data" in error) {
        const errorData = (error as { data?: unknown }).data;
        if (
          errorData &&
          typeof errorData === "object" &&
          "error_msg" in errorData
        ) {
          const apisixError = errorData as ErrorResponse;
          throw new Error(`APISIX API Error: ${apisixError.error_msg}`);
        }
      }

      // Handle network and other errors
      const message = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Request failed: ${message}`);
    }
  }

  /**
   * GET request
   */
  public async get<T>(
    endpoint: string,
    params?: Record<string, string | number | boolean | string[] | undefined>,
  ): Promise<T> {
    return this.request<T>(endpoint, {
      method: "GET",
      params,
    });
  }

  /**
   * POST request
   */
  public async post<T>(
    endpoint: string,
    body?: Record<string, unknown> | string,
  ): Promise<T> {
    return this.request<T>(endpoint, {
      method: "POST",
      body,
    });
  }

  /**
   * PUT request
   */
  public async put<T>(
    endpoint: string,
    body?: Record<string, unknown> | string,
  ): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PUT",
      body,
    });
  }

  /**
   * PATCH request
   */
  protected async patch<T>(
    endpoint: string,
    body?: Record<string, unknown> | string,
  ): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PATCH",
      body,
    });
  }

  /**
   * DELETE request
   */
  protected async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: "DELETE",
    });
  }

  /**
   * List resources with optional pagination and filtering
   */
  public async list<T>(
    endpoint: string,
    options?: ListOptions,
  ): Promise<ApisixListResponse<T>> {
    return this.get<ApisixListResponse<T>>(endpoint, options);
  }

  /**
   * Get single resource
   */
  public async getOne<T>(
    endpoint: string,
    id: string,
  ): Promise<ApisixResponse<T>> {
    return this.get<ApisixResponse<T>>(`${endpoint}/${id}`);
  }

  /**
   * Create resource
   */
  public async create<T>(
    endpoint: string,
    data: Record<string, unknown>,
    id?: string,
  ): Promise<ApisixResponse<T>> {
    if (id) {
      return this.put<ApisixResponse<T>>(`${endpoint}/${id}`, data);
    }
    return this.post<ApisixResponse<T>>(endpoint, data);
  }

  /**
   * Update resource
   */
  public async update<T>(
    endpoint: string,
    id: string,
    data: Record<string, unknown>,
  ): Promise<ApisixResponse<T>> {
    return this.put<ApisixResponse<T>>(`${endpoint}/${id}`, data);
  }

  /**
   * Partially update resource
   */
  public async partialUpdate<T>(
    endpoint: string,
    id: string,
    data: Record<string, unknown>,
  ): Promise<ApisixResponse<T>> {
    return this.patch<ApisixResponse<T>>(`${endpoint}/${id}`, data);
  }

  /**
   * Delete resource
   */
  public async remove<T>(
    endpoint: string,
    id: string,
  ): Promise<ApisixResponse<T>> {
    return this.delete<ApisixResponse<T>>(`${endpoint}/${id}`);
  }

  /**
   * Delete resource with query parameters (e.g., force delete)
   */
  public async removeWithQuery<T>(
    endpoint: string,
    id: string,
    queryParams?: Record<string, string | number | boolean | undefined>,
  ): Promise<ApisixResponse<T>> {
    const query = queryParams
      ? `?${new URLSearchParams(
          Object.fromEntries(
            Object.entries(queryParams).map(([key, value]) => [
              key,
              String(value),
            ]),
          ),
        ).toString()}`
      : "";
    return this.delete<ApisixResponse<T>>(`${endpoint}/${id}${query}`);
  }

  /**
   * Extract value from APISIX response format (version-aware)
   */
  public async extractValue<T>(response: ApisixResponse<T>): Promise<T> {
    const isV3 = await this.isVersion3OrLater();

    // Handle version-specific response formats
    let value: T | undefined;
    let key: string | undefined;

    if (!isV3 && response.node) {
      // Legacy format (v2.x): { node: { value: {} } }
      value = response.node.value;
      key = response.node.key;
    } else if ("value" in response && "key" in response) {
      // New format (v3.x): { key: "", value: {} }
      value = (response as ApisixResponse<T>).value;
      key = (response as ApisixResponse<T>).key;
    } else {
      return {} as T;
    }

    if (!value) {
      return {} as T;
    }

    // Set additional metadata
    if (key && typeof value === "object" && value !== null) {
      (value as Record<string, unknown>).id = key.split("/").pop() || key;
    }

    return value;
  }

  /**
   * Extract list from APISIX list response format (version-aware)
   */
  public async extractList<T>(response: ApisixListResponse<T>): Promise<T[]> {
    const isV3 = await this.isVersion3OrLater();

    if (!isV3 && response.node?.nodes) {
      // Legacy format (v2.x)
      return response.node.nodes.map((item) => {
        const value = item.value;
        const key = item.key;

        // Extract ID from key if value doesn't have ID
        if (
          key &&
          typeof value === "object" &&
          value !== null &&
          !("id" in value)
        ) {
          const idMatch = key.match(/\/([^\/]+)$/);
          if (idMatch) {
            return { ...value, id: idMatch[1] } as T;
          }
        }

        return value;
      });
    }
    // New format (v3.x)
    return (
      response.list?.map((item) => {
        const value = item.value;
        const key = item.key;

        // Extract ID from key if value doesn't have ID
        if (
          key &&
          typeof value === "object" &&
          value !== null &&
          !("id" in value)
        ) {
          const idMatch = key.match(/\/([^\/]+)$/);
          if (idMatch) {
            return { ...value, id: idMatch[1] } as T;
          }
        }

        return value;
      }) || []
    );
  }

  /**
   * Get configuration for admin API endpoints
   */
  public getAdminEndpoint(path: string): string {
    return `/apisix/admin${path}`;
  }

  /**
   * Get configuration for control API endpoints
   */
  public getControlEndpoint(path: string): string {
    return `/apisix/admin${path}`;
  }

  /**
   * Execute batch operations
   */
  public async batch<T>(
    endpoint: string,
    operations: Array<{
      operation: "create" | "update" | "delete";
      id?: string;
      data?: Record<string, unknown>;
    }>,
    options?: {
      continueOnError?: boolean;
      validateBeforeExecution?: boolean;
    },
  ): Promise<{
    total: number;
    successful: number;
    failed: number;
    results: Array<{
      success: boolean;
      id?: string;
      data?: T;
      error?: string;
    }>;
  }> {
    const results: Array<{
      success: boolean;
      id?: string;
      data?: T;
      error?: string;
    }> = [];

    let successful = 0;
    let failed = 0;

    for (const operation of operations) {
      try {
        let result: T;

        switch (operation.operation) {
          case "create": {
            if (!operation.data) {
              throw new Error("Data is required for create operation");
            }
            const createResponse = await this.create<T>(
              endpoint,
              operation.data,
              operation.id,
            );
            result = await this.extractValue(createResponse);
            break;
          }

          case "update": {
            if (!operation.id || !operation.data) {
              throw new Error("ID and data are required for update operation");
            }
            const updateResponse = await this.update<T>(
              endpoint,
              operation.id,
              operation.data,
            );
            result = await this.extractValue(updateResponse);
            break;
          }

          case "delete":
            if (!operation.id) {
              throw new Error("ID is required for delete operation");
            }
            await this.remove<T>(endpoint, operation.id);
            result = { success: true } as T;
            break;

          default:
            throw new Error(`Unsupported operation: ${operation.operation}`);
        }

        results.push({
          success: true,
          id: operation.id,
          data: result,
        });
        successful++;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        results.push({
          success: false,
          id: operation.id,
          error: errorMessage,
        });
        failed++;

        if (!options?.continueOnError) {
          break;
        }
      }
    }

    return {
      total: operations.length,
      successful,
      failed,
      results,
    };
  }

  /**
   * Import data from various formats
   */
  public async importData<T>(
    endpoint: string,
    data: T[] | string,
    options?: {
      strategy?: "replace" | "merge" | "skip_existing";
      validate?: boolean;
      dryRun?: boolean;
    },
  ): Promise<{
    total: number;
    created: number;
    updated: number;
    skipped: number;
    errors: Array<{
      id?: string;
      error: string;
    }>;
  }> {
    let parsedData: T[];

    if (typeof data === "string") {
      try {
        parsedData = JSON.parse(data);
      } catch (error) {
        throw new Error("Invalid JSON data provided");
      }
    } else {
      parsedData = data;
    }

    const result = {
      total: parsedData.length,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [] as Array<{ id?: string; error: string }>,
    };

    if (options?.dryRun) {
      // In dry run mode, just validate the data
      for (const item of parsedData) {
        try {
          if (options.validate) {
            await this.validateData(item);
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Validation error";
          result.errors.push({
            id:
              typeof item === "object" && item !== null && "id" in item
                ? String((item as Record<string, unknown>).id)
                : undefined,
            error: errorMessage,
          });
        }
      }
      return result;
    }

    for (const item of parsedData) {
      try {
        const id =
          typeof item === "object" && item !== null && "id" in item
            ? String((item as Record<string, unknown>).id)
            : undefined;
        const strategy = options?.strategy || "merge";

        if (id && strategy !== "replace") {
          // Check if item exists
          const exists = await this.checkExists(endpoint, id);

          if (exists) {
            if (strategy === "skip_existing") {
              result.skipped++;
              continue;
            }
            if (strategy === "merge") {
              await this.update<T>(
                endpoint,
                id,
                item as Record<string, unknown>,
              );
              result.updated++;
              continue;
            }
          }
        }

        // Create new item
        await this.create<T>(endpoint, item as Record<string, unknown>, id);
        result.created++;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Import error";
        result.errors.push({
          id:
            typeof item === "object" && item !== null && "id" in item
              ? String((item as Record<string, unknown>).id)
              : undefined,
          error: errorMessage,
        });
      }
    }

    return result;
  }

  /**
   * Export data in various formats
   */
  public async exportData<T>(
    endpoint: string,
    options?: {
      format?: "json" | "yaml";
      include?: string[];
      exclude?: string[];
      pretty?: boolean;
    },
  ): Promise<string> {
    const response = await this.list<T>(endpoint);
    const data = await this.extractList(response);

    let filteredData: unknown[] = data;

    // Apply field filtering
    if (options?.include || options?.exclude) {
      filteredData = data.map((item) => {
        const obj = item as Record<string, unknown>;
        const filtered: Record<string, unknown> = {};

        if (options.include) {
          for (const field of options.include) {
            if (obj[field] !== undefined) {
              filtered[field] = obj[field];
            }
          }
        } else {
          Object.assign(filtered, obj);
          if (options.exclude) {
            for (const field of options.exclude) {
              delete filtered[field];
            }
          }
        }

        return filtered;
      });
    }

    const format = options?.format || "json";

    if (format === "json") {
      return JSON.stringify(filteredData, null, options?.pretty ? 2 : 0);
    }
    if (format === "yaml") {
      // Simple YAML serialization (would typically use a proper YAML library)
      return this.toYaml(filteredData);
    }

    throw new Error(`Unsupported export format: ${format}`);
  }

  /**
   * Simple YAML serialization (basic implementation)
   */
  private toYaml(data: unknown, indent = 0): string {
    const spaces = " ".repeat(indent);

    if (Array.isArray(data)) {
      return data
        .map((item) => `${spaces}- ${this.toYaml(item, indent + 2).trim()}`)
        .join("\n");
    }
    if (data !== null && typeof data === "object") {
      const obj = data as Record<string, unknown>;
      return Object.entries(obj)
        .map(([key, value]) => {
          if (typeof value === "object" && value !== null) {
            return `${spaces}${key}:\n${this.toYaml(value, indent + 2)}`;
          }
          return `${spaces}${key}: ${value}`;
        })
        .join("\n");
    }
    return String(data);
  }

  /**
   * Check if resource exists
   */
  private async checkExists(endpoint: string, id: string): Promise<boolean> {
    try {
      await this.getOne(endpoint, id);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate data (placeholder for actual validation logic)
   */
  private async validateData(data: unknown): Promise<boolean> {
    // This would typically use a schema validation library
    if (!data || typeof data !== "object") {
      throw new Error("Invalid data format");
    }
    return true;
  }
}
