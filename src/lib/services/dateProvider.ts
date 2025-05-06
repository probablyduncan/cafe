export interface IDateProvider {
    now: Date;
}

export class DateProvider implements IDateProvider {
    get now(): Date {
        return new Date();
    }
}