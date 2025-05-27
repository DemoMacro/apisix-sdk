// Base types
export interface ApisixResponse<T> {
  node?: {
    key: string;
    value: T;
    createdIndex?: number;
    modifiedIndex?: number;
  };
  action?: string;
}

export interface ApisixListResponse<T> {
  total?: number;
  list: Array<{
    key: string;
    value: T;
    createdIndex?: number;
    modifiedIndex?: number;
  }>;
  has_more?: boolean;
}

export interface ListOptions {
  page?: number;
  page_size?: number;
  name?: string;
  label?: string;
  uri?: string;
  [key: string]: string | number | undefined;
}

export interface ErrorResponse {
  error_msg: string;
}

// Route types
export interface Route {
  id?: string;
  name?: string;
  desc?: string;
  uri?: string;
  uris?: string[];
  methods?: string[];
  host?: string;
  hosts?: string[];
  remote_addr?: string;
  remote_addrs?: string[];
  vars?: Array<[string, string, string]>;
  filter_func?: string;
  plugins?: Record<string, unknown>;
  upstream?: Upstream;
  upstream_id?: string;
  service_id?: string;
  plugin_config_id?: string;
  priority?: number;
  enable_websocket?: boolean;
  timeout?: {
    connect?: number;
    send?: number;
    read?: number;
  };
  status?: 0 | 1;
  labels?: Record<string, string>;
  create_time?: number;
  update_time?: number;
}

// Service types
export interface Service {
  id?: string;
  name?: string;
  desc?: string;
  upstream?: Upstream;
  upstream_id?: string;
  plugins?: Record<string, unknown>;
  plugin_config_id?: string;
  hosts?: string[];
  enable_websocket?: boolean;
  labels?: Record<string, string>;
  create_time?: number;
  update_time?: number;
}

// Upstream types
export type UpstreamType = "roundrobin" | "chash" | "ewma" | "least_conn";
export type HashOn = "vars" | "header" | "cookie" | "consumer";
export type HealthCheckType = "http" | "https" | "tcp";
export type UpstreamScheme =
  | "http"
  | "https"
  | "grpc"
  | "grpcs"
  | "tcp"
  | "udp"
  | "tls";
export type PassHost = "pass" | "node" | "rewrite";

export interface UpstreamNode {
  host: string;
  port: number;
  weight: number;
  priority?: number;
  metadata?: Record<string, unknown>;
}

export interface HealthCheck {
  active?: {
    type?: HealthCheckType;
    timeout?: number;
    concurrency?: number;
    http_path?: string;
    https_verify_certificate?: boolean;
    req_headers?: string[];
    healthy?: {
      interval?: number;
      http_statuses?: number[];
      successes?: number;
    };
    unhealthy?: {
      interval?: number;
      http_statuses?: number[];
      http_failures?: number;
      tcp_failures?: number;
      timeouts?: number;
    };
  };
  passive?: {
    type?: HealthCheckType;
    healthy?: {
      http_statuses?: number[];
      successes?: number;
    };
    unhealthy?: {
      http_statuses?: number[];
      http_failures?: number;
      tcp_failures?: number;
      timeouts?: number;
    };
  };
}

export interface KeepalivePool {
  size?: number;
  idle_timeout?: number;
  requests?: number;
}

export interface UpstreamTLS {
  client_cert?: string;
  client_key?: string;
  client_cert_id?: string;
}

export interface Upstream {
  id?: string;
  name?: string;
  desc?: string;
  type?: UpstreamType;
  nodes?: Record<string, number> | UpstreamNode[];
  service_name?: string;
  discovery_type?: string;
  hash_on?: HashOn;
  key?: string;
  checks?: HealthCheck;
  retries?: number;
  retry_timeout?: number;
  timeout?: {
    connect?: number;
    send?: number;
    read?: number;
  };
  keepalive_pool?: KeepalivePool;
  scheme?: UpstreamScheme;
  pass_host?: PassHost;
  upstream_host?: string;
  tls?: UpstreamTLS;
  labels?: Record<string, string>;
  create_time?: number;
  update_time?: number;
}

// Consumer types
export interface Consumer {
  username: string;
  desc?: string;
  plugins?: Record<string, unknown>;
  group_id?: string;
  labels?: Record<string, string>;
  create_time?: number;
  update_time?: number;
}

// Credential types (New in APISIX 3.0+)
export interface Credential {
  id?: string;
  plugins: Record<string, unknown>;
  desc?: string;
  labels?: Record<string, string>;
  create_time?: number;
  update_time?: number;
}

// SSL types
export interface SSL {
  id?: string;
  cert: string;
  key: string;
  certs?: string[];
  keys?: string[];
  snis?: string[];
  client?: {
    ca?: string;
    depth?: number;
    skip_mtls_uri_regex?: string[];
  };
  labels?: Record<string, string>;
  status?: 0 | 1;
  type?: "server" | "client";
  ssl_protocols?: string[];
  validity_start?: number;
  validity_end?: number;
  create_time?: number;
  update_time?: number;
}

