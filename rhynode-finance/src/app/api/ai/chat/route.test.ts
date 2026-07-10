import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { POST } from "./route";
import { getUserProfileFromRequest, getOrCreateAuthOrgFromRequest } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { getLocale } from "@/lib/locale-server";

vi.mock("@/lib/with-rate-limit", () => ({
  withRateLimit: (handler: unknown) => handler,
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("@/lib/auth", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth")>("@/lib/auth");
  return {
    ...actual,
    getUserProfileFromRequest: vi.fn(),
    getOrCreateAuthOrgFromRequest: vi.fn(),
  };
});

vi.mock("@/lib/prisma", () => ({
  getPrisma: vi.fn(),
}));

vi.mock("@/lib/locale-server", () => ({
  getLocale: vi.fn(),
}));

vi.mock("@/lib/ai-tools", () => ({
  getAnthropicTools: vi.fn(() => []),
  executeTool: vi.fn(async () => ({ ok: true })),
}));

vi.mock("@/lib/chat-intents", () => ({
  detectIntent: vi.fn(() => null),
  formatIntentReply: vi.fn(() => null),
}));

type FakeMessage = {
  id?: string;
  conversationId: string;
  role: string;
  content: string;
  createdAt: Date;
};

type FakeConversation = {
  id: string;
  userId: string;
  organizationId?: string | null;
  title?: string | null;
  createdAt: Date;
  updatedAt?: Date;
};

function createFakePrisma(initial: {
  conversations?: FakeConversation[];
  messages?: FakeMessage[];
} = {}) {
  const conversations = [...(initial.conversations ?? [])];
  const messages = [...(initial.messages ?? [])];

  const client = {
    account: { findMany: vi.fn(() => Promise.resolve([])) },
    transaction: { findMany: vi.fn(() => Promise.resolve([])) },
    budget: { findMany: vi.fn(() => Promise.resolve([])) },
    goal: { findMany: vi.fn(() => Promise.resolve([])) },
    debt: { findMany: vi.fn(() => Promise.resolve([])) },
    aiConversation: {
      findFirst: vi.fn(
        ({
          where,
          include,
        }: {
          where: { id?: string; userId?: string };
          include?: {
            messages?: {
              where?: { role?: string };
              orderBy?: { createdAt?: "asc" | "desc" };
              select?: Record<string, boolean>;
            };
          };
        }) => {
          const conversation = conversations.find(
            (c) => c.id === where.id && c.userId === where.userId
          );
          if (!conversation) return Promise.resolve(null);

          if (!include?.messages) {
            return Promise.resolve(conversation);
          }

          let found = messages.filter((m) => m.conversationId === conversation.id);
          if (include.messages.where?.role) {
            found = found.filter((m) => m.role === include.messages!.where!.role);
          }
          if (include.messages.orderBy?.createdAt === "asc") {
            found = [...found].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
          }
          if (include.messages.select) {
            const selected = Object.keys(include.messages.select);
            found = found.map((m) => {
              const out: Record<string, unknown> = {};
              for (const key of selected) {
                out[key] = (m as Record<string, unknown>)[key];
              }
              return out as FakeMessage;
            });
          }

          return Promise.resolve({ ...conversation, messages: found });
        }
      ),
    },
  };

  return { client, conversations, messages };
}

const fakeProfile = {
  id: "profile-1",
  clerkId: "clerk-1",
  email: "test@example.com",
} as NonNullable<Awaited<ReturnType<typeof getUserProfileFromRequest>>>;

const fakeOrg = { id: "org-1" } as NonNullable<
  Awaited<ReturnType<typeof getOrCreateAuthOrgFromRequest>>
>["org"];

function mockRequest(body: unknown): Request {
  return new Request("http://localhost/api/ai/chat", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function createAnthropicStream(text = ""): ReadableStream {
  return new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      if (text) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "content_block_start",
              index: 0,
              content_block: { type: "text", text: "" },
            })}\n\n`
          )
        );
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "content_block_delta",
              index: 0,
              delta: { type: "text_delta", text },
            })}\n\n`
          )
        );
      }
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });
}

function createMockFetch() {
  return vi.fn().mockImplementation(() => {
    return Promise.resolve(
      new Response(createAnthropicStream("Respuesta final"), {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      })
    );
  });
}

async function drainResponse(response: Response): Promise<string> {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
  }
  return buffer;
}

