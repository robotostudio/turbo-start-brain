import { Logger } from "@workspace/logger";
import { type CSSProperties, Fragment } from "react";
import {
  type BundledLanguage,
  createHighlighter,
  type Highlighter,
  type ThemedToken,
} from "shiki";

import { CopyButton } from "./copy-button";

const logger = new Logger("CodeBlock");

// Short label shown in the language tile.
const BADGE_MAP: Record<string, string> = {
  ts: "TS",
  tsx: "TSX",
  js: "JS",
  groq: "GRQ",
  bash: "SH",
  json: "{ }",
  css: "CSS",
  html: "HTML",
  python: "PY",
  yaml: "YML",
  sql: "SQL",
  diff: "DIFF",
  markdown: "MD",
};

// GROQ has no Shiki grammar and "text" is plain on purpose.
const HIGHLIGHTED = new Set<string>([
  "ts",
  "tsx",
  "js",
  "bash",
  "json",
  "css",
  "html",
  "python",
  "yaml",
  "sql",
  "diff",
  "markdown",
]);

let highlighter: Promise<Highlighter> | undefined;

// Server-only; tokens carry both themes as CSS variables (see globals.css).
// Cached because Shiki reads the clock, which prerendering rejects. Failures
// throw rather than return null, so a plain fallback is never cached.
async function highlight(
  code: string,
  language?: string | null
): Promise<ThemedToken[][] | null> {
  "use cache";
  if (!(language && HIGHLIGHTED.has(language))) {
    return null;
  }
  highlighter ??= createHighlighter({
    themes: ["github-light", "github-dark"],
    langs: [...HIGHLIGHTED] as BundledLanguage[],
  });
  try {
    return (await highlighter).codeToTokens(code, {
      lang: language as BundledLanguage,
      themes: { light: "github-light", dark: "github-dark" },
      defaultColor: false,
    }).tokens;
  } catch (error) {
    // Drop a failed load so the next render retries instead of reusing it.
    highlighter = undefined;
    throw error;
  }
}

interface CodeBlockValue {
  code?: string | null;
  language?: string | null;
  filename?: string | null;
}

export async function CodeBlock({
  code,
  language,
  filename,
}: Readonly<CodeBlockValue>) {
  if (!code) {
    return null;
  }

  const badge = (language && BADGE_MAP[language]) || "TXT";
  const lines = await highlight(code, language).catch((error: unknown) => {
    logger.warn("Code highlighting failed; rendering plain text", error);
    return null;
  });

  // Line numbers are rendered as a fixed gutter column beside the scrolling
  // code, so they stay put during horizontal scroll and are excluded from copy.
  const lineCount = code.replace(/\n$/, "").split("\n").length;

  return (
    <figure className="not-prose relative my-8 overflow-hidden border border-border bg-background">
      {filename ? (
        <div className="flex items-center gap-2 border-border border-b bg-muted px-3 py-1.5">
          <span
            aria-hidden="true"
            className="grid h-5 min-w-5 place-items-center border border-border bg-background px-1 font-mono font-semibold text-micro text-muted-foreground uppercase"
          >
            {badge}
          </span>
          <span className="truncate font-mono text-micro text-muted-foreground">
            {filename}
          </span>
          <CopyButton className="ms-auto" code={code} />
        </div>
      ) : (
        <div className="absolute top-2 right-2 z-10">
          <CopyButton
            className="border border-border bg-background/80 p-1.5 backdrop-blur-sm"
            code={code}
          />
        </div>
      )}
      <div className="rich-code flex text-small">
        <div aria-hidden="true" className="rich-code-gutter font-mono">
          {Array.from({ length: lineCount }, (_, index) => (
            <span key={index + 1}>{index + 1}</span>
          ))}
        </div>
        {/* No tabIndex: browsers make an overflowing scroll container
            keyboard-focusable on their own, so arrow keys can still pan a long
            line into view (WCAG 2.1.1). */}
        <pre className="rich-code-pre overflow-x-auto font-mono">
          <code className="font-mono">
            {lines
              ? lines.map((line, lineIndex) => (
                  <Fragment key={lineIndex}>
                    {line.map((token, tokenIndex) => (
                      <span
                        key={tokenIndex}
                        style={token.htmlStyle as CSSProperties}
                      >
                        {token.content}
                      </span>
                    ))}
                    {lineIndex < lines.length - 1 ? "\n" : null}
                  </Fragment>
                ))
              : code}
          </code>
        </pre>
      </div>
    </figure>
  );
}
