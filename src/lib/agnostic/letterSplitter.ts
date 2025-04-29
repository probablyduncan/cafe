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


// this should be split into breaths, then words, then letter
// 

// return Token[][][]

export type Char = {
    tag: string;
    content: string;
}

export type Word = {
    chars: Char[];
    delay: "long" | "short" | "none";
}

export function htmlToWords(html: string) {

    // see whether this word ends in punctuation
    function setWordDelay(word: Word) {

        const longDelayPunctuation = [".", "?", "!", ";", "&mdash;",];
        const shortDelayPunctuation = [",",];
        const breathWraps = ["”", "’", " ",];

        let i = word.chars.length - 1;
        while (i >= 0 && breathWraps.includes(word.chars[i].content)) {
            i--;
        }

        if (shortDelayPunctuation.includes(word.chars[i].content)) {
            word.delay = "short";
        }
        else if (longDelayPunctuation.includes(word.chars[i].content)) {
            word.delay = "long";
        }
    }

    const DEFAULT_TAG = "span";
    let currentTag = DEFAULT_TAG;

    const words: Word[] = [];

    const wordsHtml = html.split(" ");
    for (let i = 0; i < wordsHtml.length; i++) {
        const wordHtml = wordsHtml[i];

        if (wordHtml === "") {
            continue;
        }

        const word: Word = {
            chars: [],
            delay: "none",
        }

        for (let j = 0; j < wordHtml.length; j++) {
            const char = wordHtml[j];

            switch (char) {

                // set current tag and skip to end of tag
                case "<": {
                    const endIndex = wordHtml.indexOf(">", j);
                    const spaceIndex = wordHtml.indexOf(" ", j);

                    if (
                        endIndex > -1
                        && (
                            endIndex < spaceIndex
                            || spaceIndex === -1
                        )
                    ) {
                        currentTag = wordHtml[j + 1] === "/"
                            ? DEFAULT_TAG
                            : wordHtml.substring(j + 1, endIndex);

                        j = endIndex;
                        continue;
                    }
                    break;
                }

                // extract encoded char and keep together
                case "&": {
                    const endIndex = wordHtml.indexOf(";", j);
                    const spaceIndex = wordHtml.indexOf(" ", j);

                    if (
                        endIndex > -1
                        && (
                            endIndex < spaceIndex
                            || spaceIndex === -1
                        )
                    ) {

                        // push new char
                        word.chars.push({
                            content: wordHtml.substring(j, endIndex + 1),
                            tag: currentTag
                        });

                        j = endIndex;
                        continue;
                    }
                    break;
                }

                // if line break, this is pause.
                case "\n": {
                    word.delay = "long";
                    continue;
                }
            }

            word.chars.push({
                content: char,
                tag: currentTag,
            })
        }

        // check if we should pause after this word
        if (word.delay === "none") {
            setWordDelay(word)
        }

        words.push(word);
    }

    return words;
}