import { expect, test } from 'vitest'
import { splitHtml } from '../src/lib/agnostic/letterSplitter';

test.for([
    [
        "Now",
        "<span><span>N</span><span>o</span><span>w</span></span>",
    ],
    [
        "Now <em>this</em> is music.",
        "<span><span>N</span><span>o</span><span>w</span><span> </span><em>t</em><em>h</em><em>i</em><em>s</em><span> </span><span>i</span><span>s</span><span> </span><span>m</span><span>u</span><span>s</span><span>i</span><span>c</span><span>.</span></span>",
    ],
    [
        "1,\n2,\n3.",
        "<span><span>1</span><span>,</span><span> </span></span><span><span>2</span><span>,</span><span> </span></span><span><span>3</span><span>.</span></span>",
    ],
    [
        "1,\n        2,\n        3.",
        "<span><span>1</span><span>,</span><span> </span></span><span><span>2</span><span>,</span><span> </span></span><span><span>3</span><span>.</span></span>",
    ],
    [
        "\t1,\n\t2,\t\n\t3.",
        "<span><span>1</span><span>,</span><span> </span></span><span><span>2</span><span>,</span><span> </span></span><span><span>3</span><span>.</span></span>",
    ],
    [
        "1,\n<em>2</em>,\n3.",
        "<span><span>1</span><span>,</span><span> </span></span><span><em>2</em><span>,</span><span> </span></span><span><span>3</span><span>.</span></span>",
    ],
    [
        "A&mdash;B",
        "<span><span>A</span><span>&mdash;</span><span>B</span></span>"
    ],
    [
        "A\n<em>B\nC</em>\nD",
        "<span><span>A</span><span> </span></span><span><em>B</em><span> </span></span><span><em>C</em><span> </span></span><span><span>D</span></span>"
    ],
])("splitHtml(\"%s\") -> \"%s\"", ([input, output]) => {
    expect(splitHtml(input)).toBe(output);
});