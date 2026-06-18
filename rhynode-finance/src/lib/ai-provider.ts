import { z } from "zod";
import { logger } from "@/lib/logger";

export type AIProvider = "ollama" | "anthropic";

export type ChatMessageRole = "system" | "user" | "assistant" | "tool";

export interface TextContentPart {
  type: "text";
  text: string;
}

export interface ImageContentPart {
  type: "image";
  /** Data URL (data:image/...;base64,...) or public HTTP(S) URL. */
  url: string;
}

export type ContentPart = TextContentPart | ImageContentPart;

export type MessageContent = string | ContentPart[];

export interface ChatMessage {
  role: ChatMessageRole;
  content: MessageContent;
  name?: string;
  tool_call_id?: string;
  tool_calls?: ToolCall[];
}

export interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

export interface AIFunctionDefinition {
  name: string;
  description?: string;
  parameters: Record<string, unknown>;
}

export interface AITool {
  type: "function";
  function: AIFunctionDefinition;
}

export interface CreateChatCompletionOptions {
  model?: string;
  messages: ChatMessage[];
  tools?: AITool[];
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
}

interface OpenAIContentPart {
  type: string;
  text?: string;
  image_url?: { url: string };
}

interface AnthropicContentBlock {
  type: string;
  text?: string;
  source?: {
    type: "base64" | "url";
    media_type?: string;
    data?: string;
    url?: string;
  };
}

export interface CreateStructuredOutputOptions<T> {
  model?: string;
  messages: ChatMessage[];
  schema: z.ZodSchema<T>;
  maxTokens?: number;
  temperature?: number;
}

interface AIConfig {
  provider: AIProvider;
  ollamaApiKey: string | undefined;
  ollamaBaseUrl: string;
  anthropicApiKey: string | undefined;
}

interface ChatCompletionResult {
  provider: AIProvider;
  response: Response;
}

interface AnthropicTool {
  name: string;
  description?: string;
  input_schema: Record<string, unknown>;
}

const DEFAULT_OLLAMA_MODEL = "gpt-oss:20b";
const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-4-6-20251001";
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

/**
 * Resolve the Ollama model for a given purpose. gpt-oss has NO vision, so OCR
 * must use a vision-capable model (qwen3.5:cloud by default). Text tasks use a
 * small, cheap model (gpt-oss:20b). Both overridable via env vars.
 */
function resolveOllamaModel(purpose: "text" | "vision", override?: string): string {
  if (override) return override;
  if (purpose === "vision") {
    return process.env.OLLAMA_VISION_MODEL ?? "qwen3.5:cloud";
  }
  return process.env.OLLAMA_TEXT_MODEL ?? DEFAULT_OLLAMA_MODEL;
}
const JSON_SYSTEM_PROMPT =
  "You must respond with a single valid JSON object. Do not include markdown, explanations, or any text outside the JSON object. Ensure the JSON matches the schema requested by the user.";

function getConfig(): AIConfig {
  const provider = process.env.AI_PROVIDER;
  return {
    provider: provider === "anthropic" ? "anthropic" : "ollama",
    ollamaApiKey: process.env.OLLAMA_API_KEY,
    ollamaBaseUrl: process.env.OLLAMA_BASE_URL ?? "https://ollama.com/api",
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  };
}

function resolveProvider(config: AIConfig): AIProvider {
  if (config.provider === "anthropic") return "anthropic";
  if (!config.ollamaApiKey && config.anthropicApiKey) return "anthropic";
  return "ollama";
}

/**
 * Returns true when at least one provider has credentials configured.
 * Use this to short-circuit endpoints with a 503 before calling the provider.
 */
export function isAIConfigured(): boolean {
  const config = getConfig();
  const provider = resolveProvider(config);
  return provider === "anthropic" ? Boolean(config.anthropicApiKey) : Boolean(config.ollamaApiKey);
}

function requireOllamaKey(config: AIConfig): string {
  if (!config.ollamaApiKey) {
    throw new Error("OLLAMA_API_KEY is required for the Ollama provider");
  }
  return config.ollamaApiKey;
}

function requireAnthropicKey(config: AIConfig): string {
  if (!config.anthropicApiKey) {
    throw new Error("ANTHROPIC_API_KEY is required for the Anthropic provider");
  }
  return config.anthropicApiKey;
}

function toOpenAIContent(content: MessageContent): string | OpenAIContentPart[] {
  if (typeof content === "string") return content;
  return content.map((part) => {
    if (part.type === "text") return { type: "text", text: part.text };
    return { type: "image_url", image_url: { url: part.url } };
  });
}

function toAnthropicContent(
  content: MessageContent
): string | AnthropicContentBlock[] {
  if (typeof content === "string") return content;
  return content.map((part) => {
    if (part.type === "text") return { type: "text", text: part.text };
    const dataUrlMatch = part.url.match(/^data:([\w/+.-]+);base64,(.+)$/);
    if (dataUrlMatch) {
      return {
        type: "image",
        source: {
          type: "base64",
          media_type: dataUrlMatch[1],
          data: dataUrlMatch[2],
        },
      };
    }
    return {
      type: "image",
      source: { type: "url", url: part.url },
    };
  });
}

function flattenText(content: MessageContent): string {
  if (typeof content === "string") return content;
  return content
    .filter((part): part is TextContentPart => part.type === "text")
    .map((part) => part.text)
    .join("\n");
}

