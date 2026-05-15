import { Link } from "react-router-dom";
import { CaretRight } from "@phosphor-icons/react";

export interface WaveHierarchyCrumb {
  label: string;
  /** Omit on the current (last) segment. */
  to?: string;
}

export function WaveHierarchyBreadcrumb({
  items,
  ariaLabel = "Page hierarchy",
}: {
  items: WaveHierarchyCrumb[];
  /** Accessibility label for the trail (English). */
  ariaLabel?: string;
}) {
  if (items.length === 0) return null;

  return (
    <nav aria-label={ariaLabel} className="mt-2">
      <ol className="flex flex-wrap items-center gap-x-1 gap-y-1 font-ui text-[11px] sm:text-xs text-bloom-aubergine/55 uppercase tracking-[0.12em]">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          const showLink = Boolean(item.to) && !isLast;

          return (
            <li key={`${i}-${item.label}`} className="flex items-center gap-1 min-w-0">
              {i > 0 ? <CaretRight className="h-3.5 w-3.5 shrink-0 text-bloom-aubergine/35" aria-hidden /> : null}
              {showLink ? (
                <Link
                  to={item.to!}
                  className="text-bloom-aubergine/70 hover:text-bloom-garnet transition-colors truncate max-w-[10rem] sm:max-w-[15rem]"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className={
                    isLast
                      ? "text-bloom-aubergine font-medium truncate max-w-[12rem] sm:max-w-[18rem]"
                      : "truncate max-w-[10rem] sm:max-w-[15rem]"
                  }
                  {...(isLast ? ({ "aria-current": "page" } as const) : {})}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
