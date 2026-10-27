import type { Metadata } from "next";
import localFont from "next/font/local";
import Link from "next/link";
import { Suspense } from "react";
import { UserNav } from "@/components/UserNav";
import { appUrl } from "@/lib/auth/steam";
import "./globals.css";

// Fan-made recreation of the game's hand-drawn font (from IsaacDocs).
const isaacFont = localFont({
  src: "./fonts/IsaacGame.ttf",
  variable: "--font-isaac-game",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(appUrl()),
  title: { default: "Stats for Isaac", template: "%s · Stats for Isaac" },
  description: "Every run of The Binding of Isaac, floor by floor: maps, items, bosses and what killed you.",
  openGraph: { siteName: "Stats for Isaac", type: "website" },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={isaacFont.variable}>
      <body className="flex min-h-dvh flex-col">
        <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-4">
          <Link href="/" className="font-isaac text-2xl text-paper sm:text-3xl">
            Stats for Isaac
          </Link>
          <Suspense fallback={<span className="h-9" />}>
            <UserNav />
          </Suspense>
        </header>
        <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 pb-12">{children}</main>
        <footer className="px-4 pb-6 text-center text-sm text-paper/60">
          A fan project. Not affiliated with Edmund McMillen or Nicalis.
        </footer>
      </body>
    </html>
  );
}
