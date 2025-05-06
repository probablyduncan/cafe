import type { NodePosition, RenderableChoice, RenderableLinearNode, Scene, SceneChild, SceneNode } from "../schemasAndTypes";
import { ContentContainer, type IContentContainer } from "./contentContainer";
import { EventsController, type IEventsController } from "../services/eventsController";
import { LocalStorageSaveStore, type ISaveStore } from "../services/saveStore";
import { HTTPSceneStore, type ISceneStore } from "../services/sceneStore";
import { DateProvider, type IDateProvider } from "../services/dateProvider";
import { HoursProvider, type IHoursProvider } from "../services/hoursProvider";
import { componentNodes } from "../client/componentNodes";
import { StateProvider, type IStateProvider } from "./stateProvider";

interface InitOptions {

}

type DialogueContext = {

    events: IEventsController,

    contentContainer: IContentContainer,
    initOptions: InitOptions,

    dateProvider: IDateProvider,
    hoursProvider: IHoursProvider,

    state: IStateProvider,
    // preferences: IPreferencesProvider,

    saveDb: ISaveStore,
    sceneDb: ISceneStore,
}

let context: DialogueContext;

/**
 * the purpose of this method is to init the dependencies
 */
async function setup(initOptions: InitOptions): Promise<{
    begin: () => void,
    // context: DialogueContext,
}> {


    // this is for attaching listeners and firing events
    const events: IEventsController = new EventsController(document);

    // this is for fetching scene data
    const sceneDb: ISceneStore = new HTTPSceneStore();

    // this is for interfacing with localstorage
    const saveDb: ISaveStore = new LocalStorageSaveStore(window.localStorage);

    // this is for tracking the state of the game
    // this DOES include state keys, choices, things that get saved
    // this does NOT include tracking current position.
    // Should only be updated when there is something to save
    const state: IStateProvider = new StateProvider();

    // const preferences: IPreferencesProvider = new PreferencesProvider(saveDb);

    // this is for interfacing with the DOM
    // NOT FOR BUILDING HTMLElements, just attaching them
    const contentContainer: IContentContainer = new ContentContainer("[data-content]");

    const dateProvider: IDateProvider = new DateProvider();
    const hoursProvider: IHoursProvider = new HoursProvider(dateProvider);

    context = {
        events,
        sceneDb,
        saveDb,
        state,
        // preferences,
        contentContainer,
        initOptions,
        dateProvider,
        hoursProvider,
    }

    return {
        begin: () => begin(context),
    }
}

async function begin(context: DialogueContext) {



}


async function renderAtNode(node: NodePosition) {
    let scene = await context.sceneDb.get(node.sceneId);
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
                    {
                        context.state.addSceneToPath({
                            sceneId: scene.sceneId,
                            nodeId: result.nodeId,
                        });
                        scene = await context.sceneDb.get(result.sceneId);
                        children = [{
                            nodeId: scene.entryNodeId,
                            delay: {
                                cycles: 0,
                                style: "newScene",
                            }
                        }];
                        continue;
                    }
                case "passthrough":
                    {
                        children = result.children;
                        continue;
                    }
                default:
                    {
                        await renderLinearNode(result);
                        continue;
                    }
            }
        }

        if (type === "choices") {
            // render choices, then break
            await renderChoiceGroup(result);
            break;
        }

        if (type === "none") {
            // try to traverse up the 
            const parentScenePos = context.state.popParentScene();
            if (parentScenePos === undefined) {
                break;
            }

            scene = await context.sceneDb.get(parentScenePos.sceneId);
            children = scene.nodes[parentScenePos.nodeId].children;
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

        if (!context.state.isConditionMet(child.requiredState)) {
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

async function renderLinearNode(node: RenderableLinearNode) {
    this._events.fire("nodeRenderStart", node);

    switch (node.type) {
        case "component":
            await componentNodes[node.componentKey]();
            break;
        case "image":
            break;
        case "text":
            break;
    }

    this._events.fire("nodeRenderComplete", node);
}

async function renderChoiceGroup(choices: RenderableChoice[]) {
    this._events.fire("choiceGroupRenderStart", choices);

    const groupEl = this._contentContainer.createElement("p");
    this._contentContainer.appendChild(groupEl);
    for (let i = 0; i < choices.length; i++) {

        const choiceNode = choices[i];
        const choiceEl = this._contentContainer.createElement("button");
        choiceEl.classList.add("choice");

        choiceEl.innerHTML = choiceNode.html;

        choiceEl.dataset.choice = JSON.stringify(choiceNode);
        choiceEl.dataset.choiceKey = choiceNode.number?.toLowerCase() ?? (i + 1).toString();

        if (this._state.wasChoiceMade(choiceNode)) {
            choiceEl.classList.add("visited");
        }

        choiceEl.addEventListener("click", () => this._events.fire("choose", {
            el: choiceEl,
            node: choiceNode,
        }));

        groupEl.appendChild(choiceEl);
    }

    this._events.fire("choiceGroupRenderComplete", choices);
}

async function choose(choiceEl: HTMLElement, choice?: RenderableChoice) {

    if (choice === undefined) {
        const choiceJson = choiceEl.dataset.choice;
        if (choiceJson === undefined) {
            return;
        }

        choice = JSON.parse(choiceJson) as RenderableChoice;
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

    context.state.setCondition(choice.setState);
    context.state.setChoiceMade(choice, choice.clearOnChoose);

    renderAtNode(choice);
}


export function getNodeKey(node: NodePosition): string {
    return node.sceneId + ":" + node.nodeId;
}

export function parseNodeKey(key: string): NodePosition {
    const split = key.split(":");
    return {
        sceneId: split[0],
        nodeId: split[1]
    }
}