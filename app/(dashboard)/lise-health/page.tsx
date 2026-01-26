export default function LiseHealthPage() {
	return (
		<div className="w-full h-full flex flex-col gap-4 md:pb-0 pb-24">
			<h1 className="text-2xl font-bold">Lise Health</h1>
			<div className="w-full h-full rounded-xl overflow-hidden shadow-sm border border-gray-100">
				<iframe
					width="100%"
					height="100%"
                    style={{ minHeight: "400px" }}
					frameBorder="0"
					allowFullScreen
					src="https://eu.posthog.com/embedded/3Qrvd2hDMV4jQBSlL1erKZhXnunw-w"
					sandbox="allow-scripts allow-same-origin allow-popups"
				/>
			</div>
		</div>
	);
}
