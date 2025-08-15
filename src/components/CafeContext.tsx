import { createContext, createSignal, useContext, type JSX } from "solid-js";
import { createStore, type SetStoreFunction } from "solid-js/store";
import { type RenderableLinearNode, type RenderableChoice, type StateCondition, type SceneChild, type Scene } from "../lib/contentSchemaTypes";
import { useSceneStore } from "../lib/client/createSceneStore";

type NodePosition = {
    sceneId: string;
    nodeId: string;
}

//#region live state types

const defaultState: LiveState = {
    choices: new Map(),
    choiceHistory: [],
    keys: new Set(),
    scenePath: [],
    lastClearChoice: undefined,
    lastClearState: undefined,
}

type LiveState = {

    /**
     * All choices made, as a map of sceneIds to sets of nodeIds.
     */
    choices: Map<string, Set<string>>;

    /**
     * All choices made since (not including) the choice that last cleared the screen.
     */
    choiceHistory: NodePosition[];

    /**
     * All state keys currently true.
     */
    keys: Set<string>;

    /**
     * Nested scene path used to traverse back to parent scenes.
     * The last element is the previous scene.
     * NodeId is the node that entered the current scene.
     */
    scenePath: NodePosition[];

    /**
     * The most recent choice that cleared the screen.
     */
    lastClearChoice: NodePosition | undefined;

    /**
     * Object containing save data as of the last time the screen was cleared.
     */
    lastClearState: SerializedState_UpdatedOnClear | undefined;
}

//#endregion
//#region serialized state types

/**
 * Save data that gets updated on screen clear. Used as a starting point for reloading save.
 */
type SerializedState_UpdatedOnClear = {

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
}

/**
 * Save data that gets updated on every choice. Used to retrace choices from the last clear.
 */
type SerializedState_UpdatedOnChoose = {

    /**
     * All choices made since (not including) the last screen clear, like `"scene1:c3/scene2:node7"`.
     */
    h?: string;
}

type SerializedState = SerializedState_UpdatedOnClear & SerializedState_UpdatedOnChoose;

//#endregion
//#region ui state
type UIState = {
    nodes: RenderableLinearNode[],
    choices: RenderableChoice[],
}
//#endregion
//#region config
type LiveConfig = {
    speed: "default" | "fast";
    debug: boolean;
}
//#endregion
//#region logic

const CafeContext = createContext<{
    state: LiveState;
    setState: SetStoreFunction<LiveState>;

    /**
     * Loads data from localstorage, or resets to the deafult state if not found.
     */
    loadState: () => void;

    saveState: () => void;

    config: LiveConfig;
    setConfig: SetStoreFunction<LiveConfig>;

    uiState: UIState,
    setUIState: SetStoreFunction<UIState>;

    init: () => Promise<void>;
    renderNext: (args: { children: SceneChild[], sceneId: string }) => Promise<void>;
    enterScene: (node: Extract<RenderableLinearNode, { type: "scene" }>) => Promise<void>;
    makeChoice: (choice: RenderableChoice) => void;
}>();

