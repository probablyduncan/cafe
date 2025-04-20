/**
 * Takes in a string with straight apostrophes/quotation marks and converts to opening/closing variants
 */
export function formatQuotes(input: string | undefined): string {

    if (input === undefined) {
        return "";
    }

    // '''Word -> "'Word
    // 'Word -> 'Word
    // ''Word -> "Word
    // '''Word''' -> "'Word'"
    // don't -> don't
    // '''cause'' -> "'cause"

    const rules = [
        // replace triple quotes
        [/(?<=^|\s)'''/g, "“‘"],
        ["'''", "’”"],


        // replace double quotes
        [/(?<=^|\s)"/g, "“"],
        ["\"", "”"],
        [/(?<=^|\s)''/g, "“"],
        ["''", "”"],

        // replace single quotes
        [/(?<=^|\s)'/g, "‘"],
        ["'", "’"],
    ]

    rules.forEach(([regex, replace]) => {
        input = input!.replaceAll(regex, replace as string);
    });

    return input;
}