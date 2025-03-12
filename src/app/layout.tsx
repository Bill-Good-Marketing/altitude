import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import React from "react";
import { Toaster } from "~/components/ui/toaster";
import { cookies } from "next/headers";
import classNames from "classnames";
import { ThemeProvider } from "../components/theme-provider"; // adjust path as needed

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Altitude CRM",
  description: "Gain altitude in your business ventures",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const _cookies = await cookies();

  return (
    <html lang="en">
      <body
        className={classNames(
          geistSans.variable,
          geistMono.variable,
          "antialiased",
          { dark: _cookies.get("theme")?.value === "dark" }
        )}
      >
        <ThemeProvider defaultTheme="light">
          {children}
        </ThemeProvider>
        <Toaster richColors={true} position="top-right" />
      </body>
    </html>
  );
}
