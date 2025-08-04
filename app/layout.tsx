import type { Metadata, Viewport } from "next";
import '@ant-design/v5-patch-for-react-19';
import '@/styles/globals.css';
import MenuBar from "@/components/MenuBar";
import Footer from "@/components/Footer";
import InstallAppBanner from "@/components/InstallBanner";

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

export const viewPort: Viewport = {
  themeColor: "#ffffff",
  userScalable: false,
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
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      </head>
      <body>
            <div className="flex flex-col bg-white min-h-screen">
              <MenuBar />
              {children}  
              <Footer />
            </div>
      </body>
    </html>
  );
}
