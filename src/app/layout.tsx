import type { Metadata } from "next";
import { Libre_Caslon_Display, Libre_Caslon_Text, Barlow_Condensed, Spline_Sans_Mono } from "next/font/google";
import { CatalogNav } from "@/components/specimen";
import "./globals.css";

const caslonDisplay = Libre_Caslon_Display({
  variable: "--font-caslon-display",
  weight: "400",
  subsets: ["latin"],
});

const caslonText = Libre_Caslon_Text({
  variable: "--font-caslon-text",
  weight: ["400", "700"],
  style: ["normal", "italic"],
  subsets: ["latin"],
});

const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow-condensed",
  weight: ["500", "600"],
  subsets: ["latin"],
});

const splineMono = Spline_Sans_Mono({
  variable: "--font-spline-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Design Vault",
  description: "A private specimen catalog of saved UI screens, palettes, and fonts.",
};

export const viewport = {
  // Mirrors the --paper token in globals.css.
  themeColor: "#16130d",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${caslonDisplay.variable} ${caslonText.variable} ${barlowCondensed.variable} ${splineMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-paper text-ink">
        <CatalogNav />
        <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
