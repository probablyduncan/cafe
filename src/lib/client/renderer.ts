import type { Scene, SceneChild, SceneNode } from "../contentSchemaTypes";
import type { State } from "./state";

















// 
// THINGS TO DO
// 
// 1. transition to progressing with click instead of with autoplay
// and then I can add autoplay later
// 
// 2. switch single quote &#39; to real quotes that look nicer
// 
// 3. add inline pauses in text nodes?
// maybe think about what an mvp requires?
// 














type RenderableChild = SceneNode & SceneChild;
type RenderableChoice = Extract<SceneNode & SceneChild, { type: "choice"; }>
type RenderableNode = Exclude<SceneNode & SceneChild, { type: "choice"; }>

export interface ContentContainer {
    clear: () => void;
    add: (el: HTMLElement) => void;
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

    private static BASE_DELAY: number = 1000;

    constructor(deps: RendererDeps) {
        this._state = deps.state;
        this._choices = deps.choiceContainer;
        this._content = deps.contentContainer;
    }

    async begin() {
        const startScene = await this._state.getCurrentScene();
        console.log(startScene);
        this.renderChildren(startScene, [{
            nodeId: startScene.entryNodeId,
            delay: {
                cycles: 2,
                style: "newScene",
            },
            clearPrevious: false,
        }])
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
            console.log(prevScene);
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
                    clearPrevious: false,
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
            await this.renderChoice(scene, choices[i]);
            await this.wait(100);
        }
    }

    private async renderChoice(scene: Scene, choice: RenderableChoice) {

        const el = document.createElement("button");
        el.classList.add("choice");
        el.innerHTML = choice.html;

        if (this._state.wasChoiceMade(choice.nodeId)) {
            el.classList.add("visited");
        }

        el.onclick = () => {

            this._choices.clear();

            if (true || choice.clearPrevious) {
                this._content.clear();
            }

            this._state.setCondition(choice.setState);
            this._state.setChoice(choice.nodeId);

            this.renderChildren(scene, choice.children);
        };

        this._choices.add(el);
    }

    private async renderText(node: Extract<RenderableNode, { type: "text" }>) {

        if (node.clearPrevious) {
            this._content.clear();
        }

        const el = document.createElement("p");

        await this.renderDelay(node.delay, el);

        el.classList.add(node.type);
        el.classList.add(node.style);
        el.innerHTML = node.html;

        this._content.add(el);
        this._state.setCondition(node.setState);

        await this.wait(Renderer.BASE_DELAY);
    }

    private async enterScene(node: SceneNode) {

    }

    private async passThrough(node: SceneNode) {

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
            span.classList.add("bounce");
            el.appendChild(span);
            await this.wait(50);
        }
    }

    private async wait(ms: number) {
        await new Promise(resolve => setTimeout(resolve, ms));
    }
}