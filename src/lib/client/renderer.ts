import type { Scene, SceneChild, SceneNode } from "../contentSchemaTypes";
import type { State } from "./state";
import { htmlToTokens, htmlToWords, splitHtml } from "../agnostic/letterSplitter";









// NO RECURSION??
// so I'm thinking the loop is for rendering children
// each group of children will render one child node *or* one group of choices
// we can support more later, right now it doesn't matter
// so we can basically do the rendering, and await rendering complete
// and when the children are all done, the loop continues to the next?
// or if choices, we exit the loop but clicking on a choice triggers the loop again?

// 
// THINGS TO DO
// 
// 1. animate spans of content
// 
// 2. transition to progressing with click instead of with autoplay
// and then I can add autoplay later
// 














type RenderableChild = SceneNode & SceneChild;
type RenderableChoice = Extract<SceneNode & SceneChild, { type: "choice"; }>
type RenderableNode = Exclude<SceneNode & SceneChild, { type: "choice"; }>

export interface ContentContainer {
    clear: () => void;
    add: (el: HTMLElement) => void;
    scrollToEnd: () => void;
}

export interface ChoiceContainer {
    clear: () => void;
    add: (el: HTMLElement) => void;
}

interface RendererDeps {
    state: State;
    contentContainer: ContentContainer;
    choiceContainer: ChoiceContainer;
}

export class Renderer {

    private _state: State;
    private _choices: ChoiceContainer;
    private _content: ContentContainer;

    private static BASE_DELAY: number = 400;

    constructor(deps: RendererDeps) {
        this._state = deps.state;
        this._choices = deps.choiceContainer;
        this._content = deps.contentContainer;
    }

    async begin() {
        const startScene = await this._state.load();
        console.log(startScene);

        const startNode = startScene.nodes[startScene.entryNodeId];
        const startChildren: SceneChild[] = startNode.type === "choice" ? startNode.children : [{
            nodeId: startScene.entryNodeId,
            delay: {
                cycles: 2,
                style: "newScene",
            },
        }];

        this.initChoiceListener();
        this.renderChildren(startScene, startChildren);
    }

    private async renderChildren(scene: Scene, children: SceneChild[]) {

        const choices: RenderableChoice[] = [];
        let firstValidSequentialNode: RenderableNode | undefined = undefined;

        // we can only render the first child
        // but we can also render all choices

        for (let i = 0; i < children.length; i++) {

            const _c = children[i];
            const _n = scene.nodes[_c.nodeId];
            const child: RenderableChild = { ..._c, ..._n };

            if (!this._state.isConditionMet(child.requiredState)) {
                continue;
            }

            if (child.type === "choice") {
                choices.push(child);
            }
            else if (firstValidSequentialNode === undefined) {
                firstValidSequentialNode = child;
            }
        }

        if (choices.length === 0 && firstValidSequentialNode === undefined) {
            const prevScene = await this._state.exitScene();
            if (prevScene !== undefined) {
                const entryNode = prevScene.nodes[prevScene.entryNodeId];
                this.renderChildren(prevScene, entryNode.children);
            }
            return;
        }

        if (firstValidSequentialNode !== undefined) {
            this.renderNode(scene, firstValidSequentialNode);
        }

        this.renderChoices(scene, choices);
    }

    private async renderNode(scene: Scene, node: RenderableNode) {

        switch (node.type) {
            case "text":
                await this.renderText(node);
                this.renderChildren(scene, node.children);
                break;
            case "scene":
                const newScene = await this._state.enterScene(node.sceneId, node.nodeId);
                console.log(newScene);
                this.renderChildren(newScene, [{
                    nodeId: newScene.entryNodeId,
                    delay: {
                        cycles: 2,
                        style: "newScene",
                    },
                }]);
                break;
            case "image":
                await this.renderImage(node);
                this.renderChildren(scene, node.children);
                break;
            case "component":
                await this.renderComponent(node);
                this.renderChildren(scene, node.children);
                break;
            case "passthrough":
            default:
                this.renderChildren(scene, node.children);
                break;
        }

    }

    private async renderChoices(scene: Scene, choices: RenderableChoice[]) {
        for (let i = 0; i < choices.length; i++) {
            const number = choices[i].number ?? (i + 1).toString();
            await this.renderChoice(scene, { ...choices[i], number });
            await this.wait(Renderer.BASE_DELAY);
        }
    }

