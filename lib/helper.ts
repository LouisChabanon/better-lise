import { CalendarEventProps } from "@/lib/types";

export function CalculateOverlaps(events: CalendarEventProps[]){
    const sorted =  [...events].sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
    const groups: number[][] = [];

    sorted.forEach((event, index) => {
        let placed = false;
        for (const group of groups) {
            const lastIdx = group[group.length - 1];
            if (event.startDate < sorted[lastIdx].endDate) {
                group.push(index);
                placed = true;
                break;
            }
        }
        if (!placed) {
            groups.push([index]);
        }
    });

    const mapping: Record<string, { position: number, columns: number }> = {};
    groups.forEach((group => {
        const cols = group.length;
        group.forEach((idx, pos) => {
            const id = sorted[idx].title + idx;
            mapping[id] = { position: pos, columns: cols};
        });
    }));


    return { sorted, mapping };
}


export function getMonthName(month: number): string {
    const months = [
        "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
        "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
    ];
    return months[month];
}

export function liseIdChecker(liseId: string): boolean {
    const regex = /^\d{4}-\d{4}$/;
    return regex.test(liseId);
}