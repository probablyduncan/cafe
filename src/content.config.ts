import { defineCollection, z } from 'astro:content';
import type { Loader, LoaderContext } from 'astro/loaders';
import path from 'path';
import fs from "fs";
import mermaid from 'mermaid';
import { type FlowEdge, type FlowVertex } from "../node_modules/mermaid/dist/diagrams/flowchart/types.d"
import { marked } from 'marked';
import { dialogueScene, getVisitedStateVariableKey, type DialogueNode, type DialogueScene, type DialogueStateVar } from './lib/contentSchemaTypes';

// migrate this stuff to another file eventually??
// https://github.com/withastro/astro/issues/13253

const scenes = defineCollection({
    loader: dialogueLoader(),
});

export const collections = { scenes };

function dialogueLoader(): Loader {
    return {
        name: "dialogueLoader",

        // Called when updating the collection.
        load: async (context: LoaderContext): Promise<void> => {

            const files = import.meta.glob("/src/content/cafe/scenes/**/*.{md,mmd}");
            const filePaths = Object.keys(files).map(filePath => path.join(process.cwd(), filePath));

            const loadAll = async () => {
                context.store.clear();
                // await parseFile(filePaths[0], context);
                await Promise.all(filePaths.map(filePath => { parseFile(filePath, context) }));
            };
            await loadAll();

            // context.watcher?.add("./dialogueLoader.ts");
            context.watcher?.on("change", (path) => {
                if (filePaths.includes(path)) {
                    parseFile(path, context);
                }
                // else if (import.meta?.filename === path) {
                //     context.store.clear();
                //     loadAll();
                // }
            });
        },

        // schema of DataStore.
        schema: async () => dialogueScene
    };
}

async function parseFile(filePath: string, context: LoaderContext) {

    const file = fs.readFileSync(filePath);
    const content = file.toString();

    const relativePath = path.relative(process.cwd(), filePath);
    const { name, ext } = path.parse(relativePath);

    switch (ext) {
        case ".mmd":
            await parseMMD(name, relativePath, content, context);
        case ".md":
            await parseMD(name, relativePath, content, context);
        default:
            return;
    }
}

async function parseMMD(name: string, filePath: string, content: string, context: LoaderContext) {

    mermaid.mermaidAPI.initialize({ startOnLoad: false });
    const { db: diagramDB } = await mermaid.mermaidAPI.getDiagramFromText(content, { title: name });

    const vertices = diagramDB["vertices"] as Map<string, FlowVertex>;
    const edges = diagramDB["edges"] as FlowEdge[];

    const nodes: Record<string, Partial<DialogueNode>> = {};
    async function getNode(key: string): Promise<Partial<DialogueNode>> {
        if (key in nodes) {
            return nodes[key];
        }

        const node: Partial<DialogueNode> = {}
        node.children = [];
        node.requiredStateKeys = [];
        node.stateKeysToSetOnChoose = [];

        const vert = vertices.get(key);
        if (vert) {
            if (vert.type === undefined) {
                // this means it's a macro or some other kind of utility
            }
            else {
                node.style = vert.type;
                if (vert.text) {
                    node.html = await marked.parseInline(vert.text);
                    // node.html = node.html.replaceAll("\n", "<br><br>");
                }
            }
        }

        nodes[key] = node;
        return node;
    }

    const varsUsed = new Set<string>();

    for (let i = 0; i < edges.length; i++) {
        const edge = edges[i];
        const startNode = await getNode(edge.start);

        const endKey = edge.end;
        const endNode = await getNode(endKey);
        startNode.children?.push(endKey);

        switch (edge.type) {
            case "arrow_circle":
            case "arrow_cross":
                endNode.type = "choice";

                // a cross is a choice you can't choose again
                // so this creates a variable which will be set to true on choosing,
                // and which will be required to be unset for future visits,
                // thus preventing future visits

                const key = getVisitedStateVariableKey(endKey);
                varsUsed.add(key);
                endNode.stateKeysToSetOnChoose?.push({ key });
                if (edge.type === "arrow_cross") {
                    endNode.requiredStateKeys?.push({ key, negated: true });
                }

                break;
            case "arrow_point":
            default:
                endNode.type = "text";
                break;
        }

        // state variables
        if (edge.text) {
            const stateVar: DialogueStateVar = {
                key: edge.text,
            };

            // resolve negated
            if (edge.text.startsWith("!")) {
                stateVar.key = stateVar.key.substring(1);
                stateVar.negated = true;
            }

            if (startNode.type === "choice") {
                // if coming from a choice, the variable is meant to be set
                startNode.stateKeysToSetOnChoose?.push(stateVar);
            }
            else {
                // otherwise, the variable is required to reach the next node
                endNode.requiredStateKeys?.push(stateVar);
            }

            varsUsed.add(stateVar.key);
        }

        // arrow length
        startNode.delay = edge.length;
    }

    const data: DialogueScene = {
        entryNode: edges[0]?.start,
        nodes: nodes as Record<string, DialogueNode>,
        varsUsed: Array.from(varsUsed),
    }

    context.store.set({
        id: name,
        filePath: filePath,
        data,
    });
}

async function parseMD(name: string, filePath: string, content: string, context: LoaderContext) {
    // console.log(content)
}
