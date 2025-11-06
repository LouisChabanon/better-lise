import { CalendarEventProps } from "@/lib/types";
import * as cheerio from "cheerio";

function CalculateEatingTime(events: CalendarEventProps[]){
    // Adjust RU events (from Crous) to fit into actual gaps during meal hours.
    // If no suitable gap is found for an RU event on a given day, the RU event
    // will be removed so it doesn't show.
    const MEAL_START_HOUR = 11; // 11:00
    const MEAL_START_MIN = 30; // 11:30
    const MEAL_END_HOUR = 13; // 13:00
    const MEAL_END_MIN = 30;
    const MIN_MEAL_DURATION_MINUTES = 30; // minimum gap to consider a meal

    // Group events by day key and retain original indices
    const byDay: Record<string, { indices: number[]; events: CalendarEventProps[] }> = {};
    events.forEach((ev, idx) => {
        const d = ev.startDate;
        const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
        if (!byDay[key]) byDay[key] = { indices: [], events: [] };
        byDay[key].indices.push(idx);
        byDay[key].events.push(ev);
    });

    // We'll create a copy and return it with RU events adjusted/removed
    const result = [...events];

    for (const dayKey of Object.keys(byDay)) {
        const { indices, events: dayEventsRaw } = byDay[dayKey];
        // Sort day events by start
        const dayEvents = dayEventsRaw.slice().sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

        // find RU events indices within this day's indices
        const ruLocalIndices = indices.filter((i) => result[i].type === "RU");
        if (ruLocalIndices.length === 0) continue; // nothing to adjust

        // build list of non-RU events for gap calculation
        const nonRu = dayEvents.filter((e) => e.type !== "RU");

        // derive meal window for the day
        const sample = dayEvents[0]?.startDate ?? new Date();
        const year = sample.getFullYear();
        const month = sample.getMonth();
        const parts = dayKey.split("-").map(Number);
        const day = parts[2];
        const mealWindowStart = new Date(year, month, day, MEAL_START_HOUR, MEAL_START_MIN, 0, 0);
        const mealWindowEnd = new Date(year, month, day, MEAL_END_HOUR, MEAL_END_MIN, 0, 0);

        // compute gaps (within meal window) from nonRu events
        const gaps: { start: Date; end: Date }[] = [];

        if (nonRu.length === 0) {
            // whole meal window is available
            const duration = (mealWindowEnd.getTime() - mealWindowStart.getTime()) / (1000 * 60);
            if (duration >= MIN_MEAL_DURATION_MINUTES) gaps.push({ start: mealWindowStart, end: mealWindowEnd });
        } else {
            // before first
            const first = nonRu[0];
            const gapStart = new Date(year, month, day, 0, 0, 0);
            const gapEnd = first.startDate;
            const s = gapStart > mealWindowStart ? gapStart : mealWindowStart;
            const e = gapEnd < mealWindowEnd ? gapEnd : mealWindowEnd;
            if ((e.getTime() - s.getTime()) / (1000 * 60) >= MIN_MEAL_DURATION_MINUTES) gaps.push({ start: s, end: e });

            // between events
            for (let i = 0; i < nonRu.length - 1; i++) {
                const a = nonRu[i];
                const b = nonRu[i + 1];
                const s2 = a.endDate > mealWindowStart ? a.endDate : mealWindowStart;
                const e2 = b.startDate < mealWindowEnd ? b.startDate : mealWindowEnd;
                if ((e2.getTime() - s2.getTime()) / (1000 * 60) >= MIN_MEAL_DURATION_MINUTES) gaps.push({ start: s2, end: e2 });
            }

            // after last
            const last = nonRu[nonRu.length - 1];
            const s3 = last.endDate > mealWindowStart ? last.endDate : mealWindowStart;
            const e3 = new Date(year, month, day, 23, 59, 59);
            const e3clamped = e3 < mealWindowEnd ? e3 : mealWindowEnd;
            if ((e3clamped.getTime() - s3.getTime()) / (1000 * 60) >= MIN_MEAL_DURATION_MINUTES) gaps.push({ start: s3, end: e3clamped });
        }

        // Assign RU events to gaps in order. If not enough gaps, remaining RU events will be removed.
        for (let k = 0; k < ruLocalIndices.length; k++) {
            const globalIdx = ruLocalIndices[k];
            const ruEvent = result[globalIdx];
            const gap = gaps[k] ?? gaps[0];
            if (!gap) {
                // remove RU event: mark as undefined
                result[globalIdx] = undefined as unknown as CalendarEventProps;
                continue;
            }
            // Clip RU event to gap ∩ mealWindow
            const newStart = gap.start > mealWindowStart ? gap.start : mealWindowStart;
            const newEnd = gap.end < mealWindowEnd ? gap.end : mealWindowEnd;
            if ((newEnd.getTime() - newStart.getTime()) / (1000 * 60) < MIN_MEAL_DURATION_MINUTES) {
                // gap too small, remove
                result[globalIdx] = undefined as unknown as CalendarEventProps;
                continue;
            }
            result[globalIdx] = { ...ruEvent, startDate: new Date(newStart), endDate: new Date(newEnd) };
        }
    }

    // return filtered array without removed RU entries
    return result.filter(Boolean) as CalendarEventProps[];

}



export function CalculateOverlaps(events: CalendarEventProps[]){
    // Adjust RU events (from Crous) to fit gaps, then use the adjusted events list
    const adjustedEvents = CalculateEatingTime(events);
    const sorted = [...adjustedEvents].sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
    const groups: number[][] = [];

    sorted.forEach((event, index) => {
        let placed = false;
        if(event.isAllDay){
            placed = true;
        }
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

export function getHiddenFields($html: cheerio.CheerioAPI) {

    const viewState = $html('input[name="javax.faces.ViewState"]').val() as string;
    const formIdInit = $html('input[name="form:idInit"]').val() as string;
    const largeurDivCentre = $html('input[name="form:largeurDivCenter"]').val() as string;

    // console.log("ViewState:", encodeURIComponent(viewState));
    // console.log("FormIdInit:", encodeURIComponent(formIdInit));
    // console.log("LargeurDivCentre:", encodeURIComponent(largeurDivCentre));

    if (!viewState || !formIdInit) {
        console.warn("Could not find required hidden fields in the HTML.");
        throw new Error("Required hidden fields not found");
    }

    // log all hidden fields
    $html('input[type="hidden"]').each((_, el) => {
        const name = $html(el).attr('name');
        const value = $html(el).val();
        //console.log(`Hidden field: ${name} = ${value}`);
    });

    return { viewState, formIdInit, largeurDivCentre };
}

export function randomGaussianGrade(): number {
    const u = 1 - Math.random();
    const v = Math.random();
    const z = Math.sqrt( -2.0 * Math.log(u)) * Math.cos( 2.0 * Math.PI * v )

    const mean = 10;
    const stDev = 2;
    let grade = z * stDev + mean;
    grade = Math.max(0, Math.min(20, grade));

    return grade;
}

export function getRarity(grade: number){
    if (grade >= 18) return { rarity: "Legendary", color: "oklch(82.8% 0.189 84.429)"}
    if (grade >= 14) return { rarity: "Epic", color: "oklch(51.8% 0.253 323.949)" }
    if (grade >= 10) return { rarity: "Common", color: "oklch(54.6% 0.245 262.881)"}
    if (grade >= 7 ) return { rarity: "Basic", color: "oklch(55.3% 0.195 38.402)" }
    return { rarity: "Poor", color: "oklch(50.5% 0.213 27.518)" } 
}