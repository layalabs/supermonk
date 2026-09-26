import type { Metadata, Viewport } from "next";
import "./globals.css";
import DemoBadge from "@/components/DemoBadge";

export const metadata: Metadata = {
  title: "SuperMonk",
  description: "Invite a monk in Chiang Mai: blessings, monk chat, meditation.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "SuperMonk", statusBarStyle: "black-translucent" },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#0f1a2e",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh antialiased">
        <main className="mx-auto flex min-h-dvh max-w-[430px] flex-col px-5 pb-16 pt-[max(env(safe-area-inset-top),1.25rem)]">
          {children}
        </main>
        <DemoBadge />
      </body>
    </html>
  );
}
