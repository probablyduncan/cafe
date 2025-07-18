import { htmlToTokens } from "../agnostic/letterSplitter";
import { waitwait } from "../agnostic/waitwait";
import type { RenderableChoice, RenderableLinearNode, SceneChild } from "../contentSchemaTypes";
import { events } from "./events";

export interface INodeRenderer {

    renderLinearNode(node: RenderableLinearNode): Promise<void>;
    renderChoiceGroup(choices: RenderableChoice[]): Promise<void>;
    renderChoiceMade(choice: RenderableChoice): Promise<void>;

    backRenderLinearNode(node: RenderableLinearNode): void;
    backRenderChoiceMade(choice: RenderableChoice): void;
}

export class StandardNodeRenderer implements INodeRenderer {

    private isFast: boolean = false;
    private baseDelay: number = 400;

    private get delay(): number {
        return this.isFast ? 10 : this.baseDelay;
    }

    private _contentContainer: Element;
    constructor(contentContainerSelector: string) {

        const cc = document.querySelector(contentContainerSelector);
        if (cc === null) {
            throw `Content Container not found with selector "${contentContainerSelector}".`;
        }

        this._contentContainer = cc;

        events.on("updateSpeed", ({ isFast }) => {
            this.isFast = isFast;
        });
    }

    async renderLinearNode(node: RenderableLinearNode): Promise<void> {
        events.fire("linearNodeRenderStart", { node, isBackRendering: false });
        switch (node.type) {
            case "text":
                await this._renderTextNode(node);
                break;
        }
        events.fire("linearNodeRenderComplete", { node, isBackRendering: false, el: this._contentContainer.lastElementChild as HTMLElement });
    }

    private async _renderTextNode(node: Extract<RenderableLinearNode, { type: "text" }>) {

        const el = document.createElement("p");
        el.classList.add(node.type);
        el.classList.add(node.style);
        el.innerHTML = "&nbsp;";
        this._contentContainer.appendChild(el);
        
        await this._renderDelay(node.delay, el);
        
        const tokens = htmlToTokens(node.html);
        let started = false;
        let currentEl: HTMLElement = el;
        for (let i = 0; i < tokens.length; i++) {

            const token = tokens[i];

            switch (token.type) {
                case "char": {
                    if (!started) {
                        currentEl.innerHTML = token.content;
                        started = true;
                    }
                    else {
                        currentEl.innerHTML += token.content;
                    }
                    await waitwait(this.delay / 16);
                    break;
                }
                case "tag": {
                    if (token.side === "start") {
                        const newEl = document.createElement(token.tag);
                        currentEl.appendChild(newEl);
                        currentEl = newEl;
                    }
                    else {
                        currentEl = currentEl.parentElement!;
                    }
                    break;
                }
                case "pause": {
                    switch (token.length) {
                        case "br":
                        case "stop":
                            await waitwait(this.delay * 2);
                            break;
                        case "beat":
                            await waitwait(this.delay / 2);
                            break;
                    }
                    break;
                }
            }
        }

        await waitwait(this.delay * 2);
    }

    private async _renderDelay(delay: SceneChild["delay"], el: HTMLElement) {
        for (let i = 0; i < delay.cycles; i++) {
            switch (delay.style) {
                case "threeDots":
                    await this._renderThreeDotDelay(el);
                    await waitwait(this.delay);
                    break;
                case "newScene":
                    // await waitwait(this.delay);
                    break;
            }
        }
    }

    private async _renderThreeDotDelay(el: HTMLElement) {
        for (let i = 0; i < 3; i++) {
            const span = document.createElement("span");
            span.innerHTML = ".";
            span.classList.add("bounce");
            if (i === 0) {
                el.innerHTML = "";
            }
            el.appendChild(span);
            await waitwait(this.delay);
        }
        el.innerHTML = "&nbsp;";
    }



    // -------------------------- 



    async renderChoiceGroup(choices: RenderableChoice[]): Promise<void> {

        events.fire("choiceGroupRenderStart", { choiceGroup: choices });

        const choiceGroupEl = document.createElement("p");
        choiceGroupEl.classList.add("choice-group");
        this._contentContainer.appendChild(choiceGroupEl);

        for (let i = 0; i < choices.length; i++) {

            const choiceEl = document.createElement("button");
            choiceEl.classList.add("choice");
            choiceEl.dataset.choice = JSON.stringify(choices[i]);
            choiceEl.dataset.choiceKey = choices[i].number;
            choiceEl.innerHTML = choices[i].html;

            if (choices[i].visited) {
                choiceEl.classList.add("visited");
            }

            choiceEl.addEventListener("click", () => {
                events.fire("choose", { choiceNode: choices[i] });
            });

            choiceGroupEl.appendChild(choiceEl);
            await waitwait(this.baseDelay);
        }

        events.fire("choiceGroupRenderComplete", { choiceGroup: choices, choiceGroupEl });
    }

    async renderChoiceMade(choice: RenderableChoice): Promise<void> {

        events.fire("choiceMadeRenderStart", { choiceNode: choice, isBackRendering: false });

        if (choice.clearOnChoose) {
            this._contentContainer.innerHTML = "";
            return;
        }

        const madeChioce = document.createElement("p");
        madeChioce.innerHTML = choice.html;
        madeChioce.classList.add("choice");
        madeChioce.dataset.choiceKey = choice.number;

        this._contentContainer.querySelectorAll(".choice-group").forEach(e => e.remove());
        this._contentContainer.appendChild(madeChioce);

        events.fire("choiceMadeRenderComplete", { choiceNode: choice, isBackRendering: false, choiceMadeEl: madeChioce });
    }

    // --------------------------
    // Back rendering

    backRenderLinearNode(node: RenderableLinearNode): void {

        events.fire("linearNodeRenderStart", { node, isBackRendering: true });

        let el: HTMLElement;
        if (node.type === "text") {
            el = document.createElement("p");
            el.innerHTML = node.html;
            el.classList.add(node.type);
            el.classList.add(node.style);
            this._contentContainer.appendChild(el);
        }

        events.fire("linearNodeRenderComplete", { node, isBackRendering: true, el: el! });
    }

    backRenderChoiceMade(choice: RenderableChoice): void {

        events.fire("choiceMadeRenderStart", { choiceNode: choice, isBackRendering: true });

        const madeChoice = document.createElement("p");
        madeChoice.innerHTML = choice.html;
        madeChoice.classList.add("choice");
        madeChoice.dataset.choiceKey = choice.number;
        this._contentContainer.appendChild(madeChoice);

        events.fire("choiceMadeRenderComplete", { choiceNode: choice, isBackRendering: true, choiceMadeEl: madeChoice });
    }
}