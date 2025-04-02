import { z } from "astro/zod";

export const timeSlot = z.enum(["morning", "afternoon", "evening", "closed"]);
export type TimeSlot = z.infer<typeof timeSlot>

export const dialogueNodeType = z.enum(["text", "choice", "scene", "return", "reset"]);
export type DialogueNodeType = z.infer<typeof dialogueNodeType>;

export const dialogueStateVar = z.object({
    key: z.string(),
    negated: z.boolean().default(false).optional(),
})
export type DialogueStateVar = z.infer<typeof dialogueStateVar>;

// export const nodeStyle = z.enum(["square", "circle", "pointy"]);

export const dialogueNode = z.object({
    html: z.string().optional(),
    type: dialogueNodeType,
    style: z.string(),
    delay: z.number().default(1),
    children: z.array(z.string()),
    requiredStateKeys: z.array(dialogueStateVar),
    stateKeysToSetOnChoose: z.array(dialogueStateVar),
});
export type DialogueNode = z.infer<typeof dialogueNode>;

export const dialogueScene = z.object({
    entryNode: z.string(),
    nodes: z.record(z.string(), dialogueNode),
    // time: timeSlot,
    varsUsed: z.array(z.string()),
});
export type DialogueScene = z.infer<typeof dialogueScene>;


export const getVisitedStateVariableKey = (nodeID: string) => `visited:${nodeID}`;