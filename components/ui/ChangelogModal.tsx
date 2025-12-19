"use client";
import { m, AnimatePresence } from "framer-motion";
import { Button } from "./Button";
import { RocketOutlined, FireOutlined, BugOutlined } from "@ant-design/icons";
import { Release, CHANGELOG } from "@/lib/changelog";

interface ChangelogModalProps {
	isOpen: boolean;
	onClose: () => void;
}

export default function ChangelogModal({
	isOpen,
	onClose,
}: ChangelogModalProps) {
	const latestRelease = CHANGELOG[0];
	const history = CHANGELOG.slice(1);

	return (
		<AnimatePresence>
			{isOpen && (
				<div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
					<m.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className="absolute inset-0 bg-black/60"
						onClick={onClose}
					/>
					<m.div
						initial={{ opacity: 0, scale: 0.95, y: 20 }}
						animate={{ opacity: 1, scale: 1, y: 0 }}
						exit={{ opacity: 0, scale: 0.95, y: 20 }}
						className="relative bg-backgroundPrimary w-full max-w-lg max-h-[85vh] rounded-2xl border border-primary/20 overflow-hidden flex flex-col"
					>
						<div className="relative bg-backgroundSecondary p-6 border-b border-backgroundTertiary">
							<div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary-300 via-primary-500 to-primary-300" />
							<div className="flex justify-between items-start">
								<div className="flex items-center gap-3">
									<div className="h-10 w-10 rounded-full bg-primary-container flex items-center justify-center text-primary text-xl">
										<RocketOutlined />
									</div>
									<div>
										<h2 className="text-xl font-bold text-textPrimary">
											Nouveautés
										</h2>
										<p className="text-xs text-textTertiary font-medium uppercase tracking-wider">
											Version {latestRelease.version} • {latestRelease.date}
										</p>
									</div>
								</div>
								<div className="bg-primary/10 text-primary px-2 py-1 rounded text-xs font-bold">
									NEW
								</div>
							</div>
						</div>

						{/* Content Scrollable */}
						<div className="flex-1 overflow-y-auto p-6 space-y-6">
							{/* Latest Release */}
							<div className="space-y-4">
								<h3 className="text-lg font-semibold text-textPrimary">
									{latestRelease.title}
								</h3>

								{latestRelease.features.length > 0 && (
									<ul className="space-y-3">
										{latestRelease.features.map((feat, i) => (
											<li
												key={i}
												className="flex gap-3 text-sm text-textSecondary"
											>
												<span className="shrink-0 mt-0.5 text-primary">
													<FireOutlined />
												</span>
												<span>{feat}</span>
											</li>
										))}
									</ul>
								)}

								{latestRelease.fixes && latestRelease.fixes.length > 0 && (
									<div className="pt-2">
										<h4 className="text-xs font-bold text-textTertiary uppercase mb-2">
											Corrections
										</h4>
										<ul className="space-y-2">
											{latestRelease.fixes.map((fix, i) => (
												<li
													key={i}
													className="flex gap-3 text-sm text-textTertiary"
												>
													<span className="shrink-0 mt-0.5">
														<BugOutlined />
													</span>
													<span>{fix}</span>
												</li>
											))}
										</ul>
									</div>
								)}
							</div>

							{/* History (Simplified) */}
							{history.length > 0 && (
								<div className="pt-6 border-t border-backgroundTertiary">
									<h4 className="text-sm font-bold text-textTertiary mb-4">
										Versions précédentes
									</h4>
									<div className="space-y-4">
										{history.map((rel) => (
											<div
												key={rel.version}
												className="opacity-75 hover:opacity-100 transition-opacity"
											>
												<div className="flex items-baseline justify-between mb-1">
													<span className="font-semibold text-textPrimary text-sm">
														{rel.version}
													</span>
													<span className="text-xs text-textQuaternary">
														{rel.date}
													</span>
												</div>
												<p className="text-xs text-textSecondary">
													{rel.title}
												</p>
											</div>
										))}
									</div>
								</div>
							)}
						</div>

						{/* Footer */}
						<div className="p-4 bg-backgroundSecondary border-t border-backgroundTertiary">
							<Button status="primary" className="w-full" onClick={onClose}>
								OK
							</Button>
						</div>
					</m.div>
				</div>
			)}
		</AnimatePresence>
	);
}
