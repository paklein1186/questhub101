import { Badge } from "@/components/ui/badge";

const HEALTH_DOTS: Record<string, { color: string; label: string }> = {
  healthy: { color: "bg-emerald-500", label: "" },
  degraded: { color: "bg-amber-500", label: "" },
  unreachable: { color: "bg-destructive", label: "Unreachable" },
  unknown: { color: "bg-muted-foreground/40", label: "" },
};

export function AgentSourceBadge({
  agentSource,
  healthStatus,
  size = "sm",
}: {
  agentSource?: string;
  healthStatus?: string;
  size?: "sm" | "lg";
}) {
  if (!agentSource || agentSource === "platform") return null;

  const isWebhook = agentSource === "webhook";
  const label = isWebhook ? "🔗 External" : "🔑 Custom";
  const colorClass = isWebhook
    ? "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-700/50"
    : "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-700/50";

  const health = isWebhook ? HEALTH_DOTS[healthStatus || "unknown"] : null;

  return (
    <span className="inline-flex items-center gap-1.5">
      <Badge
        variant="outline"
        className={`${colorClass} ${size === "sm" ? "text-[10px] px-1.5 py-0" : "text-xs px-2 py-0.5"} font-medium`}
      >
        {label}
      </Badge>
      {health && (
        <span className="inline-flex items-center gap-1">
          <span className={`inline-block h-2 w-2 rounded-full ${health.color}`} />
          {health.label && (
            <span className="text-[10px] text-destructive font-medium">{health.label}</span>
          )}
        </span>
      )}
    </span>
  );
}
