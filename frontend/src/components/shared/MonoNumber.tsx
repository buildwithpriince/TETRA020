import { useEffect, useRef, useState } from 'react';

interface MonoNumberProps {
  value: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
  decimals?: number;
  className?: string;
  animate?: boolean;
}

/** A numeric value in IBM Plex Mono with an optional scroll-triggered count-up. */
export function MonoNumber({
  value,
  suffix = '',
  prefix = '',
  duration = 1.2,
  decimals = 0,
  className = '',
  animate = true,
}: MonoNumberProps) {
  const [display, setDisplay] = useState(animate ? 0 : value);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    if (!animate) {
      setDisplay(value);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !started.current) {
          started.current = true;
          const start = performance.now();
          const tick = (now: number) => {
            const t = Math.min((now - start) / (duration * 1000), 1);
            const eased = 1 - Math.pow(1 - t, 3);
            setDisplay(value * eased);
            if (t < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.4 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [value, animate, duration]);

  return (
    <span ref={ref} className={`font-mono-num tabular-nums ${className}`}>
      {prefix}
      {display.toLocaleString('en-IN', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </span>
  );
}
