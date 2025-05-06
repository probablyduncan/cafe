import { componentNodes } from "../client/componentNodes";
import type { RenderableChoice, RenderableLinearNode } from "../schemasAndTypes";
import type { IEventsController } from "./eventsController";
import type { IStateProvider } from "./stateProvider";

export interface IContentContainer {
    appendChild: (e: HTMLElement) => void;
    clear: () => void;
    createElement: (tag: string) => HTMLElement;
    renderLinearNode: (node: RenderableLinearNode) => Promise<void>;
    renderChoiceGroup: (choices: RenderableChoice[]) => Promise<void>;
}

export class ContentContainer implements IContentContainer {

    private readonly _container: Element;
    private readonly _document: Document;

    constructor(selector: string, private readonly _events: IEventsController, private readonly _state: IStateProvider) {
        this._document = document;
        const container = this._document.querySelector(selector);
        if (container === null) {
            throw "Content container not found.";
        }
        this._container = container;
    }

    createElement(tag: string): HTMLElement {
        return this._document.createElement(tag);
    }

    appendChild(e: Node) {
        this._container.appendChild(e);
    }

    clear() {
        this._container.innerHTML = "";
    }

    async renderLinearNode(node: RenderableLinearNode) {
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

    async renderChoiceGroup(choices: RenderableChoice[]) {
        this._events.fire("choiceGroupRenderStart", choices);

        const groupEl = this.createElement("p");
        this.appendChild(groupEl);
        for (let i = 0; i < choices.length; i++) {

            const choiceNode = choices[i];
            const choiceEl = this.createElement("button");
            choiceEl.classList.add("choice");

            choiceEl.innerHTML = choiceNode.html;

            choiceEl.dataset.choice = JSON.stringify(choiceNode);
            choiceEl.dataset.choiceKey = choiceNode.number?.toLowerCase() ?? (i + 1).toString();

            if (this._state.wasChoiceMade(choiceNode)) {
                choiceEl.classList.add("visited");
            }

            choiceEl.addEventListener("click", () => this._events.fire("choose", choiceNode));

            groupEl.appendChild(choiceEl);
        }

        this._events.fire("choiceGroupRenderComplete", choices);
    }
}