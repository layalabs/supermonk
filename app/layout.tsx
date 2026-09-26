import type { Metadata, Viewport } from "next";
import "./globals.css";
import DemoBadge from "@/components/DemoBadge";

export const metadata: Metadata = {
  title: { default: "SuperMonk", template: "%s · SuperMonk" },
  description: "Invite a monk in Chiang Mai: blessings, monk chat, meditation.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "SuperMonk", statusBarStyle: "default" },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#fbf6ec",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// Below lg: the original single phone column (430 px). From lg: a 1200 px stage with
// generous whitespace; pages split into two columns with <Stage aside={…}> (components/ui.tsx).
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh antialiased">
        <main className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col px-5 pb-16 pt-[max(env(safe-area-inset-top),1.25rem)] lg:max-w-[1200px] lg:px-12 lg:pb-20 lg:pt-10">
          {children}
        </main>
        <DemoBadge />
      </body>
    </html>
  );
}
