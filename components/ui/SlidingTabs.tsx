"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

export interface SlidingTabItem<T extends string> {
  id: T;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
}

interface SlidingTabsProps<T extends string> {
  items: SlidingTabItem<T>[];
  value: T;
  onChange: (val: T) => void;
  className?: string;
}

/**
 * Adapted from 21st.dev Segmented Tabs (micka_design).
 * Smooth sliding active pill + subtle cursor hover highlight.
 */
export function SlidingTabs<T extends string>({
  items,
  value,
  onChange,
  className = "",
}: SlidingTabsProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [indicator, setIndicator] = useState({ left: 0, width: 0, ready: false });
  const [hoverRect, setHoverRect] = useState<{ left: number; width: number } | null>(null);

  const measure = () => {
    const container = containerRef.current;
    const activeBtn = btnRefs.current[value];
    if (!container || !activeBtn) return;
    const cRect = container.getBoundingClientRect();
    const bRect = activeBtn.getBoundingClientRect();
    setIndicator({
      left: bRect.left - cRect.left,
      width: bRect.width,
      ready: true,
    });
  };

  useLayoutEffect(() => {
    measure();
  }, [value, items.length]);

  useEffect(() => {
    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [value]);

  return (
    <div
      ref={containerRef}
      onMouseLeave={() => setHoverRect(null)}
      className={`relative grid rounded-2xl border border-slate-200 bg-white p-1 shadow-sm ${className}`}
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
    >
      {/* Fluid hover highlight */}
      {hoverRect && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-1 top-1 rounded-xl bg-kemenag-50/90 transition-all duration-200 ease-out"
          style={{ left: hoverRect.left, width: hoverRect.width }}
        />
      )}

      {/* Sliding active pill */}
      {indicator.ready && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-1 top-1 rounded-xl bg-kemenag-600 shadow-sm transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ left: indicator.left, width: indicator.width }}
        />
      )}

      {items.map((item) => {
        const Icon = item.icon;
        const active = item.id === value;
        return (
          <button
            key={item.id}
            ref={(el) => {
              btnRefs.current[item.id] = el;
            }}
            type="button"
            onClick={() => onChange(item.id)}
            onMouseEnter={(e) => {
              const container = containerRef.current;
              if (!container) return;
              const cRect = container.getBoundingClientRect();
              const bRect = e.currentTarget.getBoundingClientRect();
              setHoverRect({ left: bRect.left - cRect.left, width: bRect.width });
            }}
            className={`relative z-10 flex flex-col items-center justify-center gap-0.5 rounded-xl py-2 text-[11px] font-bold transition-colors duration-200 sm:flex-row sm:gap-1.5 sm:text-xs ${
              active ? "text-white" : "text-slate-600 hover:text-kemenag-900"
            }`}
          >
            {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
            <span className="truncate">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
