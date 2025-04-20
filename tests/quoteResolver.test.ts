import { expect, test } from 'vitest'
import { formatQuotes } from '../src/lib/agnostic/quoteResolver';

test.for([
    ["''Hey''", "“Hey”"],
    ["''Hey", "“Hey"],
    ["Hey''", "Hey”"],
    ["\"Hey\"", "“Hey”"],
    ["\"Hey", "“Hey"],
    ["Hey\"", "Hey”"],
    ["''Hey,'' she said.", "“Hey,” she said."],
    ["And then: ''What?!''", "And then: “What?!”"],
    ["And then: ''What?!''", "And then: “What?!”"],
    ["''Hey! Don't do that!''", "“Hey! Don’t do that!”"],
    ["''She said, 'hi' to me.''", "“She said, ‘hi’ to me.”"],
    ["'''Hi,' is what he told me.''", "“‘Hi,’ is what he told me.”"],
    ["'''Hi'''", "“‘Hi’”"],
    ["'''Cause I said so!\"", "“‘Cause I said so!”"]

])("formatQuotes(\"%s\") -> \"%s\"", ([input, output]) => {
    expect(formatQuotes(input)).toBe(output);
})