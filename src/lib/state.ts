export type State = {
    currentScene: string;
    currentNode?: string;
    sceneHierarchy: string[];

    // all keys in state
    state: Map<string, boolean>;

    // maybe this way? will this get way too big in the future?
    // stored in the format visited:{scene}:{node}
    chosen: Set<string>;
}

export const state = (() => {

    const saveState: State = getSaveDataFromStore({
        currentScene: "basic-hub",
        sceneHierarchy: [],
        state: new Map<string, boolean>(),
        chosen: new Set<string>(),
    });

    const instance = () => saveState;
    const save = () => updateSaveDataInStore(saveState);

    function setVariable(key: string, value: boolean) {
        saveState.state.set(key, value);
        save();
    }

    function setCurrentNode(node: string, scene?: string) {
        saveState.currentNode = node;
        if (scene) {
            saveState.currentScene = scene;
        }
        save();
    }

    return {
        instance,
        setVariable,
        setCurrentNode,
    }
})();

const _store_key: string = "saveData";
const _store: Storage = window.localStorage;

function getSaveDataFromStore(defaultSaveData: State): State {
    if (_store) {
        const fromStore = _store.getItem(_store_key);
        if (fromStore) {
            const saveData = JSON.parse(fromStore) as State;
            if (saveData) {
                return saveData;
            }
        }
    }

    return defaultSaveData;
}

function updateSaveDataInStore(saveData: State) {

    if (!_store) {
        return;
    }

    try {
        _store.setItem(_store_key, JSON.stringify(saveData));
    }
    catch (err) {
        console.log(err);
    }
}