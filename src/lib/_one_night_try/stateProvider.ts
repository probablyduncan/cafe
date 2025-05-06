import type { NodePosition, StateCondition } from "../schemasAndTypes";
import { getNodeKey } from "./ok_one_night_try";

class State {
    protected choices: Set<string> = new Set();
    protected keys: Set<string> = new Set();
    protected pos: NodePosition | undefined;
}

interface StateSerializable {
    k: string;  // comma separated list of state keys that are true
    c: string;  // comma separated list of sceneid:nodeid choices made
    n: string;  // node position sceneid:nodeid
    
}

export interface IStateProvider {

    wasChoiceMade(choice: NodePosition): boolean;
    setChoiceMade(choice: NodePosition, isClear: boolean): void;

    isConditionMet(condition: StateCondition | undefined): boolean;
    setCondition(condition: StateCondition | undefined): void;

    addSceneToPath(exitPosition: NodePosition): void
    popParentScene(): NodePosition | undefined

    // lastClear: State;
    lastChoice: NodePosition | undefined;
}

export class StateProvider extends State implements IStateProvider {

    private _path: NodePosition[];

    private _stateAtLastClear: State | undefined;
    lastChoice: NodePosition | undefined;

    constructor(save: string) {
        super();
        
    }

    toSave() {

    }

    // get lastClear() {
    //     return this._stateAtLastClear ?? new State();
    // }

    popParentScene(): NodePosition | undefined {
        if (this._path.length === 0) {
            return undefined;
        }

        return this._path.pop()!;
    }

    addSceneToPath(exitPosition: NodePosition): void {
        this._path.push(exitPosition);
    }

    wasChoiceMade(choice: NodePosition) {
        return this.choices.has(getNodeKey(choice));
    }

    setChoiceMade(choice: NodePosition, isClear: boolean) {
        this.choices.add(getNodeKey(choice));
        this.lastChoice = choice;

        // if (isClear) {
        //     this._stateAtLastClear = { ...this };
        // }
    }

    isConditionMet(condition: StateCondition | undefined): boolean {
        if (condition === undefined) {
            return true;
        }

        // if not negated, condition is met when key in state
        // if negated, condition is met when key NOT in state
        return this.keys.has(condition.name) !== condition.negated;
    }

    setCondition(condition: StateCondition | undefined) {
        if (condition === undefined) {
            return;
        }

        if (condition.negated) {
            this.keys.delete(condition.name);
        } else {
            this.keys.add(condition.name);
        }
    }
}