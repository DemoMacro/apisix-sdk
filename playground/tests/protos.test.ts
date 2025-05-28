import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { ApisixSDK } from "../../packages/apisix-sdk/src";
import { createTestClient, resetClient, validateConnection } from "../client";
import { TestHelpers } from "./test-helpers";

describe("APISIX SDK - Protos Management", () => {
  let client: ApisixSDK;
  let helpers: TestHelpers;
  const testIds = {
    proto: "test-proto",
    validationProto: "test-validation-proto",
  };

  beforeAll(async () => {
    client = await createTestClient();

    // Validate connection
    const isConnected = await validateConnection(client);
    if (!isConnected) {
      throw new Error("Cannot connect to APISIX for testing");
    }

    helpers = new TestHelpers(client);

    // Clean up any existing test resources
    await cleanupTestResources();
  });

  afterAll(async () => {
    await cleanupTestResources();
    resetClient();
  });

  async function cleanupTestResources() {
    const cleanupTasks = [
      () => client.protos.delete(testIds.proto).catch(() => {}),
      () => client.protos.delete(testIds.validationProto).catch(() => {}),
      () => client.protos.delete("search-proto-1").catch(() => {}),
      () => client.protos.delete("search-proto-2").catch(() => {}),
      () => client.protos.delete("clone-source").catch(() => {}),
      () => client.protos.delete("clone-target").catch(() => {}),
    ];

    await Promise.all(cleanupTasks.map((task) => task()));
  }

  describe("Basic CRUD Operations", () => {
    it("should create a proto definition", async () => {
      const proto = await client.protos.create(
        {
          desc: "Test proto definition",
          content: `
            syntax = "proto3";
            package test;
            service TestService {
              rpc Test(TestRequest) returns (TestResponse) {}
            }
            message TestRequest { string name = 1; }
            message TestResponse { string message = 1; }
          `,
        },
        testIds.proto,
      );

      expect(proto).toBeDefined();
      expect(proto.id).toBe(testIds.proto);
      expect(proto.desc).toBe("Test proto definition");
      expect(proto.content).toContain('syntax = "proto3"');
    });

    it("should get proto by id", async () => {
      const proto = await client.protos.get(testIds.proto);

      expect(proto).toBeDefined();
      expect(proto.id).toBe(testIds.proto);
      expect(proto.desc).toBe("Test proto definition");
      expect(proto.content).toContain("service TestService");
    });

    it("should list protos", async () => {
      const protos = await client.protos.list();

      expect(Array.isArray(protos)).toBe(true);
      expect(protos.length).toBeGreaterThan(0);
      expect(protos.some((p) => p.id === testIds.proto)).toBe(true);
    });

    it("should update proto", async () => {
      const updatedContent = `
        syntax = "proto3";
        package helloworld;

        service Greeter {
          rpc SayHello(HelloRequest) returns (HelloReply) {}
          rpc SayGoodbye(GoodbyeRequest) returns (GoodbyeReply) {}
        }

        message HelloRequest {
          string name = 1;
        }

        message HelloReply {
          string message = 1;
        }

        message GoodbyeRequest {
          string name = 1;
        }

        message GoodbyeReply {
          string message = 1;
        }
      `;

      const updated = await client.protos.update(testIds.proto, {
        desc: "Updated test proto with goodbye service",
        content: updatedContent,
      });

      expect(updated.desc).toBe("Updated test proto with goodbye service");
      expect(updated.content).toContain("SayGoodbye");
    });

    it("should check if proto exists", async () => {
      const exists = await client.protos.exists(testIds.proto);
      expect(exists).toBe(true);

      const notExists = await client.protos.exists("non-existent-proto");
      expect(notExists).toBe(false);
    });

    it("should delete proto", async () => {
      const deleted = await client.protos.delete(testIds.proto);
      expect(deleted).toBe(true);

      const exists = await client.protos.exists(testIds.proto);
      expect(exists).toBe(false);
    });
  });

  describe("Protobuf Validation", () => {
    it("should validate valid protobuf content", async () => {
      const validContent = `
        syntax = "proto3";
        package test;

        service TestService {
          rpc TestMethod(TestRequest) returns (TestResponse) {}
        }

        message TestRequest {
          string value = 1;
        }

        message TestResponse {
          string result = 1;
        }
      `;

      const validation = client.protos.validateProtobufContent(validContent);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toBeUndefined();
    });

    it("should reject invalid protobuf content", async () => {
      const invalidContent = "this is not a valid protobuf";

      const validation = client.protos.validateProtobufContent(invalidContent);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toBeDefined();
      expect(validation.errors?.length).toBeGreaterThan(0);
    });

    it("should reject empty content", async () => {
      const validation = client.protos.validateProtobufContent("");
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain("Protobuf content cannot be empty");
    });

    it("should create proto with validation", async () => {
      const validContent = `
        syntax = "proto3";
        package validation;

        message ValidationMessage {
          string data = 1;
        }
      `;

      const proto = await client.protos.createWithValidation(
        {
          desc: "Validated proto",
          content: validContent,
        },
        testIds.validationProto,
      );

      expect(proto).toBeDefined();
      expect(proto.id).toBe(testIds.validationProto);

      // Clean up
      await client.protos.delete(testIds.validationProto);
    });

    it("should reject invalid proto creation with validation", async () => {
      const invalidContent = "invalid proto content";

      await expect(
        client.protos.createWithValidation(
          {
            desc: "Invalid proto",
            content: invalidContent,
          },
          "invalid-proto",
        ),
      ).rejects.toThrow("Protobuf validation failed");
    });
  });

  describe("Search and Filter", () => {
    beforeAll(async () => {
      // Create test protos for search
      await client.protos.create(
        {
          desc: "Search test proto 1 - type:search version:v1",
          content: `
            syntax = "proto3";
            package search;
            service SearchService1 {
              rpc Search1(SearchRequest) returns (SearchResponse) {}
            }
            message SearchRequest { string query = 1; }
            message SearchResponse { string result = 1; }
          `,
        },
        "search-proto-1",
      );

      await client.protos.create(
        {
          desc: "Search test proto 2 - type:search version:v2",
          content: `
            syntax = "proto3";
            package search;
            service SearchService2 {
              rpc Search2(SearchRequest) returns (SearchResponse) {}
            }
            message SearchRequest { string query = 1; }
            message SearchResponse { string result = 1; }
          `,
        },
        "search-proto-2",
      );
    });

    it("should find protos by description content", async () => {
      const allProtos = await client.protos.list();
      const searchProtos = allProtos.filter((p) =>
        p.desc?.includes("type:search"),
      );
      const v1Protos = allProtos.filter((p) => p.desc?.includes("version:v1"));

      expect(Array.isArray(searchProtos)).toBe(true);
      expect(searchProtos.length).toBeGreaterThanOrEqual(2);
      expect(searchProtos.some((p) => p.id === "search-proto-1")).toBe(true);
      expect(searchProtos.some((p) => p.id === "search-proto-2")).toBe(true);

      expect(Array.isArray(v1Protos)).toBe(true);
      expect(v1Protos.some((p) => p.id === "search-proto-1")).toBe(true);
    });

    it("should list protos with pagination", async () => {
      const shouldSkip = await helpers.skipIfUnsupported("pagination");
      if (shouldSkip) {
        console.log(
          "Pagination not supported in this APISIX version, skipping test",
        );
        return;
      }

      const result = await client.protos.listPaginated(1, 5);

      expect(result).toBeDefined();
      expect(Array.isArray(result.protos)).toBe(true);
      expect(result.protos.length).toBeLessThanOrEqual(5);
    });
  });

  describe("Utility Functions", () => {
    it("should clone proto", async () => {
      // First create source proto
      const sourceContent = `
        syntax = "proto3";
        package source;
        service SourceService {
          rpc SourceMethod(SourceRequest) returns (SourceResponse) {}
        }
        message SourceRequest { string input = 1; }
        message SourceResponse { string output = 1; }
      `;

      await client.protos.create(
        {
          desc: "Source proto for cloning - env:source",
          content: sourceContent,
        },
        "clone-source",
      );

      const cloned = await client.protos.clone(
        "clone-source",
        {
          desc: "Cloned proto - env:cloned",
        },
        "clone-target",
      );

      expect(cloned).toBeDefined();
      expect(cloned.id).toBe("clone-target");
      expect(cloned.desc).toBe("Cloned proto - env:cloned");
      expect(cloned.content).toContain("SourceService");
    });

    it("should get proto statistics", async () => {
      const stats = await client.protos.getStatistics();

      expect(stats).toBeDefined();
      expect(typeof stats.total).toBe("number");
      expect(stats.total).toBeGreaterThan(0);
      expect(typeof stats.labelUsage).toBe("object");
    });
  });

  describe("Error Handling", () => {
    it("should handle non-existent proto", async () => {
      await expect(client.protos.get("non-existent-proto")).rejects.toThrow();
    });

    it("should handle invalid proto data", async () => {
      await expect(
        client.protos.create({
          // Missing required content field
        } as never),
      ).rejects.toThrow();
    });
  });
});
