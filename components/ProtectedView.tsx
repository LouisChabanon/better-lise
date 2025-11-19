"use client";

import { LoginForm } from "./LoginForm";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { LockOutlined } from "@ant-design/icons";
import { motion } from "framer-motion";

export default function ProtectedView({ 
    children, 
    session, 
    title 
}: { 
    children: React.ReactNode, 
    session: any,
    title: string
}) {
    const router = useRouter();
    const queryClient = useQueryClient();

    if (session?.username) {
        return <>{children}</>;
    }

    return (
        <div className="flex flex-col items-center justify-center h-full w-full p-4 overflow-hidden">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1}} transition={{ duration: 0.5 }}
                className="absolute inset-0 bg-backgroundSecondary/50 pointer-events-none" />
            
            {/* Card Container */}
            <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ 
                    type: "spring",
                    stiffness: 300,
                    damping: 20,
                    duration: 0.4
                }}
                className="w-full max-w-md bg-backgroundPrimary p-8 rounded-2xl shadow-xl border border-buttonSecondaryBorder/30 relative overflow-hidden">
                
                {/* Decorative Top Accent */}
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary-300 via-primary-500 to-primary-300" />

                {/* Icon & Header */}
                <div className="flex flex-col items-center text-center mb-8 mt-2">
                    <motion.div
                        initial={{ scale: 0, rotate: -20 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: "spring" }}
                        className="h-14 w-14 bg-primary-container rounded-full flex items-center justify-center mb-4 text-primary text-2xl shadow-inner">
                        <LockOutlined />
                    </motion.div>
                    
                    <h2 className="text-2xl font-bold text-textPrimary tracking-tight">
                        Connexion
                    </h2>
                    
                    <p className="text-textSecondary mt-3 text-sm leading-relaxed max-w-xs">
                        La page <span className="font-semibold text-primary">{title}</span> nécessite une authentification.
                    </p>
                </div>

                {/* Login Form Wrapper */}
                <div className="w-full">
                    <LoginForm onSuccess={() => {
                        queryClient.invalidateQueries();
                        router.refresh();
                    }} />
                </div>

                {/* Footer Text */}
                <motion.div 
                    className="mt-6 text-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    >
                    <p className="text-xs text-textTertiary">
                        Utilisez vos identifiants Lise habituels.
                    </p>
                </motion.div>
            </motion.div>
        </div>
    );
}