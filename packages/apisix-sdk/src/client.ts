import { $fetch } from "ofetch";
import type {
  ApisixListResponse,
  ApisixResponse,
  ApisixSDKConfig,
  ErrorResponse,
  ListOptions,
} from "./types";

export class ApisixClient {
  private baseURL: string;
  private apiKey?: string;
  private timeout: number;
  private headers: Record<string, string>;

  constructor(config: ApisixSDKConfig) {
    this.baseURL = config.baseURL.replace(/\/$/, ""); // Remove trailing slash
    this.apiKey = config.apiKey;
    this.timeout = config.timeout || 30000;
    this.headers = config.headers || {};
  }

  /**
   * Make HTTP request with proper authentication and error handling
   */
  protected async request<T>(
    endpoint: string,
    options: {
      method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
      headers?: Record<string, string>;
      body?: Record<string, unknown> | string;
      params?: Record<string, string | number | boolean | undefined>;
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
    params?: Record<string, string | number | boolean | undefined>,
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
   * Extract value from APISIX response format
   */
  public extractValue<T>(response: ApisixResponse<T>): T {
    return response.node?.value || ({} as T);
  }

  /**
   * Extract list from APISIX list response format
   */
  public extractList<T>(response: ApisixListResponse<T>): T[] {
    return response.list?.map((item) => item.value) || [];
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
    return path.startsWith("/") ? path : `/${path}`;
  }
}
