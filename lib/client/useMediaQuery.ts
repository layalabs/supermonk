"use client";

import { useEffect, useState } from "react";

/** True when `query` matches. Always false on the server and on the first client render (no hydration mismatch). */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const update = () => setMatches(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, [query]);
  return matches;
}

/** Tailwind `lg` (app/globals.css sets --breakpoint-lg: 64rem). */
export const LG_QUERY = "(min-width: 64rem)";
