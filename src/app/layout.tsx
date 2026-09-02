import type { Metadata } from "next";
import "./globals.css";
import ThemeProvider from "./components/ThemeProvider";
import SettingsModal from "./components/SettingsModal";
import { SessionProvider } from "next-auth/react";
import ErrorBoundary from "./components/ErrorBoundary";

export const metadata: Metadata = {
  title: "PrepBite — Less prep, better bites",
  description: "Weekly meal planning & smart grocery lists on autopilot. Stop stressing over daily dinner decisions.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ErrorBoundary>
          <SessionProvider>
            <ThemeProvider>
              <SettingsModal />
              {children}
            </ThemeProvider>
          </SessionProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
