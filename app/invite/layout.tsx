import type { Metadata } from "next";

// The page is a client component and cannot export metadata; the title goes through the
// root template ("%s · SuperMonk").
export const metadata: Metadata = { title: "Your invite" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
