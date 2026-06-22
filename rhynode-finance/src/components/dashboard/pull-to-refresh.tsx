"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";
import { ArrowDown, Loader2 } from "lucide-react";

const MOBILE_BREAKPOINT = 768;
const PULL_THRESHOLD = 96;
const MAX_PULL_DISTANCE = 140;
const RESISTANCE = 0.55;

interface PullToRefreshProps {
  children: ReactNode;
  onRefresh?: () => void | Promise<void>;
  className?: string;
}

function isHorizontalScroller(element: Element | null): boolean {
  if (!element || element === document.body || element === document.documentElement) return false;
  const style = window.getComputedStyle(element);
  const overflowX = style.overflowX;
  if (overflowX === "auto" || overflowX === "scroll") {
    return element.scrollWidth > element.clientWidth;
  }
  return isHorizontalScroller(element.parentElement);
}

function shouldIgnoreTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  if (["input", "textarea", "select"].includes(tag)) return true;
  if (target.isContentEditable) return true;
  if (target.closest("[data-no-pull]")) return true;
  return false;
}

function getScrollTop(): number {
  return (
    window.scrollY ??
    document.documentElement.scrollTop ??
    document.body.scrollTop ??
    0
  );
}

export function PullToRefresh({ children, onRefresh, className }: PullToRefreshProps) {
  const t = useTranslations("dashboard.common.pullToRefresh");
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const startXRef = useRef(0);
  const pullingRef = useRef(false);
  const willRefreshRef = useRef(false);

  const [enabled, setEnabled] = useState(false);
  const [distance, setDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [willRefresh, setWillRefresh] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const check = () => setEnabled(window.innerWidth < MOBILE_BREAKPOINT);
    check();

    window.addEventListener("resize", check, { passive: true });
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    if (!enabled || typeof window === "undefined" || refreshing) return;

    function reset() {
      pullingRef.current = false;
      willRefreshRef.current = false;
      setWillRefresh(false);
      setDistance(0);
    }

    async function triggerRefresh() {
      setRefreshing(true);
      try {
        if (onRefresh) {
          await onRefresh();
        } else {
          router.refresh();
        }
      } catch (error) {
        logger.error("Pull-to-refresh failed", { error });
      } finally {
        window.setTimeout(() => {
          setRefreshing(false);
          reset();
        }, 400);
      }
    }

    function handleTouchStart(e: globalThis.TouchEvent) {
      if (refreshing) return;
      const touch = e.touches[0];
      if (!touch) return;

      if (shouldIgnoreTarget(e.target)) return;
      if (getScrollTop() > 0) return;

      startYRef.current = touch.clientY;
      startXRef.current = touch.clientX;
      pullingRef.current = true;
    }

    function handleTouchMove(e: globalThis.TouchEvent) {
      if (!pullingRef.current || refreshing) return;

      const touch = e.touches[0];
      if (!touch) return;

      const deltaY = touch.clientY - startYRef.current;
      const deltaX = touch.clientX - startXRef.current;

      // Abort if the gesture is clearly horizontal or inside an active horizontal scroller.
      if (Math.abs(deltaX) > Math.abs(deltaY) || Math.abs(deltaX) > 12) {
        pullingRef.current = false;
        setDistance(0);
        willRefreshRef.current = false;
        setWillRefresh(false);
        return;
      }

      const target = e.target as HTMLElement | null;
      if (target) {
        if (target.closest("[data-no-pull]")) {
          pullingRef.current = false;
          return;
        }

        if (isHorizontalScroller(target)) {
          const ancestor = target.closest('[style*="overflow-x"]') || target.closest(".overflow-x-auto");
          if (ancestor && ancestor.scrollLeft !== 0) {
            pullingRef.current = false;
            setDistance(0);
            willRefreshRef.current = false;
            setWillRefresh(false);
            return;
          }
        }
      }

      if (deltaY <= 0) {
        setDistance(0);
        willRefreshRef.current = false;
        setWillRefresh(false);
        return;
      }

      if (deltaY > 8) {
        e.preventDefault();
      }

      const damped = Math.min(deltaY * RESISTANCE, MAX_PULL_DISTANCE);
      willRefreshRef.current = damped >= PULL_THRESHOLD;
      setWillRefresh(willRefreshRef.current);
      setDistance(damped);
    }

    function handleTouchEnd() {
      if (!pullingRef.current) return;
      pullingRef.current = false;

      if (willRefreshRef.current) {
        void triggerRefresh();
      } else {
        reset();
      }
    }

    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("touchstart", handleTouchStart, { passive: true });
    container.addEventListener("touchmove", handleTouchMove, { passive: false });
    container.addEventListener("touchend", handleTouchEnd, { passive: true });
    container.addEventListener("touchcancel", handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
      container.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [enabled, onRefresh, refreshing, router]);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {enabled && (
        <div
          aria-hidden={!refreshing && distance <= 0 ? "true" : "false"}
          className={cn(
            "fixed inset-x-0 top-14 z-40 flex items-end justify-center overflow-hidden",
            refreshing ? "duration-300" : "duration-150"
          )}
          style={{ height: `${distance}px` }}
        >
          <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card/95 shadow-sm backdrop-blur-sm">
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary" aria-label={t("updating")} />
            ) : (
              <ArrowDown
                className={cn(
                  "h-4 w-4 text-primary transition-transform duration-150",
                  willRefresh && "rotate-180"
                )}
                aria-hidden="true"
              />
            )}
          </div>
        </div>
      )}
      {children}
    </div>
  );
}
