import { Grid3X3, Grid2X2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GridDensity } from "@/hooks/useGridDensity";

interface GridDensityToggleProps {
  density: GridDensity;
  setDensity: (d: GridDensity) => void;
}

export function GridDensityToggle({ density, setDensity }: GridDensityToggleProps) {
  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-border bg-muted/30 p-0.5">
      <Button
        size="sm"
        variant={density === "3" ? "secondary" : "ghost"}
        className="h-7 w-7 p-0"
        onClick={() => setDensity("3")}
        title="3 columns"
      >
        <Grid3X3 className="h-3.5 w-3.5" />
      </Button>
      <Button
        size="sm"
        variant={density === "4" ? "secondary" : "ghost"}
        className="h-7 w-7 p-0"
        onClick={() => setDensity("4")}
        title="4 columns"
      >
        <Grid2X2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
