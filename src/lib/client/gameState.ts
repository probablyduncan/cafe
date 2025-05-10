import { getNodeKey, nodePositionsToPath, parseNodeKey, pathToNodePositions, toNodePosition } from "../agnostic/nodeHelper";
import { SAVE_DATA_KEY, type NodePosition, type RenderableChoice, type StateCondition } from "../contentSchemaTypes";
import type { ISaveStore } from "./saveStore";

/**
 * Save data that gets updated on screen clear. Used as a starting point for reloading save.
 */
type SaveState_UpdatedOnClear = {

    /**
     * Path from base to current nested scene, like `"scene1:c3/scene2:node7"`.
     * If undefined, we're not in a nested scene, and ending this scene will end the game.
     */
    s?: string;
    
    /**
     * All visited choices, like `"scene1:c1,scene1:c3"`.
     * If undefined, no chocies have been made.
     */
    c?: string;

    /**
     * All true state keys, like `"name,name2,name3"`.
     * If undefined, no keys are true.
     */
    k?: string;

    /**
     * Last choice that cleared the screen, like `"scene7:node3"`.
     * If undefined, screen hasn't been cleared yet. 
     */
    l?: string;
};

/**
 * Save data that gets updated on every choice. Used to retrace choices from the last clear.
 */
type SaveState_UpdatedOnChoose = {
    
    /**
     * All choices made since (not including) the last screen clear, like `"scene1:c3/scene2:node7"`.
     */
    h?: string;
}

type SaveState = SaveState_UpdatedOnClear & SaveState_UpdatedOnChoose;

export type StateOptions = {
    /**
     * If true, choices/state/etc will be saved every time a choice is made.
     */
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
     * Can be used to manually save the game.
     * Useful if autosave is off.
     */
    save(): void;

    /**
     * Returns true if the given choice has already been visited.
     */
    wasChoiceMade(choice: Pick<RenderableChoice, "nodeId" | "sceneId">): boolean;

    /**
     * Returns true if the condition is met or undefined,
     * false if the condition is not met.
     */
    isConditionMet(condition: StateCondition | undefined): boolean;
}

export class GameState implements IGameState {
    /**
     * All choices made, as node keys like `"scene2:node4"`.
     */
    private _choices: Set<string> = new Set();

    /**
     * All state keys currently true.
     */
    private _keys: Set<string> = new Set(); 
    
    /**
     * Nested scene path used to traverse back to parent scenes.
     * The last element is the previous scene.
     * NodeId is the node that entered the current scene.
     */
    private _scenePath: NodePosition[] = [];

    /**
     * The most recent choice that cleared the screen.
     */
    private _lastClearChoice: NodePosition | undefined;

    /**
     * LastClearStateJSON containing save data as of the last time the screen was cleared.
     */
    private _lastClearState: SaveState_UpdatedOnClear = {}

    /**
     * All choices made since (not including) the choice that last cleared the screen.
     */
    private _choicePath: NodePosition[] = [];

    private _options: StateOptions;
    private static DEFAULT_OPTIONS: StateOptions = {
        autosave: true,
    }

    constructor(private readonly _saveStore: ISaveStore, options?: Partial<StateOptions>) {
        this._setOptions(options);
    }

    private _setOptions(options?: Partial<StateOptions>) {
        this._options = { ...GameState.DEFAULT_OPTIONS };

        if (options === undefined) {
            return;
        }

        for (const [key, value] of Object.entries(options)) {
            if (value !== undefined && value !== null) {
                this._options[key] = value;
            }
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

        if (this._options.autosave) {
            this.save();
        }
    }

    private _addChoiceToPath(choice: NodePosition) {
        this._choicePath.push(toNodePosition(choice));
    }

    private _updateLastClearState(choice: NodePosition) {
        this._choicePath = [];
        this._lastClearChoice = toNodePosition(choice);

        this._lastClearState = {};
        this._lastClearState.l = getNodeKey(choice);

        const choices = [...this._choices];
        if (choices.length > 0) {
            this._lastClearState.c = choices.join(",");
        }

        const keys = [...this._keys];
        if (keys.length > 0) {
            this._lastClearState.k = keys.join(",");
        }

        if (this._scenePath.length > 0) {
            this._lastClearState.s = nodePositionsToPath(this._scenePath);
        }
    }

    save() {

        const saveData: SaveState = { ...this._lastClearState };

        if (this._choicePath.length > 0) {
            saveData.h = nodePositionsToPath(this._choicePath);
        }

        this._saveStore.set<SaveState>(SAVE_DATA_KEY, saveData);
    }

    loadToLastClear(): {
        lastClear: NodePosition | undefined;
        choicePath: NodePosition[];
    } {

        const saveData = this._saveStore.get<SaveState>(SAVE_DATA_KEY);
        if (saveData === undefined) {
            return {
                lastClear: undefined,
                choicePath: [],
            };
        }

        if (saveData.c !== undefined) {
            this._choices = new Set(saveData.c.split(","));
        }

        if (saveData.k !== undefined) {
            this._keys = new Set(saveData.k.split(","));
        }

        if (saveData.l !== undefined) {
            this._lastClearChoice = parseNodeKey(saveData.l);
        }

        this._scenePath = pathToNodePositions(saveData.s);
        this._choicePath = pathToNodePositions(saveData.h);

        this._lastClearState = saveData;

        return {
            lastClear: this._lastClearChoice,
            choicePath: this._choicePath,
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