"use client";

// Placeholder for T9 (flying monk + breathing + singing bowl). Kept as its own component so
// the matching screen does not change when the game lands.
export default function FlyingMonk() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6">
      <img src="/mascot.png" alt="SuperMonk flying" className="w-56 animate-pulse" />
      <p className="text-xl text-cream">Finding your monk…</p>
    </div>
  );
}
