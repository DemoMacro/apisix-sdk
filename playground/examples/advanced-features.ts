import { createClient, getClientConfig, validateConnection } from "../client";

/**
 * Advanced APISIX SDK Features Example
 *
 * This example demonstrates advanced features in APISIX 3.0+:
 * - Credential Management
 * - Secret Management
 * - Stream Routes
 * - Pagination and Filtering
 * - Control API
 */
async function advancedFeaturesExample(): Promise<void> {
  console.log("🚀 Starting Advanced APISIX SDK Features Example\n");

  try {
    // Initialize client with configuration
    const client = await createClient();
    const config = getClientConfig();
    console.log(`📊 Client Configuration:
- Admin URL: ${config.adminUrl}
- Control URL: ${config.controlUrl}
- Environment: ${config.environment}
- Log Level: ${config.logLevel}\n`);

    // Validate connection
    console.log("🔍 Validating connections...");
    const [adminConnected, controlConnected] = await Promise.all([
      validateConnection(client),
      client.testControlConnection().catch(() => false),
    ]);

    console.log(`✅ Admin API: ${adminConnected ? "Connected" : "Failed"}`);
    console.log(
      `✅ Control API: ${controlConnected ? "Connected" : "Failed"}\n`,
    );

    if (!adminConnected) {
      throw new Error("Cannot proceed without Admin API connection");
    }

    // === Control API Features ===
    if (controlConnected) {
      console.log("🎮 Testing Control API features...");

      try {
        const healthCheck = await client.control.isHealthy();
        console.log("- Health Check:", healthCheck ? "Healthy" : "Unhealthy");

        const serverInfo = await client.control.getServerInfo();
        console.log(`- Server Version: ${serverInfo.version}`);
        console.log(`- Hostname: ${serverInfo.hostname}`);

        const overview = await client.control.getSystemOverview();
        console.log(
          `- System Overview: ${Object.keys(overview).length} components`,
        );
      } catch (error) {
        console.warn("⚠️  Some Control API features unavailable:", error);
      }
      console.log();
    }

    // === Credential Management ===
    console.log("🔐 Testing Credential Management...");
    const credentialId = "test-credential-advanced";

    try {
      const credential = await client.credentials.create(
        {
          plugins: {
            "key-auth": {
              key: "test-api-key-123",
            },
            "basic-auth": {
              username: "test-user",
              password: "test-password",
            },
          },
          desc: "Test credential for advanced example",
          labels: {
            env: "test",
            example: "advanced",
          },
        },
        credentialId,
      );
      console.log("✅ Credential created:", credential.id);

      // List credentials with pagination
      const credentials = await client.credentials.listPaginated(1, 5);
      console.log(`- Found ${credentials.credentials.length} credentials`);
    } catch (error) {
      console.warn("⚠️  Credential management not available:", error);
    }

    // === Secret Management ===
    console.log("\n🔒 Testing Secret Management...");
    const secretId = "test-vault-secret";

    try {
      const secret = await client.secrets.createVaultSecret(
        {
          uri: "http://127.0.0.1:8200",
          prefix: "kv/test",
          token: "test-token",
          namespace: "test",
        },
        secretId,
      );
      console.log("✅ Vault secret created:", secret.id);

      // List secrets
      const allSecrets = await client.secrets.listAllSecrets();
      console.log(`- Found ${allSecrets.vault.length} vault secrets`);
    } catch (error) {
      console.warn("⚠️  Secret management not available:", error);
    }

    // === Stream Routes ===
    console.log("\n🌊 Testing Stream Routes...");
    const streamRouteId = "test-stream-route";

    try {
      // Create TCP proxy stream route
      const streamRoute = await client.streamRoutes.createTCPRoute(
        {
          server_port: 9100,
          upstream: {
            type: "roundrobin",
            nodes: [{ host: "127.0.0.1", port: 8080, weight: 1 }],
          },
        },
        streamRouteId,
      );
      console.log("✅ Stream route created:", streamRoute.id);

      // List stream routes
      const streamRoutes = await client.streamRoutes.list();
      console.log(`- Found ${streamRoutes.length} stream routes`);
    } catch (error) {
      console.warn("⚠️  Stream routes not available:", error);
    }

    // === Pagination and Filtering Demo ===
    console.log("\n📄 Testing Pagination and Filtering...");

    try {
      // Create some test routes for pagination demo
      const testRoutes = [];
      for (let i = 1; i <= 3; i++) {
        try {
          const route = await client.routes.create(
            {
              name: `pagination-test-${i}`,
              uri: `/test-pagination-${i}`,
              methods: ["GET"],
              upstream: {
                type: "roundrobin",
                nodes: [{ host: "httpbin.org", port: 80, weight: 1 }],
              },
              labels: {
                test: "pagination",
                index: i.toString(),
              },
            },
            `pagination-test-${i}`,
          );
          testRoutes.push(route);
        } catch (error) {
          console.warn(`Failed to create test route ${i}:`, error);
        }
      }

      if (testRoutes.length > 0) {
        // Test pagination
        const page1 = await client.routes.list({ page: 1, page_size: 2 });
        console.log(`- Page 1: ${page1.length} routes`);

        // Test filtering (if supported)
        const filteredRoutes = await client.routes.list({
          name: "pagination-test",
        });
        console.log(`- Filtered routes: ${filteredRoutes.length} routes`);
      }
    } catch (error) {
      console.warn("⚠️  Pagination features not fully available:", error);
    }

    // === Plugin Configuration Demo ===
    console.log("\n🔌 Testing Plugin Configuration...");

    try {
      // Create route with multiple plugins
      const pluginRouteId = "test-plugin-route";
      const pluginRoute = await client.routes.create(
        {
          name: "plugin-test-route",
          uri: "/test-plugins",
          methods: ["GET", "POST"],
          plugins: {
            "limit-req": {
              rate: 10,
              burst: 5,
              key: "remote_addr",
              rejected_code: 429,
            },
            cors: {
              allow_origins: "*",
              allow_methods: "GET,POST",
              allow_headers: "*",
            },
            prometheus: {
              disable: false,
            },
          },
          upstream: {
            type: "roundrobin",
            nodes: [{ host: "httpbin.org", port: 80, weight: 1 }],
          },
        },
        pluginRouteId,
      );
      console.log("✅ Plugin route created:", pluginRoute.id);

      // List available plugins
      const plugins = await client.plugins.list();
      console.log(
        `- Available plugins: ${Object.keys(plugins).length} plugins`,
      );
    } catch (error) {
      console.warn("⚠️  Plugin configuration failed:", error);
    }

    // === Cleanup ===
    if (config.testConfig.cleanupEnabled) {
      console.log("\n🧹 Cleaning up resources...");

      const cleanupTasks = [
        () => client.credentials.delete(credentialId).catch(() => {}),
        () => client.secrets.deleteVaultSecret(secretId).catch(() => {}),
        () => client.streamRoutes.delete(streamRouteId).catch(() => {}),
        () => client.routes.delete("pagination-test-1").catch(() => {}),
        () => client.routes.delete("pagination-test-2").catch(() => {}),
        () => client.routes.delete("pagination-test-3").catch(() => {}),
        () => client.routes.delete("test-plugin-route").catch(() => {}),
      ];

      await Promise.all(cleanupTasks.map((task) => task()));
      console.log("✅ Cleanup completed");
    }

    console.log("\n🎉 Advanced features example completed!");
  } catch (error) {
    console.error("❌ Example failed:", error);
    process.exit(1);
  }
}

// Run the example
if (import.meta.url === `file://${process.argv[1]}`) {
  advancedFeaturesExample().catch(console.error);
}

export { advancedFeaturesExample };
