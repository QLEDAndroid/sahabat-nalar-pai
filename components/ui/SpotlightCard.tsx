"use client";

import { useEffect, useRef, type ComponentProps, type CSSProperties } from "react";

const RING_MASK =
  "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)";

interface SpotlightCardProps extends ComponentProps<"div"> {
  size?: number;
  color?: string;
  ring?: boolean;
}

/**
 * Adapted from 21st.dev Spotlight (kevingirelli).
 * Zero-rerender pointer-tracking radial light & edge ring using CSS variables.
 */
export function SpotlightCard({
  size = 300,
  color = "#008A52",
  ring = true,
  className = "",
  children,
  onPointerMove,
  ...props
}: SpotlightCardProps) {
  const frame = useRef(0);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  const circle = `${size}px circle at var(--spotlight-x, 50%) var(--spotlight-y, 50%)`;
  const ringStyle: CSSProperties = {
    background: `radial-gradient(${circle}, color-mix(in oklab, ${color} 42%, transparent), transparent 62%)`,
    mask: RING_MASK,
    maskComposite: "exclude",
    WebkitMask: RING_MASK,
    WebkitMaskComposite: "xor",
  };

  return (
    <div
      className={`group/spotlight relative isolate overflow-hidden transition-transform duration-300 ease-out hover:-translate-y-0.5 ${className}`}
      onPointerMove={(event) => {
        onPointerMove?.(event);
        if (event.pointerType === "touch") return;
        const target = event.currentTarget;
        const { clientX, clientY } = event;
        cancelAnimationFrame(frame.current);
        frame.current = requestAnimationFrame(() => {
          const bounds = target.getBoundingClientRect();
          target.style.setProperty("--spotlight-x", `${clientX - bounds.left}px`);
          target.style.setProperty("--spotlight-y", `${clientY - bounds.top}px`);
        });
      }}
      {...props}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover/spotlight:opacity-100"
        style={{
          background: `radial-gradient(${circle}, color-mix(in oklab, ${color} 12%, transparent), transparent 70%)`,
        }}
      />
      {ring && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -inset-px -z-10 rounded-[inherit] p-px opacity-0 transition-opacity duration-300 group-hover/spotlight:opacity-100"
          style={ringStyle}
        />
      )}
      {children}
    </div>
  );
}
