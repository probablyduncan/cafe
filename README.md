### Frontmatter options

- `Reset` - when this card is reached, save data is cleared
- `appearOnce` - once this card has been reached, do not show again in lists

### Choices

There are several ways to specify choices.

The first is a simple ol:

1. Choice 1. [[target-card]]
1. Choice 2. [[target-card]]
1. Choice 3. [[target-card]]

You can use ul instead if you want to use custom numbers

- 1. Choice 1. [[target-card]]
- 1. Choice 2. [[target-card]]
- 1. Choice 3. [[target-card]]

Finally, you can maybe specify them in the frontmatter? Not implemented yet

### Conditional things

==[variable] Highlighting== an item with a target at the front of it makes it conditionally render if that variable is set. ==[!variable] Exclamiation marks== negate the variable.



https://www.youtube.com/watch?v=k4v7XIgxfxY

ok flowcharts now

so we need to distinguish a few things

1. text styles
2. setting/checking variables
3. choice vs no choice vs image, linear vs hub, etc

what can I easily configure in mermaid?

1. bubble type (), [], {}
2. arrow head type -->, --x, --o, ---
3. arrow body type -->, -.->, ==>, ~~>
4. text in bubble
5. text over arrow

I guess I need to make some examples to work this out

text: [] - for example i[*You look around.*]
choice: () - for example i(1\. Take a bite.)
hook: {} - for example i{randNoRepeat}




so I can have different file formats that all get parsed together into one master tree

mmd files get parsed with mermaid/parser and then the contents with marked

md files get split by line break and parsed by marked

images? how should images be displayed?

example tree
```javascript
    const tree = {
        "oneLastJob.i": {
            contents: "Such a doddamn cliche. One last job, my ass. *He takes a long drink.* I'm old. You do it.",
            next: ["oneLastJob.ii-i", "oneLastJob.ii-ii", "oneLastJob.ii-iii"],
        },
        "oneLastJob.ii-i": {
            contents: "What? Me?",
            next: "ii-i-i",
            type: "choice",
        },
        "oneLastJob.ii-i-i": {
            contents: "Yeah, you.",
            next: "oneLastJob.ii-i-ii",
        },
    }
```






### Running mermaid on nodejs

parse diagram:

```
mermaid.mermaidAPI.initialize({ startOnLoad: false });
const { db: diagramDB } = await mermaid.mermaidAPI.getDiagramFromText(content, {});
const vertices = diagramDB["vertices"] as Map<string, FlowVertex>;
const edges = diagramDB["edges"] as FlowEdge[];
```

create fake dompurify module:

```
// domPurifyOverwrite/index.js
export default {
    addHook: () => {},
    sanitize: (txt) => txt,
}
```

overwrite dompurify dependency with local module:

```
// package.json
{
    // other config
    "pnpm": {
        "overrides": {
            "dompurify": "link:./src/lib/domPurifyOverwrite"
        }
    },
}
```










ok what are the rules

# Mermaid syntax

## Basic flow

a text node is denoted like `id[First Line] --> id2[Second Line]`
a choice node is denoted like `id[Take Action]`

## Arrows

a `-->` arrow means something is automatically said
a `--o` means a choice
a `--x` also means a choice, but it won't render if you've already chosen it

## Id keywords

the id in a node can be a special macro, reference an internal scene, or be one of the other reserved keywords

`begin` - entry point for scene
`return` - exit the current scene
`reset` - clear save and 'log out'

