import { decimalToNumber } from "@/lib/decimal";
import { getUserProfileFromRequest, getOrCreateAuthOrgFromRequest, clerkUserIdFromRequest } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { withRateLimit } from "@/lib/with-rate-limit";
import { z } from "zod";
import { getAnthropicTools, executeTool, type ToolName } from "@/lib/ai-tools";
import { detectIntent, formatIntentReply } from "@/lib/chat-intents";
import { getLocale } from "@/lib/locale-server";
import { formatCurrency } from "@/lib/format";
import { logger } from "@/lib/logger";

// This endpoint intentionally calls the Anthropic API directly instead of going
// through `@/lib/ai-provider`. The advisor runs a multi-round streaming tool-use
// loop (Anthropic-native SSE event format), which is not portable to the
// OpenAI-compatible shape used by the Ollama provider. Simple text/vision
// endpoints (briefing, ocr) use the shared abstraction; this one stays Anthropic-only.

const chatSchema = z.object({
  message: z.string().min(1).max(4000),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(8000),
      })
    )
    .max(50)
    .optional(),
});

type AnthropicTextBlock = { type: "text"; text: string };
type AnthropicToolUseBlock = {
  type: "tool_use";
  id: string;
  name: ToolName;
  input: Record<string, unknown>;
};
type AnthropicContentBlock = AnthropicTextBlock | AnthropicToolUseBlock;

type AnthropicMessage =
  | { role: "user"; content: string | AnthropicToolResultBlock[] }
  | { role: "assistant"; content: string | AnthropicContentBlock[] };

type AnthropicToolResultBlock = {
  type: "tool_result";
  tool_use_id: string;
  content: string;
};

interface PendingToolUse {
  id: string;
  name: ToolName;
  input: Record<string, unknown>;
  partialInput: string;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getStringField(
  obj: Record<string, unknown>,
  key: string
): string | undefined {
  const value = obj[key];
  return typeof value === "string" ? value : undefined;
}

async function consumeAnthropicRound(
  body: ReadableStream<Uint8Array>,
  callbacks: {
    onTextDelta: (text: string) => void;
    onToolStart: (toolName: ToolName) => void;
  }
): Promise<{ text: string; toolUses: PendingToolUse[] }> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  const toolUses: PendingToolUse[] = [];
  const toolUseByIndex = new Map<number, number>();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data: ")) continue;

        const dataStr = trimmed.slice(6).trim();
        if (dataStr === "[DONE]") continue;

