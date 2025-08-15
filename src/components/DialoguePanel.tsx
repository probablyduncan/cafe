import { createSignal, For, onCleanup, onMount } from "solid-js"
import {
    type RenderableLinearNode,
    type RenderableChoice,
} from "../lib/contentSchemaTypes";
import { useCafeContext } from "./CafeContext";
import { htmlToTokens } from "../lib/agnostic/letterSplitter";
import { waitwait } from "../lib/agnostic/waitwait";
import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
import style from "./dialogue.module.css";

export function DialoguePanel() {

    const { init, renderNext, enterScene, makeChoice, state, setState, uiState, setUIState } = useCafeContext();

    onMount(init);

    return (
        <div class={style.content}>
            <For each={uiState.nodes}>
                {(node) => {
                    switch (node.type) {
                        case "text":
                            return <TextNode {...node} onRenderComplete={() => renderNext(node)} />;
                        case "madeChoice":
                            return <MadeChoiceNode {...node} onRenderComplete={() => renderNext(node)} />;
                        case "scene":
                            enterScene(node);
                            break;
                        case "passthrough":
                            renderNext(node);
                            break;
                    }
                }}
            </For>
            <ChoiceList choices={uiState.choices} onChoose={makeChoice} />
        </div>
    );
}

function ChoiceList(props: {
    choices: RenderableChoice[];
    onChoose: (choice: RenderableChoice) => void;
}) {

    let ulRef: HTMLUListElement | undefined; 
    function handleKeyPress(e: KeyboardEvent) {
        if (!ulRef) {
            return;
        }

        const choice = ulRef.querySelector(`button[data-choice-key="${e.key.toLowerCase()}"]`) as HTMLButtonElement;
        if (choice) {
            e.preventDefault();
            choice?.click();
        }
    }
    
    onMount(() => {
        window.addEventListener("keypress", handleKeyPress);
    })

    onCleanup(() => {
        window.removeEventListener("keypress", handleKeyPress);
    })

    return (
        <ul class={style["choice-group"]} ref={ulRef}>
            <For each={props.choices}>
                {(choice) => (
                    <li>
                        <button
                            class={style.choice + (choice.visited ? ` ${style.visited}` : "")}
                            data-choice-key={choice.number?.toLowerCase()}
                            innerHTML={choice.html}
                            onclick={() => props.onChoose(choice)}
                        />
                    </li>
                )}
            </For>
        </ul>
    )
}

function TextNode(props: Extract<RenderableLinearNode, { type: "text" }> & { onRenderComplete: () => void }) {

    const [html, setHtml] = createSignal("&nbsp;");
    // let ref: HTMLParagraphElement | undefined;

    const { config } = useCafeContext();
    const delay = () => {
        switch (config.speed) {
            case "fast":
                return 8.33333333;
            case "default":
            default:
                return 83.33333333;
        }
    }

    async function render() {

        window.addEventListener("keypress", handleSkip, { once: true });

        let skipped = false;
        function handleSkip({ key }) {
            if (key === " ") {
                skipped = true;
            }
        }

        const tokens = htmlToTokens(props.html);
        for (let i = 0; i < tokens.length; i++) {

            if (skipped) {
                setHtml(props.html);
                break;
            }

            const token = tokens[i];

            function appendHtml(content: string) {
                if (i === 0) {
                    setHtml(content);
                }
                else {
                    setHtml((prev) => prev + content);
                }
            }

            switch (token.type) {
                case "char":
                    appendHtml(token.content);
                    await waitwait(delay() / 2);
                    break;
                case "tag":
                    const slash = token.side === "end" ? "/" : "";
                    appendHtml(`<${slash}${token.tag}>`);
                    break;
                case "pause":
                    switch (token.length) {
                        case "br":
                        case "stop":
                            await waitwait(delay() * 6);
                            break;
                        case "beat":
                            await waitwait(delay() * 2);
                    }
                    break;
            }
        }

        window.removeEventListener("keypress", handleSkip);
        await waitwait(delay() * (skipped ? 6 : 12));
    }

    onMount(() => {
        render().then(props.onRenderComplete);

        // gsap.registerPlugin(SplitText);
        // const split = SplitText.create(ref!, {
        //     type: "words",
        // });

        // gsap.from(split.words, {
        //     delay: 1,
        //     autoAlpha: 0,
        //     duration: 0.0833333333 * 4,
        //     stagger: 0.08333333333 / 2,
        //     // y: 10,
        //     // x: -10,
        // }).then(props.onRenderComplete);
    });

    return (
        <p
            // ref={ref}
            innerHTML={html()}
            class={style.text}
        />
    );
}

function MadeChoiceNode(props: Extract<RenderableLinearNode, { type: "madeChoice" }> & { onRenderComplete: () => void }) {

    async function render(): Promise<void> {
        return;
    }

    onMount(() => {
        render().then(props.onRenderComplete);
    });

    return (
        <p
            class={style.choice}
            data-choice-key={props.number}
            innerHTML={props.html}
        />
    )
}






