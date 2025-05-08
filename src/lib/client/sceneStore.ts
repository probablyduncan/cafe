import type { Scene } from "../contentSchemaTypes";

export interface ISceneStore {
    get: (key: string) => Promise<Scene>;
}

export class HTTPSceneStore implements ISceneStore {

    private _cache: Map<string, Scene> = new Map();

    async get(key: string) {
        let scene = this._cache.get(key);
        if (scene === undefined) {
            scene = await this.fetch(key);
            this._cache.set(key, scene);
        }
        return scene;
    }

    private async fetch(key: string): Promise<Scene> {
        const response = await fetch(this.getUrl(key));
        const scene = await response.json() as Scene;
        return scene;
    }

    private getUrl = (key: string) => `/api/scenes/${key}.json`;
}