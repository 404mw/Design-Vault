import type { Metadata } from "next";
import { Inter, Spline_Sans_Mono } from "next/font/google";
import { CatalogNav } from "@/components/specimen";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const splineMono = Spline_Sans_Mono({
  variable: "--font-spline-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Design Vault",
  description: "A private reference library of saved UI screens, palettes, fonts, and components.",
};

export const viewport = {
  // Mirrors the --paper token in globals.css.
  themeColor: "#f7f7fb",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${splineMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-paper text-ink">
        <CatalogNav />
        <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
