const BODY_LINE_WIDTHS = [
  "w-full",
  "w-[96%]",
  "w-[88%]",
  "w-[92%]",
  "w-[70%]",
] as const;

const TOC_LINE_WIDTHS = ["w-[80%]", "w-[64%]", "w-[72%]", "w-[56%]"] as const;

function Bar({ className }: Readonly<{ className: string }>) {
  return <div className={`rounded bg-muted ${className}`} />;
}

/**
 * Streams while the doc route resolves its params and fetches the document.
 * Deliberately shaped like the real page — breadcrumbs, title, description,
 * rule, body lines, TOC rail — so the layout does not jump when content lands.
 */
export default function DocLoading() {
  return (
    <div
      // Same grid as the page: article centred, TOC in the right column.
      className="grid min-h-[calc(100dvh-3.5rem)] animate-pulse grid-cols-1 gap-12 px-5 py-10 sm:px-8 lg:px-12 xl:grid-cols-[minmax(0,1fr)_minmax(0,48rem)_minmax(0,1fr)] xl:gap-16"
      role="status"
    >
      <span className="sr-only">Loading page</span>
      <div
        aria-hidden="true"
        className="mx-auto w-full min-w-0 max-w-3xl xl:col-start-2"
      >
        <div className="flex items-center gap-2">
          <Bar className="h-4 w-16" />
          <Bar className="h-4 w-3" />
          <Bar className="h-4 w-24" />
        </div>
        <div className="mt-6 mb-10 border-b pb-8">
          <Bar className="h-10 w-[70%] sm:h-12" />
          <Bar className="mt-5 h-5 w-[52%]" />
        </div>
        <div className="grid gap-4">
          {BODY_LINE_WIDTHS.map((width) => (
            <Bar className={`h-4 ${width}`} key={width} />
          ))}
        </div>
        <Bar className="mt-12 h-7 w-[38%]" />
        <div className="mt-6 grid gap-4">
          {BODY_LINE_WIDTHS.slice(0, 4).map((width) => (
            <Bar className={`h-4 ${width}`} key={width} />
          ))}
        </div>
      </div>
      <div aria-hidden="true" className="hidden w-56 max-w-full xl:block">
        <div className="sticky top-20 grid gap-3">
          <Bar className="h-4 w-28" />
          {TOC_LINE_WIDTHS.map((width) => (
            <Bar className={`h-3 ${width}`} key={width} />
          ))}
        </div>
      </div>
    </div>
  );
}
