import type { Metadata, Viewport } from "next";
import '@ant-design/v5-patch-for-react-19';
import '@/styles/globals.css';
import Footer from "@/components/Footer";
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"
import { ThemeProvider } from "@/components/ThemeProvider";

export const metadata: Metadata = {
  applicationName: "Better Lise",
  title: {
    default: "Better Lise",
    template: "%s | Better Lise",
  },
  description: "A better lise experience",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Better Lise"
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: "Better Lise",
    title: {
      default: "Better Lise",
      template: "%s | Better Lise",
    },
    description: "A better lise experience",
  },
  manifest: "/manifest.json",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body>
            <Analytics />
            <SpeedInsights />
            <ThemeProvider>
              <div className="flex flex-col bg-backgroundPrimary min-h-screen">
                {children}
                <Footer />
              </div>
            </ThemeProvider>
      </body>
    </html>
  );
}
