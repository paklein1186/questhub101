import { useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Compass, Zap, Users, Undo2 } from "lucide-react";
import { PriorityPicker, type Priority } from "@/components/PriorityPicker";
import { GuildColorLabel } from "@/components/GuildColorLabel";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

type UnifiedTask = {
  id: string;
  title: string;
  status: string;
  source: "personal" | "quest" | "subtask";
  sourceLabel?: string;
  sourceId?: string;
  questId?: string;
  convertedToQuestId?: string | null;
  convertedToSubtaskId?: string | null;
  createdAt?: string;
  priority?: Priority;
  assignees?: { user_id: string; display_name: string | null; avatar_url: string | null }[];
  guildId?: string | null;
  guildName?: string | null;
  guildLogo?: string | null;
  questTitle?: string | null;
};

const COLUMNS: { key: string; label: string; color: string }[] = [
  { key: "BACKLOG", label: "Backlog", color: "border-muted-foreground/30 bg-muted/20" },
  { key: "TODO", label: "To do next", color: "border-blue-400/50 bg-blue-50/30 dark:bg-blue-950/20" },
  { key: "IN_PROGRESS", label: "In Progress", color: "border-amber-400/50 bg-amber-50/30 dark:bg-amber-950/20" },
  { key: "DONE", label: "Done", color: "border-emerald-400/50 bg-emerald-50/30 dark:bg-emerald-950/20" },
];

const PRIORITY_ICONS: Record<string, string> = {
  HIGH: "🔴",
  MEDIUM: "🟡",
  LOW: "🔵",
};

interface WorkTasksKanbanProps {
  tasks: UnifiedTask[];
  onStatusChange: (task: UnifiedTask, newStatus: string) => void;
  pendingDone: Map<string, { task: UnifiedTask; prevStatus: string }>;
  undoDone: (task: UnifiedTask) => void;
}

export function WorkTasksKanban({ tasks, onStatusChange, pendingDone, undoDone }: WorkTasksKanbanProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggingId(taskId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    if (draggingId) {
      const task = tasks.find((t) => t.id === draggingId);
      if (task && task.status !== status) {
        onStatusChange(task, status);
      }
    }
    setDraggingId(null);
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {COLUMNS.map((col) => {
        const colTasks = tasks.filter((t) => {
          const key = `${t.source}-${t.id}`;
          if (pendingDone.has(key)) return col.key === "DONE";
          return t.status === col.key;
        });

        return (
          <div
            key={col.key}
            className={cn(
              "rounded-xl border-2 p-3 min-h-[200px] transition-all",
              col.color,
              draggingId ? "border-dashed" : "",
            )}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, col.key)}
          >
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-display font-semibold text-sm">{col.label}</h4>
              <Badge variant="secondary" className="text-xs">{colTasks.length}</Badge>
            </div>
            <div className="space-y-2">
              {colTasks.map((task) => {
                const key = `${task.source}-${task.id}`;
                const isPendingDone = pendingDone.has(key);

                if (isPendingDone) {
                  return (
                    <motion.div
                      key={key}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm text-muted-foreground line-through truncate">{task.title}</span>
                        <Button variant="outline" size="sm" className="h-6 gap-1 text-[10px] shrink-0" onClick={() => undoDone(task)}>
                          <Undo2 className="h-3 w-3" /> Undo
                        </Button>
                      </div>
                    </motion.div>
                  );
                }

                const questLink = task.source === "quest"
                  ? `/quests/${task.sourceId || task.id}`
                  : task.source === "subtask"
                  ? `/quests/${task.questId}`
                  : null;

                return (
                  <motion.div
                    key={key}
                    draggable
                    onDragStart={(e) => handleDragStart(e as any, task.id)}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "rounded-lg border border-border bg-card p-3 cursor-grab active:cursor-grabbing hover:border-primary/30 transition-all",
                      draggingId === task.id && "opacity-50",
                    )}
                  >
                    {/* Title */}
                    {questLink ? (
                      <Link to={questLink} className="block">
                        <h5 className="font-medium text-sm mb-1.5 line-clamp-2">{task.title}</h5>
                      </Link>
                    ) : (
                      <h5 className="font-medium text-sm mb-1.5 line-clamp-2">{task.title}</h5>
                    )}

                    {/* Tags row */}
                    <div className="flex flex-wrap gap-1 mb-2">
                      {task.priority && task.priority !== "NONE" && (
                        <Badge variant="outline" className="text-[10px] gap-0.5">
                          {PRIORITY_ICONS[task.priority]} {task.priority.toLowerCase()}
                        </Badge>
                      )}
                      <Badge variant="secondary" className="text-[10px] capitalize">
                        {task.source}
                      </Badge>
                      {task.guildName && (
                        <GuildColorLabel name={task.guildName} logoUrl={task.guildLogo} className="text-[10px]" />
                      )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      {task.source === "subtask" && task.questTitle && (
                        <span className="flex items-center gap-1 truncate">
                          <Compass className="h-3 w-3 shrink-0" />
                          <span className="truncate">{task.questTitle.slice(0, 20)}</span>
                        </span>
                      )}
                      {task.source !== "subtask" && <span />}

                      {/* Assignees */}
                      {(task.assignees?.length ?? 0) > 0 && (
                        <div className="flex -space-x-1">
                          {task.assignees!.slice(0, 3).map((a) => (
                            <Avatar key={a.user_id} className="h-5 w-5 border border-background">
                              <AvatarImage src={a.avatar_url ?? undefined} />
                              <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                                {a.display_name?.[0]?.toUpperCase() || "?"}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
              {colTasks.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">No tasks</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
