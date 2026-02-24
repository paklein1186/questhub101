import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { NODE_STYLES, EDGE_STYLES } from "./graphConfig";

export interface FilterState {
  nodeTypes: Record<string, boolean>;
  relationTypes: Record<string, boolean>;
}

interface GraphFiltersProps {
  filters: FilterState;
  onChange: (f: FilterState) => void;
}

export function GraphFilters({ filters, onChange }: GraphFiltersProps) {
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
    <div className="flex flex-wrap gap-4 mb-3 px-1">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Nodes:</span>
        {Object.entries(NODE_STYLES).map(([key, style]) => (
          <label key={key} className="flex items-center gap-1.5 cursor-pointer text-xs">
            <Checkbox
              checked={filters.nodeTypes[key] ?? true}
              onCheckedChange={() => toggleNode(key)}
              className="h-3.5 w-3.5"
            />
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ backgroundColor: style.color }}
            />
            <span className="text-foreground">{style.label}</span>
          </label>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Bonds:</span>
        {Object.entries(EDGE_STYLES).map(([key, style]) => (
          <label key={key} className="flex items-center gap-1.5 cursor-pointer text-xs">
            <Checkbox
              checked={filters.relationTypes[key] ?? true}
              onCheckedChange={() => toggleRelation(key)}
              className="h-3.5 w-3.5"
            />
            <span
              className="inline-block w-3 h-0.5"
              style={{ backgroundColor: style.color }}
            />
            <span className="text-foreground">{style.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
