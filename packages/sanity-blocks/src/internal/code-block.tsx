import { CopyButton } from "./copy-button";

// Short label shown in the language tile.
const BADGE_MAP: Record<string, string> = {
  ts: "TS",
  tsx: "TSX",
  js: "JS",
  groq: "GRQ",
  bash: "SH",
  json: "{ }",
  css: "CSS",
};

export interface CodeBlockValue {
  code?: string | null;
  language?: string | null;
  filename?: string | null;
}

export function CodeBlock({
  code,
  language,
  filename,
}: Readonly<CodeBlockValue>) {
  if (!code) {
    return null;
  }

  const badge = (language && BADGE_MAP[language]) || "TXT";

  // Line numbers are rendered as a fixed gutter column beside the scrolling
  // code, so they stay put during horizontal scroll and are excluded from copy.
  const lineCount = code.replace(/\n$/, "").split("\n").length;

  return (
    <figure className="not-prose relative my-6 overflow-hidden rounded-xl border border-border bg-background">
      {filename ? (
        <div className="flex items-center gap-2 border-border border-b bg-muted px-3 py-1.5">
          <span
            aria-hidden="true"
            className="grid h-5 min-w-5 place-items-center rounded-md border border-border bg-background px-1 font-mono font-semibold text-[10px] text-muted-foreground uppercase"
          >
            {badge}
          </span>
          <span className="truncate font-mono text-muted-foreground text-xs">
            {filename}
          </span>
          <CopyButton className="ms-auto" code={code} />
        </div>
      ) : (
        <div className="absolute top-2 right-2 z-10">
          <CopyButton
            className="rounded-md border border-border bg-background/80 p-1.5 backdrop-blur-sm"
            code={code}
          />
        </div>
      )}
      <div className="rich-code flex text-[13px] leading-6">
        <div aria-hidden="true" className="rich-code-gutter font-mono">
          {Array.from({ length: lineCount }, (_, index) => (
            <span key={index + 1}>{index + 1}</span>
          ))}
        </div>
        {/* No tabIndex: browsers make an overflowing scroll container
            keyboard-focusable on their own, so arrow keys can still pan a long
            line into view (WCAG 2.1.1). */}
        <pre className="rich-code-pre overflow-x-auto font-mono">
          <code className="font-mono">{code}</code>
        </pre>
      </div>
    </figure>
  );
}
