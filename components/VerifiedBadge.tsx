import type { VerifyTier } from "@/lib/verify/types";

const LABEL: Record<VerifyTier, string> = { 0: "Not verified", 1: "Phone verified", 2: "Verified host" };
const STYLE: Record<VerifyTier, string> = {
  0: "text-muted ring-1 ring-cream/15",
  1: "bg-cream/15 text-cream",
  2: "bg-saffron text-navy",
};

/** Small pill for invite lists and the confirmation card. `level` comes from /api/verify/status. */
export default function VerifiedBadge({ level, className = "" }: { level: VerifyTier | undefined; className?: string }) {
  if (level === undefined) return null;
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${STYLE[level]} ${className}`}>
      {level > 0 ? (
        <span aria-hidden>{level === 2 ? "✓" : "☎"}</span>
      ) : null}
      {LABEL[level]}
    </span>
  );
}
