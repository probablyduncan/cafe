export interface IContentContainer {
    appendChild: (e: HTMLElement) => void;
    clear: () => void;
    createElement: (tag: string) => HTMLElement;
}

export class ContentContainer implements IContentContainer {

    private readonly _container: Element;
    private readonly _document: Document;

    constructor(selector: string) {
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
}