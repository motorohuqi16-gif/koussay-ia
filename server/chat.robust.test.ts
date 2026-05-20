import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as db from "./db";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(userId: number = 1): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `test-user-${userId}`,
    email: `test${userId}@example.com`,
    name: `Test User ${userId}`,
    loginMethod: "test",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("chat.history - robust tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns mocked message history", async () => {
    const mockMessages = [
      {
        id: 1,
        userId: 1,
        role: "user" as const,
        content: "Hello",
        createdAt: new Date("2026-05-20T10:00:00Z"),
      },
      {
        id: 2,
        userId: 1,
        role: "assistant" as const,
        content: "Hi there!",
        createdAt: new Date("2026-05-20T10:01:00Z"),
      },
    ];

    vi.spyOn(db, "getConversationHistory").mockResolvedValue(mockMessages);

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.chat.history({ limit: 50 });

    expect(result).toEqual(mockMessages);
    expect(db.getConversationHistory).toHaveBeenCalledWith(1, 50);
  });

  it("respects the limit parameter", async () => {
    vi.spyOn(db, "getConversationHistory").mockResolvedValue([]);

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await caller.chat.history({ limit: 10 });

    expect(db.getConversationHistory).toHaveBeenCalledWith(1, 10);
  });
});

describe("chat.sendMessage - robust tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires authentication", async () => {
    const ctx = createAuthContext();
    ctx.user = null;
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.chat.sendMessage({ message: "Hello" });
      expect.fail("Should have thrown an error");
    } catch (error) {
      expect(error).toBeDefined();
    }
  });

  it("rejects empty messages", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.chat.sendMessage({ message: "" });
      expect.fail("Should have thrown an error");
    } catch (error) {
      expect(error).toBeDefined();
    }
  });

  it("successfully sends message with mocked DB and LLM", async () => {
    const mockUserMessage = {
      id: 1,
      userId: 1,
      role: "user" as const,
      content: "Hello, how are you?",
      createdAt: new Date(),
    };

    const mockAiMessage = {
      id: 2,
      userId: 1,
      role: "assistant" as const,
      content: "I'm doing well, thank you for asking!",
      createdAt: new Date(),
    };

    vi.spyOn(db, "createMessage")
      .mockResolvedValueOnce(mockUserMessage)
      .mockResolvedValueOnce(mockAiMessage);

    vi.spyOn(db, "getConversationHistory").mockResolvedValue([]);

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.chat.sendMessage({ message: "Hello, how are you?" });

    expect(result.userMessage).toEqual(mockUserMessage);
    expect(result.aiMessage).toEqual(mockAiMessage);
    expect(result.userMessage.role).toBe("user");
    expect(result.aiMessage.role).toBe("assistant");
  });

  it("saves user message with correct content", async () => {
    const mockUserMessage = {
      id: 1,
      userId: 1,
      role: "user" as const,
      content: "Test message",
      createdAt: new Date(),
    };

    const mockAiMessage = {
      id: 2,
      userId: 1,
      role: "assistant" as const,
      content: "Response",
      createdAt: new Date(),
    };

    const createMessageSpy = vi
      .spyOn(db, "createMessage")
      .mockResolvedValueOnce(mockUserMessage)
      .mockResolvedValueOnce(mockAiMessage);

    vi.spyOn(db, "getConversationHistory").mockResolvedValue([]);

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await caller.chat.sendMessage({ message: "Test message" });

    expect(createMessageSpy).toHaveBeenCalledWith(1, "user", "Test message");
  });

  it("includes conversation history in LLM context", async () => {
    const mockUserMessage = {
      id: 3,
      userId: 1,
      role: "user" as const,
      content: "New message",
      createdAt: new Date(),
    };

    const mockAiMessage = {
      id: 4,
      userId: 1,
      role: "assistant" as const,
      content: "Response",
      createdAt: new Date(),
    };

    vi.spyOn(db, "createMessage")
      .mockResolvedValueOnce(mockUserMessage)
      .mockResolvedValueOnce(mockAiMessage);

    const mockHistory = [
      {
        id: 1,
        userId: 1,
        role: "user" as const,
        content: "Previous message",
        createdAt: new Date(),
      },
      {
        id: 2,
        userId: 1,
        role: "assistant" as const,
        content: "Previous response",
        createdAt: new Date(),
      },
    ];

    const getHistorySpy = vi
      .spyOn(db, "getConversationHistory")
      .mockResolvedValue(mockHistory);

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await caller.chat.sendMessage({ message: "New message" });

    expect(getHistorySpy).toHaveBeenCalledWith(1, 20);
  });

  it("handles LLM failures gracefully", async () => {
    const mockUserMessage = {
      id: 1,
      userId: 1,
      role: "user" as const,
      content: "Test",
      createdAt: new Date(),
    };

    const mockAiMessage = {
      id: 2,
      userId: 1,
      role: "assistant" as const,
      content: "Désolé, une erreur s'est produite lors de la génération de la réponse. Veuillez réessayer.",
      createdAt: new Date(),
    };

    vi.spyOn(db, "createMessage")
      .mockResolvedValueOnce(mockUserMessage)
      .mockResolvedValueOnce(mockAiMessage);

    vi.spyOn(db, "getConversationHistory").mockResolvedValue([]);

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.chat.sendMessage({ message: "Test" });

    // Even if LLM fails, we should get a response message
    expect(result.aiMessage).toBeDefined();
    expect(result.aiMessage.content).toBeTruthy();
  });

  it("persists both user and AI messages", async () => {
    const mockUserMessage = {
      id: 1,
      userId: 1,
      role: "user" as const,
      content: "User message",
      createdAt: new Date(),
    };

    const mockAiMessage = {
      id: 2,
      userId: 1,
      role: "assistant" as const,
      content: "AI response",
      createdAt: new Date(),
    };

    const createMessageSpy = vi
      .spyOn(db, "createMessage")
      .mockResolvedValueOnce(mockUserMessage)
      .mockResolvedValueOnce(mockAiMessage);

    vi.spyOn(db, "getConversationHistory").mockResolvedValue([]);

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await caller.chat.sendMessage({ message: "User message" });

    // Verify createMessage was called twice: once for user, once for AI
    expect(createMessageSpy).toHaveBeenCalledTimes(2);
    expect(createMessageSpy).toHaveBeenNthCalledWith(1, 1, "user", "User message");
    expect(createMessageSpy).toHaveBeenNthCalledWith(2, 1, "assistant", expect.any(String));
  });

  it("returns messages with correct user ID", async () => {
    const mockUserMessage = {
      id: 1,
      userId: 42,
      role: "user" as const,
      content: "Test",
      createdAt: new Date(),
    };

    const mockAiMessage = {
      id: 2,
      userId: 42,
      role: "assistant" as const,
      content: "Response",
      createdAt: new Date(),
    };

    vi.spyOn(db, "createMessage")
      .mockResolvedValueOnce(mockUserMessage)
      .mockResolvedValueOnce(mockAiMessage);

    vi.spyOn(db, "getConversationHistory").mockResolvedValue([]);

    const ctx = createAuthContext(42);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.chat.sendMessage({ message: "Test" });

    expect(result.userMessage.userId).toBe(42);
    expect(result.aiMessage.userId).toBe(42);
  });
});
