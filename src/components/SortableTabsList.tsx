import { useState, type ReactNode } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GripVertical, Pencil, Check, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface TabDefinition {
  value: string;
  label: ReactNode;
  /** If false, tab is hidden (e.g. conditional tabs) */
  visible?: boolean;
}

interface SortableTabsListProps {
  tabs: TabDefinition[];
  orderedKeys: string[];
  onReorder: (newOrder: string[]) => void;
  onReset?: () => void;
  isCustomized?: boolean;
  className?: string;
}

function SortableTab({
  tab,
  isEditing,
}: {
  tab: TabDefinition;
  isEditing: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tab.value, disabled: !isEditing });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.7 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn("flex items-center", isDragging && "shadow-lg rounded-md")}
    >
      {isEditing && (
        <span
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing px-0.5 text-muted-foreground hover:text-foreground touch-none"
        >
          <GripVertical className="h-3 w-3" />
        </span>
      )}
      <TabsTrigger value={tab.value} className={cn(isEditing && "pointer-events-none")}>
        {tab.label}
      </TabsTrigger>
    </div>
  );
}

export function SortableTabsList({
  tabs,
  orderedKeys,
  onReorder,
  onReset,
  isCustomized,
  className,
}: SortableTabsListProps) {
  const [isEditing, setIsEditing] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Only show visible tabs, in the user's preferred order
  const visibleTabs = tabs.filter((t) => t.visible !== false);
  const visibleKeys = visibleTabs.map((t) => t.value);

  // Sort visible tabs by orderedKeys, keeping any unordered ones at end
  const sortedTabs = [...visibleTabs].sort((a, b) => {
    const ai = orderedKeys.indexOf(a.value);
    const bi = orderedKeys.indexOf(b.value);
    if (ai === -1 && bi === -1) return 0;
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const currentOrder = sortedTabs.map((t) => t.value);
    const oldIndex = currentOrder.indexOf(active.id as string);
    const newIndex = currentOrder.indexOf(over.id as string);
    const newOrder = arrayMove(currentOrder, oldIndex, newIndex);
    onReorder(newOrder);
  };

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={sortedTabs.map((t) => t.value)}
          strategy={horizontalListSortingStrategy}
        >
          <TabsList className={cn(isEditing && "ring-2 ring-primary/20 ring-offset-1")}>
            {sortedTabs.map((tab) => (
              <SortableTab key={tab.value} tab={tab} isEditing={isEditing} />
            ))}
          </TabsList>
        </SortableContext>
      </DndContext>

      <div className="flex items-center gap-0.5 ml-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => setIsEditing(!isEditing)}
          title={isEditing ? "Done editing tabs" : "Reorder tabs"}
        >
          {isEditing ? (
            <Check className="h-3.5 w-3.5 text-primary" />
          ) : (
            <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover/tabs:opacity-100 hover:!opacity-100 transition-opacity" />
          )}
        </Button>
        {isEditing && isCustomized && onReset && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => {
              onReset();
              setIsEditing(false);
            }}
            title="Reset to default order"
          >
            <RotateCcw className="h-3 w-3 text-muted-foreground" />
          </Button>
        )}
      </div>
    </div>
  );
}
