"use client";

import { Button } from "./ui/Button";
import { EyeInvisibleOutlined, EyeOutlined, LockOutlined, UserOutlined } from "@ant-design/icons";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "@/actions/Auth";
import { liseIdChecker } from "@/lib/helper";
import { motion, AnimatePresence, Variants } from "framer-motion";
import posthog from "posthog-js";

type PassInputType = "password" | "text";

type LoginFormProps = {
	onSuccess?: () => void;
};

const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
            delayChildren: 0.3 // Wait for card to finish opening
        }
    }
};

const itemVariants: Variants = {
    hidden: { opacity: 0, x: -10 },
    show: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

export function LoginForm({ onSuccess }: LoginFormProps) {
	const router = useRouter();

	const [loading, setLoading] = useState(false);
	const [username, setUsername] = useState("");
	const [errors, setErrors] = useState<string | null>(null);
	const [passInputType, setPassInputType] = useState<PassInputType>("password");
	const [isFocused, setIsFocused] = useState(false);

	useEffect(() => {
		const savedUsername = localStorage.getItem("lise_id");
		if (savedUsername) {
			setUsername(savedUsername);
		}
	}, []);

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setErrors(null);

		const form = e.currentTarget;
		const formData = new FormData(form);
		const username = formData.get("username") as string;

		if (!liseIdChecker(username)) {
			setErrors("L'identifiant doit être au format 20xx-xxxx");
			return;
		}
		localStorage.setItem("lise_id", username);
		setLoading(true);

		if(posthog.has_opted_in_capturing()) {
			posthog.capture("login_attempt", { lise_id: username });
		}

		try {
			// Call the signIn action
			const state = await signIn(undefined, formData);
			if (state?.success) {
				if(posthog.has_opted_in_capturing()) {
					posthog.capture("login_success", { lise_id: username });
				}
				
				if (onSuccess) {
					onSuccess();
				} else {
					router.push("/");
				}
			} else {
				if(posthog.has_opted_in_capturing()) {
					posthog.capture("login_failure", { lise_id: username });
				}
				setErrors(state?.errors || "An error occurred during login.");
			}
		} catch (error) {
			setErrors("An unexpected error occurred. Please try again later.");
			console.error("Login error:", error);
		} finally {
			setLoading(false);
		}
	};

	const handleShowPassword = () => {
		if (passInputType == "password") {
			setPassInputType("text");
		} else {
			setPassInputType("password");
		}
	};

	return (
		<motion.form onSubmit={handleSubmit} className="space-y-6" variants={containerVariants} initial="hidden" animate="show">
			<motion.div className="flex items-center gap-4" variants={itemVariants}>
				<label htmlFor="username" className="w-40 font-medium text-textSecondary">
					Identifiant :
				</label>
				<div className="flex items-center px-3 py-2 w-full bg-backgroundTertiary rounded-lg  focus-within:ring-1 focus-within:ring-primary-400 hover:ring-1 hover:ring-primary-400">
					<UserOutlined className="text-gray-500 mr-2" />
					<input type="text" id="username" name="username" placeholder="20xx-xxxx" defaultValue={username || ""} required disabled={loading} className="w-full focus:outline-none" />
				</div>
			</motion.div>
			<motion.div className="flex items-center gap-4" variants={itemVariants}>
				<label htmlFor="Password" className="w-40 font-medium text-textSecondary">
					Mot de passe :
				</label>
				<div className="flex items-center px-3 py-2 w-full bg-backgroundTertiary rounded-lg  focus-within:ring-1 focus-within:ring-primary-400 hover:ring-1 hover:ring-primary-400">
					<LockOutlined className="text-gray-500 mr-2" />
					<input type={passInputType} id="password" name="password" required disabled={loading} className="w-full focus:outline-none" />
					{passInputType == "password" ? <EyeOutlined onClick={handleShowPassword} /> : <EyeInvisibleOutlined onClick={handleShowPassword} />}
				</div>
			</motion.div>
			<AnimatePresence mode="wait">
				{errors && 
				<motion.div 
					className="p-3 bg-error-container border border-error/20 text-error rounded-lg text-sm font-medium text-center overflow-hidden"
					initial={{ opacity: 0, height: 0, y: -10 }}
					animate={{ 
						opacity: 1, 
						height: "auto", 
						y: 0,
						x: [0, -5, 5, -5, 5, 0],
						transition: { duration: 0.4 }
					}}
					exit={{ opacity: 0, height: 0, y: -10 }}
					>
						{errors}
					</motion.div>}
			</AnimatePresence>
			<div>
				<Button type="submit" className="w-full" disabled={loading}>
					<span className="font-semibold text-lg">{loading ? "Connexion..." : "Connexion"}</span>
				</Button>
			</div>
		</motion.form>
	);
}
