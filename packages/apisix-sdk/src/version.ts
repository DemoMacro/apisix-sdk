import type { ApisixClient } from "./client";
import type {
  MigrationRecommendations,
  ValidationResult,
  VersionConfig,
} from "./types";

export class VersionManager {
  private client: ApisixClient;
  private versionConfigs: Map<string, VersionConfig> = new Map();

  constructor(client: ApisixClient) {
    this.client = client;
    this.initializeVersionConfigs();
  }

  private initializeVersionConfigs() {
    // APISIX 2.x configurations
    this.versionConfigs.set("2.15.x", {
      version: "2.15.x",
      supportsCredentials: false,
      supportsSecrets: false,
      supportsNewResponseFormat: false,
      supportsStreamRoutes: true,
      supportedPlugins: [
        "limit-count",
        "limit-req",
        "limit-conn",
        "key-auth",
        "jwt-auth",
        "basic-auth",
        "authz-keycloak",
        "wolf-rbac",
        "openid-connect",
        "hmac-auth",
        "authz-casbin",
        "authz-casdoor",
        "ip-restriction",
        "ua-restriction",
        "referer-restriction",
        "cors",
        "uri-blocker",
        "request-validation",
        "openapi-validator",
        "chaitin-waf",
        "multi-auth",
        "api-breaker",
        "traffic-split",
        "request-id",
        "proxy-mirror",
        "proxy-cache",
        "proxy-rewrite",
        "workflow",
        "redirect",
        "response-rewrite",
        "fault-injection",
        "mocking",
        "serverless-pre-function",
        "serverless-post-function",
        "batch-requests",
        "real-ip",
        "zipkin",
        "skywalking",
        "opentelemetry",
        "jaeger",
        "prometheus",
        "node-status",
        "datadog",
        "elasticsearch-logger",
        "http-logger",
        "kafka-logger",
        "rocketmq-logger",
        "tcp-logger",
        "udp-logger",
        "file-logger",
        "loggly",
        "splunk-hec-logging",
        "syslog",
        "log-rotate",
        "error-log-logger",
        "sls-logger",
        "google-cloud-logging",
        "tencent-cloud-cls",
        "grpc-transcode",
        "grpc-web",
        "public-api",
        "server-info",
        "dubbo-proxy",
      ],
      deprecatedFeatures: [],
    });

    // APISIX 3.x configurations
    this.versionConfigs.set("3.0.x", {
      version: "3.0.x",
      supportsCredentials: true,
      supportsSecrets: true,
      supportsNewResponseFormat: true,
      supportsStreamRoutes: true,
      supportedPlugins: [
        // All 2.x plugins plus new ones
        "limit-count",
        "limit-req",
        "limit-conn",
        "key-auth",
        "jwt-auth",
        "basic-auth",
        "authz-keycloak",
        "wolf-rbac",
        "openid-connect",
        "hmac-auth",
        "authz-casbin",
        "authz-casdoor",
        "ip-restriction",
        "ua-restriction",
        "referer-restriction",
        "cors",
        "uri-blocker",
        "request-validation",
        "openapi-validator",
        "chaitin-waf",
        "multi-auth",
        "api-breaker",
        "traffic-split",
        "request-id",
        "proxy-mirror",
        "proxy-cache",
        "proxy-rewrite",
        "workflow",
        "redirect",
        "response-rewrite",
        "fault-injection",
        "mocking",
        "serverless-pre-function",
        "serverless-post-function",
        "batch-requests",
        "real-ip",
        "zipkin",
        "skywalking",
        "opentelemetry",
        "jaeger",
        "prometheus",
        "node-status",
        "datadog",
        "elasticsearch-logger",
        "http-logger",
        "kafka-logger",
        "rocketmq-logger",
        "tcp-logger",
        "udp-logger",
        "file-logger",
        "loggly",
        "splunk-hec-logging",
        "syslog",
        "log-rotate",
        "error-log-logger",
        "sls-logger",
        "google-cloud-logging",
        "tencent-cloud-cls",
        "grpc-transcode",
        "grpc-web",
        "public-api",
        "server-info",
        "dubbo-proxy",
        // 3.x new plugins
        "cas-auth",
        "forward-auth",
        "opa",
        "csrf",
        "public-api",
      ],
      deprecatedFeatures: ["etcd.health_check_retry"],
    });
  }

