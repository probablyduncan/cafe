//#region v1

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

//#endregion
//#region v2

export type TokenBreathLength = "beat" | "stop" | "br";
const PAUSE_PASSTHROUGH_CHARS = ["”", "’", " "];
const PAUSE_STOP_CHARS = [".", "?", "!", ";", ":", "&mdash;"];
const PAUSE_BEAT_CHARS = [","];
const ALL_BREATH_CHARS = PAUSE_PASSTHROUGH_CHARS.concat(PAUSE_STOP_CHARS, PAUSE_BEAT_CHARS);

export type Token = {
    type: "char";
    content: string;
} | {
    type: "tag";
    side: "start" | "end";
    tag: string;
} | {
    type: "pause";
    length: TokenBreathLength;
}

export function htmlToTokens(html: string | undefined): Token[] {

    if (html === undefined || html === "") {
        return [];
    }

    let nextPause: TokenBreathLength | "none" = "none";

    const tokens: Token[] = [];
    for (let i = 0; i < html.length; i++) {
        const char = html[i];
        let token: Token = {
            type: "char",
            content: char,
        }

        switch (char) {
            case "&": {
                const closeIndex = html.indexOf(";", i);
                if (closeIndex === -1) {
                    break;
                }

                token.content = html.substring(i, closeIndex + 1);
                i = closeIndex;
            }
            case "<": {

                const closeIndex = html.indexOf(">", i);
                if (closeIndex === -1) {
                    break;
                }

                const side = html[i + 1] === "/" ? "end" : "start";
                if (side === "end") {
                    i++;
                }

                token = {
                    type: "tag",
                    tag: html.substring(i + 1, closeIndex),
                    side: side,
                }

                i = closeIndex;
                break;
            }
            case "\n": {
                token.content = " ";
                nextPause = "br";

                if (tokens.length > 0) {
                    const prev = tokens[tokens.length - 1];
                    if (prev.type === "char") {

                    }
                }

                // disregard spaces after \n
                while (i + 1 < html.length && html[i + 1] === " ") {
                    i++;
                }
                break;
            }
            default: {

            }
        }


        if (token.type === "char") {

            // add a breath before the next token if:
            // 1. we have a pending breath
            // 2. the next token is not a breath char
            if (nextPause !== "none" && !ALL_BREATH_CHARS.includes(token.content)) {
                tokens.push({
                    type: "pause",
                    length: nextPause,
                });
                nextPause = "none";
            }

            // otherwise, we can set the next breath if we need to
            else if (nextPause !== "br") {
                if (PAUSE_STOP_CHARS.includes(token.content)) {
                    nextPause = "stop";
                }
                else if (nextPause === "none" && PAUSE_BEAT_CHARS.includes(token.content)) {
                    nextPause = "beat";
                }
            }
        }

        tokens.push(token);
    }

    return tokens;
}

export function tokensToString(tokens: Token[]): string {
    return tokens.map(t => {
        switch (t.type) {
            case "char":
                return `|${t.content}`;
            case "tag":
                return `|<${t.side === "end" ? "/" : ""}${t.tag}>`;
            case "pause":
                return `|breath:${t.length}`;
        }
    }).join("");
}