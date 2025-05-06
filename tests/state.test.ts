import { expect, test } from 'vitest'
import { State, type SaveDb, type SceneDb, type StateOptions, type SaveContainer } from '../src/lib/client/state'
import { sceneSchema, type Scene } from '../src/lib/schemasAndTypes';

class MockSaveDb implements SaveDb {
    
    private saveString: string;
    
    get data() {
        
        if (this.saveString) {
            return JSON.parse(this.saveString) as SaveContainer;
        }

        return {};
    }

    set data(val: SaveContainer) {
        this.saveString = JSON.stringify(val);
    }

    constructor(json?: string) {
        if (json !== undefined) {
            this.saveString = json;
        }
    }
}

class MockSceneDb implements SceneDb {

    scenes = [
        {
            sceneId: "testScene",
        }
    ]

    async get(sceneId: string) {
        const scene = this.scenes.find(s => s.sceneId === sceneId) ?? { sceneId, entryNodeId: "", };
        return sceneSchema.parse(scene);
    }
}

function createMockState(data?: SaveContainer, opts?: Partial<StateOptions>) {
    const sceneDb = new MockSceneDb();
    const saveDb = new MockSaveDb(JSON.stringify(data));
    const state = new State({ sceneDb, saveDb }, opts);
    return { state, sceneDb, saveDb };
}

test("last choice deserializes", () => {

    const { state } = createMockState({ l: "scene1:choice1" });

    expect(state["_lastChoice"]).toEqual({
        sceneId: "scene1",
        nodeId: "choice1",
    });
});

test("choice updates lastChoice", async () => {
    const { state } = createMockState();
    expect(state["_lastChoice"]).toBeUndefined();
    await state.enterScene("scene2", "fromNode");

    const currentScene = await state.getCurrentScene();
    expect(currentScene.sceneId).toBe("scene2");

    state.setChoice("choice2");
    expect(state["_lastChoice"]).toEqual({
        sceneId: "scene2",
        nodeId: "choice2",
    })
});

test("choices deserialize, setChoice, wasChoiceMade", async () => {
    const { state } = createMockState({ c: "c1,c2" });

    expect(state.wasChoiceMade("c1")).toBeTruthy();
    expect(state.wasChoiceMade("c3")).toBeFalsy();

    state.setChoice("c3");

    expect(state.wasChoiceMade("c3")).toBeTruthy();
});

test("serialize/deserialize are symmetrical", () => {

    const data = {
        c: "c1, c2 , lastChoice",
        l: "scene3:lastChoice",
        k: "  ate,slept",
        p: "scene1:exitNode1/scene2:exitNode2",
    }

    const { state, saveDb } = createMockState(data);

    // check private props
    expect(state["_choices"]).toEqual(new Set(["c1", "c2", "lastChoice"]));
    expect(state["_keys"]).toEqual(new Set(["ate", "slept"]));
    expect(state["_lastChoice"]).toEqual({ sceneId: "scene3", nodeId: "lastChoice" });
    expect(state["_path"]).toEqual([{ sceneId: "scene1", exitNodeId: "exitNode1" }, { sceneId: "scene2", exitNodeId: "exitNode2" }]);
    expect(state["_currentSceneId"]).toBe("scene3");

    // now see if it's deterministic
    const { state: state2 } = createMockState(saveDb.data);

    // compare first and second states
    expect(state2["_choices"]).toEqual(state["_choices"]);
    expect(state2["_keys"]).toEqual(state["_keys"]);
    expect(state2["_lastChoice"]).toEqual(state["_lastChoice"]);
    expect(state2["_path"]).toEqual(state["_path"]);
    expect(state2["_currentSceneId"]).toEqual(state["_currentSceneId"]);
})

test("exit scene", async () => {

    const { state, saveDb } = createMockState({
        c: "c1, c2 , lastChoice",
        l: "scene3:lastChoice",
        k: "  ate,slept",
        p: "scene1:exitNode1/scene2:exitNode2",
    });

    expect(saveDb.data).toEqual(JSON.parse('{"c":"c1, c2 , lastChoice","l":"scene3:lastChoice","k":"  ate,slept","p":"scene1:exitNode1/scene2:exitNode2"}'));

    const scene = await state.exitScene();

    expect(scene?.entryNodeId).toBe("exitNode2");
    expect(saveDb.data).toEqual(JSON.parse('{"l":"scene3:lastChoice","c":"c1,c2,lastChoice","k":"ate,slept","p":"scene1:exitNode1"}'));

});

test("enter scene", async () => {
    const { state } = createMockState({
        c: "c1, c2 , lastChoice",
        l: "scene3:lastChoice",
        k: "  ate,slept",
        p: "scene1:exitNode1/scene2:exitNode2",
    });

    await state.enterScene("scene4", "fromNode");
    expect(state["_currentSceneId"]).toBe("scene4");
    expect(state["_path"].at(-1)).toEqual({
        sceneId: "scene3",
        exitNodeId: "fromNode",
    });
});

test("path isn't serialized if null", async () => {

    const data = {
        c: "c1,c2,lastChoice",
        l: "scene2:lastChoice",
        k: "ate,slept",
        p: "scene1:exitNode1",
    }

    const { state, saveDb } = createMockState(data);
    expect(saveDb.data["p"]).toBe("scene1:exitNode1");

    await state.exitScene();

    expect(saveDb.data["p"]).toBeUndefined();
});

test("autosave", async () => {

    const data = {
        c: "c1,c2,lastChoice",
        l: "scene2:lastChoice",
        k: "ate,slept",
        p: "scene1:exitNode1",
    }
    
    const cases = [ true, false, undefined ];
    for (let i = 0; i < cases.length; i++) {
        const { state, saveDb } = createMockState(data, { autosave: cases[i] });

        const shouldAutosave = cases[i] ?? true;
        
        // this will save new choice
        state.setChoice("choice");
        expect(createMockState(saveDb.data).state["_choices"].has("choice")).toBe(shouldAutosave);

        // this won't change anything yet because no new choice or state key
        await state.enterScene("newScene", "newNode");
        expect(createMockState(saveDb.data).state["_currentSceneId"]).toBe("scene2");

        // now this should save and update scene, last choice, etc
        state.setChoice("wahoo");
        expect(createMockState(saveDb.data).state["_currentSceneId"]).toBe(shouldAutosave ? "newScene" : "scene2");
        expect(createMockState(saveDb.data).state["_choices"].has("wahoo")).toBe(shouldAutosave);
        expect(createMockState(saveDb.data).state["_lastChoice"]).toEqual(shouldAutosave ? { sceneId: "newScene", nodeId: "wahoo" } : { sceneId: "scene2", nodeId: "lastChoice" });
    }
});