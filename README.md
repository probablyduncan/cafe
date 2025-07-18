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

==[variable] Highlighting== an item with a target at the front of it makes it conditionally render if that variable is set. ==[!variable] Exclamation marks== negate the variable.



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
            "dompurify": "link:./src/lib/server/domPurifyOverwrite"
        }
    },
}
```










ok what are the rules

# Mermaid syntax

## Basic flow

a text node is denoted like `id[First Line] --> id2[Second Line]`
a choice node is denoted like `id[Take Action]`

## Arrow points

a `-->` arrow means something is automatically said
a `--o` means a choice
a `--x` also means a choice, but it won't render if you've already chosen it

## Arrow bodies/lengths

`--` is the standard length
any longer, and the dialogue will 'think' before it speaks
`==` is another style
`-.-` is another another style? Maybe this is the style of waiting?

## Id keywords

the id in a node can be a special macro, reference an internal scene, or be one of the other reserved keywords

`begin` - entry point for scene
`return` - exit the current scene
`reset` - clear save and 'log out'

## Edges
- text content
- line length (>= 1)
- type
    - `-->, ==>, -.->` arrow_point
    - `--o, ==o, -.-o` arrow_circle
    - `--x, ==x, -.-x` arrow_cross
    - `---, ===, -.-, ~~~` arrow_open
- stroke
    - `-->, --o, --x, ---` normal
    - `==>, ==o, ==x, ===` thick
    - `-.->, -.-o, -.-x, -.-` dotted
    - `~~~` invisible

## Vertices
- text content or none
- shape
    - `[]` square
    - `()` round
    - `{}` diamond
    - `[[]]` subroutine
    - `(())` circle
    - `{{}}` hexagon
    - `[()]` cylinder
    - `([])` stadium
    - `((()))` doublecircle
    - no label: undefined

# Things I need to control

- text node: `-->`
    - text content
    - style/type?
        - node type?
    - delay length
        - edge length
    - delay type? (..., or something else?)
        - edge stroke?
    - required state
        - in edge before node
- choice node: `--o`
    - text content
    - style/type?
        - shape of node
    - required state
        - in edge before choice. For example, `text -- orderedSandwich --o choice`
    - state setter
        - state key after choice sets variable
    - whether you can only do it once 
        - maybe this can be an extension of required state?
        - we'll need to track all choices made, I think, to know what to grey out
        - so this can just be like `-- ! --o` or `-->|!|` or something, to denote it should check the choice's state var
- macro/utility node: `--x`
    - could be nested scene, component or script? maybe other types? But we'll just use the text
    - so if it's something that'll only be used once, like `return`, could just do `--x return`
    - some things might be used twice in one diagram, so could do `--x id1[loading]` and `--x id2[loading]`
    - what about images/doodles? is that a macro? probably
- state
    - checked in arrow, like `-->|stateKey|` or `--stateKey-->`
    - check negative with `!`, like `-- !stateKey-->`
    - combine several with `&` or `|` - future enhancement

## Controls

Utility node (macro, return, etc.) is denoted by a node with an undefined type
for example `a[You leave.] --> return`

Node shape controls type of node
- normal text is []
- emphasized? is [[]]
- a choice is ()
- a choice that's not very important is ([])

Transition animation type is controlled by the arrow stroke
Transition duration is controlled by edge length

Arrow head controls variables
options: no change no issue
- `>` means it'll always be the same
- `o` means it will be greyed out if you've already asked it
- `x` means it can only show up once

## Animation timeline

When a node is called to be rendered:
1. If there's a delay longer than the default, the relevant 'thinking' animation is played
2. Once this extra delay is over, the node enter animation is played (depending on node shape)
3. 
2. This enter animation might contain 
2. It then pauses before rendering children.

When a choice is chosen, content is cleared, wait for default delay, then render children



WHAT ABOUT big titles? 
\- Act I -
etc.


maybe --x should clear the dialogue feed?

multiple lines in one node should all be displayed inline but should animate staggered




saving should be based on last choice
so `lastChoice: "sceneId:nodeId"`
and then we can have a history of choices
so `history: ["sceneId:nodeId","sceneId:nodeId", ...]` etc
and then we can control how far back you can see

^ the problem with this is that you also have to store state at that point? i.e. keys, whether the choice had been made before, etc. So maybe can just store an array of serialized json strings of state that we can load from
each choice would shift the history array and push another state string, and then going back would just load the previous state



## Settings I need to make customizable

autoplay vs click to progress dialogue

dark/light/system
maybe different color schemes would be cool

font size? font family?
different readability settings would be nice
reduced motion/effects

how to make this work for screen readers?

















## Rendering steps

begin:
- load state
- render scene at entryNode

render scene:
- render first node in scene
- continue rendering nodes
- when nodes have been rendered, exit the scene

render node:
- if text, image component node, render text and render children
- if choice, add choice
- if passthrough, render children

render children:
- render first of each type, EXCEPT for choices. Render all choices, staggered


should '' repeated apostrophes be turned into quotes? single ones should be turned into the correct character too right?

so the delay between inline pauses and new line pauses is the same? The base delay at least. The threedots/etc pauses are extra


by default, the text is revealed at a certain speed, but if you hold down the mouse or space bar it accelerates
so you can't just wholly skip, but you can speed it up

additionally, text above the main text should have lower opacity than the current text
and maybe the current text should be centered? Or the top of it should be at the center line? So that the first line of the current paragraph is always in the same place on the screen? Idk how that would be styled

NO RECURSION??
LOOPS ONLY


I'm thinking maybe the text, choices, etc should all be in the same container. Choices should be rendered as elements in the big content scroll thing


option in debug mode to click on a rendered piece of text to go back to that point?


## todo:
- [x] implement IRenderer up to what's currently working
- [x] back rendering / fast forwarding in renderer
- [x] basic events implementation for RESET button and MAKE CHOICE only
- [ ] wire up debug stuff
- [ ] global state keys ? for date/time
- [ ] back rendering fade in effect
- [ ] better text effects
- [ ] save files? quicksave, save file browser
- [ ] writing!! that is probably top priority lol and how I will learn what new features I need
- [x] maybe don't serialize last clear choice in choices map, so it doesn't get stored twice?



ok so what is actually blocking me
- debug is difficult to wire up, because of separation of concerns, compartmentalization, abstraction
- I don't really know what debug options I need
- I'm putting off implementing actual features because it's a pain to refactor stuff every time

what can I do to solve this?
- procedural code, messier code lol
- figure out all the requirements first before optimizing/refactoring/architecting

what are the big requirements now that I've been thinking about it?
- need to actually traverse the story normally
- configuration options
    - speed (can I do this with css? I don't think so)
    - reduce motion? animate text vs don't animate text (css? not sure, probably need js, same as render speed)
    - play/pause? (js)
    - theme (css only)
    - text size? (css only)
- debug options
    - go to node (text box, type in scene:node or something)
        - how should this work?
        - can we roll back state or something?
        - or maybe just go there and don't bother with state
        - visited choices can be empty
        - and we'll allow the debugger to choose whatever state vars they want I guess?
    - so debug mode doesn't save, you just go to whatever state you want yourself
    - this means you have to be able to modify all aspects of the state
    - ability to update state vars used in current scene (updates state)
    - save and load states (snapshots/quicksave for easy testing)