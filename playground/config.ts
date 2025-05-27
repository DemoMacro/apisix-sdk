import { loadConfig } from "c12";

export interface ApisixConfig {
  adminUrl: string;
  controlUrl: string;
  apiKey: string;
  timeout: number;
  logLevel: "debug" | "info" | "warn" | "error";
}

export interface TestConfig {
  cleanupEnabled: boolean;
  timeout: number;
}

export interface AppConfig {
  apisix: ApisixConfig;
  test: TestConfig;
  env: string;
}

export interface AppConfigOverrides {
  apisix?: Partial<ApisixConfig>;
  test?: Partial<TestConfig>;
  env?: string;
}

// Default configuration
const defaults: AppConfig = {
  apisix: {
    adminUrl: "http://127.0.0.1:9180",
    controlUrl: "http://127.0.0.1:9090",
    apiKey: "",
    timeout: 30000,
    logLevel: "info",
  },
  test: {
    cleanupEnabled: true,
    timeout: 30000,
  },
  env: "development",
};

let _config: AppConfig | null = null;

export async function loadAppConfig(): Promise<AppConfig> {
  if (_config) {
    return _config;
  }

  const { config } = await loadConfig<Partial<AppConfig>>({
    name: "apisix-sdk",
    defaults,
    dotenv: true,
    envName: "NODE_ENV",
    configFile: "config",
    cwd: process.cwd(),
  });

  // Map environment variables to config structure
  _config = {
    apisix: {
      adminUrl:
        process.env.APISIX_ADMIN_URL ||
        config.apisix?.adminUrl ||
        defaults.apisix.adminUrl,
      controlUrl:
        process.env.APISIX_CONTROL_URL ||
        config.apisix?.controlUrl ||
        defaults.apisix.controlUrl,
      apiKey:
        process.env.APISIX_API_KEY ||
        config.apisix?.apiKey ||
        defaults.apisix.apiKey,
      timeout:
        Number(process.env.APISIX_SDK_TIMEOUT) ||
        config.apisix?.timeout ||
        defaults.apisix.timeout,
      logLevel:
        (process.env.APISIX_SDK_LOG_LEVEL as
          | "debug"
          | "info"
          | "warn"
          | "error") ||
        config.apisix?.logLevel ||
        defaults.apisix.logLevel,
    },
    test: {
      cleanupEnabled:
        process.env.TEST_CLEANUP_ENABLED === "true" ||
        config.test?.cleanupEnabled ||
        defaults.test.cleanupEnabled,
      timeout:
        Number(process.env.TEST_TIMEOUT) ||
        config.test?.timeout ||
        defaults.test.timeout,
    },
    env: process.env.NODE_ENV || config.env || defaults.env,
  };

  return _config;
}

export function getConfig(): AppConfig {
  if (!_config) {
    throw new Error("Config not loaded. Call loadAppConfig() first.");
  }
  return _config;
}

// Development configuration overrides
export const developmentConfig: AppConfigOverrides = {
  apisix: {
    logLevel: "debug",
  },
  test: {
    cleanupEnabled: true,
  },
};

// Test configuration overrides
export const testConfig: AppConfigOverrides = {
  apisix: {
    logLevel: "warn",
    timeout: 10000,
  },
  test: {
    cleanupEnabled: true,
    timeout: 10000,
  },
};

// Production configuration overrides
export const productionConfig: AppConfigOverrides = {
  apisix: {
    logLevel: "error",
    timeout: 60000,
  },
  test: {
    cleanupEnabled: false,
  },
};
