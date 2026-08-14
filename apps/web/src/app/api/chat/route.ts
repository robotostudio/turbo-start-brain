import { pipeJsonRender } from "@json-render/core";
import { env } from "@workspace/env/server";
import { Logger } from "@workspace/logger";
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  isStepCount,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai";

import {
  getInitialContext,
  getSanityContextTools,
} from "@/lib/ai/sanity-context";

export const maxDuration = 30;

const logger = new Logger("ChatRoute");

const BASE_INSTRUCTIONS = `You are the docs assistant for Turbo Start Brain, a documentation site.

- Answer only from retrieved content; use the Sanity tools for every factual claim.
- Cite pages as markdown links using their slug: [Page Title](/{slug}).
- Only link to pages you actually retrieved — never invent slugs.
- If retrieval returns nothing relevant, say so and suggest broadening the question. Never invent content.
- Keep answers concise and grounded in the documentation.`;

export async function POST(req: Request) {
  // Fail closed: without the Gateway key the model call cannot succeed.
  if (!env.AI_GATEWAY_API_KEY) {
    logger.warn("Rejected chat request: AI_GATEWAY_API_KEY is not configured");
    return new Response("Chat is not configured: missing AI_GATEWAY_API_KEY.", {
      status: 503,
    });
  }

  let messages: UIMessage[];
  try {
    ({ messages } = (await req.json()) as { messages: UIMessage[] });
  } catch {
    return new Response("Bad Request: body must be valid JSON", {
      status: 400,
    });
  }
  if (!Array.isArray(messages)) {
    return new Response("Bad Request: messages must be an array", {
      status: 400,
    });
  }

  // Schema overview + Context instructions, cached — replaces the
  // initial_context tool call. Non-fatal: retrieval still works without it.
  const initialContext = await getInitialContext().catch((error: unknown) => {
    logger.warn("Failed to fetch Sanity initial context", { error });
    return "";
  });

  const { tools, close } = await getSanityContextTools();

  const instructions = initialContext
    ? `${BASE_INSTRUCTIONS}\n\n${initialContext}`
    : BASE_INSTRUCTIONS;

  const result = streamText({
    model: "anthropic/claude-sonnet-5",
    instructions,
    messages: await convertToModelMessages(messages),
    tools,
    stopWhen: isStepCount(8),
    onError: ({ error }) => {
      logger.error("Chat stream error", { error });
    },
    onEnd: () => {
      close().catch((error: unknown) => {
        logger.warn("Failed to close MCP client", { error });
      });
    },
  });

  return createUIMessageStreamResponse({
    stream: pipeJsonRender(toUIMessageStream({ stream: result.stream })),
  });
}
