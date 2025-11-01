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
        <link rel="manifest" href={`/manifest.json?v=${process.env.VERCEL_GIT_COMMIT_SHA}`} />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body>
            <Analytics />
            <SpeedInsights />
            <ThemeProvider>
              {/* Lock page to viewport height on md+ and prevent body scrolling there; on mobile keep normal document flow so footer follows content */}
              <div className="flex flex-col bg-backgroundPrimary overflow-auto md:overflow-hidden min-h-screen">
                <main className="flex-1 min-h-0 md:h-screen overflow-auto md:overflow-hidden pb-20 md:pb-0">
                  {children}
                </main>
                <Footer />
              </div>
            </ThemeProvider>
      </body>
    </html>
  );
}
