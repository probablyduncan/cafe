import type { NodePosition, RenderableChoice, RenderableLinearNode, Scene, SceneChild, SceneNode } from "../contentSchemaTypes";
import { componentNodes } from "./componentNodes";
import { events } from "./events";
import type { IGameState } from "./gameState";
import type { INodeRenderer } from "./nodeRenderer";
import type { ISceneStore } from "./sceneStore";


type GameDriverDeps = {
    state: IGameState;
    sceneStore: ISceneStore;
    renderer: INodeRenderer;
}

export class GameDriver {

    private _state: IGameState;
    private _sceneStore: ISceneStore;
    private _renderer: INodeRenderer;

    constructor(deps: GameDriverDeps) {
        this._state = deps.state;
        this._sceneStore = deps.sceneStore;
        this._renderer = deps.renderer;
    }

    async begin() {

        const { lastClear, choicePath } = this._state.loadToLastClear();

        const startSceneId = lastClear?.sceneId ?? "morning-start-outside";
        const defaultEntryNodeId = (await this._sceneStore.get(startSceneId)).entryNodeId;

        this.initListeners();

        let startPos = {
            nodeId: lastClear?.nodeId ?? defaultEntryNodeId,
            sceneId: startSceneId
        };

        events.fire("setupComplete");

        startPos = await this._fastForward(startPos, choicePath);
        await this.renderFromNode(startPos);
    }

    async renderFromNode(node: NodePosition) {
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
                            events.fire("enterScene", { scene });
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
                            await componentNodes[result.componentKey]({
                                state: this._state,
                                isBackRendering: false,
                            });
                            children = result.children;
                            continue;
                        }
                        case "passthrough": {
                            children = result.children;
                            continue;
                        }
                        default: {
                            await this._renderer.renderLinearNode(result);
                            children = result.children;
                            continue;
                        }
                    }
                }

                case "choices": {
                    await this._renderer.renderChoiceGroup(result);
                    return;
                }

                case "none": {
                    const parentSceneExitPos = this._state.onExitScene();
                    if (parentSceneExitPos === undefined) {
                        return;
                    }

                    scene = await this._sceneStore.get(parentSceneExitPos.sceneId);
                    events.fire("exitScene", { scene });
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

            const node = {
                ...child,
                ...scene.nodes[child.nodeId],
                sceneId: scene.sceneId,
            };

            if (node.type === "choice") {
                // add all eligable choices to be rendered
                choices.push({
                    ...node,
                    visited: this._state.wasChoiceMade(node)
                });
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

            // resolve choice numbers
            choices.forEach((c, i) => {
                c.number ??= (i + 1).toString();
            });

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

    /**
     * fast forwards all choices and returns the last choice made, i.e. where to start normal game loop from
     */
    private async _fastForward(lastScreenClear: NodePosition, choicePath: NodePosition[]): Promise<NodePosition> {

        events.fire("fastForwardStart", { lastClearChoicePos: lastScreenClear });

        // if no choices made since screen clear, then we're just rendering from last clear choice
        if (choicePath.length === 0) {
            return lastScreenClear;
        }

        // if choices have been made, we start rendering at the given node (last screen clear)
        // and fast forward all nodes until we get to the last choice in choice path. Then we return the last choice made


        // We should start back rendering after the first one and return the last one
        const choicesMade = [lastScreenClear, ...choicePath];

        for (let i = 0; i < choicesMade.length - 1; i++) {

            // first start rendering at the first choice (last clear choice)
            const choiceGroup = await this._fastForwardAtNode(choicesMade[i]);
            if (choiceGroup === undefined) {
                throw "Forwarded too fast!!";
            }

            // then get the resolved renderable choice we need to make
            const choiceToMake = choiceGroup.find(
                choice => choice.nodeId === choicesMade[i + 1].nodeId && choice.sceneId === choicesMade[i + 1].sceneId
            );

            if (choiceToMake === undefined) {
                throw "aaah";
            }

            this._renderer.backRenderChoiceMade(choiceToMake);
        }

        const lastChoiceMadePos = choicesMade.at(-1)!;
        events.fire("fastForwardComplete", { lastChoiceMadePos });
        return lastChoiceMadePos;
    }

    private async _fastForwardAtNode(node: NodePosition): Promise<RenderableChoice[] | undefined> {
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
                            await componentNodes[result.componentKey]({
                                state: this._state,
                                isBackRendering: true,
                            });
                            children = result.children;
                            continue;
                        }
                        case "passthrough": {
                            children = result.children;
                            continue;
                        }
                        default: {
                            this._renderer.backRenderLinearNode(result);
                            children = result.children;
                            continue;
                        }
                    }
                }

                case "choices": {
                    return result;
                }

                case "none": {
                    const parentSceneExitPos = this._state.onExitScene();
                    if (parentSceneExitPos === undefined) {
                        return undefined;
                    }

                    scene = await this._sceneStore.get(parentSceneExitPos.sceneId);
                    children = scene.nodes[parentSceneExitPos.nodeId].children;
                    continue;
                }
            }
        }
    }

    private initListeners() {

        // key listeners
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
                events.fire("choose", { choiceNode: choiceData });
            }
        });

        // make choice
        events.on("choose", async e => await this.choose(e.choiceNode));

        // reset
        events.on("reset", () => { this._state.reset(); });

        // goto
        events.on("goto", ({ pos }) => {
            this.renderFromNode(pos);
        });
    }

    private async choose(choice: RenderableChoice) {
        this._state.onChoose(choice);
        await this._renderer.renderChoiceMade(choice);
        await this.renderFromNode(choice);
    }
}