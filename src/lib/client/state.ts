import { type Scene, type StateCondition } from "../contentSchemaTypes";

export type SaveContainer = {
    l?: string; // last choice, "sceneId:nodeId"
    p?: string; // path to current scene, "scene1Id:exitNodeId/scene2Id:exitNodeId". Will not contain scene of last choice
    c?: string; // list of nodeIds of visited choices, "c1,c3,go-around-back"
    k?: string; // list of active state keys, "sceneId:ate,sceneId:ranAway"
}

export interface SceneDb {
    get: (sceneId: string) => Promise<Scene>;
}

export interface SaveDb {
    data: SaveContainer;
}

export type StateDeps = {
    saveDb: SaveDb;
    sceneDb: SceneDb;
}

export type StateOptions = {
    autosave: boolean;
    startingScene: string;
}

export class LocalStorageSaveDb implements SaveDb {
    private static KEY = "save-data";

    get data() {
        const value = window.localStorage.getItem(LocalStorageSaveDb.KEY);
        if (value !== null) {
            return JSON.parse(value) as SaveContainer;
        }

        return {};
    }

    set data(val: SaveContainer) {
        window.localStorage.setItem(LocalStorageSaveDb.KEY, JSON.stringify(val));
    }
}

export class HttpSceneDb implements SceneDb {
    private _cache = new Map<string, Scene>();

    async get(sceneId: string): Promise<Scene> {

        if (this._cache.has(sceneId)) {
            return this._cache.get(sceneId)!;
        }

        const response = await fetch(`/cafe/api/scenes/${sceneId}.json`);
        const scene = await response.json() as Scene;
        this._cache.set(sceneId, scene);
        return scene;
    }
}

export class State {

    private _choices: Set<string>;
    private _keys: Set<string>;
    private _path: {
        sceneId: string;
        exitNodeId: string;
    }[];

    private _lastChoice: {
        sceneId: string;
        nodeId: string;
    } | undefined;

    private _currentSceneId: string;

    private _options: StateOptions;
    private static DEFAULT_OPTIONS: StateOptions = {
        autosave: true,
        startingScene: "morning-start-outside",
    }

    private _sceneDb: SceneDb;
    private _saveDb: SaveDb;

    constructor(deps: StateDeps, opts?: Partial<StateOptions>) {

        this._sceneDb = deps.sceneDb;
        this._saveDb = deps.saveDb;

        this.setOptions(opts);
        this.setDefaults();
    }

    private setDefaults() {
        this._choices = new Set();
        this._keys = new Set();
        this._path = [];
        // this._lastChoice;
        this._currentSceneId = this._options.startingScene;
    }

    private setOptions(opts: Partial<StateOptions> = {}) {
        this._options = { ...State.DEFAULT_OPTIONS };
        for (const [key, value] of Object.entries(opts)) {
            if (value === undefined || value === null) {
                continue;
            }
            this._options[key] = value;
        }
    }

    /**
     * Loads save data and returns the current scene, with correct entryNodeId
     */
    async load(): Promise<Scene> {

        if (this._options.autosave) {
            this.deserialize(this._saveDb.data);
        }

        const scene = { ... await this.getCurrentScene() };
        if (this._lastChoice !== undefined && this._lastChoice.nodeId) {
            scene.entryNodeId = this._lastChoice?.nodeId;
        }

        return scene;
    }

    private deserialize(data: SaveContainer) {

        const { l, p, c, k } = data;

        // parse last choice
        if (l !== undefined) {
            const [sceneId, nodeId] = l.trim().split(":");
            this._currentSceneId = sceneId;
            this._lastChoice = { sceneId, nodeId };
        }

        // parse path to current position
        this._path = p?.split("/").filter(str => str).map((sceneAndExitNode: string) => {
            const [sceneId, exitNodeId] = sceneAndExitNode.trim().split(":");
            return { sceneId, exitNodeId };
        }) ?? [];

        // parse sets
        this._choices = new Set(c?.split(",").filter(str => str).map(str => str.trim()));
        this._keys = new Set(k?.split(",").filter(str => str).map(str => str.trim()));
    }

    /**
     * serializes and saves the curernt state
     */
    save() {
        this._saveDb.data = this.serialize();
    }

    private autosave() {
        if (!this._options.autosave) {
            return;
        }

        this.save();
    }

    private serialize(): SaveContainer {
        const save: SaveContainer = {};

        // save last choice
        if (this._lastChoice !== undefined) {
            save.l = this._lastChoice.sceneId + ":" + this._lastChoice.nodeId;
        }

        // save scene path
        if (this._path?.length > 0) {

            // exclude the last item in the path if the last choice was in that scene,
            // because when we load this save we'll resume at the last choice

            const lastChoiceInPrevScene = (this._lastChoice?.sceneId) === (this._path.at(-1)!.sceneId);
            const path = this._path.slice(0, lastChoiceInPrevScene ? -1 : undefined);


            if (path.length > 0) {
                save.p = path.map(sc => sc.sceneId + ":" + sc.exitNodeId).join("/");
            }
        }

        // save choices
        if (this._choices.size > 0) {
            save.c = Array.from(this._choices).join(",");
        }

        // save state keys
        if (this._keys.size > 0) {
            save.k = Array.from(this._keys).join(",");
        }

        return save;
    }

    async getCurrentScene(): Promise<Scene> {
        const scene = await this._sceneDb.get(this._currentSceneId);
        return { ...scene };
    }

    // fetches new scene, adds it to hierarchy, and returns it
    async enterScene(sceneId: string, fromNodeId: string): Promise<Scene> {

        this._path.push({
            sceneId: this._currentSceneId,
            exitNodeId: fromNodeId,
        });

        this._currentSceneId = sceneId;

        this.autosave();

        return await this.getCurrentScene();
    }

    // returns scene that we're re-entering, with correct entry point set
    async exitScene(): Promise<Scene | undefined> {

        if (this._path.length === 0) {
            return undefined;
        }

        const { sceneId, exitNodeId: fromNodeId } = this._path.pop()!;
        this._currentSceneId = sceneId;

        const parentScene = await this.getCurrentScene();

        // overwrite entryNode to be the node
        // that we left the parent from
        parentScene.entryNodeId = fromNodeId;

        this.autosave();

        return parentScene;
    }

    wasChoiceMade(nodeId: string) {
        return this._choices.has(nodeId);
    }

    setChoice(nodeId: string) {

        this._lastChoice = {
            sceneId: this._currentSceneId,
            nodeId,
        }

        this._choices.add(nodeId);

        this.autosave();
    }

    isConditionMet(condition: StateCondition | undefined): boolean {
        if (condition === undefined) {
            return true;
        }

        // if not negated, condition is met when key in state
        // if negated, condition is met when key NOT in state
        return this._keys.has(condition.name) !== condition.negated;
    }

    setCondition(condition: StateCondition | undefined) {
        if (condition === undefined) {
            return;
        }

        if (condition.negated) {
            this._keys.delete(condition.name);
        } else {
            this._keys.add(condition.name);
        }

        // not autosaving here because if we revert to a prev save,
        // progress will resume at the last choice,
        // not the last condition that was set
    }
}