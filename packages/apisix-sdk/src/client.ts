import { $fetch } from "ofetch";
import type {
  ApisixListResponse,
  ApisixResponse,
  ApisixSDKConfig,
  ErrorResponse,
  ListOptions,
  ServerInfo,
} from "./types";

interface ConnectionPool {
  admin: Map<string, Connection>;
  control: Map<string, Connection>;
  maxSize: number;
  ttl: number;
}

interface Connection {
  url: string;
  lastUsed: number;
  keepAlive: boolean;
}

export class ApisixClient {
  private adminBaseURL: string;
  private controlBaseURL: string;
  private apiKey?: string;
  private adminTimeout: number;
  private controlTimeout: number;
  private adminHeaders: Record<string, string>;
  private controlHeaders: Record<string, string>;
  private _serverInfo?: ServerInfo;
  private _apiVersion?: string;
  private connectionPool: ConnectionPool;
  private retryAttempts: number = 3;
  private retryDelay: number = 1000;
  private queryCache: Map<string, { data: unknown; expires: number }>;
  private cacheTTL: number = 30000; // 30 seconds

  constructor(config: ApisixSDKConfig) {
    this.adminBaseURL = config.adminAPI.baseURL.replace(/\/$/, ""); // Remove trailing slash
    this.controlBaseURL =
      config.controlAPI?.baseURL?.replace(/\/$/, "") || "http://127.0.0.1:9090";
    this.apiKey = config.adminAPI.apiKey;
    this.adminTimeout = config.adminAPI.timeout || 30000;
    this.controlTimeout = config.controlAPI?.timeout || this.adminTimeout;
    this.adminHeaders = config.adminAPI.headers || {};
    this.controlHeaders = config.controlAPI?.headers || {};

    // Initialize connection pool
    this.connectionPool = {
      admin: new Map(),
      control: new Map(),
      maxSize: 10,
      ttl: 300000, // 5 minutes
    };

    // Initialize query cache
    this.queryCache = new Map();
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
        console.warn("Failed to get server info from Control API:", error);
        // Fallback: try to get version from admin API
        try {
          await this.request<string>("/", { method: "HEAD" });
          console.warn(
            "Fallback: using HEAD request, could not get real version",
          );
          this._serverInfo = {
            hostname: "unknown",
            version: "unknown",
            up_time: 0,
            boot_time: 0,
            last_report_time: 0,
            etcd_version: "unknown",
          };
        } catch {
          console.warn("All version detection methods failed, assuming v3.0.0");
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
    supportsPagination: boolean;
  }> {
    const version = await this.getVersion();
    const isV3Plus = await this.isVersion3OrLater();

    return {
      supportsCredentials: isV3Plus,
      supportsSecrets: isV3Plus,
      supportsNewResponseFormat: isV3Plus,
      supportsStreamRoutes: this.compareVersions(version, "2.10.0") >= 0,
      supportsPagination: isV3Plus, // Pagination support added in APISIX 3.0
    };
  }

  /**
   * Get or create connection from pool
   */
  private getConnection(url: string, isControlAPI: boolean): string {
    const pool = isControlAPI
      ? this.connectionPool.control
      : this.connectionPool.admin;
    const now = Date.now();

    // Clean expired connections
    for (const [key, conn] of pool.entries()) {
      if (now - conn.lastUsed > this.connectionPool.ttl) {
        pool.delete(key);
      }
    }

    // Remove oldest connection if pool is full
    if (pool.size >= this.connectionPool.maxSize) {
      const oldestKey = pool.keys().next().value;
      pool.delete(oldestKey);
    }

    // Add new connection
    pool.set(url, {
      url,
      lastUsed: now,
      keepAlive: true,
    });

    return url;
  }

  /**
   * Generate cache key for request
   */
  private getCacheKey(
    endpoint: string,
    options: {
      method?: string;
      params?: Record<string, string | number | boolean | string[] | undefined>;
    },
  ): string {
    const method = options.method || "GET";
    const params = options.params ? JSON.stringify(options.params) : "";
    return `${method}:${endpoint}:${params}`;
  }

  /**
   * Get cached response if available and not expired
   */
  private getCachedResponse<T>(cacheKey: string): T | null {
    const cached = this.queryCache.get(cacheKey);
    if (!cached) return null;

    if (Date.now() > cached.expires) {
      this.queryCache.delete(cacheKey);
      return null;
    }

    return cached.data as T;
  }

  /**
   * Cache response data
   */
  private cacheResponse(cacheKey: string, data: unknown): void {
    this.queryCache.set(cacheKey, {
      data,
      expires: Date.now() + this.cacheTTL,
    });
  }

  /**
   * Smart retry with exponential backoff
   */
  private async retryRequest<T>(
    requestFn: () => Promise<T>,
    maxAttempts: number = this.retryAttempts,
    baseDelay: number = this.retryDelay,
  ): Promise<T> {
    let lastError: Error = new Error("Unknown error");

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await requestFn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry on certain error types
        if (this.isNonRetryableError(lastError)) {
          throw lastError;
        }

        if (attempt === maxAttempts) {
          break;
        }

        // Exponential backoff with jitter
        const delay = Math.min(
          baseDelay * Math.pow(2, attempt - 1) + Math.random() * 100,
          10000, // Max 10 seconds
        );

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  /**
   * Check if error should not be retried
   */
  private isNonRetryableError(error: Error): boolean {
    const nonRetryableMessages = [
      "unauthorized",
      "forbidden",
      "not found",
      "invalid",
      "validation",
      "already exists",
    ];

    const message = error.message.toLowerCase();
    return nonRetryableMessages.some((msg) => message.includes(msg));
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
      signal?: AbortSignal;
      skipCache?: boolean;
    } = {},
  ): Promise<T> {
    // Determine if this is a Control API call based on endpoint
    const isControlAPI =
      endpoint.startsWith("http://") ||
      endpoint.startsWith("https://") ||
      (!endpoint.startsWith("/apisix/admin") &&
        (endpoint.startsWith("/v1/") ||
          endpoint.includes("server_info") ||
          endpoint.includes("healthcheck") ||
          endpoint.includes("discovery")));

    const baseUrl = isControlAPI ? this.controlBaseURL : this.adminBaseURL;
    const timeout = isControlAPI ? this.controlTimeout : this.adminTimeout;
    const baseHeaders = isControlAPI ? this.controlHeaders : this.adminHeaders;

    const url = `${baseUrl}${endpoint}`;

    // Check cache for GET requests (unless skipped)
    if (options.method === "GET" || !options.method) {
      const cacheKey = this.getCacheKey(endpoint, options);
      const cached = this.getCachedResponse<T>(cacheKey);
      if (cached && !options.skipCache) {
        return cached;
      }
    }

    // Get connection from pool
    this.getConnection(url, isControlAPI);

    const requestConfig = {
      timeout,
      headers: {
        "Content-Type": "application/json",
        Connection: "keep-alive",
        ...baseHeaders,
        ...(!isControlAPI && this.apiKey && { "X-API-KEY": this.apiKey }),
        ...options.headers,
      },
      method: options.method || "GET",
      body: options.body,
      params: options.params,
      signal: options.signal,
    };

    try {
      // Use smart retry for the request
      const response = await this.retryRequest(async () => {
        const result = await $fetch<T>(url, requestConfig);

        // Cache successful GET responses
        if (
          (options.method === "GET" || !options.method) &&
          !options.skipCache
        ) {
          const cacheKey = this.getCacheKey(endpoint, options);
          this.cacheResponse(cacheKey, result);
        }

        return result;
      });

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
          throw new Error(
            `APISIX API Error: ${apisixError.error_msg} [${options.method || "GET"} ${endpoint}]`,
          );
        }
      }

      // Handle network and other errors
      const message = error instanceof Error ? error.message : "Unknown error";
      throw new Error(
        `APISIX SDK Request failed: [${options.method || "GET"}] "${url}" - ${this.getErrorMessage(message, options.method || "GET", endpoint)}`,
      );
    }
  }

  /**
   * Get error message with suggestions
   */
  private getErrorMessage(
    originalMessage: string,
    method: string,
    endpoint: string,
  ): string {
    const message = originalMessage.toLowerCase();

    // Network connectivity issues
    if (
      message.includes("econnrefused") ||
      message.includes("connection refused")
    ) {
      return "Connection refused. Please check if APISIX is running and accessible.";
    }

    // Timeout issues
    if (message.includes("timeout")) {
      return "Request timeout. Consider increasing timeout or checking APISIX performance.";
    }

    // Authentication issues
    if (message.includes("unauthorized") || message.includes("401")) {
      return "Authentication failed. Please check your API key and permissions.";
    }

    // Not found errors
    if (message.includes("not found") || message.includes("404")) {
      return `Resource not found. Check if the endpoint ${endpoint} exists.`;
    }

    // Validation errors
    if (message.includes("validation") || message.includes("invalid")) {
      return "Invalid request data. Please check your request format and required fields.";
    }

    // Rate limiting
    if (
      message.includes("rate limit") ||
      message.includes("too many requests")
    ) {
      return "Rate limit exceeded. Please wait before making another request.";
    }

    // Return original message if no specific suggestion is available
    return originalMessage;
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
   * POST request with optional cancellation support
   */
  public async post<T>(
    endpoint: string,
    body?: Record<string, unknown> | string,
    options?: {
      signal?: AbortSignal;
    },
  ): Promise<T> {
    return this.request<T>(endpoint, {
      method: "POST",
      body,
      signal: options?.signal,
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
   * Check if current APISIX version supports pagination
   */
  public async supportsPagination(): Promise<boolean> {
    const config = await this.getApiVersionConfig();
    return config.supportsPagination;
  }

  /**
   * List resources with optional pagination and filtering
   * Automatically handles version compatibility
   */
  public async list<T>(
    endpoint: string,
    options?: ListOptions,
  ): Promise<ApisixListResponse<T>> {
    // If pagination parameters are provided, check if supported
    if (options && (options.page || options.page_size)) {
      const supportsPag = await this.supportsPagination();
      if (!supportsPag) {
        // Remove pagination parameters for non-supporting versions
        const {
          page: _page,
          page_size: _page_size,
          ...nonPaginationOptions
        } = options;
        return this.get<ApisixListResponse<T>>(endpoint, nonPaginationOptions);
      }
    }

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
   * Extract list data from response, handling both v2.x and v3.x formats
   */
  extractList<T>(response: unknown): T[] {
    if (!response || typeof response !== "object") {
      return [];
    }

    const resp = response as Record<string, unknown>;

    // Handle v3.x format with list array
    if (resp.list && Array.isArray(resp.list)) {
      return resp.list.map((item: unknown) => {
        if (item && typeof item === "object" && "value" in item) {
          return (item as { value: T }).value;
        }
        return item as T;
      });
    }

    // Handle legacy v2.x format with node.nodes array
    if (
      resp.node &&
      typeof resp.node === "object" &&
      "nodes" in resp.node &&
      Array.isArray((resp.node as { nodes: unknown[] }).nodes)
    ) {
      return (resp.node as { nodes: unknown[] }).nodes.map((item: unknown) => {
        if (item && typeof item === "object" && "value" in item) {
          return (item as { value: T }).value;
        }
        return item as T;
      });
    }

    // Handle direct array response
    if (Array.isArray(response)) {
      return response as T[];
    }

    // Handle wrapped array response
    if (resp.data && Array.isArray(resp.data)) {
      return resp.data as T[];
    }

    // Handle single item wrapped in array
    if (resp.value) {
      return [resp.value as T];
    }

    // Fallback to empty array
    return [];
  }

  /**
   * Extract pagination info from response
   */
  extractPaginationInfo(response: unknown): {
    total: number;
    hasMore: boolean;
  } {
    if (!response || typeof response !== "object") {
      return { total: 0, hasMore: false };
    }

    const resp = response as Record<string, unknown>;

    // Handle v3.x format
    if (typeof resp.total === "number") {
      const data = this.extractList(resp);
      return {
        total: resp.total,
        hasMore:
          data.length > 0 && data.length >= (Number(resp.page_size) || 10),
      };
    }

    // Handle legacy format
    if (
      resp.node &&
      typeof resp.node === "object" &&
      "nodes" in resp.node &&
      Array.isArray((resp.node as { nodes: unknown[] }).nodes)
    ) {
      const total =
        typeof resp.count === "number"
          ? resp.count
          : (resp.node as { nodes: unknown[] }).nodes.length;
      return {
        total,
        hasMore: false, // Legacy format doesn't provide hasMore info
      };
    }

    // Fallback
    const data = this.extractList(resp);
    return {
      total: data.length,
      hasMore: false,
    };
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
    return path;
  }

  /**
   * Make Control API request (convenience method)
   */
  public async controlRequest<T>(
    endpoint: string,
    options: {
      method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD";
      headers?: Record<string, string>;
      body?: Record<string, unknown> | string;
      params?: Record<string, string | number | boolean | string[] | undefined>;
    } = {},
  ): Promise<T> {
    return this.request<T>(endpoint, options);
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
        console.error("Error parsing JSON:", error);
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
    const data = this.extractList(response);

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

  /**
   * Clear query cache
   */
  public clearCache(): void {
    this.queryCache.clear();
  }

  /**
   * Clear cache for specific endpoint
   */
  public clearCacheForEndpoint(endpoint: string): void {
    const keysToDelete: string[] = [];
    for (const [key] of this.queryCache.entries()) {
      if (key.includes(endpoint)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach((key) => this.queryCache.delete(key));
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): {
    totalEntries: number;
    expiredEntries: number;
    sizeInBytes: number;
  } {
    const now = Date.now();
    let expiredCount = 0;
    let totalSize = 0;

    for (const [key, value] of this.queryCache.entries()) {
      if (now > value.expires) {
        expiredCount++;
      }
      totalSize += key.length + JSON.stringify(value).length;
    }

    return {
      totalEntries: this.queryCache.size,
      expiredEntries: expiredCount,
      sizeInBytes: totalSize,
    };
  }

  /**
   * Clear connection pool
   */
  public clearConnectionPool(): void {
    this.connectionPool.admin.clear();
    this.connectionPool.control.clear();
  }

  /**
   * Get connection pool statistics
   */
  public getConnectionPoolStats(): {
    adminConnections: number;
    controlConnections: number;
    totalConnections: number;
    maxPoolSize: number;
    ttl: number;
  } {
    return {
      adminConnections: this.connectionPool.admin.size,
      controlConnections: this.connectionPool.control.size,
      totalConnections:
        this.connectionPool.admin.size + this.connectionPool.control.size,
      maxPoolSize: this.connectionPool.maxSize,
      ttl: this.connectionPool.ttl,
    };
  }

  /**
   * Configure retry settings
   */
  public configureRetry(options: {
    maxAttempts?: number;
    baseDelay?: number;
  }): void {
    if (options.maxAttempts) {
      this.retryAttempts = Math.max(1, options.maxAttempts);
    }
    if (options.baseDelay) {
      this.retryDelay = Math.max(100, options.baseDelay);
    }
  }

  /**
   * Configure cache settings
   */
  public configureCache(options: { ttl?: number; maxSize?: number }): void {
    if (options.ttl) {
      this.cacheTTL = Math.max(1000, options.ttl);
    }
    if (options.maxSize) {
      // Clean cache if new max size is smaller than current size
      if (this.queryCache.size > options.maxSize) {
        const entries = Array.from(this.queryCache.entries());
        entries.sort((a, b) => a[1].expires - b[1].expires);
        const toDelete = entries.slice(
          0,
          this.queryCache.size - options.maxSize,
        );
        toDelete.forEach(([key]) => this.queryCache.delete(key));
      }
    }
  }

  /**
   * Create AbortController for request cancellation
   */
  public createAbortController(): AbortController {
    return new AbortController();
  }
}
