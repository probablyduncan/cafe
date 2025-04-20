export type Token = {
    content: string;
    tag: string;
}

export function tokensToHtmlElements(
    tokens: Token[][],
    createWrapperElement: () => HTMLElement,
    createBreathElement: () => HTMLElement,
    createCharElement: (token: Token) => HTMLElement,
): HTMLElement {
    const wrapperEl = createWrapperElement();
    for (let i = 0; i < tokens.length; i++) {
        const breathEl = createBreathElement();
        for (let j = 0; j < tokens[i].length; j++) {
            const char = createCharElement(tokens[i][j]);
            breathEl.appendChild(char);
        }
        wrapperEl.appendChild(breathEl);
    }
    return wrapperEl;
}

/**
 * wraps each character in a tag (span, by default)
 * 
 * supports one level of nesting, so in "<em>Wow</em>, dude"
 * the chars in Wow are wrapped in individual <em> tags and the other chars are wrapped in individual <span> tags
 */
export function splitHtml(html: string): string {
    const tokens = htmlToTokens(html);
    const result = tokensToHtmlString(tokens);
    return result;
}


export function htmlToTokens(html: string): Token[][] {

    const DEFAULT_TAG = "span";
    let currentTag = DEFAULT_TAG;

    return html.split("\n").map(breath => {
        breath = breath.trim();
        const chars: Token[] = [];
        for (let i = 0; i < breath.length; i++) {

            const char = breath[i];

            // if tag, set current and skip to next char
            if (char === "<") {

                const endIndex = breath.indexOf(">", i);
                const spaceIndex = breath.indexOf(" ", i);

                if (
                    endIndex > -1
                    && (
                        endIndex < spaceIndex
                        || spaceIndex === -1
                    )
                ) {

                    currentTag = breath[i + 1] === "/"
                        ? DEFAULT_TAG
                        : breath.substring(i + 1, endIndex);

                    i = endIndex;
                    continue;
                }
            }

            // keep special char together, like "&mdash;"
            if (char === "&") {

                const endIndex = breath.indexOf(";", i);
                const spaceIndex = breath.indexOf(" ", i);

                if (
                    endIndex > -1
                    && (
                        endIndex < spaceIndex
                        || spaceIndex === -1
                    )
                ) {

                    chars.push({
                        content: breath.substring(i, endIndex + 1),
                        tag: currentTag,
                    });

                    i = endIndex;
                    continue;
                }
            }

            chars.push({
                content: char,
                tag: currentTag,
            });

        }

        return chars;
    });
}


export function tokensToHtmlString(tokens: Token[][]): string {
    let result: string = "";
    for (let i = 0; i < tokens.length; i++) {
        result += "<span>";
        for (let j = 0; j < tokens[i].length; j++) {
            const token = tokens[i][j];
            result += `<${token.tag}>`;
            result += token.content;
            result += `</${token.tag}>`;
        }

        // if not last, add space after
        if (i < tokens.length - 1) {
            result += "<span> </span>";
        }

        result += "</span>";
    }

    return result;
}