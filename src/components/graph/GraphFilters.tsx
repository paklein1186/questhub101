import { Badge } from "@/components/ui/badge";
import { NODE_STYLES, EDGE_STYLES } from "./graphConfig";
import { cn } from "@/lib/utils";

export interface FilterState {
  nodeTypes: Record<string, boolean>;
  relationTypes: Record<string, boolean>;
}

interface GraphFiltersProps {
  filters: FilterState;
  onChange: (f: FilterState) => void;
  nodeCount?: number;
  edgeCount?: number;
}

export function GraphFilters({ filters, onChange, nodeCount, edgeCount }: GraphFiltersProps) {
  const toggleNode = (key: string) => {
    onChange({
      ...filters,
      nodeTypes: { ...filters.nodeTypes, [key]: !filters.nodeTypes[key] },
    });
  };

  const toggleRelation = (key: string) => {
    onChange({
      ...filters,
      relationTypes: { ...filters.relationTypes, [key]: !filters.relationTypes[key] },
    });
  };

  return (
    <div className="flex flex-col gap-2 mb-3 px-1">
      {/* Stats */}
      {(nodeCount !== undefined || edgeCount !== undefined) && (
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          {nodeCount !== undefined && <span>{nodeCount} nodes</span>}
          {edgeCount !== undefined && <span>{edgeCount} edges</span>}
          <span className="text-[10px] opacity-60">Click a node to navigate • Scroll to zoom</span>
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        {/* Node type badges */}
        {Object.entries(NODE_STYLES).map(([key, style]) => {
          const active = filters.nodeTypes[key] ?? true;
          return (
            <button
              key={key}
              onClick={() => toggleNode(key)}
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-all border cursor-pointer",
                active
                  ? "border-transparent text-white shadow-sm"
                  : "border-border bg-transparent text-muted-foreground opacity-50 hover:opacity-75"
              )}
              style={active ? { backgroundColor: style.color } : undefined}
            >
              <span className="text-xs">{style.icon}</span>
              {style.label}
            </button>
          );
        })}

        <span className="w-px h-5 bg-border self-center mx-1" />

        {/* Relation type badges */}
        {Object.entries(EDGE_STYLES).map(([key, style]) => {
          const active = filters.relationTypes[key] ?? true;
          return (
            <button
              key={key}
              onClick={() => toggleRelation(key)}
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-all border cursor-pointer",
                active
                  ? "border-transparent bg-card text-foreground shadow-sm"
                  : "border-border bg-transparent text-muted-foreground opacity-50 hover:opacity-75"
              )}
            >
              <span
                className="inline-block w-3 h-[2px] rounded-full"
                style={{ backgroundColor: active ? style.activeColor : style.color }}
              />
              {style.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