    private async renderChoice(scene: Scene, choice: RenderableChoice) {

        const el = document.createElement("button");
        el.classList.add("choice");

        el.dataset.choice = JSON.stringify(choice);
        el.dataset.choiceKey = choice.number?.toLowerCase() ?? "";

        el.innerHTML = choice.html;

        if (this._state.wasChoiceMade(choice.nodeId)) {
            el.classList.add("visited");
        }

        el.onclick = () => {
            this.choose(el, scene, choice);
        }

        this._choices.add(el);
    }

    private initChoiceListener() {
        document.addEventListener("keydown", e => {
            const choiceEl = document.querySelector(`button.choice[data-choice-key="${e.key.toLowerCase()}"]`) as HTMLElement;
            if (choiceEl) {
                e.preventDefault();
                this.choose(choiceEl);
            }
        });
    }

    private async choose(choiceEl: HTMLElement, scene?: Scene, choice?: RenderableChoice) {

        if (choice === undefined) {
            const choiceJson = choiceEl.dataset.choice;
            if (choiceJson === undefined) {
                return;
            }

            choice = JSON.parse(choiceJson) as RenderableChoice;
        }

        if (scene === undefined) {
            scene = await this._state.getCurrentScene();
        }

        if (choice.clearOnChoose) {
            this._content.clear();
        }
        else {
            const madeChioce = document.createElement("p");
            madeChioce.innerHTML = choiceEl.innerHTML;
            madeChioce.classList.add("choice");
            madeChioce.dataset.choiceKey = choiceEl.dataset.choiceKey;
            this._content.add(madeChioce);
    
            this._choices.clear();
        }

        

        this._state.setCondition(choice.setState);
        this._state.setChoice(choice.nodeId);

        this.renderChildren(scene, choice.children);
    }

    private async renderText(node: Extract<RenderableNode, { type: "text" }>) {

        const el = document.createElement("p");
        el.classList.add(node.type);
        el.classList.add(node.style);
        el.innerHTML = "&nbsp;";
        this._content.add(el);
        this._content.scrollToEnd();

        await this.renderDelay(node.delay, el);

        const words = htmlToWords(node.html);
        for (let i = 0; i < words.length; i++) {
            const wordEl = document.createElement("span");

            if (i === 0) {
                el.replaceChildren(wordEl)
            }
            else {
                el.appendChild(wordEl);
            }

            for (let j = 0; j < words[i].chars.length; j++) {

                // wordEl.innerHTML += words[i].chars[j].content;
                // await this.wait(Renderer.BASE_DELAY / 8);

                const char = words[i].chars[j];
                const charEl = document.createElement(char.tag);
                charEl.innerHTML = char.content;
                wordEl.appendChild(charEl);
                await this.wait(Renderer.BASE_DELAY / 8);
            }

            if (i < words.length - 1) {

                const spaceEl = document.createElement("span");
                spaceEl.innerHTML = " ";
                wordEl.appendChild(spaceEl);

                // await this.wait(Renderer.BASE_DELAY / 8);
            }

            this._content.scrollToEnd();

            switch (words[i].delay) {
                case "short":
                    await this.wait(Renderer.BASE_DELAY / 2);
                    break;
                case "long":
                    await this.wait(Renderer.BASE_DELAY * 2);
                    break;
                // case "none":
                //     await this.wait(Renderer.BASE_DELAY / 4);
            }
        }

        this._state.setCondition(node.setState);

        await this.wait(Renderer.BASE_DELAY);
    }

    private async renderComponent(node: SceneNode) {

    }

    private async renderImage(node: SceneNode) {

    }

    private async renderDelay(delay: RenderableNode["delay"], el: HTMLElement) {
        for (let i = 0; i < delay.cycles; i++) {
            switch (delay.style) {
                case "threeDots":
                    await this.renderThreeDotDelay(el);
                    await this.wait(Renderer.BASE_DELAY);
                    break;
                case "newScene":
                    // await this.wait(Renderer.BASE_DELAY);
                    break;
            }
        }
    }

    private async renderThreeDotDelay(el: HTMLElement) {
        for (let i = 0; i < 3; i++) {
            const span = document.createElement("span");
            span.innerHTML = ".";
            span.classList.add("bounce");
            if (i === 0) {
                el.innerHTML = "";
            }
            el.appendChild(span);
            await this.wait(Renderer.BASE_DELAY);
        }
        el.innerHTML = "&nbsp;";
    }

    private async wait(ms: number) {
        await new Promise(resolve => setTimeout(resolve, ms));
    }
}