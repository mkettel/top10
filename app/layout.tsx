import type { Metadata } from "next";
import { Geist, Geist_Mono, Outfit } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

import { Monoton } from "next/font/google";

const monoton = Monoton({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-monoton",
})

export const metadata: Metadata = {
  title: "The Top 10 Game",
  description: "Play with friends to guess the top 10 answers to a question.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${outfit.variable} ${outfit.variable} ${monoton.variable} font-outfit antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
