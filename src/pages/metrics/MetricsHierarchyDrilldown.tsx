import { useCallback, useState } from "react";
import { CaretDown, CaretRight } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export type MetricsHierarchyNode = {
  id: string;
  label: string;
  count: number;
  subtitle?: string;
  children?: MetricsHierarchyNode[];
};

type MetricsHierarchyDrilldownProps = {
  roots: MetricsHierarchyNode[];
  emptyLabel: string;
};

function hasChildren(node: MetricsHierarchyNode): boolean {
  return (node.children?.length ?? 0) > 0;
}

function HierarchyRow({
  node,
  depth,
  expanded,
  onToggle,
}: {
  node: MetricsHierarchyNode;
  depth: number;
  expanded: Set<string>;
  onToggle: (id: string) => void;
}) {
  const expandable = hasChildren(node);
  const isOpen = expanded.has(node.id);

  return (
    <>
      <div
        className={cn(
          "flex items-center gap-2 border-t border-bloom-aubergine/[0.07] py-2.5 font-ui text-[13px] first:border-t-0",
          depth === 0 && "first:pt-0",
        )}
        style={{ paddingLeft: `${depth * 1.125 + 0.25}rem` }}
      >
        {expandable ? (
          <button
            type="button"
            onClick={() => onToggle(node.id)}
            className="flex size-7 shrink-0 items-center justify-center rounded-lg text-bloom-aubergine/55 transition-colors hover:bg-bloom-aubergine/[0.06] hover:text-bloom-aubergine"
            aria-expanded={isOpen}
            aria-label={isOpen ? `Recolher ${node.label}` : `Expandir ${node.label}`}
          >
            {isOpen ?
              <CaretDown size={16} weight="bold" aria-hidden />
            : <CaretRight size={16} weight="bold" aria-hidden />}
          </button>
        ) : (
          <span className="size-7 shrink-0" aria-hidden />
        )}
        <div className="min-w-0 flex-1">
          <span className="block truncate font-semibold text-bloom-aubergine">{node.label}</span>
          {node.subtitle ? (
            <span className="mt-0.5 block truncate font-ui text-[11px] text-bloom-aubergine/45">{node.subtitle}</span>
          ) : null}
        </div>
        <strong className="shrink-0 tabular-nums text-bloom-aubergine">{node.count}</strong>
      </div>
      {expandable && isOpen ?
        node.children!.map((child) => (
          <HierarchyRow
            key={child.id}
            node={child}
            depth={depth + 1}
            expanded={expanded}
            onToggle={onToggle}
          />
        ))
      : null}
    </>
  );
}

export function MetricsHierarchyDrilldown({ roots, emptyLabel }: MetricsHierarchyDrilldownProps) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  const onToggle = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  if (roots.length === 0) {
    return <p className="font-ui text-sm text-bloom-aubergine/55">{emptyLabel}</p>;
  }

  return (
    <div className="rounded-[1.25rem] border border-bloom-aubergine/12 bg-white/45 px-3.5 py-2">
      {roots.map((root) => (
        <HierarchyRow key={root.id} node={root} depth={0} expanded={expanded} onToggle={onToggle} />
      ))}
    </div>
  );
}
