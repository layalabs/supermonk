import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

// Dumb building blocks. Colours come from the @theme tokens in app/globals.css.

/** Keyboard focus ring shared by every control. Ember, not saffron: saffron on cream is 1.99:1. */
export const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember focus-visible:ring-offset-2 ring-offset-cream";

export function PrimaryButton({ className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  // Disabled keeps the label at full ink on a flat pale saffron (navy on saffron/40 over cream: 11.5:1).
  // Fading the whole button washed the label out on a projector; opacity-70 only reaches 2.9:1 on the orange end.
  // `bg-none!` is needed because .bg-brand lives outside Tailwind's utilities layer.
  return (
    <button
      aria-disabled={props.disabled || undefined}
      {...props}
      className={`bg-brand w-full rounded-card px-5 py-4 text-lg font-semibold text-navy shadow-lg shadow-orange/20 transition hover:brightness-105 active:scale-[0.98] disabled:pointer-events-none disabled:bg-none! disabled:bg-saffron/40 disabled:shadow-none ${FOCUS_RING} ${className}`}
    />
  );
}

export function GhostButton({ className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`w-full rounded-card border border-navy/15 bg-navy-2 px-5 py-3 text-base text-navy transition hover:border-navy/30 active:scale-[0.98] disabled:opacity-40 ${FOCUS_RING} ${className}`}
    />
  );
}

export function Pill({ active, className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      aria-pressed={active}
      {...props}
      className={`min-h-11 shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition active:scale-95 disabled:opacity-40 ${FOCUS_RING} ${
        active ? "border-saffron bg-saffron text-navy" : "border-saffron/50 bg-navy-2 text-navy hover:bg-saffron/15"
      } ${className}`}
    />
  );
}

/** Two-to-four-way view switcher (Grid | Map). Buttons carry aria-pressed; the group is labelled. */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  className = "",
}: {
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (v: T) => void;
  label: string;
  className?: string;
}) {
  return (
    <div role="group" aria-label={label} className={`inline-flex shrink-0 rounded-full bg-navy/5 p-1 ring-1 ring-navy/10 ${className}`}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(o.value)}
            className={`min-h-11 rounded-full px-4 py-1.5 text-sm font-semibold transition lg:min-h-0 ${FOCUS_RING} ${
              on ? "bg-navy-2 text-navy shadow-sm shadow-navy/10" : "text-muted hover:text-navy"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-card bg-navy-2 p-4 shadow-sm shadow-navy/5 ring-1 ring-navy/10 ${className}`}>{children}</div>;
}

export function Header({ title, back }: { title?: string; back?: string }) {
  return (
    <header className="mb-4 flex items-center gap-3">
      {back ? (
        <Link href={back} aria-label="Back" className={`-ml-2 flex min-h-11 min-w-11 items-center justify-center rounded-full text-2xl text-muted hover:text-navy ${FOCUS_RING}`}>
          ‹
        </Link>
      ) : null}
      <Link href="/" aria-label="SuperMonk home" className={`flex items-center gap-2 rounded-lg ${FOCUS_RING}`}>
        <img src="/icons/icon-192.png" alt="" className="h-8 w-8 rounded-lg" />
        {title ? null : <span className="text-lg font-bold">Super<span className="text-brand">Monk</span></span>}
      </Link>
      {title ? <h1 className="text-lg font-semibold">{title}</h1> : null}
    </header>
  );
}

export function Bubble({ from, children }: { from: "user" | "assistant"; children: ReactNode }) {
  return from === "user" ? (
    <div className="ml-10 self-end rounded-card rounded-br-sm bg-brand px-4 py-3 text-navy">{children}</div>
  ) : (
    <div className="mr-10 flex items-end gap-2 self-start">
      <img src="/icons/icon-192.png" alt="SuperMonk" className="h-8 w-8 shrink-0 rounded-full" />
      <div className="rounded-card rounded-bl-sm bg-navy-2 px-4 py-3 ring-1 ring-navy/10">{children}</div>
    </div>
  );
}

export function Chip({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-mist/50 px-2.5 py-0.5 text-xs text-navy">{children}</span>;
}

export function ErrorNote({ message }: { message: string }) {
  return <p className="rounded-card bg-cape/10 px-4 py-3 text-sm text-navy ring-1 ring-cape/40">{message}</p>;
}

/**
 * Responsive stage. Below lg it is a plain single column (phone layout, unchanged).
 * From lg (1024 px) it becomes a two-column grid inside the 1200 px shell:
 * content on the left (max 560 px), `aside` on the right. Pages without an aside get a
 * single centred 560 px column; `wide` pages (grids, dashboards) take the whole width.
 *
 *   <Stage aside={<StageAside id="home-aside" />}>…</Stage>
 */
export function Stage({
  children,
  aside,
  wide = false,
  className = "",
}: {
  children: ReactNode;
  aside?: ReactNode;
  wide?: boolean;
  className?: string;
}) {
  if (wide) return <div className={`flex flex-1 flex-col ${className}`}>{children}</div>;
  if (!aside) return <div className={`flex w-full flex-1 flex-col lg:mx-auto lg:max-w-[560px] ${className}`}>{children}</div>;
  return (
    <div className={`flex flex-1 flex-col lg:grid lg:grid-cols-[minmax(0,560px)_minmax(0,1fr)] lg:items-start lg:gap-16 xl:gap-24 ${className}`}>
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      {aside}
    </div>
  );
}

/** Right-column slot for `Stage`. On mobile it renders below the content in flow order. */
export function StageAside({ id, children, className = "" }: { id?: string; children?: ReactNode; className?: string }) {
  return (
    <aside id={id} className={`mt-8 flex min-w-0 flex-col gap-4 lg:sticky lg:top-10 lg:mt-0 ${className}`}>
      {children}
    </aside>
  );
}
