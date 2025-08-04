"use client";

import { Button } from "./ui/Button";
import { EyeInvisibleOutlined, EyeOutlined, LockOutlined, UserOutlined } from "@ant-design/icons";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "@/actions/Auth";

type FieldType = {
	username: string;
	password: string;
};

type PassInputType = "password" | "text";

export function LoginForm() {
	const router = useRouter();

	const [loading, setLoading] = useState(false);
	const [errors, setErrors] = useState<string | null>(null);
	const [passInputType, setPassInputType] = useState<PassInputType>("password");
	const [isFocused, setIsFocused] = useState(false);

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setErrors(null);

		const form = e.currentTarget;
		const formData = new FormData(form);
		const username = formData.get("username") as string;
		const password = formData.get("password") as string;

		if (!/^\d{4}-\d{4}$/.test(username)) {
			setErrors("L'identifiant doit être au format 20xx-xxxx");
			return;
		}
		setLoading(true);

		try {
			// Call the signIn action
			const state = await signIn(undefined, formData);
			if (state?.success) {
				router.push("/");
			} else {
				console.log("Login failed:", state?.errors);
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
		<form onSubmit={handleSubmit} className="space-y-6">
			<div className="flex items-center gap-4">
				<label htmlFor="username" className="w-40 font-medium text-gray-800">
					Identifiant :
				</label>
				<div className="flex items-center px-3 py-2 w-full bg-surface rounded-lg  focus-within:ring-1 focus-within:ring-primary-400 hover:ring-1 hover:ring-primary-400">
					<UserOutlined className="text-gray-500 mr-2" />
					<input type="text" id="username" name="username" placeholder="20xx-xxxx" required disabled={loading} className="w-full focus:outline-none" />
				</div>
			</div>
			<div className="flex items-center gap-4">
				<label htmlFor="Password" className="w-40 font-medium text-gray-800">
					Mot de passe :
				</label>
				<div className="flex items-center px-3 py-2 w-full bg-surface rounded-lg  focus-within:ring-1 focus-within:ring-primary-400 hover:ring-1 hover:ring-primary-400">
					<LockOutlined className="text-gray-500 mr-2" />
					<input type={passInputType} id="password" name="password" required disabled={loading} className="w-full focus:outline-none" />
					{passInputType == "password" ? <EyeOutlined onClick={handleShowPassword} /> : <EyeInvisibleOutlined onClick={handleShowPassword} />}
				</div>
			</div>
			{errors && <div className="p-4 bg-error-container border border-error text-error rounded-md">{errors}</div>}
			<div>
				<Button type="submit" className="w-full" disabled={loading}>
					<span className="font-semibold text-lg">{loading ? "Connexion..." : "Connexion"}</span>
				</Button>
			</div>
		</form>
	);
}
