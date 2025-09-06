export default function LoadingPlaceholder() {
    return (
        <div className="flex flex-col animate-pulse">
        {/* Header Skeleton */}
        <div className="sticky top-0 z-30 flex-none bg-white shadow ring-opacity-5">
            <div className="grid grid-cols-5 text-sm sm:hidden">
            <div className="col-end-1 w-14" />
            {Array.from({ length: 5 }).map((_, i) => (
                <div
                key={i}
                className="flex flex-col items-center pt-1 pb-1 space-y-2"
                >
                <div className="h-3 w-8 rounded bg-gray-200" />
                <div className="h-8 w-8 rounded-full bg-gray-200" />
                </div>
            ))}
            </div>

            <div className="-mr-px hidden grid-cols-5 divide-x divide-gray-100 border-r border-gray-100 text-sm leading-6 sm:grid">
            <div className="col-end-1 w-14" />
            {Array.from({ length: 5 }).map((_, i) => (
                <div
                key={i}
                className="flex items-center justify-center py-3"
                >
                <div className="h-5 w-16 rounded bg-gray-200" />
                </div>
            ))}
            </div>
        </div>

        {/* Body Skeleton */}
        <div className="flex flex-auto">
            {/* Time labels */}
            <div className="sticky left-0 z-10 w-14 flex-none bg-white ring-1 ring-gray-100">
            <div className="flex flex-col space-y-6 py-4">
                {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="h-3 w-8 rounded bg-gray-200 mx-auto" />
                ))}
            </div>
            </div>

            {/* Events grid */}
            <div className="grid flex-auto grid-cols-1 grid-rows-1">
            <div
                className="col-start-1 col-end-2 row-start-1 grid divide-y divide-gray-100"
                style={{ gridTemplateRows: "repeat(24, minmax(2rem, 1fr))" }}
            >
                {Array.from({ length: 24 }).map((_, i) => (
                <div key={i} className="relative" />
                ))}
            </div>

            {/* Event placeholders */}
            <ol
                className="col-start-1 col-end-2 row-start-1 grid grid-cols-5"
                style={{ gridTemplateRows: "repeat(144, minmax(0, 1fr)) auto" }}
            >
                {Array.from({ length: 9 }).map((_, i) => {
                const col = i % 5;
                const row = Math.floor(Math.random() * 100);
                const span = Math.floor(Math.random() * 8) + 20;
                return (
                    <li
                    key={i}
                    className={`m-1 rounded-lg bg-gray-200 col-start-${col + 1}`}
                    style={{
                        gridRow: `${row} / span ${span}`,
                    }}
                    />
                );
                })}
            </ol>
            </div>
        </div>
        </div>
  );
}