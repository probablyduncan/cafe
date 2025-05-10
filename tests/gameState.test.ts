import { expect, test } from 'vitest'
import { type StateOptions, GameState } from '../src/lib/client/gameState'
import { SAVE_DATA_KEY } from '../src/lib/contentSchemaTypes';
import type { ISaveStore } from '../src/lib/client/saveStore';

class MockSaveStore implements ISaveStore {

    private store: Map<string, any> = new Map();

    get data() {

        return this.store.get(SAVE_DATA_KEY) ?? {};
    }

    set data(val: any | undefined) {
        if (val === undefined) {
            this.store.delete(SAVE_DATA_KEY);
        }
        else {
            this.store.set(SAVE_DATA_KEY, val);
        }
    }

    constructor(data?: any) {
        if (data !== undefined) {
            this.store.set(SAVE_DATA_KEY, data);
        }
    }

    set<T>(key: string, value: T) {
        this.store.set(key, value);
    };

    remove(key: string) {
        this.store.delete(key);
    };

    get<T>(key: string) {
        return this.store.get(key) as T;
    };
}

function createMockState(data?: any, opts?: Partial<StateOptions>) {
    const store = new MockSaveStore(data);
    const state = new GameState(store, opts);
    return { state, store };
}

test("choice tracking", () => {

    const { state } = createMockState();
    const choice = { nodeId: "i", sceneId: "s", clearOnChoose: false };
    const sameNodeNewScene = { nodeId: "i", sceneId: "s2", clearOnChoose: false };
    const sameSceneNewNode = { nodeId: "i2", sceneId: "s", clearOnChoose: false };
    const clearOnChoose = { nodeId: "i2", sceneId: "s2", clearOnChoose: true };

    expect(state.wasChoiceMade(choice)).toBe(false);
    expect(state.wasChoiceMade(sameNodeNewScene)).toBe(false);
    expect(state.wasChoiceMade(sameSceneNewNode)).toBe(false);
    expect(state.wasChoiceMade(clearOnChoose)).toBe(false);

    state.onChoose(choice);

    expect(state.wasChoiceMade(choice)).toBe(true);
    expect(state.wasChoiceMade(sameNodeNewScene)).toBe(false);
    expect(state.wasChoiceMade(sameSceneNewNode)).toBe(false);
    expect(state.wasChoiceMade(clearOnChoose)).toBe(false);

    state.onChoose(choice);
    state.onChoose(sameNodeNewScene);

    expect(state.wasChoiceMade(choice)).toBe(true);
    expect(state.wasChoiceMade(sameNodeNewScene)).toBe(true);
    expect(state.wasChoiceMade(sameSceneNewNode)).toBe(false);
    expect(state.wasChoiceMade(clearOnChoose)).toBe(false);

    state.onChoose(sameSceneNewNode);

    expect(state.wasChoiceMade(choice)).toBe(true);
    expect(state.wasChoiceMade(sameNodeNewScene)).toBe(true);
    expect(state.wasChoiceMade(sameSceneNewNode)).toBe(true);
    expect(state.wasChoiceMade(clearOnChoose)).toBe(false);

    state.onChoose(clearOnChoose);
    state.onChoose(sameSceneNewNode);

    expect(state.wasChoiceMade(choice)).toBe(true);
    expect(state.wasChoiceMade(sameNodeNewScene)).toBe(true);
    expect(state.wasChoiceMade(sameSceneNewNode)).toBe(true);
    expect(state.wasChoiceMade(clearOnChoose)).toBe(true);
});