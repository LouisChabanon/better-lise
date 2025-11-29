export function getWeekData(weekOffset: number): {
	weekDates: Date[];
	currentDayIndex: number;
} {
	const today = new Date();
	const currentDay = today.getDay();
	const isoDay = currentDay === 0 ? 7 : currentDay;

	const monday = new Date(today);
	// Get Monday date of the week
	monday.setDate(today.getDate() - isoDay + weekOffset * 7 + 1); // Set to the previous Monday

	const weekDates: Date[] = Array.from({ length: 5 }, (_, i) => {
		const d = new Date(monday);
		d.setDate(monday.getDate() + i);
		return d;
	});

	const isWeekDay = isoDay >= 1 && isoDay <= 5; // Monday to Friday are considered weekdays
	const currentDayIndex = isWeekDay ? isoDay - 1 : null; // If it's a weekend, return null

	if (weekOffset != 0) {
		return {
			weekDates: weekDates,
			currentDayIndex: -1,
		};
	}

	return {
		weekDates: weekDates,
		currentDayIndex: isoDay - 1, // 0 for Monday, 6 for Sunday
	};
}
