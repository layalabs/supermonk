import type { VerifyTier } from "@/lib/verify/types";

const LABEL: Record<VerifyTier, string> = { 0: "Not verified", 1: "Phone verified", 2: "Verified host" };
const STYLE: Record<VerifyTier, string> = {
  0: "text-muted ring-1 ring-navy/15",
  1: "bg-mist/40 text-navy",
  2: "bg-saffron text-navy",
};

/** Public mirror of the server's VERIFY_REQUIRED flag (lib/verify/index.ts); inlined by Next at build time. */
export const verifyRequiredPublic = (env: NodeJS.ProcessEnv = process.env): boolean => env.NEXT_PUBLIC_VERIFY_REQUIRED === "1";

/**
 * Small pill for invite lists and the confirmation card. `level` comes from /api/verify/status.
 * "Not verified" is only worth showing when verification gates invites; with the gate off it
 * reads as a warning on the happy path, so level 0 renders nothing.
 */
export default function VerifiedBadge({ level, className = "" }: { level: VerifyTier | undefined; className?: string }) {
  if (level === undefined) return null;
  if (level === 0 && !verifyRequiredPublic()) return null;
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${STYLE[level]} ${className}`}>
      {level > 0 ? (
        <span aria-hidden>{level === 2 ? "✓" : "☎"}</span>
      ) : null}
      {LABEL[level]}
    </span>
  );
}