// Global Rule types
export interface GlobalRule {
  id?: string;
  plugins?: Record<string, unknown>;
  create_time?: number;
  update_time?: number;
}

// Consumer Group types
export interface ConsumerGroup {
  id?: string;
  desc?: string;
  plugins?: Record<string, unknown>;
  labels?: Record<string, string>;
  create_time?: number;
  update_time?: number;
}

// Plugin Config types
export interface PluginConfig {
  id?: string;
  desc?: string;
  plugins?: Record<string, unknown>;
  labels?: Record<string, string>;
  create_time?: number;
  update_time?: number;
}

// Stream Route types
export interface StreamRoute {
  id?: string;
  desc?: string;
  remote_addr?: string;
  remote_addrs?: string[];
  server_addr?: string;
  server_port?: number;
  sni?: string;
  upstream?: Upstream;
  upstream_id?: string;
  service_id?: string;
  plugins?: Record<string, unknown>;
  protocol?: {
    name?: string;
    conf?: Record<string, unknown>;
  };
  create_time?: number;
  update_time?: number;
}

// Secret Management types (New in APISIX 3.0+)
export interface VaultSecret {
  id?: string;
  uri: string;
  prefix: string;
  token: string;
  namespace?: string;
  create_time?: number;
  update_time?: number;
}

export interface AWSSecret {
  id?: string;
  access_key_id: string;
  secret_access_key: string;
  session_token?: string;
  region?: string;
  endpoint_url?: string;
  create_time?: number;
  update_time?: number;
}

export interface GCPAuthConfig {
  client_email: string;
  private_key: string;
  project_id: string;
  token_uri?: string;
  entries_uri?: string;
  scope?: string[];
}

export interface GCPSecret {
  id?: string;
  auth_config?: GCPAuthConfig;
  auth_file?: string;
  ssl_verify?: boolean;
  create_time?: number;
  update_time?: number;
}

export type Secret = VaultSecret | AWSSecret | GCPSecret;

// Plugin types
export interface Plugin {
  name: string;
  version?: string;
  priority?: number;
  schema?: object;
  consumer_schema?: object;
  metadata_schema?: object;
  type?: string;
  disable?: boolean;
}

export interface PluginInfo {
  name: string;
  version?: string;
  priority?: number;
  type?: string;
  status?: "enabled" | "disabled";
  [key: string]: unknown;
}

export interface PluginList {
  [key: string]: boolean;
}

export interface PluginMetadata {
  id?: string;
  [key: string]: unknown;
}

// Health Check types
export interface HealthCheckStatus {
  status: "ok" | "error";
  info?: {
    version: string;
    hostname: string;
    up_time: number;
  };
}

export interface UpstreamHealthNode {
  host: string;
  port: number;
  status: "healthy" | "unhealthy" | "mostly_healthy" | "mostly_unhealthy";
  counter: {
    http_failure: number;
    tcp_failure: number;
    timeout_failure: number;
    success: number;
  };
}

export interface UpstreamHealth {
  name: string;
  type: "http" | "https" | "tcp";
  nodes: UpstreamHealthNode[];
}

// Server Info types
export interface ServerInfo {
  hostname: string;
  version: string;
  up_time: number;
  boot_time: number;
  last_report_time: number;
  etcd_version: string;
}

// Schema types
export interface SchemaInfo {
  main: {
    route: { properties: object };
    upstream: { properties: object };
    service: { properties: object };
    consumer: { properties: object };
    ssl: { properties: object };
    [key: string]: { properties: object };
  };
  plugins: Record<
    string,
    {
      consumer_schema?: object;
      metadata_schema?: object;
      schema?: object;
      type?: string;
      priority?: number;
      version?: number;
    }
  >;
  "stream-plugins": Record<string, object>;
}

// Discovery types (for service discovery)
export interface DiscoveryServices {
  services: Record<
    string,
    Array<{
      host: string;
      port: number;
      weight: number;
    }>
  >;
  expire: number;
  last_update: number;
}

export interface DiscoveryDump {
  endpoints: Array<{
    endpoints: Array<{
      value: string;
      name: string;
    }>;
    id: string;
  }>;
  config: Array<{
    default_weight: number;
    id: string;
    client: Record<string, unknown>;
    service: {
      host: string;
      port: string;
      schema: string;
    };
    shared_size: string;
  }>;
}

// Configuration types
export interface ApisixSDKConfig {
  baseURL: string;
  apiKey?: string;
  timeout?: number;
  headers?: Record<string, string>;
}

// Utility types
export type CreateInput<T> = Omit<T, "id" | "create_time" | "update_time">;
export type UpdateInput<T> = Partial<
  Omit<T, "id" | "create_time" | "update_time">
>;

// Force delete option
export interface ForceDeleteOptions {
  force?: boolean;
}

// TTL option for routes
export interface TTLOptions {
  ttl?: number;
}

// Filtering options for listings
export interface FilterOptions extends ListOptions {
  name?: string;
  label?: string;
  uri?: string;
}
