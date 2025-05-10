import type { NodePosition, RenderableChoice, RenderableLinearNode, Scene, SceneChild, SceneNode } from "../contentSchemaTypes";
import type { IGameState } from "./gameState";
import { htmlToWords } from "../agnostic/letterSplitter";
import type { ISceneStore } from "./sceneStore";


export interface IContentContainer {
    clear: () => void;
    add: (el: HTMLElement) => void;
    scrollToEnd: () => void;
}

export interface IChoiceContainer {
    clear: () => void;
    add: (el: HTMLElement) => void;
}

type GameDriverDeps = {
    state: IGameState;
    sceneStore: ISceneStore;
    contentContainer: IContentContainer;
    choiceContainer: IChoiceContainer;
}

export class GameDriver {

    private _state: IGameState;
    private _choices: IChoiceContainer;
    private _content: IContentContainer;
    private _sceneStore: ISceneStore;

    private static BASE_DELAY: number = 4//00;

    constructor(deps: GameDriverDeps) {
        this._state = deps.state;
        this._choices = deps.choiceContainer;
        this._content = deps.contentContainer;
        this._sceneStore = deps.sceneStore;
    }

    async begin() {

        // here we load at the beginning
        const { lastClear, choicePath } = this._state.loadToLastClear();
        
        const startSceneId = lastClear?.sceneId ?? "morning-start-outside";
        const startScene = await this._sceneStore.get(startSceneId);
        const startNode = startScene.nodes[lastClear?.nodeId ?? startScene.entryNodeId];
        
        console.log("fast forward start at:", lastClear ?? "beginning");
        console.log("choice path:", choicePath);
        console.log("starting scene:", startScene);

        // TODO:
        // this.fastForward(startScene, choicePath);

        this.initChoiceListener();
        this.renderAtNode({ nodeId: lastClear?.nodeId ?? startScene.entryNodeId, sceneId: startSceneId });
    }

    async renderAtNode(node: NodePosition) {
        let scene = await this._sceneStore.get(node.sceneId);
        const startNode: SceneNode = scene.nodes[node.nodeId];
        let children: SceneChild[] = startNode.type === "choice" ? startNode.children : [{
            nodeId: node.nodeId,
            delay: {
                cycles: 0,
                style: "newScene",
            }
        }];

        while (true) {
            const { type, result } = this.getRenderableChildren(children, scene);

            if (type === "node") {
                // render node, then continue

                switch (result.type) {
                    case "text":
                        // await ___CONTENT___.renderLinearNode(result);
                        await this.renderText(result);
                        children = result.children;
                        continue;   
                    case "scene":
                        this._state.onEnterScene(result);
                        scene = await this._sceneStore.get(result.sceneKey);
                        children = [{
                            nodeId: scene.entryNodeId,
                            delay: {
                                cycles: 0,
                                style: "newScene",
                            }
                        }];
                        continue;
                    case "passthrough":
                    default:
                        children = result.children;
                        continue;
                }
            }

            if (type === "choices") {
                // render choices, then break
                // await ___CONTENT___.renderChoiceGroup(result);
                await this.renderChoices(scene, result);
                break;
            }

            if (type === "none") {
                // try to traverse up the scene path
                const parentSceneExitPos = this._state.onExitScene();
                if (parentSceneExitPos === undefined) {
                    break;
                }

                scene = await this._sceneStore.get(parentSceneExitPos.sceneId);
                children = scene.nodes[parentSceneExitPos.nodeId].children;
            }
        }
    }

    getRenderableChildren(children: SceneChild[], scene: Scene): {
        type: "node",
        result: RenderableLinearNode,
    } | {
        type: "choices",
        result: RenderableChoice[],
    } | {
        type: "none",
        result: undefined,
    } {
        const choices: RenderableChoice[] = [];
        for (let child of children) {

            if (!this._state.isConditionMet(child.requiredState)) {
                continue;
            }

            const node: SceneChild & SceneNode & NodePosition = {
                ...child,
                ...scene.nodes[child.nodeId],
                sceneId: scene.sceneId,
            };

            if (node.type === "choice") {
                // add all eligable choices to be rendered
                choices.push(node);
            }
            else if (choices.length === 0) {
                // first eligable node is not a choice, so we just render that
                return {
                    type: "node",
                    result: node,
                }
            }
        }

        if (choices.length > 0) {
            return {
                type: "choices",
                result: choices,
            };
        }

        return {
            type: "none",
            result: undefined,
        };
    }

    // private fastForward(scene: Scene, choicePath: NodePosition[]) {
    //     for (let choice of choicePath) {

    //         let startNode = {}
    //         this.renderAtNode(scene.nodes[choice.nodeId]);
    //     }
    // }

    private async renderChoices(scene: Scene, choices: RenderableChoice[]) {
        for (let i = 0; i < choices.length; i++) {
            const number = choices[i].number ?? (i + 1).toString();
            await this.renderChoice(scene, { ...choices[i], number });
            await this.wait(GameDriver.BASE_DELAY);
        }
    }

    private async renderChoice(scene: Scene, choice: RenderableChoice) {

        const el = document.createElement("button");
        el.classList.add("choice");

        el.dataset.choice = JSON.stringify(choice);
        el.dataset.choiceKey = choice.number?.toLowerCase() ?? "";

        el.innerHTML = choice.html;

        if (this._state.wasChoiceMade(choice)) {
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
            scene = await this._sceneStore.get(choice.sceneId);
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

        this._state.onChoose(choice);

        this.renderAtNode(choice);
    }

    private async renderText(node: Extract<RenderableLinearNode, { type: "text" }>) {

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
                // await this.wait(GameDriver.BASE_DELAY / 8);

                const char = words[i].chars[j];
                const charEl = document.createElement(char.tag);
                charEl.innerHTML = char.content;
                wordEl.appendChild(charEl);
                await this.wait(GameDriver.BASE_DELAY / 8);
            }

            if (i < words.length - 1) {

                const spaceEl = document.createElement("span");
                spaceEl.innerHTML = " ";
                wordEl.appendChild(spaceEl);

                // await this.wait(GameDriver.BASE_DELAY / 8);
            }

            this._content.scrollToEnd();

            switch (words[i].delay) {
                case "short":
                    await this.wait(GameDriver.BASE_DELAY / 2);
                    break;
                case "long":
                    await this.wait(GameDriver.BASE_DELAY * 2);
                    break;
                // case "none":
                //     await this.wait(GameDriver.BASE_DELAY / 4);
            }
        }

        await this.wait(GameDriver.BASE_DELAY);
    }

    private async renderDelay(delay: SceneChild["delay"], el: HTMLElement) {
        for (let i = 0; i < delay.cycles; i++) {
            switch (delay.style) {
                case "threeDots":
                    await this.renderThreeDotDelay(el);
                    await this.wait(GameDriver.BASE_DELAY);
                    break;
                case "newScene":
                    // await this.wait(GameDriver.BASE_DELAY);
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
            await this.wait(GameDriver.BASE_DELAY);
        }
        el.innerHTML = "&nbsp;";
    }

    private async wait(ms: number) {
        await new Promise(resolve => setTimeout(resolve, ms));
    }
}