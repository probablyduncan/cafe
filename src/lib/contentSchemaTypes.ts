import { z } from "astro/zod";

export const timeSlot = z.enum(["morning", "afternoon", "evening", "closed"]);
export type TimeSlot = z.infer<typeof timeSlot>;

// export const dialogueNodeType = z.enum(["text", "choice", "scene", "return", "reset"]);
// export type DialogueNodeType = z.infer<typeof dialogueNodeType>;

// export const dialogueStateVar = z.object({
//     key: z.string(),
//     negated: z.boolean().default(false).optional(),
// });
// export type DialogueStateVar = z.infer<typeof dialogueStateVar>;

// export const dialogueNode = z.object({
//     html: z.string().optional(),
//     type: dialogueNodeType,
//     style: z.string(),
//     delayBefore: z.number().default(1),
//     children: z.array(z.string()),
//     requiredStateKeys: z.array(dialogueStateVar),
//     stateKeysToSetOnChoose: z.array(dialogueStateVar),
// });
// export type DialogueNode = z.infer<typeof dialogueNode>;

// export const dialogueScene = z.object({
//     entryNode: z.string(),
//     nodes: z.record(z.string(), dialogueNode),
//     varsUsed: z.array(z.string()),
//     // time: timeSlot.optional(),
// });
// export type DialogueScene = z.infer<typeof dialogueScene>;


export const getVisitedStateVariableKey = (nodeID: string) => `v:${nodeID}`;

export const flowchartVertex = z.object({
    id: z.string(),
    text: z.string().optional(),
    type: z.enum(["square", "round", "diamond", "subroutine", "circle", "hexagon", "cylinder", "stadium", "doublecircle"]).optional(),
});
export type FlowchartVertex = z.infer<typeof flowchartVertex>;

export const flowchartEdge = z.object({
    start: z.string(),
    end: z.string(),
    text: z.string().optional(),
    length: z.number().min(1).default(1),
    type: z.enum(["arrow_point", "arrow_circle", "arrow_cross", "arrow_open"]).default("arrow_point"),
    stroke: z.enum(["normal", "thick", "dotted", "invisible"]).default("normal"),
});
export type FlowchartEdge = z.infer<typeof flowchartEdge>;

export const flowchart = z.object({
    vertices: z.record(z.string(), flowchartVertex),
    edges: z.array(flowchartEdge),
});
export type Flowchart = z.infer<typeof flowchart>;


export const stateCondition = z.object({
    key: z.string(),
    negated: z.boolean().default(false),
});
export type StateCondition = z.infer<typeof stateCondition>;


// need to control:
// node style
// node transition
// thinking/delay animation



export const childNodeSchema = z.object({
    key: z.string(),
    delay: z.object({
        cycles: z.number(),             // determined by edge length, 0 if no extra delay
        style: z.enum(["threeDots"]).default("threeDots"),  // determined by edge stroke
    }),
    requiredState: stateCondition.optional(),
    clearPrevious: z.boolean().default(false),
});

const nodeBaseSchema = z.object({
    key: z.string(),
    children: z.array(childNodeSchema).default([]),
    setState: stateCondition.optional(),
});

const textNodeSchema = nodeBaseSchema.extend({
    type: z.literal("text"),
    html: z.string().default(""),
    style: z.enum(["default"]).default("default"),
});

const choiceNodeSchema = nodeBaseSchema.extend({
    type: z.literal("choice"),
    html: z.string().default(""),
    style: z.enum(["default"]).default("default"),
});

const passthroughNodeSchema = nodeBaseSchema.extend({
    type: z.literal("passthrough"),
});

const imageNodeSchema = nodeBaseSchema.extend({
    type: z.literal("image"),
    src: z.string().default(""),
    alt: z.string().default(""),
    style: z.enum(["inline"]).default("inline"),
});

const nestedSceneNodeSchema = nodeBaseSchema.extend({
    type: z.literal("scene"),
    key: z.string().default(""),
});

const componentNodeSchema = nodeBaseSchema.extend({
    type: z.literal("component"),
    key: z.string().default(""),
});

export const nodeSchema = z.union([
    textNodeSchema,
    choiceNodeSchema,
    passthroughNodeSchema,
    imageNodeSchema,
    nestedSceneNodeSchema,
    componentNodeSchema,
]);

export type SceneNode = z.infer<typeof nodeSchema>;
export type SceneChild = z.infer<typeof childNodeSchema>;

export const sceneSchema = z.object({
    nodes: z.record(z.string(), nodeSchema).default({}),
    entryNode: z.string().optional(),
    varsUsed: z.array(z.string()).default([]),
    timeSlot: timeSlot.optional(),
})
export type Scene = z.infer<typeof sceneSchema>;
