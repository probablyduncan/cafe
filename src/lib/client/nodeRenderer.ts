import { htmlToWords } from "../agnostic/letterSplitter";
import { waitwait } from "../agnostic/waitwait";
import type { RenderableChoice, RenderableLinearNode, SceneChild } from "../contentSchemaTypes";

export interface INodeRenderer {

    renderLinearNode(node: RenderableLinearNode): Promise<void>;
    renderChoiceGroup(choices: RenderableChoice[]): Promise<void>;
    renderChoiceMade(choice: RenderableChoice): Promise<void>;

    backRenderLinearNode(node: RenderableLinearNode): void;
    backRenderChoiceMade(choice: RenderableChoice): void;
}

export class StandardNodeRenderer implements INodeRenderer {

    private baseDelay: number = 400;

    private _contentContainer: Element;
    constructor(contentContainerSelector: string) {

        const cc = document.querySelector(contentContainerSelector);
        if (cc === null) {
            throw `Content Container not found with selector "${contentContainerSelector}".`;
        }

        this._contentContainer = cc;
    }

    async renderLinearNode(node: RenderableLinearNode): Promise<void> {
        switch (node.type) {
            case "text":
                await this._renderTextNode(node);
                break;
        }
    }

    private async _renderTextNode(node: Extract<RenderableLinearNode, { type: "text" }>) {
        
        const el = document.createElement("p");
        el.classList.add(node.type);
        el.classList.add(node.style);
        el.innerHTML = "&nbsp;";
        this._contentContainer.appendChild(el);

        await this._renderDelay(node.delay, el);

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
                // await waitwait(GameDriver.BASE_DELAY / 8);

                const char = words[i].chars[j];
                const charEl = document.createElement(char.tag);
                charEl.innerHTML = char.content;
                wordEl.appendChild(charEl);
                await waitwait(this.baseDelay / 8);
            }

            if (i < words.length - 1) {

                const spaceEl = document.createElement("span");
                spaceEl.innerHTML = " ";
                wordEl.appendChild(spaceEl);

                // await waitwait(this.baseDelay / 8);
            }

            switch (words[i].delay) {
                case "short":
                    await waitwait(this.baseDelay / 2);
                    break;
                case "long":
                    await waitwait(this.baseDelay * 2);
                    break;
                // case "none":
                //     await waitwait(this.baseDelay / 4);
            }
        }

        await waitwait(this.baseDelay);
    }

    private async _renderDelay(delay: SceneChild["delay"], el: HTMLElement) {
        for (let i = 0; i < delay.cycles; i++) {
            switch (delay.style) {
                case "threeDots":
                    await this._renderThreeDotDelay(el);
                    await waitwait(this.baseDelay);
                    break;
                case "newScene":
                    // await waitwait(this.baseDelay);
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
            await waitwait(this.baseDelay);
        }
        el.innerHTML = "&nbsp;";
    }



    // -------------------------- 



    async renderChoiceGroup(choices: RenderableChoice[]): Promise<void> {

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
                // fire choice event
            });

            choiceGroupEl.appendChild(choiceEl);
            waitwait(this.baseDelay);
        }
    }

    async renderChoiceMade(choice: RenderableChoice): Promise<void> {

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
    }
    
    backRenderLinearNode(node: RenderableLinearNode): void {
        // ...
        if (node.type === "text") {
            const el = document.createElement("p");
            el.innerHTML = node.html;
            el.classList.add(node.type);
            el.classList.add(node.style);
            this._contentContainer.appendChild(el);
        }

    }

    backRenderChoiceMade(choice: RenderableChoice): void {
        const madeChioce = document.createElement("p");
        madeChioce.innerHTML = choice.html;
        madeChioce.classList.add("choice");
        madeChioce.dataset.choiceKey = choice.number;
        this._contentContainer.appendChild(madeChioce);
    }
}