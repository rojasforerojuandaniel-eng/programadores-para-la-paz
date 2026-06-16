"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
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
import { GripVertical, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";
import {
  buildDefaultLayout,
  normalizeLayout,
  type WidgetLayoutItem,
  type DashboardWidget,
} from "@/lib/widgets";

const WidgetSettings = dynamic(() => import("./widget-settings").then((mod) => mod.WidgetSettings), {
  ssr: false,
});

interface DraggableDashboardProps {
  initialLayout: WidgetLayoutItem[];
  widgets: DashboardWidget[];
}

interface SortableWidgetProps {
  id: string;
  children: React.ReactNode;
}

function SortableWidget({ id, children }: SortableWidgetProps) {
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
        "group relative flex items-start gap-2 rounded-xl",
        isDragging && "opacity-50"
      )}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="touch-none rounded-md p-1.5 text-muted-foreground opacity-100 transition-opacity hover:bg-muted hover:text-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring md:opacity-0 md:group-hover:opacity-100"
        aria-label="Arrastrar widget"
      >
        <GripVertical className="h-5 w-5" />
      </button>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-40 animate-pulse rounded-xl bg-muted" />
      ))}
    </div>
  );
}

function DashboardEmptyState({ onOpenSettings }: { onOpenSettings: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-border p-12 text-center">
      <p className="text-lg font-medium">Todos los widgets están ocultos</p>
      <p className="text-sm text-muted-foreground">
        Abre la configuración para mostrar widgets en tu dashboard.
      </p>
      <button
        type="button"
        onClick={onOpenSettings}
        className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Personalizar widgets
      </button>
    </div>
  );
}

function debounce<T extends (...args: Parameters<T>) => ReturnType<T>>(
  fn: T,
  delay: number
) {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      fn(...args);
    }, delay);
  };
}

export function DraggableDashboard({
  initialLayout,
  widgets,
}: DraggableDashboardProps) {
  const [layout, setLayout] = useState(initialLayout);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    async function syncLayout() {
      try {
        const res = await fetch("/api/personal/widgets");
        if (!res.ok) throw new Error("Failed to fetch widgets");
        const data = await res.json();
        if (Array.isArray(data.widgets)) {
          setLayout(normalizeLayout(data.widgets));
        }
      } catch (error) {
        console.error("Failed to sync widget layout:", error);
      } finally {
        setIsLoading(false);
      }
    }
    syncLayout();
  }, []);

  const saveLayout = useCallback(async (newLayout: WidgetLayoutItem[]) => {
    setIsSyncing(true);
    try {
      const res = await fetch("/api/personal/widgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ layout: newLayout }),
      });
      if (!res.ok) throw new Error("Failed to save widgets");
      const data = await res.json();
      if (Array.isArray(data.widgets)) {
        setLayout(normalizeLayout(data.widgets));
      }
    } catch (error) {
      console.error("Failed to save widget layout:", error);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const debouncedSaveLayout = useMemo(
    () => debounce(saveLayout, 400),
    [saveLayout]
  );

  const handleLayoutChange = useCallback(
    (newLayout: WidgetLayoutItem[]) => {
      const normalized = normalizeLayout(newLayout);
      setLayout(normalized);
      debouncedSaveLayout(normalized);
    },
    [debouncedSaveLayout]
  );

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

      setLayout((prev) => {
        const oldIndex = prev.findIndex((item) => item.id === active.id);
        const newIndex = prev.findIndex((item) => item.id === over.id);
        const moved = arrayMove(prev, oldIndex, newIndex);
        const normalized = normalizeLayout(moved);
        debouncedSaveLayout(normalized);
        return normalized;
      });
    },
    [debouncedSaveLayout]
  );

  const visibleWidgets = useMemo(() => {
    const layoutById = new Map(layout.map((item) => [item.id, item]));
    return widgets
      .filter((widget) => layoutById.get(widget.id)?.visible !== false)
      .sort(
        (a, b) =>
          (layoutById.get(a.id)?.order ?? 0) - (layoutById.get(b.id)?.order ?? 0)
      );
  }, [layout, widgets]);

  const handleSettingsReorder = useCallback(
    (newLayout: WidgetLayoutItem[]) => {
      handleLayoutChange(newLayout);
    },
    [handleLayoutChange]
  );

  const handleReset = useCallback(() => {
    handleLayoutChange(buildDefaultLayout());
  }, [handleLayoutChange]);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end gap-2">
        {isSyncing && (
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Guardando...
          </span>
        )}
        <WidgetSettings
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          layout={layout}
          widgets={widgets}
          onChange={handleSettingsReorder}
          onReset={handleReset}
        />
      </div>

      {visibleWidgets.length === 0 ? (
        <DashboardEmptyState onOpenSettings={() => setSettingsOpen(true)} />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={visibleWidgets.map((widget) => widget.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-6">
              {visibleWidgets.map((widget) => (
                <SortableWidget key={widget.id} id={widget.id}>
                  {widget.content}
                </SortableWidget>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
