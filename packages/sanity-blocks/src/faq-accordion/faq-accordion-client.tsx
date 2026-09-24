"use client";

import { BlockEyebrow } from "@workspace/sanity-blocks/internal/block-eyebrow";
import { useDisclosureAnimation } from "@workspace/sanity-blocks/internal/use-disclosure-animation";
import { cn } from "@workspace/tailwind-config/utils";
import { Plus } from "lucide-react";
import {
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  useState,
} from "react";

/**
 * The disclosure UI: exclusive-open state and the height animation. The answers themselves arrive as `body` — already
 * rendered on the server by `index.tsx` — so `RichText` (and everything it
 * reaches: PortableText, the code block, the Sanity image loader) never
 * crosses this boundary.
 */
export interface FaqClientItem {
  _key?: string | null;
  _id: string;
  body?: ReactNode;
  title?: string | null;
}

export interface FaqAccordionClientProps {
  _key?: string;
  faqs?: FaqClientItem[] | null;
  eyebrow?: string | null;
  subtitle?: string | null;
  title?: string | null;
}

const DISCLOSURE_BASE_CLASS =
  "hover-surface group border border-border bg-background px-4 transition-colors duration-150 has-[summary:focus-visible]:[outline:2px_solid_var(--foreground)] has-[summary:focus-visible]:[outline-offset:-2px] motion-reduce:transition-none";
// `animation-duration-300`, not `duration-300`: the latter also sets
// `transition-duration`, which stretched the hover fade above to the entrance's
// 300ms while the code chip inside switched instantly.
const DISCLOSURE_ANIMATION_CLASS =
  "fade-in slide-in-from-bottom-2 animate-in fill-mode-both animation-duration-300 ease-out motion-reduce:animate-none";

function FaqDisclosure({
  animationDelay,
  faq,
  isOpen,
  onToggle,
}: Readonly<{
  animationDelay: string;
  faq: FaqClientItem;
  isOpen: boolean;
  onToggle: () => void;
}>) {
  const { detailsRef, contentRef } = useDisclosureAnimation(isOpen);
  const [initialOpen] = useState(isOpen);

  const handleSummaryClick = (event: ReactMouseEvent<HTMLElement>) => {
    event.preventDefault();
    onToggle();
  };

  return (
    <details
      className={cn(DISCLOSURE_BASE_CLASS, DISCLOSURE_ANIMATION_CLASS)}
      open={initialOpen}
      ref={detailsRef}
      style={{ animationDelay }}
    >
      {/* biome-ignore lint/a11y/noStaticElementInteractions: summary is natively interactive */}
      <summary
        className="flex cursor-pointer list-none items-center justify-between gap-2.5 py-4 outline-none [&::-webkit-details-marker]:hidden"
        onClick={handleSummaryClick}
      >
        <h3 className="font-normal text-foreground text-lg leading-6">
          {faq.title}
        </h3>
        <Plus
          className={cn(
            "pointer-events-none size-5 shrink-0 text-foreground transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none",
            isOpen && "rotate-45"
          )}
        />
      </summary>
      {faq.body ? (
        <div className="overflow-hidden" ref={contentRef}>
          <div className="min-h-0 pb-4 text-muted-foreground">{faq.body}</div>
        </div>
      ) : null}
    </details>
  );
}

function FaqList({ faqs }: Readonly<{ faqs: FaqClientItem[] }>) {
  const defaultFaq = faqs.find((faq) => faq?.title);
  const defaultOpenId = defaultFaq
    ? (defaultFaq._key ?? defaultFaq._id)
    : undefined;
  // Exclusive-open lives in state (not the details `name` attribute) so the
  // sibling that closes animates instead of snapping shut.
  const [openId, setOpenId] = useState(defaultOpenId);

  return (
    <div className="grid content-start gap-4">
      {faqs.map((faq, index) => {
        if (!faq?.title) return null;
        const itemId = faq._key ?? faq._id;
        return (
          <FaqDisclosure
            animationDelay={`${Math.min(index, 8) * 45}ms`}
            faq={faq}
            isOpen={itemId === openId}
            key={`faq-${itemId}`}
            onToggle={() =>
              setOpenId((current) => (current === itemId ? undefined : itemId))
            }
          />
        );
      })}
    </div>
  );
}

function FaqHeader({
  eyebrow,
  title,
  subtitle,
}: Readonly<Pick<FaqAccordionClientProps, "eyebrow" | "title" | "subtitle">>) {
  return (
    <div className="flex flex-col items-start gap-6">
      <BlockEyebrow eyebrow={eyebrow} />
      {(title || subtitle) && (
        <div className="flex flex-col gap-5">
          {title && (
            <h2 className="font-normal text-4xl text-foreground leading-tight tracking-[-0.24px] md:text-5xl">
              {title}
            </h2>
          )}
          {subtitle && (
            <p className="body-text max-w-xl text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function FaqAccordionClient({
  faqs,
  eyebrow,
  title,
  subtitle,
}: Readonly<FaqAccordionClientProps>) {
  return (
    <section className="bg-background pt-20 pb-0.5 sm:pt-28 lg:pt-34" id="faq">
      <div className="container">
        <FaqHeader eyebrow={eyebrow} subtitle={subtitle} title={title} />
        <div className="mt-12 flex flex-col gap-6 lg:mt-16">
          <FaqList faqs={faqs ?? []} />
        </div>
      </div>
    </section>
  );
}
