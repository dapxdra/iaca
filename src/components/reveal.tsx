"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Realza su contenido con un rise sutil al entrar al viewport. Enfoque de
 * mejora progresiva: el contenido SIEMPRE está visible (opacity 1); si hay
 * JS + movimiento permitido, se reproduce una animación de entrada una sola
 * vez. Sin JS o con `prefers-reduced-motion`, simplemente aparece.
 */
export function Reveal({
  children,
  delay = 0,
  as: Tag = "div",
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  as?: React.ElementType;
  className?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      data-reveal={shown ? "in" : "armed"}
      className={`reveal-target ${className}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </Tag>
  );
}
