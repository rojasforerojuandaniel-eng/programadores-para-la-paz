"use client";

import * as React from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { XIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface BottomSheetContextValue {
  onOpenChange?: (open: boolean) => void;
}

const BottomSheetContext = React.createContext<BottomSheetContextValue | null>(null);

function useBottomSheetContext() {
  const ctx = React.useContext(BottomSheetContext);
  if (!ctx) {
    throw new Error("BottomSheet compound components must be used inside <BottomSheet>");
  }
  return ctx;
}

function BottomSheet({ children, ...props }: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return (
    <BottomSheetContext.Provider value={{ onOpenChange: props.onOpenChange }}>
      <DialogPrimitive.Root data-slot="bottom-sheet" {...props}>
        {children}
      </DialogPrimitive.Root>
    </BottomSheetContext.Provider>
  );
}

function BottomSheetTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="bottom-sheet-trigger" {...props} />;
}

function BottomSheetClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="bottom-sheet-close" {...props} />;
}

function BottomSheetOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="bottom-sheet-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-black/50 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0",
        className
      )}
      {...props}
    />
  );
}

const DRAG_THRESHOLD = 80;

function BottomSheetContent({
  className,
  children,
  showCloseButton = true,
  snapPoints,
  side = "bottom",
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean;
  snapPoints?: string[];
  side?: "bottom" | "right";
}) {
  const { onOpenChange } = useBottomSheetContext();
  const [dragOffset, setDragOffset] = React.useState(0);
  const [isDragging, setIsDragging] = React.useState(false);
  const dragStartY = React.useRef(0);
  const currentOffset = React.useRef(0);
  const handleRef = React.useRef<HTMLDivElement>(null);

  const maxHeight = snapPoints && snapPoints.length > 0 ? snapPoints[0] : "85dvh";

  const handlePointerDown = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (side !== "bottom") return;
      event.preventDefault();
      dragStartY.current = event.clientY;
      currentOffset.current = dragOffset;
      setIsDragging(true);
      handleRef.current?.setPointerCapture(event.pointerId);
    },
    [dragOffset, side]
  );

  const handlePointerMove = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging || side !== "bottom") return;
      const delta = event.clientY - dragStartY.current + currentOffset.current;
      setDragOffset(Math.max(0, delta));
    },
    [isDragging, side]
  );

  const handlePointerUp = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging || side !== "bottom") return;
      setIsDragging(false);
      handleRef.current?.releasePointerCapture(event.pointerId);
      const offset = event.clientY - dragStartY.current + currentOffset.current;
      if (offset > DRAG_THRESHOLD) {
        setDragOffset(0);
        onOpenChange?.(false);
      } else {
        setDragOffset(0);
      }
    },
    [isDragging, onOpenChange, side]
  );

  return (
    <DialogPrimitive.Portal data-slot="bottom-sheet-portal">
      <BottomSheetOverlay />
      <DialogPrimitive.Content
        data-slot="bottom-sheet-content"
        className={cn(
          "fixed z-50 flex outline-none data-[state=closed]:animate-out data-[state=open]:animate-in",
          side === "bottom" &&
            "inset-x-0 bottom-0 justify-center data-[state=closed]:duration-200 data-[state=open]:duration-500 data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
          side === "right" &&
            "inset-y-0 right-0 justify-end data-[state=closed]:duration-200 data-[state=open]:duration-500 data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
          className
        )}
        {...props}
      >
        <div
          className={cn(
            "relative flex w-full flex-col overflow-hidden bg-background shadow-xl",
            side === "bottom" &&
              "mx-auto max-w-[calc(100%-1rem)] rounded-t-2xl border-t sm:max-w-lg",
            side === "right" &&
              "h-full w-3/4 max-w-sm rounded-l-2xl rounded-tr-none border-l"
          )}
          style={{ maxHeight: side === "bottom" ? maxHeight : undefined, transform: `translateY(${dragOffset}px)` }}
        >
          {side === "bottom" && (
            <div
              ref={handleRef}
              aria-label="Cerrar arrastrando hacia abajo"
              tabIndex={-1}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              className={cn(
                "flex shrink-0 cursor-grab items-center justify-center py-3 active:cursor-grabbing touch-none select-none",
                isDragging && "cursor-grabbing"
              )}
            >
              <span className="h-1.5 w-10 rounded-full bg-muted-foreground/40" />
            </div>
          )}

          {showCloseButton && (
            <DialogPrimitive.Close
              className="absolute top-3 right-3 z-10 rounded-xs p-1 opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label="Cerrar"
            >
              <XIcon className="h-5 w-5" />
              <span className="sr-only">Cerrar</span>
            </DialogPrimitive.Close>
          )}

          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-6 sm:px-6">
            {children}
          </div>
        </div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

function BottomSheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="bottom-sheet-header"
      className={cn("flex flex-col gap-1.5 pb-4 pr-8", className)}
      {...props}
    />
  );
}

function BottomSheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="bottom-sheet-footer"
      className={cn("mt-auto flex flex-col-reverse gap-2 pt-4 sm:flex-row sm:justify-end", className)}
      {...props}
    />
  );
}

function BottomSheetTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="bottom-sheet-title"
      className={cn("text-lg font-semibold leading-none", className)}
      {...props}
    />
  );
}

function BottomSheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="bottom-sheet-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

export {
  BottomSheet,
  BottomSheetTrigger,
  BottomSheetClose,
  BottomSheetContent,
  BottomSheetHeader,
  BottomSheetFooter,
  BottomSheetTitle,
  BottomSheetDescription,
};
