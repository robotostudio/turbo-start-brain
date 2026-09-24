"use client";

import { cn } from "@workspace/tailwind-config/utils";
import {
  Dialog,
  DialogBackdrop,
  DialogClose,
  DialogPopup,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import { BorderBeam } from "border-beam";
import { ChevronRight, FileText, Loader2, SearchIcon, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  Fragment,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";

import type { DocsTreeNode } from "@/lib/docs-tree";

const SEARCH_DEBOUNCE_MS = 200;
const MIN_QUERY_LENGTH = 2;
const SKELETON_ROWS = [0, 1, 2];

/**
 * Any client component can open the palette (optionally seeded with a query)
 * by dispatching this event on `window` — see `openDocsSearch`.
 */
const DOCS_SEARCH_OPEN_EVENT = "docs-search:open";

const subscribeNever = () => () => {};

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
  /** Set on empty-query suggestions; starts a labelled group in the list. */
  group?: string;
};

const MAX_SUGGESTIONS = 5;
const MAX_CHIPS = 6;

function suggestionsFor(tree: DocsTreeNode[], path: string): SearchResult[] {
  const section = tree.find(
    (node) => path === node.slug || path.startsWith(`${node.slug}/`)
  );
  const source = section ?? tree[0];
  if (!source) {
    return [];
  }
  const group = section ? `In ${section.title}` : "Start here";
  const pages = [source, ...source.children].filter(
    (node) =>
      node.slug !== path && (node.document || node.children.length === 0)
  );
  return pages.slice(0, MAX_SUGGESTIONS).map((node) => ({
    title: node.title,
    description: node.description ?? null,
    slug: node.slug,
    snippet: node.description ?? "",
    group,
  }));
}

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
type FeaturedDoc = { title: string; slug: string };

export function DocsSearch({
  featured,
  tree,
}: Readonly<{ featured: FeaturedDoc[]; tree: DocsTreeNode[] }>) {
  const router = useRouter();
  const listboxId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [state, setState] = useState<SearchState>("idle");
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMac, setIsMac] = useState(true);
  const [pendingSlug, setPendingSlug] = useState<string | null>(null);
  // Read on open rather than via usePathname, which would make the header
  // URL-dependent during prerendering.
  const [openedOn, setOpenedOn] = useState("");
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

  useEffect(() => {
    if (open) {
      setOpenedOn(window.location.pathname);
    }
  }, [open]);

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

  const trimmedQuery = query.trim();
  const isSuggesting = trimmedQuery.length < MIN_QUERY_LENGTH;
  const items = isSuggesting ? suggestionsFor(tree, openedOn) : results;
  const chips = isSuggesting
    ? (featured.length > 0 ? featured : tree).slice(0, MAX_CHIPS)
    : [];

  const onInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (items.length === 0 && event.key !== "Enter") {
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, items.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Home") {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setActiveIndex(items.length - 1);
    } else if (event.key === "Enter") {
      event.preventDefault();
      navigateTo(items[activeIndex]?.slug ?? null);
    }
  };

  useEffect(() => {
    document
      .getElementById(`${listboxId}-option-${activeIndex}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, listboxId]);

  const isSearching = state === "loading";
  const showEmpty =
    state === "done" &&
    results.length === 0 &&
    trimmedQuery.length >= MIN_QUERY_LENGTH;
  const hasResults = items.length > 0;

  const announcement = describeResults({
    count: results.length,
    isSearching,
    query: trimmedQuery,
    showEmpty,
  });

  const trigger = (
    <DialogTrigger
      aria-label="Search docs"
      className={cn(SEARCH_TRIGGER_CLASS, "w-full sm:w-80 md:w-96")}
    >
      <SearchTriggerContent isMac={isMac} />
    </DialogTrigger>
  );

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <SearchBeam className="min-w-0 flex-1 sm:flex-none">{trigger}</SearchBeam>
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
              onChange={(event) => {
                setQuery(event.target.value);
                setActiveIndex(0);
              }}
              onKeyDown={onInputKeyDown}
              placeholder="Search docs…"
              role="combobox"
              spellCheck={false}
              type="text"
              value={query}
            />
            <DialogClose
              aria-label="Close search"
              className="focus-ring -me-2 grid size-11 shrink-0 place-items-center text-muted-foreground transition-colors hover:text-foreground sm:size-9"
            >
              <X aria-hidden="true" className="size-5" />
            </DialogClose>
          </div>
          <div
            aria-label="Search results"
            className={cn(
              "min-h-0 flex-1 overflow-y-auto overscroll-contain p-2 sm:max-h-[50dvh] sm:flex-none",
              !(hasResults || showEmpty || chips.length > 0) && "hidden"
            )}
            id={listboxId}
            ref={listRef}
            role="listbox"
            tabIndex={-1}
          >
            {chips.length > 0 ? (
              <div className="grid gap-2 border-b px-3 pt-2 pb-4">
                <p className={GROUP_LABEL_CLASS}>
                  {featured.length > 0 ? "Featured" : "Sections"}
                </p>
                <div className="flex flex-wrap gap-2">
                  {chips.map((chip) => (
                    <button
                      className="focus-ring bg-muted px-3 py-1.5 text-base text-foreground transition-colors hover:bg-muted/70 sm:text-sm"
                      key={chip.slug}
                      onClick={() => navigateTo(chip.slug)}
                      type="button"
                    >
                      {chip.title}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            {showEmpty ? (
              <p className="px-3 py-8 text-center text-base text-muted-foreground sm:text-sm">
                No results for “{trimmedQuery}”
              </p>
            ) : null}
            {items.map((result, index) => (
              <Fragment key={result.slug ?? index}>
                {result.group && result.group !== items[index - 1]?.group ? (
                  <p
                    className={`${GROUP_LABEL_CLASS} px-3 pt-4 pb-2`}
                    role="presentation"
                  >
                    {result.group}
                  </p>
                ) : null}
                <div
                  aria-selected={index === activeIndex}
                  className={cn(
                    "relative grid cursor-pointer gap-1 px-3 py-2.5 pe-9",
                    index === activeIndex
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground",
                    pendingSlug && pendingSlug !== result.slug && "opacity-50"
                  )}
                  id={`${listboxId}-option-${index}`}
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
                  <span className="flex items-center gap-2 font-medium text-base text-foreground sm:text-sm">
                    {pendingSlug === result.slug ? (
                      <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
                    ) : (
                      <FileText className="size-4 shrink-0 text-muted-foreground" />
                    )}
                    {result.title}
                  </span>
                  {result.snippet ? (
                    <span className="line-clamp-2 pl-6 text-muted-foreground text-sm leading-relaxed sm:text-xs">
                      {result.snippet}
                    </span>
                  ) : null}
                  {index === activeIndex ? (
                    <ChevronRight
                      aria-hidden="true"
                      className="absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
                    />
                  ) : null}
                </div>
              </Fragment>
            ))}
          </div>
          {isSearching ? (
            <div className="grid gap-1 p-2" data-testid="search-skeleton">
              {SKELETON_ROWS.map((row) => (
                <div className="grid gap-2 px-3 py-2.5" key={row}>
                  <div className="h-4 w-1/3 animate-pulse bg-muted" />
                  <div className="h-3 w-4/5 animate-pulse bg-muted/60" />
                </div>
              ))}
            </div>
          ) : null}
          <p aria-live="polite" className="sr-only" role="status">
            {pendingSlug ? "Opening result…" : announcement}
          </p>
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  );
}

const GROUP_LABEL_CLASS =
  "font-medium text-micro text-muted-foreground uppercase tracking-wider";

const SEARCH_TRIGGER_CLASS =
  "focus-ring inline-flex h-11 items-center gap-2.5 border border-border/60 bg-muted/60 pr-1.5 pl-3 text-muted-foreground text-sm transition-colors hover:border-border hover:bg-muted hover:text-foreground sm:h-10";

function SearchTriggerContent({ isMac }: Readonly<{ isMac: boolean }>) {
  return (
    <>
      <SearchIcon className="size-4 shrink-0" />
      <span>Search docs</span>
      {/* Phones have no keyboard to press it on. Hidden from the accessible
          name so it matches the visible "Search docs" label. */}
      <span aria-hidden="true" className="contents">
        <kbd
          className={cn(
            "pointer-events-none ml-auto inline-flex h-6 items-center gap-0.5 border bg-background px-1.5",
            "font-medium font-sans text-micro text-muted-foreground max-sm:hidden"
          )}
        >
          {isMac ? "⌘" : "Ctrl"} K
        </kbd>
      </span>
    </>
  );
}

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const subscribeReducedMotion = (onChange: () => void) => {
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};

/** border-beam measures the element, so its styles differ from the server
 * render; it attaches only after hydration, and never under reduced motion
 * since it loops forever. */
function SearchBeam({
  children,
  className,
}: Readonly<{ children: React.ReactNode; className?: string }>) {
  const { resolvedTheme } = useTheme();
  const hydrated = useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false
  );
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
    () => false
  );
  if (!hydrated || reducedMotion) {
    return children;
  }
  return (
    <BorderBeam
      borderRadius={0}
      className={className}
      duration={4.5}
      size="line"
      theme={resolvedTheme === "light" ? "light" : "dark"}
    >
      {children}
    </BorderBeam>
  );
}

const subscribeMac = () => () => {};

/** Another place to open the one search palette `DocsSearch` owns. */
export function SearchButton({ className }: Readonly<{ className?: string }>) {
  const isMac = useSyncExternalStore(
    subscribeMac,
    () => /mac|iphone|ipad/i.test(navigator.platform),
    () => true
  );
  return (
    <SearchBeam>
      <button
        aria-label="Search docs"
        className={cn(SEARCH_TRIGGER_CLASS, className)}
        onClick={() => openDocsSearch()}
        type="button"
      >
        <SearchTriggerContent isMac={isMac} />
      </button>
    </SearchBeam>
  );
}
