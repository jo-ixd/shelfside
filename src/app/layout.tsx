import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { LibraryProvider } from "@/lib/store";
import { AccentSync } from "@/components/accent-sync";
import { BottomNav } from "@/components/bottom-nav";
import { AddFab } from "@/components/add-fab";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Shelfside",
  description: "Your bookshelves, tracked like they're real",
};

export const viewport: Viewport = {
  themeColor: "#17130e",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col pb-24 text-base">
        <ThemeProvider>
          <LibraryProvider>
            <AccentSync />
            {/* One centered column keeps every screen size working: rails,
                headers and the fixed chrome all anchor to it on desktop. */}
            <div className="mx-auto w-full max-w-2xl">{children}</div>
            <BottomNav />
            <AddFab />
            <Toaster position="bottom-center" />
          </LibraryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
