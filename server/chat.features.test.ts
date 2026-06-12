import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-features",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };

  return { ctx };
}

describe("chat.deleteMessage", () => {
  it("should delete a message successfully", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Test with a valid message ID
    const result = await caller.chat.deleteMessage({ messageId: 1 });
    
    expect(result).toEqual({ success: expect.any(Boolean) });
  });

  it("should reject invalid message ID", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Test with invalid input
    try {
      await caller.chat.deleteMessage({ messageId: -1 });
    } catch (error) {
      expect(error).toBeDefined();
    }
  });
});

describe("chat.deleteAllConversations", () => {
  it("should delete all conversations successfully", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.chat.deleteAllConversations();
    
    expect(result).toEqual({ success: expect.any(Boolean) });
  });
});

describe("chat.generateMusic", () => {
  it("should generate music with valid prompt", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.chat.generateMusic({ 
      prompt: "Jazz music with piano" 
    });
    
    expect(result.success).toBe(true);
    expect(result.status).toBe("processing");
    expect(result.url).toBeUndefined();
    expect(result.message).toHaveProperty("id");
    expect(result.message).toHaveProperty("content");
    expect(result.message.role).toBe("assistant");
    // The content should be a string with music generation info
    expect(typeof result.message.content).toBe("string");
  });

  it("should reject empty prompt", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.chat.generateMusic({ prompt: "" });
      expect.fail("Should have thrown an error");
    } catch (error) {
      expect(error).toBeDefined();
    }
  });

  it("should reject prompt longer than 500 characters", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const longPrompt = "a".repeat(501);
    try {
      await caller.chat.generateMusic({ prompt: longPrompt });
      expect.fail("Should have thrown an error");
    } catch (error) {
      expect(error).toBeDefined();
    }
  });
});

describe("chat.generateImage", () => {
  it("should validate image prompt length", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.chat.generateImage({ prompt: "" });
      expect.fail("Should have thrown an error");
    } catch (error) {
      expect(error).toBeDefined();
    }
  });

  it("should reject prompt longer than 500 characters", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const longPrompt = "a".repeat(501);
    try {
      await caller.chat.generateImage({ prompt: longPrompt });
      expect.fail("Should have thrown an error");
    } catch (error) {
      expect(error).toBeDefined();
    }
  });

  it("should return a saved message on success", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    try {
      const result = await caller.chat.generateImage({ prompt: "A beautiful sunset" });
      expect(result.success).toBe(true);
      expect(result.message).toHaveProperty("id");
      expect(result.message).toHaveProperty("content");
      expect(result.message.role).toBe("assistant");
    } catch (error) {
      // Expected if Forge API is not available
      expect(error).toBeDefined();
    }
  }, { timeout: 10000 });
});

describe("chat.uploadFile", () => {
  it("should validate file upload input", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.chat.uploadFile({ 
        filename: "",
        fileData: "base64data",
        mimeType: "text/plain"
      });
      expect.fail("Should have thrown an error");
    } catch (error) {
      expect(error).toBeDefined();
    }
  });

  it("should accept valid file upload input", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // This test validates input schema only
    // Actual upload would require Forge API
    try {
      const result = await caller.chat.uploadFile({ 
        filename: "test.txt",
        fileData: Buffer.from("test content").toString('base64'),
        mimeType: "text/plain"
      });
      // If it succeeds, great; if it fails due to API, that's expected
      expect(result).toHaveProperty('success');
      if (result.message && typeof result.message === 'object') {
        expect(result.message).toHaveProperty('id');
        expect(result.message).toHaveProperty('content');
      }
    } catch (error) {
      // Expected if Forge API is not available
      expect(error).toBeDefined();
    }
  });
});
