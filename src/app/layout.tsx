import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { APP_DESCRIPTION, APP_TITLE } from "@/lib/constants/app";
import { HTML_LANG } from "@/lib/constants/locale";
import { APP_THEME } from "@/lib/constants/ui";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Pages set only their own name; the template adds the brand.
  title: APP_TITLE,
  description: APP_DESCRIPTION,
};

const RootLayout = ({ children }: LayoutProps<"/">) => {
  return (
    <html
      lang={HTML_LANG}
      className={`${APP_THEME} ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        {children}
        {/* Same theme as the class on <html>: see APP_THEME. */}
        <Toaster theme={APP_THEME} richColors />
      </body>
    </html>
  );
};

export default RootLayout;
