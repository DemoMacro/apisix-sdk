import { ApisixSDK } from "../../packages/apisix-sdk/src";

async function pluginExamples() {
  console.log("🚀 APISIX SDK - Plugin Configuration Examples");
  console.log("=============================================");

  const client = new ApisixSDK({
    baseURL: "http://127.0.0.1:9180",
    apiKey: "edd1c9f034335f136f87ad84b625c8f1",
  });

  try {
    // Test connection
    const connected = await client.testConnection();
    if (!connected) {
      console.log("❌ Cannot connect to APISIX Admin API");
      return;
    }
    console.log("✅ Connected to APISIX Admin API");

    // Create upstream
    const upstream = await client.upstreams.create({
      name: "plugin-demo-backend",
      type: "roundrobin",
      nodes: [{ host: "127.0.0.1", port: 8080, weight: 1 }],
    });

    // 1. Authentication Plugins
    console.log("\n🔐 1. Authentication Plugins Example");

    // Create consumer for authentication
    const consumer = await client.consumers.create({
      username: "demo-user",
      plugins: {
        "key-auth": {
          key: "demo-api-key-123",
        },
        "jwt-auth": {
          key: "demo-user",
          secret: "my-secret-key",
          algorithm: "HS256",
        },
      },
    });
    console.log(`✅ Consumer created: ${consumer.username}`);

    // Route with key-auth
    const authRoute = await client.routes.create({
      name: "auth-protected-route",
      uri: "/api/auth/*",
      methods: ["GET", "POST"],
      upstream_id: upstream.id,
      plugins: {
        "key-auth": {},
      },
    });
    console.log(`✅ Auth-protected route created: ${authRoute.id}`);

    // 2. Rate Limiting Plugins
    console.log("\n⏱️ 2. Rate Limiting Plugins Example");

    const rateLimitRoute = await client.routes.create({
      name: "rate-limited-route",
      uri: "/api/limited/*",
      methods: ["GET"],
      upstream_id: upstream.id,
      plugins: {
        "limit-req": {
          rate: 10,
          burst: 5,
          key: "remote_addr",
          rejected_code: 429,
          nodelay: true,
        },
        "limit-conn": {
          conn: 10,
          burst: 5,
          key: "remote_addr",
          default_conn_delay: 0.1,
        },
        "limit-count": {
          count: 100,
          time_window: 3600,
          rejected_code: 429,
          policy: "local",
        },
      },
    });
    console.log(`✅ Rate-limited route created: ${rateLimitRoute.id}`);

    // 3. Security Plugins
    console.log("\n🛡️ 3. Security Plugins Example");

    const securityRoute = await client.routes.create({
      name: "security-enhanced-route",
      uri: "/api/secure/*",
      methods: ["GET", "POST"],
      upstream_id: upstream.id,
      plugins: {
        cors: {
          origin: "https://mydomain.com",
          methods: "GET,POST,PUT,DELETE",
          headers: "Authorization,Content-Type",
          max_age: 86400,
        },
        "ip-restriction": {
          whitelist: ["127.0.0.1", "192.168.1.0/24"],
        },
        "ua-restriction": {
          bypass_missing: true,
          allowlist: ["Chrome", "Firefox", "Safari"],
        },
      },
    });
    console.log(`✅ Security-enhanced route created: ${securityRoute.id}`);

    // 4. Load Balancing and Health Check
    console.log("\n⚖️ 4. Load Balancing with Health Check Example");

    const lbUpstream = await client.upstreams.create({
      name: "loadbalanced-backend",
      type: "roundrobin",
      nodes: [
        { host: "127.0.0.1", port: 8080, weight: 1 },
        { host: "127.0.0.1", port: 8081, weight: 2 },
        { host: "127.0.0.1", port: 8082, weight: 1 },
      ],
      checks: {
        active: {
          type: "http",
          http_path: "/health",
          healthy: {
            interval: 5,
            successes: 2,
          },
          unhealthy: {
            interval: 5,
            http_failures: 3,
          },
        },
        passive: {
          healthy: {
            http_statuses: [200, 201, 202],
          },
          unhealthy: {
            http_statuses: [500, 502, 503, 504],
          },
        },
      },
    });

    const lbRoute = await client.routes.create({
      name: "loadbalanced-route",
      uri: "/api/lb/*",
      methods: ["GET", "POST"],
      upstream_id: lbUpstream.id,
    });
    console.log(`✅ Load-balanced route created: ${lbRoute.id}`);

    // 5. Logging and Monitoring
    console.log("\n📊 5. Logging and Monitoring Example");

    const loggingRoute = await client.routes.create({
      name: "monitored-route",
      uri: "/api/monitor/*",
      methods: ["GET", "POST"],
      upstream_id: upstream.id,
      plugins: {
        prometheus: {
          prefer_name: true,
        },
        "http-logger": {
          uri: "http://localhost:3000/logs",
          batch_max_size: 100,
          max_retry_count: 3,
          retry_delay: 1,
          buffer_duration: 60,
          inactive_timeout: 5,
        },
        "file-logger": {
          path: "/tmp/apisix-access.log",
        },
      },
    });
    console.log(`✅ Monitored route created: ${loggingRoute.id}`);

    // 6. Request/Response Transformation
    console.log("\n🔄 6. Request/Response Transformation Example");

    const transformRoute = await client.routes.create({
      name: "transform-route",
      uri: "/api/transform/*",
      methods: ["GET", "POST"],
      upstream_id: upstream.id,
      plugins: {
        "proxy-rewrite": {
          scheme: "https",
          host: "new-backend.com",
          headers: {
            "X-Forwarded-For": "$remote_addr",
            "X-Real-IP": "$remote_addr",
          },
        },
        "response-rewrite": {
          status_code: 200,
          headers: {
            "X-Server": "APISIX",
          },
        },
        "request-validation": {
          type: "object",
          properties: {
            name: { type: "string", minLength: 1 },
            age: { type: "integer", minimum: 0 },
          },
          required: ["name"],
        },
      },
    });
    console.log(`✅ Transform route created: ${transformRoute.id}`);

    // 7. Cache Plugin
    console.log("\n🗄️ 7. Cache Plugin Example");

    const cacheRoute = await client.routes.create({
      name: "cached-route",
      uri: "/api/cache/*",
      methods: ["GET"],
      upstream_id: upstream.id,
      plugins: {
        "proxy-cache": {
          cache_zone: "disk_cache_one",
          cache_key: ["$host", "$request_uri"],
          cache_bypass: ["$arg_bypass"],
          cache_method: ["GET"],
          cache_http_status: [200, 301, 404],
          hide_cache_headers: true,
          cache_control: false,
          no_cache: ["$arg_test"],
        },
      },
    });
    console.log(`✅ Cached route created: ${cacheRoute.id}`);

    // List enabled plugins
    console.log("\n📋 Listing enabled plugins...");
    const plugins = await client.plugins.list();
    console.log(`Total enabled plugins: ${Object.keys(plugins).length}`);
    console.log("Plugins:", Object.keys(plugins).join(", "));

    // Clean up
    console.log("\n🧹 Cleaning up...");
    if (authRoute.id) await client.routes.delete(authRoute.id);
    if (rateLimitRoute.id) await client.routes.delete(rateLimitRoute.id);
    if (securityRoute.id) await client.routes.delete(securityRoute.id);
    if (lbRoute.id) await client.routes.delete(lbRoute.id);
    if (loggingRoute.id) await client.routes.delete(loggingRoute.id);
    if (transformRoute.id) await client.routes.delete(transformRoute.id);
    if (cacheRoute.id) await client.routes.delete(cacheRoute.id);
    await client.consumers.delete(consumer.username);
    if (upstream.id) await client.upstreams.delete(upstream.id);
    if (lbUpstream.id) await client.upstreams.delete(lbUpstream.id);
    console.log("✅ All resources cleaned up");

    console.log("\n🎉 Plugin examples completed!");
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

export { pluginExamples };

// Run if called directly
if (require.main === module) {
  pluginExamples().catch(console.error);
}
