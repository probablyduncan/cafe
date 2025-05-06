import type { NodePosition, RenderableChoice, RenderableLinearNode, Scene, SceneChild, SceneNode, StateCondition } from "./schemasAndTypes";
import { ContentContainer, type IContentContainer } from "./services/contentContainer";
import { EventsController, type IEventsController } from "./services/eventsController";
import { LocalStorageSaveStore } from "./services/saveStore";
import { HTTPSceneStore, type ISceneStore } from "./services/sceneStore";
import { StateProvider, type IStateProvider } from "./services/stateProvider";

async function setup(initOptions: InitOptions) {

    const ___SCENEDB___: ISceneStore = new HTTPSceneStore();
    const ___EVENTS___: IEventsController = new EventsController(document);
    const ___STATE___: IStateProvider = new StateProvider(new LocalStorageSaveStore());

    const ___CONTENT___: IContentContainer = new ContentContainer("[data-content]", ___EVENTS___, ___STATE___);
    let scene: Scene;

    // window.cafeContext = {

    // }

    window.cafeContext.events.fire("setupComplete", initOptions);

    await renderAtNode(___STATE___.currentPosition);

    async function renderAtNode(node: NodePosition) {
        scene = await ___SCENEDB___.get(node.sceneId);
        const startNode: SceneNode = scene.nodes[node.nodeId];
        let children: SceneChild[] = startNode.type === "choice" ? startNode.children : [{
            nodeId: node.nodeId,
            delay: {
                cycles: 0,
                style: "newScene",
            }
        }];

        while (true) {
            const { type, result } = getRenderableChildren(children, scene);

            if (type === "node") {
                // render node, then continue

                switch (result.type) {
                    case "scene":
                        ___STATE___.scenePath.push({
                            sceneId: scene.sceneId,
                            nodeId: result.nodeId,
                        });
                        scene = await ___SCENEDB___.get(result.sceneId);
                        children = [{
                            nodeId: scene.entryNodeId,
                            delay: {
                                cycles: 0,
                                style: "newScene",
                            }
                        }];
                        continue;
                    case "passthrough":
                        children = result.children;
                        continue;
                    default:
                        await ___CONTENT___.renderLinearNode(result);
                        continue;
                }
            }

            if (type === "choices") {
                // render choices, then break
                await ___CONTENT___.renderChoiceGroup(result);
                break;
            }

            if (type === "none") {
                // try to traverse up the 
                if (___STATE___.scenePath.length === 0) {
                    break;
                }

                const { sceneId, nodeId } = ___STATE___.scenePath.pop();
                scene = await ___SCENEDB___.get(sceneId);
                children = scene.nodes[nodeId].children;
            }
        }
    }

    function getRenderableChildren(children: SceneChild[], scene: Scene): {
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

            if (!isConditionMet(child.requiredState)) {
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

    function isConditionMet(condition: StateCondition | undefined): boolean {
        if (condition === undefined) {
            return true;
        }

        return ___STATE___.keys.has(condition.name) !== condition.negated;
    }

    function setCondition(condition: StateCondition | undefined): void {
        if (condition === undefined) {
            return;
        }

        if (condition.negated) {
            ___STATE___.keys.delete(condition.name);
        } else {
            ___STATE___.keys.add(condition.name);
        }
    }

    function wasChoiceMade(choice: NodePosition): boolean {
        return ___STATE___.choicesMade.has(getNodeKey(choice));
    }

    function setChoiceMade(choice: NodePosition): void {
        ___STATE___.choicesMade.add(getNodeKey(choice));
    }


    function getNodeKey(node: NodePosition): string {
        return node.sceneId + ":" + node.nodeId;
    }

    function parseNodeKey(key: string): NodePosition {
        const split = key.split(":");
        return {
            sceneId: split[0],
            nodeId: split[1]
        }
    }
}