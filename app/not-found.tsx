"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { HomeOutlined, WarningOutlined } from "@ant-design/icons";
import { motion } from "framer-motion";

// --- CONFIGURATION ---
const EASTER_EGG_IMAGES = [
  {
    src: "/images/404/image1.png",
    alt: "",
  },
  {
    src: "/images/404/image2.jpg",
    alt: "",
  },
  {
    src: "/images/404/image4.jpg",
    alt: "",
  },
    {
    src: "/images/404/image5.jpg",
    alt: "",
  }
];

export default function NotFound() {
  const [randomImage, setRandomImage] = useState<typeof EASTER_EGG_IMAGES[0] | null>(null);

  useEffect(() => {
    // Select a random image only on the client side to prevent hydration mismatch
    const randomIndex = Math.floor(Math.random() * EASTER_EGG_IMAGES.length);
    setRandomImage(EASTER_EGG_IMAGES[randomIndex]);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-backgroundPrimary text-textPrimary p-4 text-center">
      
      {/* Main 404 Text */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-9xl font-black text-primary/10 select-none">404</h1>
        <div className="relative -top-12">
            <h2 className="text-3xl font-bold mb-2">Page Introuvable</h2>
            <p className="text-textSecondary max-w-md mx-auto">
            La page que vous recherchez a peut-être été supprimée, renommée ou est temporairement indisponible.
            </p>
        </div>
      </motion.div>

      {/* Easter Egg Container */}
      <div className="my-8 h-64 w-full max-w-md flex items-center justify-center relative">
        {randomImage ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="relative rounded-xl overflow-hidden shadow-lg border-4 border-backgroundSecondary"
          >
            {/* Image */}
            <img 
                src={randomImage.src} 
                alt={randomImage.alt} 
                className="w-full h-full object-cover max-h-60"
            />
          </motion.div>
        ) : (

          <div className="animate-pulse flex flex-col items-center justify-center h-full w-full bg-backgroundSecondary rounded-xl text-textTertiary">
             <WarningOutlined className="text-3xl mb-2" />
             <span>Chargement...</span>
          </div>
        )}
      </div>

      {/* Action Button */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <Link href="/">
            <Button status="primary" className="flex items-center gap-2 px-6 py-3 text-lg">
            <HomeOutlined /> Retour à l'accueil
            </Button>
        </Link>
      </motion.div>

    </div>
  );
}