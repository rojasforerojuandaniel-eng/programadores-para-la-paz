"use client";

import { useState, useCallback, useMemo } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Settings, GripVertical, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { buildDefaultLayout, type WidgetLayoutItem, type DashboardWidget } from "@/lib/widgets";

interface WidgetSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  layout: WidgetLayoutItem[];
  widgets: DashboardWidget[];
  onChange: (layout: WidgetLayoutItem[]) => void;
  onReset: () => void;
}

interface SortableSettingsItemProps {
  id: string;
  label: string;
  visible: boolean;
  onToggle: () => void;
}

function SortableSettingsItem({
  id,
  label,
  visible,
  onToggle,
}: SortableSettingsItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-3 rounded-lg border border-border p-3",
        isDragging && "opacity-50"
      )}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="touch-none rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Arrastrar para reordenar"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <Switch id={`widget-${id}`} checked={visible} onCheckedChange={onToggle} />
      <Label
        htmlFor={`widget-${id}`}
        className="flex-1 cursor-pointer text-sm font-medium"
      >
        {label}
      </Label>
    </div>
  );
}

export function WidgetSettings({
  open,
  onOpenChange,
  layout,
  widgets,
  onChange,
  onReset,
}: WidgetSettingsProps) {
  const [localLayout, setLocalLayout] = useState(layout);

  // Reset local layout when dialog opens so it reflects current state
  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) {
        setLocalLayout(layout);
      }
      onOpenChange(nextOpen);
    },
    [layout, onOpenChange]
  );

  const orderedItems = useMemo(() => {
    const layoutById = new Map(localLayout.map((item) => [item.id, item]));
    return widgets
      .filter((widget) => layoutById.has(widget.id))
      .sort(
        (a, b) =>
          (layoutById.get(a.id)?.order ?? 0) - (layoutById.get(b.id)?.order ?? 0)
      );
  }, [localLayout, widgets]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      setLocalLayout((prev) => {
        const oldIndex = prev.findIndex((item) => item.id === active.id);
        const newIndex = prev.findIndex((item) => item.id === over.id);
        const moved = arrayMove(prev, oldIndex, newIndex).map(
          (item, index) => ({
            ...item,
            order: index,
          })
        );
        onChange(moved);
        return moved;
      });
    },
    [onChange]
  );

  const toggleWidget = useCallback(
    (id: string) => {
      setLocalLayout((prev) => {
        const next = prev.map((item) =>
          item.id === id ? { ...item, visible: !item.visible } : item
        );
        onChange(next);
        return next;
      });
    },
    [onChange]
  );

  const handleReset = useCallback(() => {
    const defaults = buildDefaultLayout();
    setLocalLayout(defaults);
    onReset();
  }, [onReset]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings className="h-4 w-4" />
          Widgets
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="heading-card">Personalizar Widgets</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <p className="text-sm text-muted-foreground">
            Arrastra los widgets para reordenarlos y usa el switch para mostrar u ocultar.
          </p>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={orderedItems.map((widget) => widget.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {orderedItems.map((widget) => {
                  const item = localLayout.find((l) => l.id === widget.id);
                  if (!item) return null;
                  return (
                    <SortableSettingsItem
                      key={widget.id}
                      id={widget.id}
                      label={widget.label}
                      visible={item.visible}
                      onToggle={() => toggleWidget(widget.id)}
                    />
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              className="gap-2"
              onClick={handleReset}
            >
              <RotateCcw className="h-4 w-4" />
              Restaurar defaults
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
