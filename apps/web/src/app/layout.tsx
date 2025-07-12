import { ThemeProvider } from "next-themes";
import { Analytics } from "@vercel/analytics/react";
import Script from "next/script";
import "./globals.css";
import { Toaster } from "../components/ui/sonner";
import { TooltipProvider } from "../components/ui/tooltip";
import { DevelopmentDebug } from "../components/development-debug";
import { StorageProvider } from "../components/storage-provider";
import { baseMetaData } from "./metadata";
import { defaultFont } from "../lib/font-config";

export const metadata = baseMetaData;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${defaultFont.className} font-sans antialiased`}>
        <ThemeProvider attribute="class" forcedTheme="dark" enableSystem>
          <TooltipProvider>
            <StorageProvider>{children}</StorageProvider>
            <Analytics />
            <Toaster />
            <DevelopmentDebug />
            <Script
              src="https://cdn.databuddy.cc/databuddy.js"
              async
              data-client-id="UP-Wcoy5arxFeK7oyjMMZ"
              data-disabled="true"
              data-track-sessions="false"
              data-track-performance="false"
              data-enable-batching="true"
              crossOrigin="anonymous"
            />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
