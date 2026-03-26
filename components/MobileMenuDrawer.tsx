"use client";

import { TrophyOutlined, SettingOutlined, LogoutOutlined, HeartOutlined } from "@ant-design/icons";
import { m, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRef, useEffect } from "react";

interface MobileMenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsClick: () => void;
  onLogout: () => void;
  session: any;
}

const DrawerItem = ({ icon, label, onClick, href, isDestructive = false }: { icon: React.ReactNode; label: string; onClick?: () => void; href?: string; isDestructive?: boolean }) => {
  const content = (
    <div className={`flex items-center gap-4 p-4 rounded-xl transition-colors ${isDestructive ? "text-error bg-error/5 active:bg-error/10" : "text-textPrimary hover:bg-backgroundSecondary active:bg-backgroundSecondary"}`}>
      <span className="text-xl">{icon}</span>
      <span className="font-medium text-sm">{label}</span>
    </div>
  );

  if (href) {
    return (
      <Link href={href} onClick={onClick} className="block w-full">
        {content}
      </Link>
    );
  }

  return (
    <button onClick={onClick} className="block w-full text-left">
      {content}
    </button>
  );
};

export default function MobileMenuDrawer({ isOpen, onClose, onSettingsClick, onLogout, session }: MobileMenuDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      // Prevent body scroll when drawer is open
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm md:hidden"
            onClick={onClose}
          />

          {/* Drawer */}
          <m.div
            ref={drawerRef}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 bg-backgroundPrimary rounded-t-3xl border-t border-backgroundSecondary z-50 md:hidden p-4 pb-8 shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.1)]"
          >
            {/* Handle/Indicator */}
            <div className="w-12 h-1.5 bg-backgroundTertiary rounded-full mx-auto mb-6" />

            <div className="space-y-2">
			  <div className="px-4 pb-2 text-xs font-semibold text-textTertiary uppercase tracking-wider">
                  Menu
              </div>
              
              <DrawerItem
                icon={<TrophyOutlined />}
                label="Achievements"
                href="/achievements"
                onClick={onClose}
              />
              
              <DrawerItem
                icon={<HeartOutlined />}
                label="Lise Health"
                href="/lise-health"
                onClick={onClose}
              />
              
              {/*<DrawerItem
                icon={<TrophyOutlined className="text-amber-500" />}
                label="Premium ✨"
                onClick={() => {
                  onClose();
                  window.dispatchEvent(new Event("open-premium-modal"));
                }}
              /> */}
              
              <DrawerItem
                icon={<SettingOutlined />}
                label="Paramètres"
                onClick={() => {
                  onClose();
                  onSettingsClick();
                }}
              />

              {session?.username && (
                <div className="pt-2 mt-2 border-t border-backgroundSecondary">
                  <DrawerItem
                    icon={<LogoutOutlined />}
                    label="Déconnexion"
                    onClick={onLogout}
                    isDestructive
                  />
                </div>
              )}
            </div>
          </m.div>
        </>
      )}
    </AnimatePresence>
  );
}
