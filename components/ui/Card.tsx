

export default function Card({ children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`max-w-md w-full bg-white p-8 rounded-2xl shadow-lg ${className}`}
    >
      {children}
    </div>
  );
}