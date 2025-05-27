import { createClient, getClientConfig, validateConnection } from "../client";

/**
 * Basic APISIX SDK Usage Example
 *
 * This example demonstrates the basic functionality of the SDK:
 * - Creating and configuring upstream, service, and route
 * - Resource management (CRUD operations)
 * - Resource cleanup
 */
async function basicUsageExample(): Promise<void> {
  console.log("🚀 Starting Basic APISIX SDK Usage Example\n");

  try {
    // Initialize client with configuration
    const client = await createClient();
    const config = getClientConfig();
    console.log(`📊 Client Configuration:
- Admin URL: ${config.adminUrl}
- Control URL: ${config.controlUrl}
- Environment: ${config.environment}
- Timeout: ${config.timeout}ms\n`);

    // Validate connection
    console.log("🔍 Validating connection...");
    const isConnected = await validateConnection(client);
    if (!isConnected) {
      throw new Error("Failed to connect to APISIX");
    }
    console.log("✅ Connected to APISIX successfully\n");

    // Test IDs for resources
    const upstreamId = "test-upstream-basic";
    const serviceId = "test-service-basic";
    const routeId = "test-route-basic";

    // === Create Upstream ===
    console.log("📦 Creating Upstream...");
    const upstream = await client.upstreams.create(
      {
        name: "test-upstream",
        desc: "Test upstream for basic example",
        type: "roundrobin",
        nodes: {
          "httpbin.org:80": 1,
          "www.baidu.com:80": 1,
        },
        timeout: {
          connect: 6,
          send: 6,
          read: 6,
        },
      },
      upstreamId,
    );
    console.log("✅ Upstream created:", upstream.id);

    // === Create Service ===
    console.log("🔧 Creating Service...");
    const service = await client.services.create(
      {
        name: "test-service",
        desc: "Test service for basic example",
        upstream_id: upstreamId,
        enable_websocket: false,
      },
      serviceId,
    );
    console.log("✅ Service created:", service.id);

    // === Create Route ===
    console.log("🛣️  Creating Route...");
    const route = await client.routes.create(
      {
        name: "test-route",
        desc: "Test route for basic example",
        uri: "/test-basic",
        methods: ["GET", "POST"],
        service_id: serviceId,
        status: 1,
      },
      routeId,
    );
    console.log("✅ Route created:", route.id);

    // === List resources ===
    console.log("\n📋 Listing created resources...");
    const upstreams = await client.upstreams.list({ page_size: 10 });
    const services = await client.services.list({ page_size: 10 });
    const routes = await client.routes.list({ page_size: 10 });

    console.log(`- Upstreams: ${upstreams.length} total`);
    console.log(`- Services: ${services.length} total`);
    console.log(`- Routes: ${routes.length} total`);

    // === Cleanup ===
    if (config.testConfig.cleanupEnabled) {
      console.log("\n🧹 Cleaning up resources...");

      try {
        await client.routes.delete(routeId);
        console.log("✅ Route deleted");
      } catch (error) {
        console.warn("⚠️  Failed to delete route:", error);
      }

      try {
        await client.services.delete(serviceId);
        console.log("✅ Service deleted");
      } catch (error) {
        console.warn("⚠️  Failed to delete service:", error);
      }

      try {
        await client.upstreams.delete(upstreamId);
        console.log("✅ Upstream deleted");
      } catch (error) {
        console.warn("⚠️  Failed to delete upstream:", error);
      }
    }

    console.log("\n🎉 Basic usage example completed successfully!");
  } catch (error) {
    console.error("❌ Example failed:", error);
    process.exit(1);
  }
}

// Run the example
if (import.meta.url === `file://${process.argv[1]}`) {
  basicUsageExample().catch(console.error);
}

export { basicUsageExample };