function messagesContainImage(messages: ChatMessage[]): boolean {
  return messages.some((message) => {
    if (typeof message.content !== "string") {
      return message.content.some((part) => part.type === "image");
    }
    return false;
  });
}

function buildOllamaBody(options: CreateChatCompletionOptions): Record<string, unknown> {
  const model =
    options.model ??
    resolveOllamaModel(messagesContainImage(options.messages) ? "vision" : "text");
  return {
    model,
    messages: options.messages.map((message) => ({
      ...message,
      content: toOpenAIContent(message.content),
    })),
    tools: options.tools,
    max_tokens: options.maxTokens,
    temperature: options.temperature,
    stream: options.stream ?? false,
  };
}

function toAnthropicTools(tools: AITool[]): AnthropicTool[] {
  return tools.map((tool) => ({
    name: tool.function.name,
    description: tool.function.description,
    input_schema: tool.function.parameters,
  }));
}

function extractSystemMessages(messages: ChatMessage[]): {
  system: string | undefined;
  remaining: ChatMessage[];
} {
  const systemParts: string[] = [];
  const remaining: ChatMessage[] = [];
  for (const message of messages) {
    if (message.role === "system") {
      systemParts.push(flattenText(message.content));
    } else {
      remaining.push(message);
    }
  }
  return {
    system: systemParts.length > 0 ? systemParts.join("\n\n") : undefined,
    remaining,
  };
}

function buildAnthropicBody(
  options: CreateChatCompletionOptions,
  system?: string
): Record<string, unknown> {
  const { remaining } = extractSystemMessages(options.messages);
  const body: Record<string, unknown> = {
    model: options.model ?? DEFAULT_ANTHROPIC_MODEL,
    messages: remaining.map((message) => ({
      role: message.role,
      content: toAnthropicContent(message.content),
    })),
    max_tokens: options.maxTokens ?? 1024,
    temperature: options.temperature,
    stream: options.stream ?? false,
  };
  if (system) body.system = system;
  const tools = options.tools ? toAnthropicTools(options.tools) : undefined;
  if (tools && tools.length > 0) body.tools = tools;
  return body;
}

async function executeChatCompletion(
  options: CreateChatCompletionOptions
): Promise<ChatCompletionResult> {
  const config = getConfig();
  const provider = resolveProvider(config);

  if (provider === "ollama") {
    const response = await fetch(`${config.ollamaBaseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${requireOllamaKey(config)}`,
      },
      body: JSON.stringify(buildOllamaBody(options)),
    });
    return { provider, response };
  }

  const { system } = extractSystemMessages(options.messages);
  const response = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": requireAnthropicKey(config),
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(buildAnthropicBody(options, system)),
  });
  return { provider, response };
}

export async function createChatCompletion(
  options: CreateChatCompletionOptions
): Promise<Response> {
  const { response } = await executeChatCompletion(options);
  return response;
}

/**
 * Non-streaming completion that returns the extracted text content.
 * Throws if the provider returns a non-OK status, with the status code in the message.
 */
export async function createChatCompletionText(
  options: CreateChatCompletionOptions
): Promise<string> {
  const { provider, response } = await executeChatCompletion({
    ...options,
    stream: false,
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `AI provider returned ${response.status} ${response.statusText}${detail ? `: ${detail.slice(0, 200)}` : ""}`
    );
  }

  const data = (await response.json()) as unknown;
  return extractTextFromResponse(data, provider);
}

function extractTextFromOpenAIResponse(data: unknown): string {
  const typed = data as { choices?: { message?: { content?: string } }[] };
  return typed.choices?.[0]?.message?.content ?? "";
}

function extractTextFromAnthropicResponse(data: unknown): string {
  const typed = data as { content?: { type?: string; text?: string }[] };
  return typed.content?.[0]?.text ?? "";
}

function extractTextFromResponse(data: unknown, provider: AIProvider): string {
  if (provider === "ollama") return extractTextFromOpenAIResponse(data);
  return extractTextFromAnthropicResponse(data);
}

function parseJsonResponse(text: string): unknown {
  const trimmed = text.trim();
  const codeBlockMatch = /^```(?:json)?\n?([\s\S]*?)\n?```$/.exec(trimmed);
  const jsonText = codeBlockMatch ? codeBlockMatch[1].trim() : trimmed;
  return JSON.parse(jsonText);
}

export async function createStructuredOutput<T>(
  options: CreateStructuredOutputOptions<T>
): Promise<T> {
  const instructionMessage: ChatMessage = { role: "system", content: JSON_SYSTEM_PROMPT };
  const messages: ChatMessage[] = [instructionMessage, ...options.messages];
  const { provider, response } = await executeChatCompletion({
    ...options,
    messages,
    stream: false,
  });

  if (!response.ok) {
    throw new Error(`AI provider returned ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as unknown;
  const text = extractTextFromResponse(data, provider);

  let parsed: unknown;
  try {
    parsed = parseJsonResponse(text);
  } catch (error) {
    logger.error("Failed to parse structured output as JSON", {
      text,
      error: error instanceof Error ? error.message : String(error),
    });
    throw new Error("AI response did not contain valid JSON");
  }

  return options.schema.parse(parsed);
}
