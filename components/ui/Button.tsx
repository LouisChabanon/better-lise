export function Button({
	children,
	onClick,
	disabled = false,
	className = "",
	type = "button",
	status = "primary",
}: {
	children: React.ReactNode;
	onClick?: () => void;
	disabled?: boolean;
	className?: string;
	type?: "button" | "submit" | "reset";
	//status?: "primary" | "secondary" | "danger";
	status?: "primary" | "secondary";
}) {
	// Define button styles based on status
	const statusClasses = {
		primary: "text-buttonTextPrimary bg-buttonPrimaryBackground hover:bg-buttonPrimaryHover focus:ring-buttonPrimaryBorder",
		secondary: "bg-buttonBackgroundSecondary text-buttonTextSecondary hover:bg-buttonSecondaryHover border border-buttonSecondaryBorder focus:ring-buttonSecondaryHover",
		//danger: "bg-danger-200 hover:bg-danger-300 focus:ring-danger-50",
	};
	let buttonClass = className + " " + statusClasses[status] + "hover:cursor-pointer focus:outline-none focus:ring-4 focus:ring-primary-100 font-medium rounded-lg px-5 py-2.5";
	if (disabled) {
		buttonClass = className + " " + "text-buttonTextDisabled bg-buttonDisabledBackground dark:opacity-70 cursor-not-allowed font-medium rounded-lg px-5 py-2.5 text-center";
	}
	return (
		<button onClick={onClick} type={type} disabled={disabled} className={buttonClass}>
			{children}
		</button>
	);
}
