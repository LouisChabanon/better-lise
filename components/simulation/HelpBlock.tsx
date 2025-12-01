"use client";

import {
	InfoCircleOutlined,
	CloudUploadOutlined,
	WarningOutlined,
} from "@ant-design/icons";

export default function HelpBlock() {
	return (
		<div className="bg-primary/5 border border-primary/10 rounded-xl p-4 mb-6 flex gap-4 text-sm text-textSecondary">
			<InfoCircleOutlined className="text-primary text-lg mt-0.5" />
			<div>
				<p className="font-bold text-textPrimary mb-1">Comment ça marche ?</p>
				<ul className="list-disc pl-4 space-y-1">
					<li>
						<span className="font-bold text-textPrimary">
							Coefficients Communautaires :
						</span>{" "}
						Si un coefficient semble incorrect, changez-le et cliquez sur le
						bouton <CloudUploadOutlined className="inline text-primary" /> pour
						le partager avec les autres.
					</li>
					<li>
						<span className="font-bold text-textPrimary">UE Inconnues :</span>{" "}
						Si une note est marquée{" "}
						<span className="text-orange-500 font-bold">
							<WarningOutlined /> Autre
						</span>
						, cliquez sur le nom du code (ex: FITE_S7...) pour l'assigner à la
						bonne UE.
					</li>
				</ul>
			</div>
		</div>
	);
}
