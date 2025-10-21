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
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon1.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/web-app-manifest-512x512.png", sizes: "512x512", type: "image/png" },
      { url: "/icons/web-app-manifest-192x192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/apple-icon.png",
    other: [
      { rel: "mask-icon", url: "/icon0.svg" },
    ],
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
        <meta name="apple-mobile-web-app-title" content="Better Lise" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/apple-icon.png" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="mask-icon" href="/icon0.svg" color="#5bbad5" />
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
