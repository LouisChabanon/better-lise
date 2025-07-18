import type { Metadata } from "next";
import '@ant-design/v5-patch-for-react-19';
import '@/styles/globals.css';
import MenuBar from "@/components/MenuBar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Better Lise",
  description: "A better lise experience",
  appleWebApp: {
    title: "Better Lise"
  }
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
