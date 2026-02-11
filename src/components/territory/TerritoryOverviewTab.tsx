import { TerritorySynthesis } from "./TerritorySynthesis";
import { useTerritoryStats } from "@/hooks/useTerritoryDetail";

interface Props {
  territoryId: string;
  territoryName: string;
}

export function TerritoryOverviewTab({ territoryId, territoryName }: Props) {
  return (
    <div className="space-y-6">
      <TerritorySynthesis
        territoryId={territoryId}
        territoryName={territoryName}
        isMember={true}
      />
    </div>
  );
}
