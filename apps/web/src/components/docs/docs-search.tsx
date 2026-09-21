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
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
} from "react";

const SEARCH_DEBOUNCE_MS = 200;
const MIN_QUERY_LENGTH = 2;
const SKELETON_ROWS = [0, 1, 2];

/**
 * Any client component can open the palette (optionally seeded with a query)
 * by dispatching this event on `window` — see `openDocsSearch`.
 */
export const DOCS_SEARCH_OPEN_EVENT = "docs-search:open";

export function openDocsSearch(query?: string) {
  window.dispatchEvent(
    new CustomEvent(DOCS_SEARCH_OPEN_EVENT, { detail: { query } })
  );
}

type SearchResult = {
  title: string | null;
  description: string | null;
  slug: string | null;
  snippet: string;
};

type SearchState = "idle" | "loading" | "done";

/** Screen-reader status text for the current search state. */
function describeResults({
  count,
  isSearching,
  query,
  showEmpty,
}: {
  count: number;
  isSearching: boolean;
  query: string;
  showEmpty: boolean;
}): string {
  if (isSearching) {
    return "Searching the docs…";
  }
  if (showEmpty) {
    return `No results for ${query}`;
  }
  if (count > 0) {
    return `${count} result${count === 1 ? "" : "s"} for ${query}. Use the arrow keys to review results, Enter to open.`;
  }
  return "";
}

/**
 * Docs search palette: a header trigger opening a centered dialog that
 * queries `/api/docs/search` as you type. Results support arrow-key
 * navigation; Enter opens the highlighted doc. The palette stays open with a
 * pending row until the navigation commits, so choosing a result never leaves
 * the reader staring at the old page with no feedback.
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
  const [pendingSlug, setPendingSlug] = useState<string | null>(null);
  const [isNavigating, startNavigation] = useTransition();
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMac(/mac|iphone|ipad/i.test(navigator.platform));

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((wasOpen) => !wasOpen);
      }
    };
    const onOpenRequest = (event: Event) => {
      const seed = (event as CustomEvent<{ query?: string }>).detail?.query;
      if (seed) {
        setQuery(seed);
      }
      setOpen(true);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener(DOCS_SEARCH_OPEN_EVENT, onOpenRequest);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener(DOCS_SEARCH_OPEN_EVENT, onOpenRequest);
    };
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

  const onOpenChange = useCallback((nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setQuery("");
      setResults([]);
      setState("idle");
      setActiveIndex(0);
      setPendingSlug(null);
    }
  }, []);

  // The palette holds itself open (pending) while the route resolves; close it
  // only once React has committed the navigation.
  useEffect(() => {
    if (pendingSlug && !isNavigating) {
      onOpenChange(false);
    }
  }, [isNavigating, onOpenChange, pendingSlug]);

  const navigateTo = (slug: string | null) => {
    if (!slug || pendingSlug) {
      return;
    }
    setPendingSlug(slug);
    startNavigation(() => {
      router.push(slug);
    });
  };

  const onInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (results.length === 0 && event.key !== "Enter") {
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Home") {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setActiveIndex(results.length - 1);
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

  const trimmedQuery = query.trim();
  const isSearching = state === "loading";
  const showEmpty =
    state === "done" &&
    results.length === 0 &&
    trimmedQuery.length >= MIN_QUERY_LENGTH;
  const showIdle = state === "idle" && results.length === 0;
  const hasResults = results.length > 0;

  const announcement = describeResults({
    count: results.length,
    isSearching,
    query: trimmedQuery,
    showEmpty,
  });

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogTrigger
        className={cn(
          // Below sm the label and kbd are hidden, so the asymmetric padding
          // that balances them would push the lone icon off centre.
          "focus-ring inline-flex h-9 items-center gap-2 rounded-full border bg-muted/50 max-sm:w-9 max-sm:justify-center max-sm:px-0 sm:pr-[5px] sm:pl-3 md:w-80",
          "text-muted-foreground text-sm transition-colors hover:bg-muted hover:text-foreground"
        )}
      >
        <SearchIcon className="size-4" />
        <span className="hidden sm:inline">Search</span>
        <kbd
          className={cn(
            "pointer-events-none ml-auto hidden h-6 items-center gap-0.5 rounded-full border bg-background px-2",
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
            {isSearching ? (
              <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
            ) : (
              <SearchIcon className="size-4 shrink-0 text-muted-foreground" />
            )}
            <input
              aria-activedescendant={
                hasResults ? `${listboxId}-option-${activeIndex}` : undefined
              }
              aria-autocomplete="list"
              aria-controls={listboxId}
              aria-expanded={hasResults}
              autoComplete="off"
              autoFocus
              // text-base below sm keeps the field at 16px so iOS Safari does
              // not zoom the page when the palette autofocuses.
              className={cn(
                "h-12 w-full bg-transparent text-base text-foreground outline-none",
                "placeholder:text-muted-foreground sm:text-sm"
              )}
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
              !(hasResults || showEmpty) && "hidden"
            )}
            id={listboxId}
            ref={listRef}
            role="listbox"
            tabIndex={-1}
          >
            {showEmpty ? (
              <p className="px-3 py-8 text-center text-muted-foreground text-sm">
                No results for “{trimmedQuery}”
              </p>
            ) : null}
            {results.map((result, index) => (
              <div
                aria-selected={index === activeIndex}
                className={cn(
                  "grid cursor-pointer gap-1 rounded-md px-3 py-2.5",
                  index === activeIndex
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground",
                  pendingSlug && pendingSlug !== result.slug && "opacity-50"
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
                  {pendingSlug === result.slug ? (
                    <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
                  ) : (
                    <FileText className="size-4 shrink-0 text-muted-foreground" />
                  )}
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
          {isSearching ? (
            <div className="grid gap-1 p-2" data-testid="search-skeleton">
              {SKELETON_ROWS.map((row) => (
                <div className="grid gap-2 px-3 py-2.5" key={row}>
                  <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-4/5 animate-pulse rounded bg-muted/60" />
                </div>
              ))}
            </div>
          ) : null}
          {showIdle ? (
            <p className="px-4 py-8 text-center text-muted-foreground text-sm">
              Type to search the docs…
            </p>
          ) : null}
          <p aria-live="polite" className="sr-only" role="status">
            {pendingSlug ? "Opening result…" : announcement}
          </p>
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  );
}