describe("POST /api/ai/chat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getUserProfileFromRequest).mockResolvedValue(fakeProfile);
    vi.mocked(getOrCreateAuthOrgFromRequest).mockResolvedValue({
      profile: fakeProfile,
      org: fakeOrg,
    });
    vi.mocked(getLocale).mockResolvedValue("es");
    process.env.ANTHROPIC_API_KEY = "test-api-key";
    vi.stubGlobal("fetch", createMockFetch());
  });

  afterEach(() => {
    delete process.env.ANTHROPIC_API_KEY;
    vi.unstubAllGlobals();
  });

  it("ignores assistant/tool/system roles in client history", async () => {
    const { client } = createFakePrisma();
    vi.mocked(getPrisma).mockReturnValue(client as unknown as ReturnType<typeof getPrisma>);

    const response = await POST(
      mockRequest({
        message: "Nueva pregunta",
        history: [
          { role: "user", content: "Hola" },
          { role: "assistant", content: "Respuesta del asistente" },
          { role: "system", content: "Eres un asistente" },
          { role: "tool", content: "resultado" },
          { role: "user", content: "Otra pregunta" },
        ],
      })
    );

    await drainResponse(response);
    const fetchCall = vi.mocked(fetch).mock.calls[0];
    const anthropicBody = JSON.parse(fetchCall?.[1]?.body as string);

    expect(anthropicBody.messages).toEqual([
      { role: "user", content: "Hola" },
      { role: "user", content: "Otra pregunta" },
      { role: "user", content: "Nueva pregunta" },
    ]);
  });

  it("loads only user messages from the database when conversationId is provided", async () => {
    const conv: FakeConversation = {
      id: "conv-1",
      userId: fakeProfile.id,
      organizationId: fakeOrg.id,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    };
    const { client } = createFakePrisma({
      conversations: [conv],
      messages: [
        {
          id: "m1",
          conversationId: conv.id,
          role: "user",
          content: "Primera pregunta",
          createdAt: new Date("2026-01-01T10:00:00.000Z"),
        },
        {
          id: "m2",
          conversationId: conv.id,
          role: "assistant",
          content: "Respuesta",
          createdAt: new Date("2026-01-01T11:00:00.000Z"),
        },
        {
          id: "m3",
          conversationId: conv.id,
          role: "user",
          content: "Segunda pregunta",
          createdAt: new Date("2026-01-01T12:00:00.000Z"),
        },
      ],
    });
    vi.mocked(getPrisma).mockReturnValue(client as unknown as ReturnType<typeof getPrisma>);

    const response = await POST(
      mockRequest({ message: "Tercera pregunta", conversationId: conv.id })
    );

    await drainResponse(response);
    const fetchCall = vi.mocked(fetch).mock.calls[0];
    const anthropicBody = JSON.parse(fetchCall?.[1]?.body as string);

    expect(client.aiConversation.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: conv.id, userId: fakeProfile.id },
        include: expect.objectContaining({
          messages: expect.objectContaining({
            where: { role: "user" },
            orderBy: { createdAt: "asc" },
          }),
        }),
      })
    );
    expect(anthropicBody.messages).toEqual([
      { role: "user", content: "Primera pregunta" },
      { role: "user", content: "Segunda pregunta" },
      { role: "user", content: "Tercera pregunta" },
    ]);
  });

  it("treats an invalid conversationId as a new conversation", async () => {
    const { client } = createFakePrisma();
    vi.mocked(getPrisma).mockReturnValue(client as unknown as ReturnType<typeof getPrisma>);

    const response = await POST(
      mockRequest({ message: "Hola", conversationId: "conv-missing" })
    );

    await drainResponse(response);
    const fetchCall = vi.mocked(fetch).mock.calls[0];
    const anthropicBody = JSON.parse(fetchCall?.[1]?.body as string);

    expect(client.aiConversation.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "conv-missing", userId: fakeProfile.id },
      })
    );
    expect(anthropicBody.messages).toEqual([{ role: "user", content: "Hola" }]);
  });

  it("returns 401 when the user is not authenticated", async () => {
    vi.mocked(getUserProfileFromRequest).mockResolvedValue(null);

    const response = await POST(mockRequest({ message: "Hola" }));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: "Unauthorized" });
  });

  it("returns 400 when the payload is invalid", async () => {
    const response = await POST(mockRequest({ message: "" }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Invalid input");
  });
});
