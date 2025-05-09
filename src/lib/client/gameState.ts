import { getNodeKey, parseNodeKey, toNodePosition } from "../agnostic/nodeHelper";
import { SAVE_DATA_KEY, type NodePosition, type RenderableChoice, type StateCondition } from "../contentSchemaTypes";
import type { ISaveStore } from "./saveStore";

type SaveJSON = {
    // this stuff only gets updated on screen clear
    s?: string;    // scene path, "scene1:c3/scene2:node7"
    c?: string;     // made choices, "scene1:c1,scene1:c3"
    k?: string;     // true state keys, "name,name2,name3"

    l?: string;    // scene:node, last clear choice. If undefined, screen hasn't been cleared yet

    // all choices since last screen clear. Includes last screen clear and most recent choice
    h?: string;    // "scene1:c3/scene2:node7"
}

export type StateOptions = {
    autosave: boolean;
}

export interface IGameState {

    /**
     * Updates scene path.
     */
    onEnterScene(exitPos: NodePosition): void;

    /**
     * Updates scene path and returns position we exited the previous scene.
     */
    onExitScene(): NodePosition | undefined;

    /**
     * Updates choices made, sets choice condition, and saves. Handles stateCondition, choice history, onClear, etc.
     */
    onChoose(choice: Pick<RenderableChoice, "nodeId" | "sceneId" | "clearOnChoose" | "setState">): void;

    /**
     * Sets state as of last clear,
     * and returns choice history starting from last clear,
     * to be fast forwarded to current pos.
     */
    loadToLastClear(): {
        lastClear: NodePosition | undefined;
        choicePath: NodePosition[];
    };

    /**
     * Returns true if the given choice has already been visited.
     */
    wasChoiceMade(choice: Pick<RenderableChoice, "nodeId" | "sceneId">): boolean;

    /**
     * Updates state keys with the given condition if it exists,
     * and returns true if the condition was changed.
     */
    // setCondition(condition: StateCondition | undefined): boolean;

    /**
     * Returns true if the condition is met or undefined,
     * false if the condition is not met.
     */
    isConditionMet(condition: StateCondition | undefined): boolean;
}

export class GameState implements IGameState {

    // these props are up to date, but will only get saved on screen clear
    private _choices: Set<string> = new Set();
    private _keys: Set<string> = new Set();
    private _scenePath: NodePosition[] = [];    // will NOT NECESSARILY include the current scene.

    private _lastClearChoice: NodePosition | undefined;
    private _lastClearState: Omit<SaveJSON, "h" | "l"> = {}

    // [0] is last clear choice, last el is most recent choice
    private _choicePath: NodePosition[] = [];

    private _autosave: boolean = false;

    constructor(private readonly _saveStore: ISaveStore, options?: Partial<StateOptions>) {
        if (options?.autosave !== undefined) {
            this._autosave = options.autosave;
        }
    }

    onEnterScene(exitPos: NodePosition): void {
        this._scenePath.push(exitPos);
    }

    onExitScene(): NodePosition | undefined {
        return this._scenePath.pop();
    }

    onChoose(choice: Pick<RenderableChoice, "nodeId" | "sceneId" | "clearOnChoose" | "setState">) {

        this._choices.add(getNodeKey(choice));
        this._setCondition(choice.setState);

        if (choice.clearOnChoose) {
            this._updateLastClearState(choice);
        }
        else {
            this._addChoiceToPath(choice);
        }

        if (this._autosave) {
            this._save();
        }
    }

    private _addChoiceToPath(choice: NodePosition) {
        this._choicePath.push(toNodePosition(choice));
    }

    private _updateLastClearState(choice: NodePosition) {
        this._choicePath = [];
        this._lastClearChoice = toNodePosition(choice);
        this._lastClearState = {};

        const choices = [...this._choices];
        if (choices.length > 0) {
            this._lastClearState.c = choices.join(",");
        }

        const keys = [...this._keys];
        if (keys.length > 0) {
            this._lastClearState.k = keys.join(",");
        }

        if (this._scenePath.length > 0) {
            this._lastClearState.s = this._scenePath.map(getNodeKey).join("/");
        }
    }

    private _save() {

        const saveData: SaveJSON = { ...this._lastClearState };

        if (this._lastClearChoice !== undefined) {
            saveData.l = getNodeKey(this._lastClearChoice);
        }

        if (this._choicePath.length > 0) {
            saveData.h = this._choicePath.map(getNodeKey).join("/");
        }

        this._saveStore.set<SaveJSON>(SAVE_DATA_KEY, saveData);
    }

    loadToLastClear(): {
        lastClear: NodePosition | undefined;
        choicePath: NodePosition[];
    } {

        const saveData = this._saveStore.get<SaveJSON>(SAVE_DATA_KEY);
        if (saveData === undefined) {
            return {
                lastClear: undefined,
                choicePath: [],
            };
        }

        const choicePath = saveData.h?.split("/").map(parseNodeKey) ?? [];

        if (saveData.c !== undefined) {
            this._choices = new Set(saveData.c.split(","));
        }

        if (saveData.k !== undefined) {
            this._keys = new Set(saveData.k.split(","));
        }

        if (saveData.l !== undefined) {
            this._lastClearChoice = parseNodeKey(saveData.l);
        }

        if (saveData.s !== undefined) {
            this._scenePath = saveData.s.split("/").map(parseNodeKey);
        }

        if (saveData.h !== undefined) {
            this._choicePath = saveData.h.split("/").map(parseNodeKey);
        }

        this._lastClearState = saveData;

        return {
            lastClear: this._lastClearChoice,
            choicePath,
        };
    }

    wasChoiceMade(choice: Pick<RenderableChoice, "nodeId" | "sceneId">) {
        return this._choices.has(getNodeKey(choice));
    }

    isConditionMet(condition: StateCondition | undefined): boolean {
        if (condition === undefined) {
            return true;
        }

        // if not negated, condition is met when key in state
        // if negated, condition is met when key NOT in state
        return this._keys.has(condition.name) !== condition.negated;
    }

    private _setCondition(condition: StateCondition | undefined) {
        if (condition === undefined) {
            return;
        }

        if (condition.negated) {
            this._keys.delete(condition.name);
        } else {
            this._keys.add(condition.name);
        }
    }
}