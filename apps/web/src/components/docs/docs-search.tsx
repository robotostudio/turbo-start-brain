"use client";

import { cn } from "@workspace/tailwind-config/utils";
import {
  Dialog,
  DialogBackdrop,
  DialogPopup,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import { FileText, Loader2, SearchIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

const SEARCH_DEBOUNCE_MS = 200;
const MIN_QUERY_LENGTH = 2;

type SearchResult = {
  title: string | null;
  description: string | null;
  slug: string | null;
  snippet: string;
};

type SearchState = "idle" | "loading" | "done";

/**
 * Docs search palette: a header trigger opening a centered dialog that
 * queries `/api/docs/search` as you type. Results support arrow-key
 * navigation; Enter opens the highlighted doc.
 */
export function DocsSearch() {
  const router = useRouter();
  const listboxId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [state, setState] = useState<SearchState>("idle");
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMac, setIsMac] = useState(true);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMac(/mac|iphone|ipad/i.test(navigator.platform));

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((wasOpen) => !wasOpen);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) {
      setResults([]);
      setState("idle");
      return;
    }

    setState("loading");
    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/docs/search?q=${encodeURIComponent(trimmed)}`,
          { signal: controller.signal }
        );
        const data: SearchResult[] = response.ok ? await response.json() : [];
        setResults(data);
        setActiveIndex(0);
        setState("done");
      } catch {
        // Aborted by a newer keystroke or the dialog closing — keep quiet.
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [query]);

  const onOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setQuery("");
      setResults([]);
      setState("idle");
      setActiveIndex(0);
    }
  };

  const navigateTo = (slug: string | null) => {
    if (!slug) {
      return;
    }
    onOpenChange(false);
    router.push(slug);
  };

  const onInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      navigateTo(results[activeIndex]?.slug ?? null);
    }
  };

  useEffect(() => {
    document
      .getElementById(`${listboxId}-option-${activeIndex}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, listboxId]);

  const showEmpty =
    state === "done" &&
    results.length === 0 &&
    query.trim().length >= MIN_QUERY_LENGTH;

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogTrigger
        className={cn(
          "focus-ring inline-flex h-9 items-center gap-2 rounded-md border bg-muted/50 px-3",
          "text-muted-foreground text-sm transition-colors hover:bg-muted hover:text-foreground"
        )}
      >
        <SearchIcon className="size-4" />
        <span className="hidden sm:inline">Search</span>
        <kbd
          className={cn(
            "pointer-events-none ml-2 hidden items-center gap-0.5 rounded border bg-background px-1.5",
            "font-medium font-sans text-[11px] text-muted-foreground sm:inline-flex"
          )}
        >
          {isMac ? "⌘" : "Ctrl"} K
        </kbd>
      </DialogTrigger>
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup aria-label="Search documentation">
          <DialogTitle className="sr-only">Search documentation</DialogTitle>
          <div className="flex items-center gap-2 border-b px-4">
            {state === "loading" ? (
              <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
            ) : (
              <SearchIcon className="size-4 shrink-0 text-muted-foreground" />
            )}
            <input
              aria-activedescendant={
                results.length > 0
                  ? `${listboxId}-option-${activeIndex}`
                  : undefined
              }
              aria-controls={listboxId}
              aria-expanded={results.length > 0}
              autoComplete="off"
              autoFocus
              className="h-12 w-full bg-transparent text-foreground text-sm outline-none placeholder:text-muted-foreground"
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={onInputKeyDown}
              placeholder="Search documentation…"
              role="combobox"
              spellCheck={false}
              type="text"
              value={query}
            />
            <kbd className="hidden shrink-0 rounded border bg-muted px-1.5 py-0.5 font-sans text-[11px] text-muted-foreground sm:block">
              Esc
            </kbd>
          </div>
          <div
            aria-label="Search results"
            className={cn(
              "max-h-[50dvh] overflow-y-auto overscroll-contain p-2",
              results.length === 0 && !showEmpty && "hidden"
            )}
            id={listboxId}
            ref={listRef}
            role="listbox"
            tabIndex={-1}
          >
            {showEmpty ? (
              <p className="px-3 py-8 text-center text-muted-foreground text-sm">
                No results for “{query.trim()}”
              </p>
            ) : null}
            {results.map((result, index) => (
              <div
                aria-selected={index === activeIndex}
                className={cn(
                  "grid cursor-pointer gap-1 rounded-md px-3 py-2.5",
                  index === activeIndex
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground"
                )}
                id={`${listboxId}-option-${index}`}
                key={result.slug ?? index}
                onClick={() => navigateTo(result.slug)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    navigateTo(result.slug);
                  }
                }}
                onMouseMove={() => setActiveIndex(index)}
                role="option"
                tabIndex={-1}
              >
                <span className="flex items-center gap-2 font-medium text-foreground text-sm">
                  <FileText className="size-4 shrink-0 text-muted-foreground" />
                  {result.title}
                </span>
                {result.snippet ? (
                  <span className="line-clamp-2 pl-6 text-muted-foreground text-xs leading-relaxed">
                    {result.snippet}
                  </span>
                ) : null}
              </div>
            ))}
          </div>
          {results.length === 0 && !showEmpty ? (
            <p className="px-4 py-8 text-center text-muted-foreground text-sm">
              Type to search the docs…
            </p>
          ) : null}
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  );
}
