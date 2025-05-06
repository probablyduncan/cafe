import type { NodePosition, StateCondition } from "../schemasAndTypes";
import type { ISaveStore } from "./saveStore";

export interface IStateProvider {
    currentPosition: NodePosition
    firstNodeAfterClear: NodePosition;

    isConditionMet: (condition: StateCondition) => boolean;
    setCondition: (condition: StateCondition) => void;

    wasChoiceMade: (node: NodePosition) => boolean;
    setChoiceMade: (node: NodePosition) => void;
}

interface SaveDataJson {
    
}

interface SaveData {
    // so I need to store the current position (and current state?)
    // as well as the state when the screen was last cleared
    // as well as all the choices since the screen was last cleared

    // because the screen can only be cleared after a choice,
    // basically we have to store the state on last clear and the last choice
    // if the last choice *is* where the screen was last cleared, just need to save once

    choices: Set<string>;
    keys: Set<string>;
    path: {
        sceneId: string;
        exitNodeId: string;
    }[];

    lastChoice: NodePosition | undefined;
    firstNodeOfLastClear: NodePosition;

    stateAtLastClear: {
        choices: Set<string>;
        keys: Set<string>;
        path: {
            sceneId: string;
            exitNodeId: string;
        }[];
    }
}

export class StateProvider implements IStateProvider {

    // first node in current display
    private _anchor: NodePosition;

    // so if I want to go back a node, I need to know what the 

    // all choices since anchor node
    private _choiceSnapshots: NodePosition[];

    // all state keys

    private _keys: Set<string>;

    constructor(private readonly _store: ISaveStore) {
        const data = this.parseDataFromStore();
    }

    private parseDataFromStore(): SaveData | undefined {
        return this._store.get<SaveData>("save-data");
    }

    isConditionMet(condition: StateCondition) {
        // TODO
        return true;
    }

    setCondition(condition: StateCondition) {
        // TODO
    }

    wasChoiceMade: (node: NodePosition) => boolean;
    setChoiceMade: (node: NodePosition) => void;

    currentPosition: NodePosition;
    firstNodeAfterClear: NodePosition;
}