window.state = (() => {

    const saveData: SaveData = getSaveDataFromStore({
        currentNode: "basic",
        currentScene: "i",
        state: {},
    });

    const get = () => saveData;
    const save = () => updateSaveDataInStore(saveData);

    function setVariable(key: string, value: boolean) {
        saveData.state[key] = value;
        save();
    }

    function setCurrentNode(node: string, scene?: string) {
        saveData.currentNode = node;
        save();
    }

    return {
        get,
        setVariable,
        setCurrentNode,
    }
})();

const _store_key = "saveData";
const _store = window.localStorage;

function getSaveDataFromStore(defaultSaveData: SaveData): SaveData {
    if (_store) {
        const fromStore = _store.getItem(_store_key);
        if (fromStore) {
            const saveData = JSON.parse(fromStore) as SaveData;
            if (saveData) {
                return saveData;
            }
        }
    }

    return defaultSaveData;
}

function updateSaveDataInStore(saveData: SaveData) {

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