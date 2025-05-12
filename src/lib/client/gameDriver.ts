import type { NodePosition, RenderableChoice, RenderableLinearNode, Scene, SceneChild, SceneNode } from "../contentSchemaTypes";
import { componentNodes } from "./componentNodes";
import type { IGameState } from "./gameState";
import type { INodeRenderer } from "./nodeRenderer";
import type { ISceneStore } from "./sceneStore";


type GameDriverDeps = {
    state: IGameState;
    sceneStore: ISceneStore;
    nodeRenderer: INodeRenderer;
}

export class GameDriver {

    private _state: IGameState;
    private _sceneStore: ISceneStore;
    private _nodeRenderer: INodeRenderer;

    constructor(deps: GameDriverDeps) {
        this._state = deps.state;
        this._sceneStore = deps.sceneStore;
        this._nodeRenderer = deps.nodeRenderer;
    }

    async begin() {

        // here we load at the beginning
        const { lastClear, choicePath } = this._state.loadToLastClear();

        const startSceneId = lastClear?.sceneId ?? "morning-start-outside";
        const startScene = await this._sceneStore.get(startSceneId);

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
            switch (type) {

                case "node": {
                    switch (result.type) {
                        case "scene": {
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
                        }
                        case "component": {
                            await componentNodes[result.componentKey](this);
                            children = result.children;
                            continue;
                        }
                        case "passthrough": {
                            children = result.children;
                            continue;
                        }
                        default: {
                            await this._nodeRenderer.renderLinearNode(result);
                            children = result.children;
                            continue;
                        }
                    }
                }

                case "choices": {
                    await this._nodeRenderer.renderChoiceGroup(result);
                    break;
                }

                case "none": {
                    const parentSceneExitPos = this._state.onExitScene();
                    if (parentSceneExitPos === undefined) {
                        break;
                    }

                    scene = await this._sceneStore.get(parentSceneExitPos.sceneId);
                    children = scene.nodes[parentSceneExitPos.nodeId].children;
                    continue;
                }
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

    private initChoiceListener() {
        document.addEventListener("keydown", e => {

            const choiceEl = document.querySelector(
                `button.choice[data-choice-key="${e.key.toLowerCase()}"]`
            ) as HTMLElement;

            if (choiceEl) {
                e.preventDefault();

                const choiceJson = choiceEl.dataset.choice;
                if (choiceJson === undefined) {
                    return;
                }
                const choiceData = JSON.parse(choiceJson) as RenderableChoice;

                this.choose(choiceEl, choiceData);
            }
        });
    }

    private async choose(choiceEl: HTMLElement, choice: RenderableChoice) {
        this._state.onChoose(choice);
        await this._nodeRenderer.renderChoiceMade(choiceEl, choice);
        this.renderAtNode(choice);
    }
}