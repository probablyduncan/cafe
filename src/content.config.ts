import { defineCollection, z } from 'astro:content';
import type { Loader, LoaderContext } from 'astro/loaders';
import path from 'path';
import fs from "fs";
import mermaid from 'mermaid';
import { type FlowEdge, type FlowVertex } from "../node_modules/mermaid/dist/diagrams/flowchart/types.d"

const dialogueNodes = defineCollection({
    loader: dialogueLoader(),
});

export const collections = { dialogueNodes };

function dialogueLoader(options?: { url: string, apiKey: string }): Loader {
    return {
        name: "dialogueLoader",

        // Called when updating the collection.
        load: async (context: LoaderContext): Promise<void> => {

            const files = import.meta.glob("/src/content/cafe/scenes/**/*.{md,mmd}");
            const filePaths = Object.keys(files).map(filePath => path.join(process.cwd(), filePath));

            const loadAll = () => filePaths.forEach(filePath => parseFile(filePath, context));
            // const loadAll = () => parseFile(filePaths[0], context); // temp only one
            loadAll();

            // context.watcher?.add("./dialogueLoader.ts");
            context.watcher?.on("change", (path) => {
                if (filePaths.includes(path)) {
                    parseFile(path, context);
                }
                else if (import.meta?.filename === path) {
                    context.store.clear();

                    context.watcher?.emit("")
                    loadAll();
                }
            });
        },

        // schema of DataStore.
        schema: async () => z.object({
            id: z.string(),
            // setVar: z.string(),
            text: z.string(),
            children: z.array(z.string(), )
            // z.object({
                // id: z.string(),
                // pause: z.number(),
                // requiredVar: z.string(),
                // setVar: z.string(),
            // }))
        })
    };
}

function parseFile(filePath: string, context: LoaderContext) {

    console.log("loading file", filePath)

    const file = fs.readFileSync(filePath);
    const content = file.toString();
    const { ext, name } = path.parse(filePath)
    switch (ext) {
        case ".mmd":
            parseMMD(name, content, context);
        case ".md":
            parseMD(name, content, context);
        default:
            return;
    }
}

async function parseMMD(sceneId: string, content: string, context: LoaderContext) {

    mermaid.mermaidAPI.initialize({ startOnLoad: false });
    const { db: diagramDB } = await mermaid.mermaidAPI.getDiagramFromText(content, { title: sceneId });
    const vertices = diagramDB["vertices"] as Map<string, FlowVertex>;
    const edges = diagramDB["edges"] as FlowEdge[];

    const { store } = context;
    edges.forEach((edge, i) => {

        // for each edge:
        // we need to set the start and end, and associated info

        const startKey = sceneId + "." + edge.start;
        const startVert = vertices.get(edge.start)!;
        const endKey = sceneId + "." + edge.end;

        let start: {
            id: string;
            text: string;
            children: string[],
        };
        if (store.has(startKey)) {
            start = store.get(startKey)!.data! as {
                id: string;
                text: string;
                children: string[];
            };
        }
        else {
            start = {
                id: startKey,
                text: startVert.text ?? startVert.id,
                children: [],
            }
        }

        start.children.push(endKey);

        const entry = {
            id: start.id,
            data: start as Record<string, unknown>
        }

        store.set(entry);
        // console.log(entry.data);
    });
}

export type DialogueNode = {
    id: string;
    style?: FlowVertex["type"];
    children: {
        type: string;
        id: string;
        requiredStateKey?: string;
    }[];
    content: string;    // markdown
}

function parseMD(sceneId: string, content: string, context: LoaderContext) {
    // console.log(content)
}

async function validateAndSave(node: DialogueNode, context: LoaderContext) {

    const id = node.id;



    // validate/parse to schema
    const validatedData = await context.parseData({
        id: node.id,
        data: node,
    });

    // enter into store
    context.store.set({
        id: node.id,
        data: validatedData,
    });
}