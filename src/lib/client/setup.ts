// ok so what do we need
// we have events, which will fire to pass information between services
// so each service needs an eventsController
// can I get some way to do dependency injection for a singleton?
// maybe I have a setup class

import { EventsController, type IEventsController } from "../services/eventsController";
import { HTTPSceneStore, type ISceneStore } from "../services/sceneStore";
import { ContentContainer, type IContentContainer } from "../services/contentContainer";
import { HoursProvider, type IHoursProvider } from "../services/hoursProvider";
import { LocalStorageSaveStore, type ISaveStore } from "../services/saveStore";
import { DateProvider } from "../services/dateProvider";
import { StateProvider, type IStateProvider } from "../services/stateProvider";
import type { RenderableChoice, RenderableLinearNode, Scene, SceneChild, SceneNode } from "../schemasAndTypes";

// actions:
// load data from localstorage
// save data to localstorage
// start rendering
// reset localstorage
// enter new scene
// exit to prev scene
// get next linear node or group of choices
// render choice group
// render linear node
// make choice
// make choice with keydown
// go to specific node/scene
// revert choice
// speed up rendering
// update state variable
// 


interface Context {
    state: IStateProvider,
    scenes: ISceneStore,
    content: IContentContainer,
    hours: IHoursProvider,
    saveStore: ISaveStore,
}

interface IDebugPanel {

}

class DebugPanel implements IDebugPanel {

}







const themes = ["light", "dark", "system"] as const;
interface ISettingsProvider {
    theme: typeof themes[number];
    speed: number;
    autoplay: boolean;
}



class Renderer implements IRenderer {

    constructor(
        private readonly _contentContainer: IContentContainer,
        private readonly _eventsController: IEventsController,
        private readonly _stateProvider: IStateProvider,
    ) { }

    async renderLinearNode(node: RenderableLinearNode) {

    }

    async renderChoiceGroup(choices: RenderableChoice[]) {
        const groupEl = this._contentContainer.createElement("p");
        this._contentContainer.appendChild(groupEl);
        for (let i = 0; i < choices.length; i++) {

            const choiceNode = choices[i];
            const choiceEl = this._contentContainer.createElement("button");
            choiceEl.classList.add("choice");

            choiceEl.innerHTML = choiceNode.html;

            choiceEl.dataset.choice = JSON.stringify(choiceNode);
            choiceEl.dataset.choiceKey = choiceNode.number?.toLowerCase() ?? (i + 1).toString();

            if (this._stateProvider.wasChoiceMade(choiceNode)) {
                choiceEl.classList.add("visited");
            }

            choiceEl.addEventListener("click", () => {
                this._eventsController.fire("choose", choiceNode);
            });

            groupEl.appendChild(choiceEl);
        }
    }
}

