"use client";

import { useEffect, useState, type RefObject } from "react";

// True while the element is on screen and the tab is visible. The scene freezes its
// animations and timers otherwise, so an idle home page costs nothing.
export function useActive(ref: RefObject<HTMLElement | null>): boolean {
  const [visible, setVisible] = useState(true);
  const [tabShown, setTabShown] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.05 });
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);

  useEffect(() => {
    const onChange = () => setTabShown(document.visibilityState !== "hidden");
    onChange();
    document.addEventListener("visibilitychange", onChange);
    return () => document.removeEventListener("visibilitychange", onChange);
  }, []);

  return visible && tabShown;
}
