"use client";

import { useEffect, useRef, useState } from "react";

interface NumberTickerProps {
  value: number;
  duration?: number;
  className?: string;
}

export function NumberTicker({
  value,
  duration = 550,
  className = "",
}: NumberTickerProps) {
  const [display, setDisplay] = useState(value);
  const prevRef = useRef(value);

  useEffect(() => {
    const startVal = prevRef.current;
    const diff = value - startVal;
    if (diff === 0) return;

    let raf = 0;
    const startTime = performance.now();

    const tick = (now: number) => {
      const progress = Math.min(1, (now - startTime) / duration);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(startVal + diff * eased));
      if (progress < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        prevRef.current = value;
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return <span className={className}>{display.toLocaleString("id-ID")}</span>;
}
