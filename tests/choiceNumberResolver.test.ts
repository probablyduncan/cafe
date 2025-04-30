import { test, expect } from "vitest";
import { resolveChoiceNumber } from "../src/lib/agnostic/choiceNumberResolver";

test.for([
    ["My choice", "My choice", undefined],
    ["1\\. My choice", "My choice", "1"],
    ["1. My choice", "My choice", "1"],
    ["2\\. My choice.", "My choice.", "2"],
    ["2. My choice.", "My choice.", "2"],
    [" No.", " No.", undefined],
    ["No.", "No.", undefined],
    ["A.", "A.", undefined],
    ["A\\.", "", "A"],
    ["A. First choice.", "First choice.", "A"],
    ["No. Incorrect.", "No. Incorrect.", undefined],
    ["1\\.", "", "1"],
    [undefined, "", undefined],

])("resolveChoiceNumber(\"%s\") -> { text: \"%s\", number: \"%s\" }", ([input, text, number]) => {
    expect(resolveChoiceNumber(input).text).toBe(text);
    expect(resolveChoiceNumber(input).number).toBe(number);
});