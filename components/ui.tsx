import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

// Dumb building blocks. Colours come from the @theme tokens in app/globals.css.

export function PrimaryButton({ className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`bg-brand w-full rounded-card px-5 py-4 text-lg font-semibold text-navy shadow-lg shadow-orange/20 transition active:scale-[0.98] disabled:opacity-40 ${className}`}
    />
  );
}

export function GhostButton({ className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`w-full rounded-card border border-cream/15 px-5 py-3 text-base text-cream transition active:scale-[0.98] disabled:opacity-40 ${className}`}
    />
  );
}

export function Pill({ active, className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      aria-pressed={active}
      {...props}
      className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition active:scale-95 disabled:opacity-40 ${
        active ? "border-saffron bg-saffron text-navy" : "border-saffron/40 bg-navy-2 text-cream"
      } ${className}`}
    />
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-card bg-navy-2 p-4 ring-1 ring-cream/10 ${className}`}>{children}</div>;
}

export function Header({ title, back }: { title?: string; back?: string }) {
  return (
    <header className="mb-4 flex items-center gap-3">
      {back ? (
        <Link href={back} aria-label="Back" className="-ml-2 rounded-full px-2 py-1 text-2xl text-muted">
          ‹
        </Link>
      ) : null}
      <Link href="/" className="flex items-center gap-2">
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
      <div className="rounded-card rounded-bl-sm bg-navy-2 px-4 py-3 ring-1 ring-cream/10">{children}</div>
    </div>
  );
}

export function Chip({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-cream/10 px-2.5 py-0.5 text-xs text-cream/90">{children}</span>;
}

export function ErrorNote({ message }: { message: string }) {
  return <p className="rounded-card bg-cape/15 px-4 py-3 text-sm text-cream ring-1 ring-cape/40">{message}</p>;
}
