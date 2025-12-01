"use client";

import { useState } from "react";
import {
	InfoCircleOutlined,
	CloudUploadOutlined,
	WarningOutlined,
	CloseOutlined,
} from "@ant-design/icons";
import { motion, AnimatePresence } from "framer-motion";

export default function HelpBlock() {
	const [isVisible, setIsVisible] = useState(true);

	if (!isVisible) return null;

	return (
		<AnimatePresence>
			<motion.div
				initial={{ opacity: 0, y: -10 }}
				animate={{ opacity: 1, y: 0 }}
				exit={{ opacity: 0, height: 0 }}
				className="bg-primary-50 border border-primary-100 rounded-2xl p-4 mb-6 relative overflow-hidden group transition-colors duration-300"
			>
				<button
					onClick={() => setIsVisible(false)}
					className="absolute top-2 right-2 p-2 text-primary-400 hover:text-primary-600 hover:bg-primary-100 rounded-full transition-colors"
				>
					<CloseOutlined />
				</button>

				<div className="flex gap-4">
					<div className="p-3 bg-backgroundPrimary rounded-full h-fit shadow-sm text-primary shrink-0 transition-colors duration-300">
						<InfoCircleOutlined className="text-xl" />
					</div>
					<div className="text-sm text-textSecondary pr-6">
						<p className="font-bold text-textPrimary mb-2 text-base">
							Comment ça marche ?
						</p>
						<div className="grid md:grid-cols-2 gap-4">
							<div className="flex gap-3 items-start">
								<CloudUploadOutlined className="text-primary mt-1" />
								<p>
									<span className="font-semibold text-textPrimary">
										Participez :
									</span>{" "}
									Modifiez les coefficients incorrects et cliquez sur l'icône de
									nuage pour les partager aux autres.
								</p>
							</div>
							<div className="flex gap-3 items-start">
								<WarningOutlined className="text-badgeWarningText mt-1" />
								<p>
									<span className="font-semibold text-textPrimary">
										Organisez :
									</span>{" "}
									Si une note est "Non classée", cliquez sur son code
									(FITE_S7....) pour l'assigner au bon UE.
								</p>
							</div>
						</div>
					</div>
				</div>
			</motion.div>
		</AnimatePresence>
	);
}