  /**
   * Get version configuration for current APISIX version
   */
  async getCurrentVersionConfig(): Promise<VersionConfig> {
    const version = await this.client.getVersion();
    const majorVersion = this.getMajorVersion(version);

    return (
      this.versionConfigs.get(`${majorVersion}.x`) ||
      this.versionConfigs.get("3.0.x") || {
        version: "3.0.x",
        supportsCredentials: true,
        supportsSecrets: true,
        supportsNewResponseFormat: true,
        supportsStreamRoutes: true,
        supportedPlugins: [],
        deprecatedFeatures: [],
      }
    ); // Default to latest
  }

  /**
   * Check if a feature is supported in current version
   */
  async isFeatureSupported(
    feature: keyof Omit<
      VersionConfig,
      "version" | "supportedPlugins" | "deprecatedFeatures"
    >,
  ): Promise<boolean> {
    const config = await this.getCurrentVersionConfig();
    return config[feature];
  }

  /**
   * Check if a plugin is supported in current version
   */
  async isPluginSupported(pluginName: string): Promise<boolean> {
    const config = await this.getCurrentVersionConfig();
    return config.supportedPlugins.includes(pluginName);
  }

  /**
   * Get list of deprecated features in current version
   */
  async getDeprecatedFeatures(): Promise<string[]> {
    const config = await this.getCurrentVersionConfig();
    return config.deprecatedFeatures;
  }

  /**
   * Check if a feature is deprecated
   */
  async isFeatureDeprecated(feature: string): Promise<boolean> {
    const deprecated = await this.getDeprecatedFeatures();
    return deprecated.includes(feature);
  }

  /**
   * Get migration recommendations for version upgrade
   */
  async getMigrationRecommendations(
    targetVersion: string,
  ): Promise<MigrationRecommendations> {
    const currentConfig = await this.getCurrentVersionConfig();
    const targetMajor = this.getMajorVersion(targetVersion);
    const targetConfig = this.versionConfigs.get(`${targetMajor}.x`);

    if (!targetConfig) {
      throw new Error(`Unsupported target version: ${targetVersion}`);
    }

    const newFeatures: string[] = [];
    const deprecatedFeatures = targetConfig.deprecatedFeatures;
    const breakingChanges: string[] = [];

    // Detect new features
    if (
      targetConfig.supportsCredentials &&
      !currentConfig.supportsCredentials
    ) {
      newFeatures.push("Consumer Credentials API");
    }
    if (targetConfig.supportsSecrets && !currentConfig.supportsSecrets) {
      newFeatures.push("Secret Management");
    }
    if (
      targetConfig.supportsNewResponseFormat &&
      !currentConfig.supportsNewResponseFormat
    ) {
      newFeatures.push("New Admin API Response Format");
      breakingChanges.push(
        "Admin API response format changed - update SDK usage",
      );
    }

    // Detect new plugins
    const newPlugins = targetConfig.supportedPlugins.filter(
      (plugin) => !currentConfig.supportedPlugins.includes(plugin),
    );
    newFeatures.push(...newPlugins.map((plugin) => `${plugin} plugin`));

    return {
      newFeatures,
      deprecatedFeatures,
      breakingChanges,
    };
  }

  private getMajorVersion(version: string): string {
    const parts = version.split(".");
    return parts.length > 0 ? parts[0] : "3"; // Default to 3
  }

  /**
   * Validate configuration against current version
   */
  async validateConfiguration(
    config: Record<string, unknown>,
  ): Promise<ValidationResult> {
    const versionConfig = await this.getCurrentVersionConfig();
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for unsupported plugins
    if (config.plugins) {
      for (const pluginName of Object.keys(config.plugins)) {
        if (!(await this.isPluginSupported(pluginName))) {
          errors.push(
            `Plugin '${pluginName}' is not supported in APISIX ${versionConfig.version}`,
          );
        }
      }
    }

    // Check for deprecated features
    for (const feature of versionConfig.deprecatedFeatures) {
      if (this.hasNestedProperty(config, feature)) {
        warnings.push(
          `Feature '${feature}' is deprecated in APISIX ${versionConfig.version}`,
        );
      }
    }

    // Version-specific validations
    if (!versionConfig.supportsCredentials && config.credentials) {
      errors.push("Credentials API is not supported in this APISIX version");
    }

    if (!versionConfig.supportsSecrets && config.secrets) {
      errors.push("Secret management is not supported in this APISIX version");
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private hasNestedProperty(
    obj: Record<string, unknown>,
    path: string,
  ): boolean {
    const keys = path.split(".");
    let current: unknown = obj;

    for (const key of keys) {
      if (
        typeof current !== "object" ||
        current === null ||
        !(key in current)
      ) {
        return false;
      }
      current = (current as Record<string, unknown>)[key];
    }

    return true;
  }
}
