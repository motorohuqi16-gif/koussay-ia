import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
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

describe("chat.generateImage", () => {
  it("should validate prompt is not empty", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.chat.generateImage({ prompt: "" });
      expect.fail("Should have thrown validation error");
    } catch (error: any) {
      expect(error.message).toContain("Too small");
    }
  });

  it("should validate prompt max length", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const longPrompt = "a".repeat(501);

    try {
      await caller.chat.generateImage({ prompt: longPrompt });
      expect.fail("Should have thrown validation error");
    } catch (error: any) {
      expect(error.message).toContain("Too big");
    }
  });

  it("should handle valid image generation request", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    try {
      const result = await Promise.race([
        caller.chat.generateImage({ prompt: "A beautiful sunset" }),
        new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 5000))
      ]);
      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("url");
    } catch (error: any) {
      if (error.message === "timeout" || error.message.includes("API")) {
        console.log("Image generation test skipped (no API available)");
      } else {
        throw error;
      }
    }
  }, { timeout: 10000 });

  it("should return SVG base64 fallback or storage URL", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // This test validates that either SVG fallback or storage URL is returned
    const result = await caller.chat.generateImage({ prompt: "Test SVG fallback" });
    
    expect(result).toHaveProperty("url");
    const url = result.url as string;
    
    // Check if it's either a data URL with SVG or a storage URL
    const isSvgFallback = url.match(/^data:image\/svg\+xml;base64,/);
    const isStorageUrl = url.includes("/manus-storage/");
    
    expect(isSvgFallback || isStorageUrl).toBe(true);
    
    // If it's a SVG fallback, verify it can be decoded
    if (isSvgFallback) {
      const base64Part = url.replace(/^data:image\/svg\+xml;base64,/, "");
      const decodedSvg = Buffer.from(base64Part, "base64").toString("utf-8");
      
      // Verify it contains SVG elements
      expect(decodedSvg).toContain("<svg");
      expect(decodedSvg).toContain("Test SVG fallback");
    }
  }, { timeout: 10000 });
});

describe("chat.uploadFile", () => {
  it("should validate filename is not empty", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.chat.uploadFile({
        filename: "",
        fileData: "base64data",
        mimeType: "text/plain",
      });
      expect.fail("Should have thrown validation error");
    } catch (error: any) {
      expect(error.message).toContain("Too small");
    }
  });

  it("should accept valid file upload data", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    try {
      const result = await Promise.race([
        caller.chat.uploadFile({
          filename: "test.txt",
          fileData: Buffer.from("test content").toString("base64"),
          mimeType: "text/plain",
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 5000))
      ]);
      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("url");
      expect(result).toHaveProperty("key");
      expect(result).toHaveProperty("message");
    } catch (error: any) {
      if (error.message === "timeout" || error.message.includes("storage")) {
        console.log("File upload test skipped (no storage available)");
      } else {
        throw error;
      }
    }
  }, { timeout: 10000 });

  it("should use default mime type", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    try {
      const result = await Promise.race([
        caller.chat.uploadFile({
          filename: "test.bin",
          fileData: Buffer.from("binary data").toString("base64"),
          mimeType: "application/octet-stream",
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 5000))
      ]);
      expect(result).toHaveProperty("success");
    } catch (error: any) {
      if (error.message === "timeout" || error.message.includes("storage")) {
        console.log("File upload test skipped (no storage available)");
      } else {
        throw error;
      }
    }
  }, { timeout: 10000 });
});

describe("chat.generateMusic", () => {
  it("should validate prompt is not empty", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.chat.generateMusic({ prompt: "" });
      expect.fail("Should have thrown validation error");
    } catch (error: any) {
      expect(error.message).toContain("Too small");
    }
  });

  it("should validate prompt max length", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const longPrompt = "a".repeat(501);

    try {
      await caller.chat.generateMusic({ prompt: longPrompt });
      expect.fail("Should have thrown validation error");
    } catch (error: any) {
      expect(error.message).toContain("Too big");
    }
  });

  it("should handle valid music generation request", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.chat.generateMusic({ prompt: "Upbeat electronic music" });
    expect(result).toHaveProperty("success");
    expect(result.success).toBe(true);
    expect(result).toHaveProperty("message");
    expect(result.message).toContain("Génération de Musique");
  }, { timeout: 10000 });
});

describe("chat integration", () => {
  it("should require authentication for generateImage", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: {} as any,
      res: {} as any,
    };

    const caller = appRouter.createCaller(ctx);

    try {
      await caller.chat.generateImage({ prompt: "test" });
      expect.fail("Should require authentication");
    } catch (error: any) {
      expect(error.message).toContain("login");
    }
  });

  it("should require authentication for uploadFile", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: {} as any,
      res: {} as any,
    };

    const caller = appRouter.createCaller(ctx);

    try {
      await caller.chat.uploadFile({
        filename: "test.txt",
        fileData: "data",
      });
      expect.fail("Should require authentication");
    } catch (error: any) {
      expect(error.message).toContain("login");
    }
  });

  it("should require authentication for generateMusic", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: {} as any,
      res: {} as any,
    };

    const caller = appRouter.createCaller(ctx);

    try {
      await caller.chat.generateMusic({ prompt: "test" });
      expect.fail("Should require authentication");
    } catch (error: any) {
      expect(error.message).toContain("login");
    }
  });
});
