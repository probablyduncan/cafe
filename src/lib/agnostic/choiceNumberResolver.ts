/**
 * takes markdown text and tries to extract 
 * @param text 
 */
export function resolveChoiceNumber(text: string | undefined): {
    text: string,
    number: string | undefined,
} {
    text ??= "";
    let number: string | undefined = undefined;

    const firstDot = text.indexOf(".");
    const firstSpace = text.indexOf(" ");
    const firstSlash = text.indexOf("\\");
    
    // first case: single char, single dot, no slash, like "A. First choice." or "7. Seventh choice."
    if (firstDot === 1 && firstSpace === 2) {
        number = text[firstDot - 1];
        text = text.substring(firstDot + 1).trimStart();
    }

    // second case, "1\. First." or "AAH\." or whatever. The slash means this won't just be a word
    else if (firstSlash + 1 === firstDot && (firstSpace > firstDot || firstSpace === -1)) {
        number = text.substring(0, firstDot - 1);
        text = text.substring(firstDot + 1).trimStart();
    }

    return { text, number };
}