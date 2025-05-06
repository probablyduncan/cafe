import type { IDateProvider } from "./dateProvider";

export const timeslots = ["morning", "afternoon", "evening", "night", "closed"] as const;
export type Timeslot = typeof timeslots[number];
export const seasons = ["spring", "summer", "autumn", "winter"] as const;
export type Season = typeof seasons[number];

export interface IHoursProvider {
    timeslot: Timeslot;
    season: Season;
}

export class HoursProvider implements IHoursProvider {

    constructor(private readonly _dateProvider: IDateProvider) { }

    get season(): Season {
        return this._getSeasonImpl(this._dateProvider.now);
    }

    get timeslot(): Timeslot {
        return this._getTimeslotImpl(this._dateProvider.now);
    }

    private _getSeasonImpl(now: Date): Season {
        // shift to 1-based index for readability (jan is 1, dec is 12, etc)
        let month = now.getMonth() + 1;

        // if this is a month with a season change (3, 6, 9, 12) and we're not yet at the 21st day
        // decriment it so it's easier to check, so mar 20 counts as feb, for example
        if (month % 3 === 0 && now.getDate() < 21) {
            month--;
        }

        switch (month) {
            case 3:
            case 4:
            case 5:
                return "spring";
            case 6:
            case 7:
            case 8:
                return "summer";
            case 9:
            case 10:
            case 11:
                return "autumn";
            case 12:
            case 1:
            case 2:
            default:
                return "winter";
        }
    }

    private _getTimeslotImpl(now: Date): Timeslot {
        const time = now.getHours() * 60 * now.getMinutes();
        const season = this._getSeasonImpl(now);

        const baseSlotTimes: Record<Timeslot, number> = {
            morning: 7.5,
            afternoon: 12,
            evening: 19,
            night: 20.5,
            closed: 23
        }
    
        const seasonalModifiers: Record<Timeslot, number> = {
            morning: 0,
            afternoon: 0,
            evening: 1.5,
            night: 0.5,
            closed: 0,
        }

        const { morning, afternoon, evening, night, closed } = Object.keys(baseSlotTimes).reduce((prev, curr) => {
            const modifier = season === "summer" ? 1 : season === "winter" ? -1 : 0
            prev[curr] = (baseSlotTimes[curr] + seasonalModifiers[curr] * modifier) * 60;
            return prev;
        }, {} as typeof baseSlotTimes);

        const day = now.getDay();

        if (time < morning) {
            return "closed";
        }

        if (time < afternoon) {
            return "morning";
        }

        if (time < evening) {
            return "afternoon";
        }

        if (day === 0) {
            return "closed";
        }

        if (time < night) {
            return "evening";
        }

        if (day > 4 || time < closed) {
            return "night";
        }

        return "closed";
    }
}