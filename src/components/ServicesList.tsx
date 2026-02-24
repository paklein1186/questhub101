import { useState } from "react";
import { Link } from "react-router-dom";
import { LayoutList, LayoutGrid, Trash2, Video, Briefcase, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";

type ViewMode = "list" | "grid";

interface ServicesListProps {
  services: any[];
  isAdmin?: boolean;
  onToggleActive?: (svc: any) => void;
  onDelete?: (svc: any) => void;
}

export function ServicesList({ services, isAdmin, onToggleActive, onDelete }: ServicesListProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  if (services.length === 0) return <p className="text-muted-foreground">No services yet.</p>;

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <TooltipProvider delayDuration={200}>
          <div className="flex items-center rounded-lg border border-border bg-muted/30 p-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-7 w-7 rounded-md ${viewMode === "list" ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                  onClick={() => setViewMode("list")}
                >
                  <LayoutList className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">List view</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-7 w-7 rounded-md ${viewMode === "grid" ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                  onClick={() => setViewMode("grid")}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">Grid view</TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </div>

      <div className={viewMode === "grid" ? "grid gap-3 sm:grid-cols-2 lg:grid-cols-3" : "space-y-3"}>
        {services.map((svc: any) => (
          <div key={svc.id} className="rounded-lg border border-border bg-card hover:border-primary/30 transition-all overflow-hidden">
            <Link to={`/services/${svc.id}`} className="block">
              {svc.image_url && (
                <div className={viewMode === "grid" ? "h-32 w-full" : "h-28 w-full"}>
                  <img src={svc.image_url} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="p-4 pb-2">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-display font-semibold truncate">{svc.title}</h4>
                  <div className="flex items-center gap-2 shrink-0">
                    {svc.duration_minutes && <span className="text-xs text-muted-foreground">{svc.duration_minutes} min</span>}
                    {svc.price_amount != null && (
                      <Badge className="bg-primary/10 text-primary border-0">
                        {svc.price_amount === 0 ? "Free" : `€${svc.price_amount}`}
                      </Badge>
                    )}
                  </div>
                </div>
                {viewMode === "list" && (
                  <p className="text-sm text-muted-foreground line-clamp-1 mt-1">{svc.description}</p>
                )}
                {viewMode === "grid" && svc.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{svc.description}</p>
                )}
                <div className="flex items-center gap-2 mt-1">
                  {svc.service_type === "online_call" && <Badge variant="outline" className="text-[10px]"><Video className="h-2.5 w-2.5 mr-0.5" />Call</Badge>}
                  {svc.service_type === "service_mission" && <Badge variant="outline" className="text-[10px]"><Briefcase className="h-2.5 w-2.5 mr-0.5" />Mission</Badge>}
                  {svc.service_type === "event_attendance" && <Badge variant="outline" className="text-[10px]"><Users className="h-2.5 w-2.5 mr-0.5" />Event</Badge>}
                  {(svc as any)._provider_name && (
                    <span className="text-xs text-muted-foreground">by {(svc as any)._provider_name}</span>
                  )}
                  {svc.is_draft && <Badge variant="outline" className="text-[10px]">Draft</Badge>}
                </div>
              </div>
            </Link>
            {isAdmin && onToggleActive && onDelete && (
              <div className="px-4 pb-3 flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => onToggleActive(svc)}>
                  {svc.is_active ? "Pause" : "Resume"}
                </Button>
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => onDelete(svc)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
