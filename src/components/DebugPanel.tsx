import { For } from "solid-js";
import { useCafeContext } from "./CafeContext";
import { useSceneStore } from "../lib/client/createSceneStore";

export function DebugPanel() {
    const { state, setState, setConfig } = useCafeContext();
    const { getScene } = useSceneStore();

    return (<>
        <h1>Debug!</h1>
        <details open data-choice-history>
            <summary>Choice History</summary>
            <For each={state.choiceHistory}>
                {choice => (
                    <button onclick={() => { }}>
                        <span>{choice.sceneId}:{choice.nodeId}</span>
                        <span></span>
                        <span>↩</span>
                    </button>
                )}
            </For>
        </details>
    </>)
}