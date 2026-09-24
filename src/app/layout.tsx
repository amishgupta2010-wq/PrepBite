import type { Metadata } from "next";
import "./globals.css";
import ThemeProvider from "./components/ThemeProvider";
import SettingsModal from "./components/SettingsModal";
import { SessionProvider } from "next-auth/react";
import ErrorBoundary from "./components/ErrorBoundary";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXTAUTH_URL || 'https://prepbite.netlify.app'),
  title: "PrepBite — Less prep, better bites",
  description: "Weekly meal planning & smart grocery lists on autopilot. Stop stressing over daily dinner decisions.",
  icons: {
    icon: '/prepbite-logo.png',
    apple: '/prepbite-logo.png',
  },
  openGraph: {
    title: 'PrepBite — Less prep, better bites',
    description: 'Weekly meal planning & smart grocery lists on autopilot.',
    images: ['/prepbite-logo.png'],
    type: 'website',
  },
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
