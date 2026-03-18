import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Undo2 } from "lucide-react";
import { CurrencyIcon } from "@/components/CurrencyIcon";
import { PriorityPicker, type Priority } from "@/components/PriorityPicker";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const COLUMNS = [
  { key: "BACKLOG", label: "Backlog", color: "border-muted-foreground/30 bg-muted/20" },
  { key: "TODO", label: "To do next", color: "border-blue-400/50 bg-blue-50/30 dark:bg-blue-950/20" },
  { key: "IN_PROGRESS", label: "In Progress", color: "border-amber-400/50 bg-amber-50/30 dark:bg-amber-950/20" },
  { key: "DONE", label: "Done", color: "border-emerald-400/50 bg-emerald-50/30 dark:bg-emerald-950/20" },
] as const;

interface SubtasksKanbanViewProps {
  subtasks: any[];
  pendingDone: Map<string, string>;
  onStatusChange: (subtaskId: string, newStatus: string, currentStatus: string) => void;
  onUndoDone: (subtaskId: string) => void;
  canEditSubtask: (subtask: any) => boolean;
}

export function SubtasksKanbanView({
  subtasks,
  pendingDone,
  onStatusChange,
  onUndoDone,
  canEditSubtask,
}: SubtasksKanbanViewProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggingId(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    if (!draggingId) return;
    const task = subtasks.find((s) => s.id === draggingId);
    if (task && task.status !== status && canEditSubtask(task)) {
      onStatusChange(task.id, status, task.status);
    }
    setDraggingId(null);
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {COLUMNS.map((col) => {
        const colTasks = subtasks.filter((s) => {
          if (pendingDone.has(s.id)) return col.key === "DONE";
          return s.status === col.key;
        });

        return (
          <div
            key={col.key}
            className={cn(
              "rounded-xl border-2 p-3 min-h-[150px] transition-all",
              col.color,
              draggingId ? "border-dashed" : "",
            )}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, col.key)}
          >
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-display font-semibold text-xs">{col.label}</h4>
              <Badge variant="secondary" className="text-[10px]">{colTasks.length}</Badge>
            </div>
            <div className="space-y-2">
              {colTasks.map((subtask) => {
                const isPending = pendingDone.has(subtask.id);

                if (isPending) {
                  return (
                    <motion.div
                      key={subtask.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-muted-foreground line-through truncate">{subtask.title}</span>
                        <Button variant="outline" size="sm" className="h-5 gap-1 text-[10px] shrink-0" onClick={() => onUndoDone(subtask.id)}>
                          <Undo2 className="h-2.5 w-2.5" /> Undo
                        </Button>
                      </div>
                    </motion.div>
                  );
                }

                return (
                  <motion.div
                    key={subtask.id}
                    draggable={canEditSubtask(subtask)}
                    onDragStart={(e) => handleDragStart(e as any, subtask.id)}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "rounded-lg border border-border bg-card p-2.5 hover:border-primary/30 transition-all",
                      canEditSubtask(subtask) && "cursor-grab active:cursor-grabbing",
                      draggingId === subtask.id && "opacity-50",
                    )}
                  >
                    <h5 className={cn(
                      "font-medium text-xs mb-1.5 line-clamp-2",
                      subtask.status === "DONE" && "line-through text-muted-foreground"
                    )}>
                      {subtask.title}
                    </h5>

                    <div className="flex flex-wrap gap-1 mb-1.5">
                      {subtask.priority && subtask.priority !== "NONE" && (
                        <Badge variant="outline" className="text-[9px] px-1 py-0">
                          {subtask.priority === "HIGH" ? "🔴" : subtask.priority === "MEDIUM" ? "🟡" : "🔵"} {subtask.priority.toLowerCase()}
                        </Badge>
                      )}
                      {(subtask.ctg_reward ?? 0) > 0 && (
                        <Badge variant="outline" className="text-[9px] px-1 py-0 gap-0.5">
                          <CurrencyIcon currency="ctg" className="h-2.5 w-2.5" /> {subtask.ctg_reward}
                        </Badge>
                      )}
                    </div>

                    {subtask.assignees?.length > 0 && (
                      <div className="flex -space-x-1">
                        {subtask.assignees.slice(0, 3).map((a: any) => (
                          <Avatar key={a.user_id} className="h-4 w-4 border border-background">
                            <AvatarImage src={a.avatar_url} />
                            <AvatarFallback className="text-[7px]">{a.name?.[0]}</AvatarFallback>
                          </Avatar>
                        ))}
                      </div>
                    )}
                  </motion.div>
                );
              })}
              {colTasks.length === 0 && (
                <p className="text-[10px] text-muted-foreground text-center py-3">No tasks</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
