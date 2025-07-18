"use client";
import { useEffect, useState } from 'react';

interface CurrentTimeLineProps {
    currentDay: number;
}

const CurrentTimeLine: React.FC<CurrentTimeLineProps> = (props) => {

    const [position, setPosition] = useState<number | null>(null);

    useEffect(() => {
        const updatePosition = () => {
            const now = new Date();
            const hours = now.getHours();
            const minutes = now.getMinutes();

            if (hours < 7 || hours > 18) {
                setPosition(null); // Outside of working hours
                return null;
            }
            if( props.currentDay < 1 || props.currentDay > 5) {
                setPosition(null); // Invalid day index
                return null;
            }

            const minutesSinceStart = (hours - 7) * 60 + minutes; // Minutes since 7 AM
            const exactRow = Math.floor(minutesSinceStart / 5) + 1; // Each row represents 5 minutes
            setPosition(exactRow);
        };
        updatePosition(); // Initial position update
        const interval = setInterval(updatePosition, 60000); // Update every minute
        return () => clearInterval(interval); // Cleanup on unmount
    }, [])

    return (
        <div className={`relative col-start-${props.currentDay +1 } pointer-events-none z-40`} style={{gridRow: `${position}`}}>
            <div className="relative">
                <div className="absolute left-0 right-0 h-px bg-primary" />
                <div className="absolute -left-1 top-[-4px] h-2 w-2 rounded-full bg-primary" />
            </div>
        </div>
    );
}

export { CurrentTimeLine };