"use client";

import { m, AnimatePresence } from "framer-motion";
import { Button } from "./Button";
import { CrownOutlined, RobotOutlined, BankOutlined, RocketOutlined, CloseOutlined, CheckCircleFilled } from "@ant-design/icons";
import { useState } from "react";

interface PremiumModalProps {
	isOpen: boolean;
	onClose: () => void;
}

export default function PremiumModal({
	isOpen,
	onClose,
}: PremiumModalProps) {
	const [isSubscribing, setIsSubscribing] = useState(false);

	const handleSubscribe = () => {
		setIsSubscribing(true);
		setTimeout(() => {
			alert("Ceci est bien évidemment une blague. Merci d'avoir voulu payer cependant.");
			setIsSubscribing(false);
			onClose();
		}, 1500);
	};

	return (
		<AnimatePresence>
			{isOpen && (
				<div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-6 overflow-hidden">
					<m.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className="absolute inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-md"
						onClick={onClose}
					/>
					<m.div
						initial={{ opacity: 0, scale: 0.95, y: 40 }}
						animate={{ opacity: 1, scale: 1, y: 0 }}
						exit={{ opacity: 0, scale: 0.95, y: 40 }}
						transition={{ type: "spring", damping: 25, stiffness: 300 }}
						className="relative w-full max-w-[480px] bg-backgroundPrimary text-textPrimary rounded-t-[32px] sm:rounded-3xl overflow-hidden shadow-2xl border-t sm:border border-black/5 dark:border-white/10 max-h-[92vh] flex flex-col"
					>
						{/* Cool background effects - light opacity for both themes */}
						<div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 dark:bg-indigo-500/15 rounded-full blur-[80px] pointer-events-none" />
						<div className="absolute bottom-0 left-0 w-64 h-64 bg-fuchsia-500/10 dark:bg-fuchsia-500/15 rounded-full blur-[60px] pointer-events-none" />

						{/* Close button */}
						<button
							onClick={onClose}
							className="absolute top-4 right-4 sm:top-5 sm:right-5 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-textSecondary hover:text-textPrimary transition-colors"
						>
							<CloseOutlined className="text-sm" />
						</button>

						{/* Scrollable Content */}
						<div className="relative flex-1 overflow-y-auto custom-scrollbar p-6 sm:p-7 pb-4 sm:pb-5">
							<div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-fuchsia-500 flex items-center justify-center mb-4 sm:mb-6 shadow-lg shadow-indigo-500/20 border border-white/20">
								<CrownOutlined className="text-xl sm:text-2xl text-white" />
							</div>

							<h2 className="text-2xl sm:text-3xl font-extrabold mb-2 sm:mb-3 tracking-tight text-textPrimary">
								Passez au niveau supérieur.
							</h2>
							<p className="text-textSecondary text-[14px] sm:text-[15px] leading-relaxed mb-5 sm:mb-6">
								Dans le cadre de notre nouvelle stratégie d'excellence, Better-Lise devient un service exclusivement premium. Débloquez les outils qui garantiront votre réussite académique et financière.
							</p>

							{/* Pricing Card */}
							<div className="bg-backgroundSecondary border border-black/5 dark:border-white/10 hover:border-indigo-500/30 dark:hover:border-indigo-500/30 transition-colors rounded-2xl p-4 sm:p-5 relative overflow-hidden group mb-6">
								<div className="absolute inset-0 bg-gradient-to-r from-indigo-500/0 via-indigo-500/5 to-purple-500/0 opacity-0 group-hover:opacity-100 transition-opacity" />
								<div className="relative flex justify-between items-center">
									<div>
										<div className="flex items-center gap-2 mb-1">
											<span className="text-lg font-bold text-textPrimary">Plan Pro</span>
											<span className="text-[10px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-sm">
												Obligatoire
											</span>
										</div>
										<span className="text-sm text-textTertiary">Facturation mensuelle</span>
									</div>
									<div className="text-right">
										<div className="flex items-baseline gap-1 justify-end">
											<span className="text-3xl font-black text-textPrimary">24</span>
											<span className="text-xl font-bold text-textPrimary">,00€</span>
										</div>
										<span className="text-textTertiary text-xs font-medium">/mois</span>
									</div>
								</div>
							</div>

							{/* Divider */}
							<div className="h-px w-full bg-gradient-to-r from-transparent via-black/10 dark:via-white/10 to-transparent mb-6" />

							{/* Features */}
							<div className="space-y-5 sm:space-y-6">
								<div className="flex gap-3 sm:gap-4">
									<div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center shrink-0 border border-indigo-500/20 shadow-inner">
										<RobotOutlined className="text-indigo-500 dark:text-indigo-400 text-lg sm:text-xl" />
									</div>
									<div>
										<h3 className="text-[15px] sm:text-base font-bold text-textPrimary mb-1 sm:mb-1.5 flex items-center gap-2">
											Better-Lise Copilot™
											<CheckCircleFilled className="text-indigo-500 text-xs sm:text-sm" />
										</h3>
										<p className="text-[12px] sm:text-[13px] text-textSecondary leading-relaxed">
											Découvrez notre IA spécialement entrainée sur le drive tuysse. Bypass des logiciels anti-plagiat garanti à 100%.
										</p>
									</div>
								</div>

								<div className="flex gap-3 sm:gap-4">
									<div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0 border border-purple-500/20 shadow-inner">
										<BankOutlined className="text-purple-500 dark:text-purple-400 text-lg sm:text-xl" />
									</div>
									<div>
										<h3 className="text-[15px] sm:text-base font-bold text-textPrimary mb-1 sm:mb-1.5 flex items-center gap-2">
											Accès ENIM
											<CheckCircleFilled className="text-purple-500 text-xs sm:text-sm" />
										</h3>
										<p className="text-[12px] sm:text-[13px] text-textSecondary leading-relaxed">
											Partenariat institutionnel exclusif avec l'école d'ingénieur la plus prestigieuse de France.
										</p>
									</div>
								</div>

								<div className="flex gap-3 sm:gap-4">
									<div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0 border border-amber-500/20 shadow-inner">
										<RocketOutlined className="text-amber-500 dark:text-amber-400 text-lg sm:text-xl" />
									</div>
									<div>
										<h3 className="text-[15px] sm:text-base font-bold text-textPrimary mb-1 sm:mb-1.5 flex items-center gap-2">
											Masterclass Entrepreneur
											<CheckCircleFilled className="text-amber-500 text-xs sm:text-sm" />
										</h3>
										<p className="text-[12px] sm:text-[13px] text-textSecondary leading-relaxed">
											Avec Ewen Henry, découvez la formation vidéo "De l'amphi à Dubaï en 30 jours".
										</p>
									</div>
								</div>
							</div>
						</div>

						{/* Footer */}
						<div className="p-6 sm:p-7 pt-3 sm:pt-4 border-t border-black/5 dark:border-white/5 bg-backgroundPrimary/50 backdrop-blur-sm">
							<Button
								status="primary"
								className="w-full relative group bg-gradient-to-r from-indigo-500 to-fuchsia-500 hover:from-indigo-600 hover:to-fuchsia-600 text-white border-none transition-all py-3 sm:py-3.5 rounded-xl h-auto shadow-lg shadow-indigo-500/25"
								onClick={handleSubscribe}
								disabled={isSubscribing}
							>
								{isSubscribing ? (
									<span className="flex items-center justify-center gap-2 text-[15px] sm:text-base font-bold">
										<span className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
										Vérification...
									</span>
								) : (
									<span className="flex items-center justify-center gap-2 text-[15px] sm:text-base font-bold">
										Passer à la caisse
										<span className="transition-transform group-hover:translate-x-1">→</span>
									</span>
								)}
							</Button>

							<div className="mt-3 sm:mt-4 flex flex-col items-center gap-1">
								<span className="text-[10px] sm:text-[11px] text-textTertiary text-center px-4 leading-tight">
									En cliquant sur "Passer à la caisse", vous acceptez nos CGV qui stipulent un engagement irrévocable sur 12 mois. Aucun remboursement n'est possible.
								</span>
							</div>
						</div>
					</m.div>
				</div>
			)}
		</AnimatePresence>
	);
}