        try {
          const event = JSON.parse(dataStr) as unknown;
          if (!isObject(event)) continue;

          switch (event.type) {
            case "content_block_start": {
              const contentBlock = event.content_block;
              if (!isObject(contentBlock)) break;

              if (contentBlock.type === "text" && typeof contentBlock.text === "string") {
                text += contentBlock.text;
              } else if (contentBlock.type === "tool_use") {
                const id = getStringField(contentBlock, "id") || crypto.randomUUID();
                const name = getStringField(contentBlock, "name") as ToolName | undefined;
                if (!name) break;
                const toolUse: PendingToolUse = {
                  id,
                  name,
                  input: isObject(contentBlock.input) ? contentBlock.input : {},
                  partialInput: "",
                };
                const index =
                  typeof event.index === "number" ? event.index : toolUses.length;
                toolUseByIndex.set(index, toolUses.length);
                toolUses.push(toolUse);
                callbacks.onToolStart(name);
              }
              break;
            }
            case "content_block_delta": {
              const delta = event.delta;
              if (!isObject(delta)) break;

              if (delta.type === "text_delta" && typeof delta.text === "string") {
                text += delta.text;
                callbacks.onTextDelta(delta.text);
              } else if (
                delta.type === "input_json_delta" &&
                typeof delta.partial_json === "string"
              ) {
                const index =
                  typeof event.index === "number"
                    ? event.index
                    : undefined;
                if (index === undefined) break;
                const toolIndex = toolUseByIndex.get(index);
                if (toolIndex !== undefined) {
                  toolUses[toolIndex].partialInput += delta.partial_json;
                }
              }
              break;
            }
            case "content_block_stop": {
              const index =
                typeof event.index === "number" ? event.index : undefined;
              if (index === undefined) break;
              const toolIndex = toolUseByIndex.get(index);
              if (toolIndex !== undefined) {
                try {
                  const parsed = JSON.parse(
                    toolUses[toolIndex].partialInput || "{}"
                  );
                  toolUses[toolIndex].input = isObject(parsed) ? parsed : {};
                } catch {
                  toolUses[toolIndex].input = {};
                }
              }
              break;
            }
          }
        } catch {
          // Ignorar líneas que no son JSON válido
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return { text, toolUses };
}

export const POST = withRateLimit(
  async (request: Request) => {
    const profile = await getUserProfileFromRequest(request);
    if (!profile) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const authOrg = await getOrCreateAuthOrgFromRequest(request);
    if (!authOrg) {
      return Response.json({ error: "Organization not found" }, { status: 500 });
    }
    const org = authOrg.org;

    const parseResult = chatSchema.safeParse(await request.json());
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({
          error: "Invalid input",
          details: parseResult.error.flatten(),
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { message: userMessage, history = [] } = parseResult.data;

    const locale = await getLocale();

    const prisma = getPrisma();
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999
    );

    const accountsPromise = prisma.account.findMany({
      where: { userId: profile.id },
    });

    const monthTransactionsPromise = prisma.transaction.findMany({
      where: {
        organizationId: org.id,
        date: { gte: startOfMonth, lte: endOfMonth },
      },
    });

    const budgetsPromise = prisma.budget.findMany({
      where: { userId: profile.id },
      include: { category: true },
    });

    const goalsPromise = prisma.goal.findMany({
      where: { userId: profile.id, status: "ACTIVE" },
    });

    const debtsPromise = prisma.debt.findMany({
      where: { userId: profile.id, status: "ACTIVE" },
    });

    const [accounts, monthTransactions, budgets, goals, debts] = await Promise.all([
      accountsPromise,
      monthTransactionsPromise,
      budgetsPromise,
      goalsPromise,
      debtsPromise,
    ]);

    const totalBalance = accounts.reduce(
      (sum, account) => sum + decimalToNumber(account.balance),
      0
    );
    const monthIncome = monthTransactions
      .filter((transaction) => transaction.type === "INCOME")
      .reduce((sum, transaction) => sum + decimalToNumber(transaction.amount), 0);
    const monthExpense = monthTransactions
      .filter((transaction) => transaction.type === "EXPENSE")
      .reduce((sum, transaction) => sum + decimalToNumber(transaction.amount), 0);

    const budgetsText =
      budgets
        .map(
          (budget) =>
            `- ${budget.name}${
              budget.category ? ` (${budget.category.name})` : ""
            }: ${formatCurrency(decimalToNumber(budget.spent), "COP", locale)} / ${formatCurrency(
              decimalToNumber(budget.amount),
              "COP",
              locale
            )}`
        )
        .join("\n") || (locale === "en" ? "None" : "Ninguno");

    const goalsText =
      goals
        .map(
          (goal) =>
            `- ${goal.name}: ${formatCurrency(
              decimalToNumber(goal.currentAmount),
              "COP",
              locale
            )} / ${formatCurrency(decimalToNumber(goal.targetAmount), "COP", locale)}`
        )
        .join("\n") || (locale === "en" ? "None" : "Ninguna");

    const debtsText =
      debts
        .map(
          (debt) =>
            `- ${debt.name}${
              debt.counterparty ? ` ${locale === "en" ? "with" : "con"} ${debt.counterparty}` : ""
            }: ${formatCurrency(
              decimalToNumber(debt.remainingAmount),
              "COP",
              locale
            )} ${locale === "en" ? "remaining" : "restante"}`
        )
        .join("\n") || (locale === "en" ? "None" : "Ninguna");

    const systemPrompt =
      locale === "en"
        ? `You are Rhynode AI Advisor, an expert financial advisor for LATAM.
You have access to tools to query the user's real data (balance, transactions, cashflow) and create reminders. Use the tools when you need exact data or to perform actions.

User context:
- Total balance: ${formatCurrency(totalBalance, "COP", locale)}
- Month income: ${formatCurrency(monthIncome, "COP", locale)}
- Month expenses: ${formatCurrency(monthExpense, "COP", locale)}
- Budgets:\n${budgetsText}
- Active goals:\n${goalsText}
- Debts:\n${debtsText}

Reply in English, be concise and practical. Don't give generic advice — use the user's real data.`
        : `Eres Rhynode AI Advisor, un asesor financiero experto para LATAM.
Tienes acceso a herramientas para consultar datos reales del usuario (balance, transacciones, flujo de caja) y crear recordatorios. Usa las herramientas cuando necesites datos exactos o para ejecutar acciones.

Contexto del usuario:
- Balance total: ${formatCurrency(totalBalance, "COP", locale)}
- Ingresos mes: ${formatCurrency(monthIncome, "COP", locale)}
- Gastos mes: ${formatCurrency(monthExpense, "COP", locale)}
- Presupuestos:\n${budgetsText}
- Metas activas:\n${goalsText}
- Deudas:\n${debtsText}

Responde en español, sé conciso y práctico. No des consejos genéricos — usa los datos reales del usuario.`;

    const messages: AnthropicMessage[] = [
      ...(history || []),
      { role: "user", content: userMessage },
    ];

    const toolContext = { userId: profile.id, orgId: org.id, locale };

    // Deterministic fast-path: resolve common queries directly with the tools,
    // emitting the same SSE events the client expects — no LLM round-trip.
    // Only applied to the latest message with no conversation history, so we
    // never misread a follow-up that depends on prior context.
    if (history.length === 0) {
      const intent = detectIntent(userMessage);
      if (intent) {
        const fastStream = new ReadableStream({
          async start(controller) {
            const encoder = new TextEncoder();
            const write = (payload: unknown) => {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
            };
            try {
              write({ type: "tool_start", tool: intent.tool });
              const result = await executeTool(intent.tool, intent.input, toolContext);
              write({ type: "tool_result", tool: intent.tool, result });
              const reply = formatIntentReply(intent.tool, result, locale);
              const text =
                reply ??
                (locale === "en"
                  ? "Done — check the result above."
                  : "Listo — revisa el resultado arriba.");
              const chunkSize = 60;
              for (let i = 0; i < text.length; i += chunkSize) {
                write({ type: "content_block_delta", delta: { text: text.slice(i, i + chunkSize) } });
              }
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            } catch (error) {
              logger.error("Fast-path intent execution failed", {
                error: error instanceof Error ? error.message : String(error),
              });
              write({
                type: "error",
                message:
                  locale === "en"
                    ? "Error processing the query"
                    : "Error procesando la consulta",
              });
            }
            controller.close();
          },
        });
        return new Response(fastStream, {
          status: 200,
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        });
      }
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 503, headers: { "Content-Type": "application/json" } }
      );
    }

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const write = (payload: unknown) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(payload)}\n\n`)
          );
        };

        try {
          const maxRounds = 3;
          let finalText = "";

          for (let round = 0; round < maxRounds; round++) {
            const aiResponse = await fetch(
              "https://api.anthropic.com/v1/messages",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "x-api-key": apiKey,
                  "anthropic-version": "2023-06-01",
                },
                body: JSON.stringify({
                  model: "claude-sonnet-4-6-20251001",
                  max_tokens: 1024,
                  system: systemPrompt,
                  messages,
                  tools: getAnthropicTools(locale),
                  stream: true,
                }),
              }
            );

            if (!aiResponse.ok) {
              const text = await aiResponse.text();
              logger.error("Anthropic chat API request failed", {
                status: aiResponse.status,
                response: text,
              });
              write({
                type: "error",
                message: "AI request failed",
              });
              controller.close();
              return;
            }

            if (!aiResponse.body) {
              write({ type: "error", message: "No response body" });
              controller.close();
              return;
            }

            const { text, toolUses } = await consumeAnthropicRound(
              aiResponse.body,
              {
                onTextDelta: () => {
                  // No se transmite texto intermedio de rondas con tool_use
                },
                onToolStart: (toolName) => {
                  write({ type: "tool_start", tool: toolName });
                },
              }
            );

            if (toolUses.length === 0) {
              finalText = text;
              break;
            }

            // Última ronda con tool_use: ejecutar tools pero no pedir otra respuesta
            const isLastRound = round === maxRounds - 1;

            const assistantContent: AnthropicContentBlock[] = [];
            if (text.trim()) {
              assistantContent.push({ type: "text", text });
            }
            for (const toolUse of toolUses) {
              assistantContent.push({
                type: "tool_use",
                id: toolUse.id,
                name: toolUse.name,
                input: toolUse.input,
              });
            }
            messages.push({ role: "assistant", content: assistantContent });

            const toolResultContent: AnthropicToolResultBlock[] = [];
            for (const toolUse of toolUses) {
              const result = await executeTool(
                toolUse.name,
                toolUse.input,
                toolContext
              );
              write({
                type: "tool_result",
                tool: toolUse.name,
                result,
              });
              toolResultContent.push({
                type: "tool_result",
                tool_use_id: toolUse.id,
                content: JSON.stringify(result),
              });
            }
            messages.push({ role: "user", content: toolResultContent });

            if (isLastRound) {
              finalText =
                locale === "en"
                  ? "I ran several queries. Review the results above and let me know if you need anything else."
                  : "He realizado varias consultas. Revisa los resultados arriba y dime si necesitas algo más.";
              break;
            }
          }

          // Transmitir respuesta final
          const chunkSize = 60;
          for (let i = 0; i < finalText.length; i += chunkSize) {
            const chunk = finalText.slice(i, i + chunkSize);
            write({ type: "content_block_delta", delta: { text: chunk } });
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error) {
          logger.error("Chat streaming failed", {
            error: error instanceof Error ? error.message : String(error),
          });
          write({
            type: "error",
            message:
              locale === "en"
                ? "Error processing the conversation"
                : "Error procesando la conversación",
          });
          controller.close();
        }
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  },
  { key: "ai-chat", maxRequests: 20, windowMs: 60000, identifier: clerkUserIdFromRequest }
);
