
export function Button({
  children,
  onClick,
  disabled = false,
  className = "",
  status = "primary",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  status?: "primary" | "secondary" | "danger";
}) {

    // Define button styles based on status
    const statusClasses = {
        primary: "text-white bg-primary hover:bg-primary-400 focus:ring-primary-50",
        secondary: "bg-white text-primary-400 hover:bg-primary-100 border border-primary-400 focus:ring-secondary-50",
        danger: "bg-danger-200 hover:bg-danger-300 focus:ring-danger-50",
    };
    let buttonClass = className + " " + statusClasses[status] + "hover:cursor-pointer focus:outline-none focus:ring-4 focus:ring-primary-100 font-medium rounded-lg px-5 py-2.5"
    if (disabled) {
        buttonClass = className + " " + "text-white bg-gray-300 cursor-not-allowed font-medium rounded-lg px-5 py-2.5 text-center"
    }
    return (
        <button
        onClick={onClick}
        disabled={disabled}
        className={buttonClass}>
        {children}
        </button>
    );
}