export interface ISaveStore {
    set: <T>(key: string, value: T) => void;
    remove: (key: string) => void;
    get: <T>(key: string) => T | undefined;
}

export class LocalStorageSaveStore implements ISaveStore {

    constructor(private readonly _store: Storage) {}

    set = <T>(key: string, value: T) => this._store.setItem(key, JSON.stringify(value));
    remove = (key: string) => this._store.removeItem(key);
    get<T>(key: string) {
        const fromStore = this._store.getItem(key);
        if (fromStore === null) {
            return undefined;
        }
        return JSON.parse(fromStore) as T;
    }
}