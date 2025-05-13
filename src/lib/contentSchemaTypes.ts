import { z } from "astro/zod";
import { componentKeys } from "./client/componentNodes";

// export const timeSlot = z.enum(["morning", "afternoon", "evening", "closed"]);
// export type TimeSlot = z.infer<typeof timeSlot>;


export const getVisitedStateVariable = (nodeId: string) => `v:${nodeId}`;

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
    name: z.string(),
    negated: z.boolean().default(false),
});


// need to control:
// node style
// node transition
// thinking/delay animation



export const childNodeSchema = z.object({
    nodeId: z.string(),
    delay: z.object({
        cycles: z.number(),             // determined by edge length, 0 if no extra delay
        style: z.enum(["threeDots", "newScene"]).default("threeDots"),  // determined by edge stroke
    }),
    requiredState: stateCondition.optional(),
});

const nodeBaseSchema = z.object({
    nodeId: z.string(),
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
    number: z.string().optional(),
    style: z.enum(["default"]).default("default"),
    clearOnChoose: z.boolean().default(false),
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
    sceneKey: z.string().default(""),
});

const componentNodeSchema = nodeBaseSchema.extend({
    type: z.literal("component"),
    componentKey: z.enum(componentKeys).default("confetti"),
});

export const nodeSchema = z.discriminatedUnion("type", [
    textNodeSchema,
    choiceNodeSchema,
    passthroughNodeSchema,
    imageNodeSchema,
    nestedSceneNodeSchema,
    componentNodeSchema,
]);

export type SceneNode = z.infer<typeof nodeSchema>;
export type SceneChild = z.infer<typeof childNodeSchema>;

export type NodePosition = {
    nodeId: string;
    sceneId: string;
}

export type RenderableLinearNode = 
    Exclude<SceneNode, { type: "choice" }> 
    & SceneChild 
    & NodePosition;

export type RenderableChoice = 
    Extract<SceneNode, { type: "choice" }> 
    & SceneChild 
    & NodePosition 
    & { visited: boolean };

export type StateCondition = z.infer<typeof stateCondition>;

export const sceneSchema = z.object({
    sceneId: z.string(),
    nodes: z.record(z.string(), nodeSchema).default({}),
    entryNodeId: z.string(),
    varsUsed: z.array(z.string()).default([]),
    // timeSlot: timeSlot.optional(),
})
export type Scene = z.infer<typeof sceneSchema>;

export const SAVE_DATA_KEY = "save-data" as const;