export function CafeContextProvider(props: { children: JSX.Element, debug?: boolean }) {

    const [state, setState] = createStore(defaultState);

    const [uiState, setUIState] = createStore<UIState>({
        nodes: [],
        choices: [],
    });

    const [config, setConfig] = createStore<LiveConfig>({
        speed: "default",
        debug: props.debug ?? false,
    });

    const { getScene } = useSceneStore();

    // --

    function loadState() {
        const fromStorage = localStorage.getItem("state-data");
        const parsed = fromStorage ? JSON.parse(fromStorage) as LiveState : defaultState;
        setState(parsed);
    }

    function saveState() {
        localStorage.setItem("state-data", JSON.stringify(state));
    }

    // --

    function wasChoiceMade(choice: Pick<RenderableChoice, "nodeId" | "sceneId">): boolean {
        return state.choices.get(choice.sceneId)?.has(choice.nodeId) ?? false;
    }

    function setChoiceMade(choice: Pick<RenderableChoice, "nodeId" | "sceneId">): void {
        const choices = state.choices.get(choice.sceneId) ?? new Set<string>();
        setState("choiceHistory", [...state.choiceHistory, choice]);
        choices.add(choice.nodeId);
        state.choices.set(choice.sceneId, choices);
    }

    function isStateConditionMet(condition: StateCondition | undefined): boolean {
        return condition === undefined || state.keys.has(condition.name) === !condition.negated;
    }

    function setStateCondition(condition: StateCondition | undefined) {
        if (condition === undefined) {
            return;
        }

        if (condition.negated) {
            this._keys.delete(condition.name);
        } else {
            this._keys.add(condition.name);
        }
    }

    async function enterScene(node: Extract<RenderableLinearNode, { type: "scene" }>) {

        const scene = await getScene(node.sceneKey);
        if (!scene) return;

        renderNext({
            sceneId: node.sceneKey,
            children: [{
                nodeId: scene.entryNodeId,
                delay: {
                    cycles: 0,
                    style: "threeDots",
                },
            }]
        });
    }

    async function renderNext(args: { children: SceneChild[], sceneId: string }) {
        const scene = await getScene(args.sceneId);
        if (scene === undefined) {
            return;
        }

        const { type, result } = getRenderableChildren(args.children, scene);
        switch (type) {
            case "node":
                setUIState("nodes", (prev) => [...prev, result]);
                break;
            case "choices":
                setUIState("choices", result);
                break;
            case "none":
                break;
        }
    }

    function getRenderableChildren(children: SceneChild[], scene: Scene): {
        type: "node", result: RenderableLinearNode
    } | {
        type: "choices", result: RenderableChoice[]
    } | {
        type: "none", result: undefined
    } {
        const choices: RenderableChoice[] = [];
        for (let child of children) {

            if (!isStateConditionMet(child.requiredState)) {
                continue;
            }

            const node = { ...child, ...scene.nodes[child.nodeId], sceneId: scene.sceneId };

            if (node.type === "choice") {
                // add all eligable choices to be rendered
                choices.push({ ...node, visited: wasChoiceMade(node) });
            }
            else if (choices.length === 0) {
                // first eligable node is not a choice, so we just render that
                return { type: "node", result: node }
            }
        }

        if (choices.length > 0) {
            // resolve choice numbers
            choices.forEach((c, i) => { c.number ??= (i + 1).toString(); });
            return { type: "choices", result: choices };
        }

        return { type: "none", result: undefined };
    }

    function makeChoice(choice: RenderableChoice) {

        setChoiceMade(choice);
        setStateCondition(choice.setState);

        setUIState("choices", []);
        if (choice.clearOnChoose) {
            setUIState("nodes", []);
        }

        setUIState("nodes", (prev) => [...prev, {
            type: "madeChoice",
            nodeId: choice.nodeId,
            sceneId: choice.sceneId,
            html: choice.html,
            number: choice.number,
            style: choice.style,
            children: choice.children,
            delay: choice.delay,
        }]);
    }

    async function init() {

        loadState();
        const startSceneId = state.lastClearChoice?.sceneId ?? "morning-start-outside";
        const startScene = await getScene(startSceneId);

        if (!startScene) {
            return;
        }

        renderNext({
            sceneId: startSceneId,
            children: [{
                nodeId: state.lastClearChoice?.nodeId ?? startScene.entryNodeId,
                delay: {
                    cycles: 0,
                    style: "threeDots",
                }
            }],
        });
    }

    return (
        <CafeContext.Provider value={{
            init, renderNext, enterScene, makeChoice,
            state, setState, loadState, saveState,
            config, setConfig,
            uiState, setUIState,
        }}>
            {props.children}
        </CafeContext.Provider>
    )
}

export function useCafeContext() {
    const ctx = useContext(CafeContext);
    if (!ctx) throw new Error("Context is unavailable!");
    return ctx;
}

//#endregion