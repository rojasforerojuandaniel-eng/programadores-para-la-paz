import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { z } from "zod";
import {
  createChatCompletion,
  createChatCompletionText,
  createStructuredOutput,
  type AITool,
} from "./ai-provider";

describe("ai-provider", () => {
  beforeEach(() => {
    vi.stubEnv("AI_PROVIDER", "ollama");
    vi.stubEnv("OLLAMA_API_KEY", "ollama-key");
    vi.stubEnv("ANTHROPIC_API_KEY", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("createChatCompletion returns a raw Response for Ollama streaming", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ choices: [{ message: { content: "hola" } }] }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await createChatCompletion({
      messages: [{ role: "user", content: "hola" }],
      stream: true,
    });

    expect(response).toBeInstanceOf(Response);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://ollama.com/api/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer ollama-key",
        }),
      })
    );
  });

  it("createStructuredOutput parses JSON and validates with Zod for Ollama", async () => {
    const schema = z.object({ answer: z.string() });
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({ answer: "sí" }),
              },
            },
          ],
        }),
        { status: 200 }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await createStructuredOutput({
      messages: [{ role: "user", content: "¿Funciona?" }],
      schema,
    });

    expect(result).toEqual({ answer: "sí" });
  });

  it("falls back to Anthropic when Ollama key is missing and Anthropic key is present", async () => {
    vi.unstubAllEnvs();
    vi.stubEnv("AI_PROVIDER", "ollama");
    vi.stubEnv("OLLAMA_API_KEY", "");
    vi.stubEnv("ANTHROPIC_API_KEY", "anthropic-key");

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          content: [{ type: "text", text: JSON.stringify({ answer: "ok" }) }],
        }),
        { status: 200 }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await createStructuredOutput({
      messages: [{ role: "user", content: "¿OK?" }],
      schema: z.object({ answer: z.string() }),
    });

    expect(result).toEqual({ answer: "ok" });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.anthropic.com/v1/messages",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "x-api-key": "anthropic-key",
        }),
      })
    );
  });

  it("converts OpenAI tool schema to Anthropic tool schema", async () => {
    vi.unstubAllEnvs();
    vi.stubEnv("AI_PROVIDER", "anthropic");
    vi.stubEnv("ANTHROPIC_API_KEY", "anthropic-key");

    const tool: AITool = {
      type: "function",
      function: {
        name: "get_weather",
        description: "Devuelve el clima",
        parameters: {
          type: "object",
          properties: { city: { type: "string" } },
          required: ["city"],
        },
      },
    };

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ content: [{ type: "text", text: "ok" }] }),
        { status: 200 }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    await createChatCompletion({
      messages: [{ role: "user", content: "clima" }],
      tools: [tool],
      stream: false,
    });

    const requestInit = fetchMock.mock.calls[0][1] as { body: string };
    const requestBody = JSON.parse(requestInit.body);

    expect(requestBody.tools).toEqual([
      {
        name: "get_weather",
        description: "Devuelve el clima",
        input_schema: {
          type: "object",
          properties: { city: { type: "string" } },
          required: ["city"],
        },
      },
    ]);
  });

  it("throws when structured output does not match the Zod schema", async () => {
    const schema = z.object({ answer: z.string() });
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: JSON.stringify({ wrongKey: 123 }) } }],
        }),
        { status: 200 }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      createStructuredOutput({
        messages: [{ role: "user", content: "?" }],
        schema,
      })
    ).rejects.toThrow();
  });

  it("createChatCompletionText returns extracted text from Ollama", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: "Hola desde Ollama" } }],
        }),
        { status: 200 }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const text = await createChatCompletionText({
      messages: [{ role: "user", content: "hola" }],
    });

    expect(text).toBe("Hola desde Ollama");
  });

  it("createChatCompletionText throws on non-OK provider response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response("upstream error", { status: 500, statusText: "Internal Server Error" })
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      createChatCompletionText({ messages: [{ role: "user", content: "hola" }] })
    ).rejects.toThrow(/500/);
  });

  it("sends image content as image_url to Ollama and as base64 to Anthropic", async () => {
    vi.unstubAllEnvs();
    vi.stubEnv("AI_PROVIDER", "anthropic");
    vi.stubEnv("ANTHROPIC_API_KEY", "anthropic-key");

    const dataUrl = "data:image/png;base64,abc123";
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ content: [{ type: "text", text: "recibo" }] }),
        { status: 200 }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    await createChatCompletionText({
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "describe" },
            { type: "image", url: dataUrl },
          ],
        },
      ],
    });

    const anthropicBody = JSON.parse(
      (fetchMock.mock.calls[0][1] as { body: string }).body
    );
    expect(anthropicBody.messages[0].content).toEqual([
      { type: "text", text: "describe" },
      { type: "image", source: { type: "base64", media_type: "image/png", data: "abc123" } },
    ]);

    // Now Ollama path
    vi.unstubAllEnvs();
    vi.stubEnv("AI_PROVIDER", "ollama");
    vi.stubEnv("OLLAMA_API_KEY", "ollama-key");
    const ollamaFetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ choices: [{ message: { content: "recibo" } }] }),
        { status: 200 }
      )
    );
    vi.stubGlobal("fetch", ollamaFetch);

    await createChatCompletionText({
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "describe" },
            { type: "image", url: dataUrl },
          ],
        },
      ],
    });

    const ollamaBody = JSON.parse(
      (ollamaFetch.mock.calls[0][1] as { body: string }).body
    );
    expect(ollamaBody.messages[0].content).toEqual([
      { type: "text", text: "describe" },
      { type: "image_url", image_url: { url: dataUrl } },
    ]);
  });
});
