import { createMCPClient } from "@ai-sdk/mcp";
import { env as clientEnv } from "@workspace/env/client";
import { env } from "@workspace/env/server";
import type { ToolSet } from "ai";
import { cacheLife } from "next/cache";

/**
 * Sanity Context — the hosted read-only MCP server at api.sanity.io — is the
 * retrieval layer for the docs assistant. The browser never sees this URL or
 * the read token; only the /api/chat route handler talks to it.
 */

const MCP_API_VERSION = "v2026-02-27";
const CONTEXT_SLUG = "docs-assistant";

function getMcpUrl(): string {
  const projectId = clientEnv.NEXT_PUBLIC_SANITY_PROJECT_ID;
  const dataset = clientEnv.NEXT_PUBLIC_SANITY_DATASET;
  return `https://api.sanity.io/${MCP_API_VERSION}/context/mcp/${projectId}/${dataset}/${CONTEXT_SLUG}`;
}

/**
 * Fetches the compressed schema overview + Context document instructions that
 * the `initial_context` tool would otherwise return. Fetching it once here and
 * appending it to the system instructions saves a tool round-trip per
 * conversation, so the route strips `initial_context` from the tool set.
 */
export async function getInitialContext(): Promise<string> {
  "use cache";
  cacheLife("hours");
  const response = await fetch(`${getMcpUrl()}/initial-context`, {
    headers: { Authorization: `Bearer ${env.SANITY_API_READ_TOKEN}` },
  });
  if (!response.ok) {
    throw new Error(`Initial context fetch failed: ${response.status}`);
  }
  return await response.text();
}

export type RetrievalTools = {
  tools: ToolSet;
  close: () => Promise<void>;
};

/**
 * Connects to the Sanity Context MCP server and returns its tools minus
 * `initial_context` (served via {@link getInitialContext} instead). Returned
 * as a plain object so a different retrieval backend (e.g. the Fuse.js search
 * fallback) can be dropped into the chat route without touching the loop.
 */
export async function getSanityContextTools(): Promise<RetrievalTools> {
  const mcp = await createMCPClient({
    transport: {
      type: "http",
      url: getMcpUrl(),
      headers: { Authorization: `Bearer ${env.SANITY_API_READ_TOKEN}` },
    },
  });
  const { initial_context: _initialContext, ...tools } = await mcp.tools();
  return { tools, close: () => mcp.close() };
}
