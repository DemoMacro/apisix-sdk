import { ApisixSDK } from "../packages/apisix-sdk/src";
import { getConfig, loadAppConfig } from "./config";

let _client: ApisixSDK | null = null;

/**
 * Create and return a configured APISIX SDK client instance
 * Using c12 to load the configuration information
 */
export async function createClient(): Promise<ApisixSDK> {
  if (_client) {
    return _client;
  }

  // Load configuration
  const config = await loadAppConfig();

  // Create client instance
  _client = new ApisixSDK({
    baseURL: config.apisix.adminUrl,
    apiKey: config.apisix.apiKey,
    timeout: config.apisix.timeout,
  });

  return _client;
}

/**
 * Get the created client instance
 * If not created, throw an error
 */
export function getClient(): ApisixSDK {
  if (!_client) {
    throw new Error("Client not initialized. Call createClient() first.");
  }
  return _client;
}

/**
 * Reset the client instance (mainly for testing)
 */
export function resetClient(): void {
  _client = null;
}

/**
 * Create a test client (for testing environment)
 */
export async function createTestClient(): Promise<ApisixSDK> {
  const config = await loadAppConfig();

  return new ApisixSDK({
    baseURL: config.apisix.adminUrl,
    apiKey: config.apisix.apiKey,
    timeout: config.test.timeout,
  });
}

/**
 * Validate client connection
 */
export async function validateConnection(client?: ApisixSDK): Promise<boolean> {
  try {
    const testClient = client || (await createClient());
    await testClient.consumers.list();
    return true;
  } catch (error) {
    console.error("APISIX connection validation failed:", error);
    return false;
  }
}

/**
 * Get client configuration information
 */
export function getClientConfig() {
  const config = getConfig();
  return {
    adminUrl: config.apisix.adminUrl,
    controlUrl: config.apisix.controlUrl,
    timeout: config.apisix.timeout,
    logLevel: config.apisix.logLevel,
    testConfig: config.test,
    environment: config.env,
  };
}
