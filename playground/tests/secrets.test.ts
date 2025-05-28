import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { ApisixSDK } from "../../packages/apisix-sdk/src";
import { createTestClient, resetClient, validateConnection } from "../client";
import { TestHelpers } from "./test-helpers";

describe("APISIX SDK - Secrets Management", () => {
  let client: ApisixSDK;
  let helpers: TestHelpers;
  const baseTestIds = {
    vaultSecret: "test-vault-secret",
    awsSecret: "test-aws-secret",
    gcpSecret: "test-gcp-secret",
  };

  // Test IDs for cleanup
  let testIds = {
    vaultSecret: "test-vault-secret",
    awsSecret: "test-aws-secret",
    gcpSecret: "test-gcp-secret",
  };

  beforeAll(async () => {
    client = await createTestClient();

    // Validate connection
    const isConnected = await validateConnection(client);
    if (!isConnected) {
      throw new Error("Cannot connect to APISIX for testing");
    }

    helpers = new TestHelpers(client);

    // Set up actual test IDs with version-aware prefixes
    testIds = {
      vaultSecret: await helpers.normalizeSecretId(
        "vault",
        baseTestIds.vaultSecret,
      ),
      awsSecret: await helpers.normalizeSecretId("aws", baseTestIds.awsSecret),
      gcpSecret: await helpers.normalizeSecretId("gcp", baseTestIds.gcpSecret),
    };

    // Clean up any existing test resources
    await cleanupTestResources();
  });

  afterAll(async () => {
    await cleanupTestResources();
    resetClient();
  });

  async function cleanupTestResources() {
    const cleanupTasks = [
      () =>
        client.secrets
          .deleteVaultSecret(baseTestIds.vaultSecret)
          .catch(() => {}),
      () =>
        client.secrets.deleteAWSSecret(baseTestIds.awsSecret).catch(() => {}),
      () =>
        client.secrets.deleteGCPSecret(baseTestIds.gcpSecret).catch(() => {}),
      () =>
        client.secrets.deleteVaultSecret("test-clone-vault").catch(() => {}),
      () => client.secrets.deleteAWSSecret("test-clone-aws").catch(() => {}),
      () => client.secrets.deleteGCPSecret("test-clone-gcp").catch(() => {}),
    ];

    await Promise.all(cleanupTasks.map((task) => task()));
  }

  describe("Vault Secret Management", () => {
    it("should create a Vault secret", async () => {
      const secret = await client.secrets.createVaultSecret(
        {
          uri: "https://vault.example.com",
          prefix: "/apisix/secrets",
          token: "hvs.CAESIP1mTkpOTF-secret-token",
          namespace: "admin",
        },
        baseTestIds.vaultSecret,
      );

      expect(secret).toBeDefined();
      expect(secret.id).toBe(testIds.vaultSecret);
      expect(secret.uri).toBe("https://vault.example.com");
      expect(secret.prefix).toBe("/apisix/secrets");
      expect(secret.token).toBe("hvs.CAESIP1mTkpOTF-secret-token");
    });

    it("should get Vault secret by id", async () => {
      const secret = await client.secrets.getVaultSecret(
        baseTestIds.vaultSecret,
      );

      expect(secret).toBeDefined();
      expect(secret.id).toBe(baseTestIds.vaultSecret);
      expect(secret.uri).toBe("https://vault.example.com");
    });

    it("should list Vault secrets", async () => {
      const secrets = await client.secrets.listVaultSecrets();

      expect(Array.isArray(secrets)).toBe(true);
      // After creation test, the vault secret should exist
      expect(secrets.length).toBeGreaterThan(0);

      // APISIX returns secrets with type prefix in the ID
      expect(
        secrets.some((s) => s.id === `vault/${baseTestIds.vaultSecret}`),
      ).toBe(true);
    });

    it("should update Vault secret", async () => {
      const updated = await client.secrets.updateVaultSecret(
        baseTestIds.vaultSecret,
        {
          uri: "https://updated-vault.example.com",
          prefix: "/apisix/updated",
          token: "hvs.CAESIP1mTkpOTF-secret-token",
          namespace: "updated-namespace",
        },
      );

      expect(updated.uri).toBe("https://updated-vault.example.com");
      expect(updated.prefix).toBe("/apisix/updated");
      expect(updated.namespace).toBe("updated-namespace");
    });

    it("should find Vault secrets by namespace", async () => {
      const secrets =
        await client.secrets.findVaultSecretsByNamespace("updated-namespace");

      expect(Array.isArray(secrets)).toBe(true);
      expect(
        secrets.some((s) => s.id === `vault/${baseTestIds.vaultSecret}`),
      ).toBe(true);
    });

    it("should create Vault secret with validation", async () => {
      const secret = await client.secrets.createVaultSecretWithValidation(
        {
          uri: "https://validated-vault.example.com",
          prefix: "/apisix/validated",
          token: "validated-token",
        },
        "validated-vault-secret",
      );

      expect(secret).toBeDefined();
      expect(secret.id).toBe("validated-vault-secret");

      // Clean up
      await client.secrets.deleteVaultSecret("validated-vault-secret");
    });

    it("should test Vault connection", async () => {
      const connectionTest = await client.secrets.testVaultConnection(
        baseTestIds.vaultSecret,
      );

      expect(connectionTest).toBeDefined();
      expect(typeof connectionTest.connected).toBe("boolean");
      // Note: Connection will likely fail since we're using fake credentials
    });

    it("should delete Vault secret", async () => {
      const deleted = await client.secrets.deleteVaultSecret(
        baseTestIds.vaultSecret,
      );
      expect(deleted).toBe(true);

      const secrets = await client.secrets.listVaultSecrets();
      expect(secrets.some((s) => s.id === baseTestIds.vaultSecret)).toBe(false);
    });
  });

  describe("AWS Secret Management", () => {
    it("should create an AWS secret", async () => {
      const secret = await client.secrets.createAWSSecret(
        {
          access_key_id: "AKIAIOSFODNN7EXAMPLE",
          secret_access_key: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
          region: "us-east-1",
          endpoint_url: "https://s3.amazonaws.com",
        },
        baseTestIds.awsSecret,
      );

      expect(secret).toBeDefined();
      expect(secret.id).toBe(testIds.awsSecret);
      expect(secret.access_key_id).toBe("AKIAIOSFODNN7EXAMPLE");
      expect(secret.region).toBe("us-east-1");
    });

    it("should get AWS secret by id", async () => {
      const secret = await client.secrets.getAWSSecret(baseTestIds.awsSecret);

      expect(secret).toBeDefined();
      expect(secret.id).toBe(baseTestIds.awsSecret);
      expect(secret.access_key_id).toBe("AKIAIOSFODNN7EXAMPLE");
    });

    it("should list AWS secrets", async () => {
      const secrets = await client.secrets.listAWSSecrets();

      expect(Array.isArray(secrets)).toBe(true);
      // After creation test, the AWS secret should exist
      expect(secrets.length).toBeGreaterThan(0);

      // APISIX returns secrets with type prefix in the ID
      expect(secrets.some((s) => s.id === `aws/${baseTestIds.awsSecret}`)).toBe(
        true,
      );
    });

    it("should update AWS secret", async () => {
      const updated = await client.secrets.updateAWSSecret(
        baseTestIds.awsSecret,
        {
          access_key_id: "AKIAIOSFODNN7EXAMPLE",
          secret_access_key: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
          region: "us-west-2",
          endpoint_url: "https://secretsmanager.us-west-2.amazonaws.com",
          session_token: "updated-session-token",
        },
      );

      expect(updated.region).toBe("us-west-2");
      expect(updated.session_token).toBe("updated-session-token");
    });

    it("should find AWS secrets by region", async () => {
      const secrets = await client.secrets.findAWSSecretsByRegion("us-west-2");

      expect(Array.isArray(secrets)).toBe(true);
      // After update test, the AWS secret should exist and be in us-west-2 region
      expect(secrets.some((s) => s.id === `aws/${baseTestIds.awsSecret}`)).toBe(
        true,
      );
    });

    it("should create AWS secret with validation", async () => {
      const secret = await client.secrets.createAWSSecretWithValidation(
        {
          access_key_id: "AKIA_VALIDATED_EXAMPLE",
          secret_access_key: "validated_secret_key",
          region: "eu-west-1",
        },
        "validated-aws-secret",
      );

      expect(secret).toBeDefined();
      expect(secret.id).toBe("validated-aws-secret");

      // Clean up
      await client.secrets.deleteAWSSecret("validated-aws-secret");
    });

    it("should test AWS connection", async () => {
      const connectionTest = await client.secrets.testAWSConnection(
        baseTestIds.awsSecret,
      );

      expect(connectionTest).toBeDefined();
      expect(typeof connectionTest.connected).toBe("boolean");
      // Note: Connection will likely fail since we're using fake credentials
    });

    it("should delete AWS secret", async () => {
      const deleted = await client.secrets.deleteAWSSecret(
        baseTestIds.awsSecret,
      );
      expect(deleted).toBe(true);

      const secrets = await client.secrets.listAWSSecrets();
      expect(secrets.some((s) => s.id === baseTestIds.awsSecret)).toBe(false);
    });
  });

  describe("GCP Secret Management", () => {
    it("should create a GCP secret", async () => {
      const secret = await client.secrets.createGCPSecret(
        {
          auth_config: {
            client_email: "service@project.iam.gserviceaccount.com",
            private_key:
              "-----BEGIN PRIVATE KEY-----\nMIIEvQ...EXAMPLE\n-----END PRIVATE KEY-----\n",
            project_id: "my-gcp-project",
            token_uri: "https://oauth2.googleapis.com/token",
          },
          ssl_verify: true,
        },
        baseTestIds.gcpSecret,
      );

      expect(secret).toBeDefined();
      expect(secret.id).toBe(baseTestIds.gcpSecret);
      expect(secret.auth_config?.client_email).toBe(
        "service@project.iam.gserviceaccount.com",
      );
      expect(secret.auth_config?.project_id).toBe("my-gcp-project");
    });

    it("should get GCP secret by id", async () => {
      const secret = await client.secrets.getGCPSecret(baseTestIds.gcpSecret);

      expect(secret).toBeDefined();
      expect(secret.id).toBe(baseTestIds.gcpSecret);
      expect(secret.auth_config?.client_email).toBe(
        "service@project.iam.gserviceaccount.com",
      );
    });

    it("should list GCP secrets", async () => {
      const secrets = await client.secrets.listGCPSecrets();

      expect(Array.isArray(secrets)).toBe(true);
      // After creation test, the GCP secret should exist
      expect(secrets.length).toBeGreaterThan(0);
      expect(secrets.some((s) => s.id === `gcp/${baseTestIds.gcpSecret}`)).toBe(
        true,
      );
    });

    it("should update GCP secret", async () => {
      const updated = await client.secrets.updateGCPSecret(
        baseTestIds.gcpSecret,
        {
          auth_config: {
            client_email: "updated-service@project.iam.gserviceaccount.com",
            private_key:
              "-----BEGIN PRIVATE KEY-----\nUpdated...\n-----END PRIVATE KEY-----\n",
            project_id: "updated-gcp-project",
            token_uri: "https://oauth2.googleapis.com/token",
            entries_uri: "https://secretmanager.googleapis.com/v1",
          },
          ssl_verify: false,
        },
      );

      expect(updated.auth_config?.client_email).toBe(
        "updated-service@project.iam.gserviceaccount.com",
      );
      expect(updated.auth_config?.project_id).toBe("updated-gcp-project");
      expect(updated.ssl_verify).toBe(false);
    });

    it("should create GCP secret with validation", async () => {
      const secret = await client.secrets.createGCPSecretWithValidation(
        {
          auth_config: {
            client_email: "validated@project.iam.gserviceaccount.com",
            private_key:
              "-----BEGIN PRIVATE KEY-----\nValidated...\n-----END PRIVATE KEY-----\n",
            project_id: "validated-project",
          },
        },
        "validated-gcp-secret",
      );

      expect(secret).toBeDefined();
      expect(secret.id).toBe("validated-gcp-secret");

      // Clean up
      await client.secrets.deleteGCPSecret("validated-gcp-secret");
    });

    it("should test GCP connection", async () => {
      const connectionTest = await client.secrets.testGCPConnection(
        baseTestIds.gcpSecret,
      );

      expect(connectionTest).toBeDefined();
      expect(typeof connectionTest.connected).toBe("boolean");
      // Note: Connection will likely fail since we're using fake credentials
    });

    it("should delete GCP secret", async () => {
      const deleted = await client.secrets.deleteGCPSecret(
        baseTestIds.gcpSecret,
      );
      expect(deleted).toBe(true);

      const secrets = await client.secrets.listGCPSecrets();
      expect(secrets.some((s) => s.id === baseTestIds.gcpSecret)).toBe(false);
    });
  });

  describe("Generic Secret Operations", () => {
    beforeAll(async () => {
      // Create test secrets for generic operations
      await client.secrets.createVaultSecret(
        {
          uri: "https://vault.test.com",
          prefix: "/test",
          token: "test-token",
        },
        "test-vault-multi",
      );

      await client.secrets.createAWSSecret(
        {
          access_key_id: "TEST_ACCESS_KEY",
          secret_access_key: "test_secret_key",
          region: "us-east-1",
        },
        "test-aws-multi",
      );

      await client.secrets.createGCPSecret(
        {
          auth_config: {
            client_email: "test@project.iam.gserviceaccount.com",
            private_key:
              "-----BEGIN PRIVATE KEY-----\nTest...\n-----END PRIVATE KEY-----\n",
            project_id: "test-project",
          },
        },
        "test-gcp-multi",
      );
    });

    afterAll(async () => {
      // Clean up test secrets
      await client.secrets
        .deleteVaultSecret("test-vault-multi")
        .catch(() => {});
      await client.secrets.deleteAWSSecret("test-aws-multi").catch(() => {});
      await client.secrets.deleteGCPSecret("test-gcp-multi").catch(() => {});
    });

    it("should list all secrets", async () => {
      const allSecrets = await client.secrets.listAllSecrets();

      expect(allSecrets).toBeDefined();
      expect(Array.isArray(allSecrets.vault)).toBe(true);
      expect(Array.isArray(allSecrets.aws)).toBe(true);
      expect(Array.isArray(allSecrets.gcp)).toBe(true);

      expect(
        allSecrets.vault.some((s) => s.id === "vault/test-vault-multi"),
      ).toBe(true);
      expect(allSecrets.aws.some((s) => s.id === "aws/test-aws-multi")).toBe(
        true,
      );
      expect(allSecrets.gcp.some((s) => s.id === "gcp/test-gcp-multi")).toBe(
        true,
      );
    });

    it("should find secrets by prefix", async () => {
      const secrets = await client.secrets.findSecretsByPrefix("/test");

      expect(Array.isArray(secrets)).toBe(true);
      expect(secrets.some((s) => s.id === "vault/test-vault-multi")).toBe(true);
    });
  });

  describe("Validation and Error Handling", () => {
    it("should validate required fields for Vault secrets", async () => {
      await expect(
        client.secrets.createVaultSecretWithValidation({
          // Missing uri
          prefix: "/test",
          token: "test-token",
        } as any),
      ).rejects.toThrow(
        "URI, prefix, and token are required for Vault secrets",
      );

      await expect(
        client.secrets.createVaultSecretWithValidation({
          uri: "https://vault.test.com",
          // Missing prefix
          token: "test-token",
        } as any),
      ).rejects.toThrow(
        "URI, prefix, and token are required for Vault secrets",
      );

      await expect(
        client.secrets.createVaultSecretWithValidation({
          uri: "https://vault.test.com",
          prefix: "/test",
          // Missing token
        } as any),
      ).rejects.toThrow(
        "URI, prefix, and token are required for Vault secrets",
      );
    });

    it("should validate required fields for AWS secrets", async () => {
      await expect(
        client.secrets.createAWSSecretWithValidation({
          // Missing access_key_id
          secret_access_key: "test-secret",
        } as any),
      ).rejects.toThrow(
        "Access key ID and secret access key are required for AWS secrets",
      );

      await expect(
        client.secrets.createAWSSecretWithValidation({
          access_key_id: "test-key",
          // Missing secret_access_key
        } as any),
      ).rejects.toThrow(
        "Access key ID and secret access key are required for AWS secrets",
      );
    });

    it("should validate required fields for GCP secrets", async () => {
      await expect(
        client.secrets.createGCPSecretWithValidation({
          // Missing auth_config and auth_file
        } as any),
      ).rejects.toThrow(
        "Either auth_config or auth_file is required for GCP secrets",
      );

      await expect(
        client.secrets.createGCPSecretWithValidation({
          auth_config: {
            // Missing client_email
            private_key: "test-key",
            project_id: "test-project",
          },
        } as any),
      ).rejects.toThrow(
        "client_email, private_key, and project_id are required in auth_config",
      );
    });

    it("should handle non-existent secrets", async () => {
      await expect(
        client.secrets.getVaultSecret("non-existent-vault"),
      ).rejects.toThrow();
      await expect(
        client.secrets.getAWSSecret("non-existent-aws"),
      ).rejects.toThrow();
      await expect(
        client.secrets.getGCPSecret("non-existent-gcp"),
      ).rejects.toThrow();
    });
  });
});
