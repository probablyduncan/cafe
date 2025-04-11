import { defineCollection, z } from 'astro:content';
import type { Loader, LoaderContext } from 'astro/loaders';
import path from 'path';
import fs from "fs";
import mermaid from 'mermaid';
import { type FlowEdge, type FlowVertex } from "../node_modules/mermaid/dist/diagrams/flowchart/types.d"
import { marked } from 'marked';
import { flowchart, getVisitedStateVariableKey, type Flowchart, type FlowchartEdge, type Scene, sceneSchema, nodeSchema, type SceneNode, childNodeSchema, type StateCondition, type SceneChild } from './lib/contentSchemaTypes';
import { type FilePath, parsePath } from './lib/parsePath';

// migrate this stuff to another file eventually??
// https://github.com/withastro/astro/issues/13253

const scenes = defineCollection({
    loader: sceneLoader(),
});

export const collections = { scenes };

const assets: Map<string, SceneNode["type"]> = new Map();

function sceneLoader(): Loader {
    return {
        name: "sceneLoader",

        // Called when updating the collection.
        load: async (context: LoaderContext): Promise<void> => {

            const loadAll = async () => {

                context.store.clear();
                assets.clear();

                fs.readdirSync(path.join(process.cwd(), "/public/assets/images/")).forEach((val) => {
                    assets.set(val, "image");
                })
    
                const scenes = import.meta.glob("/src/assets/scenes/**/*.{md,mmd}");
                await Promise.all(Object.keys(scenes).map(async filePath => {
                    const parsedPath = parsePath(filePath);
                    await updateAsset("add", parsedPath);
                }));
            };

            await loadAll();

            // context.watcher?.add("./dialogueLoader.ts");

            context.watcher?.on("all", (event, absolutePath) => {
                const parsedPath = parsePath(absolutePath);
                updateAsset(event as typeof updateAsset["arguments"][0], parsedPath);
            });

            async function updateAsset(event: "add" | "change" | "unlink", parsedPath: FilePath) {
                if (path.matchesGlob(parsedPath.relativePath, "src/assets/scenes/**/*.{md,mmd}")) {
                    console.log(event, "scene:", parsedPath.file);

                    switch (event) {
                        case "add":
                            assets.set(parsedPath.file, "scene");
                            await parseFile(parsedPath, context);
                            break;
                        case "change":
                            await parseFile(parsedPath, context);
                            break;
                        case "unlink":
                            assets.delete(parsedPath.file);
                            context.store.delete(parsedPath.name);
                            break;
                    }
                }

                else if (path.matchesGlob(parsedPath.relativePath, "public/assets/images/**/*.{svg,webp,jpg}")) {
                    console.log(event, "image:", parsedPath.file);

                    switch (event) {
                        case "add":
                            assets.set(parsedPath.file, "image");
                            break;
                        case "unlink":
                            assets.delete(parsedPath.file);
                            break;
                    }
                }
            }
        },

        // schema of DataStore.
        schema: async () => sceneSchema
    };
}

async function parseFile(filePath: FilePath, context: LoaderContext) {

    const file = fs.readFileSync(filePath.absolutePath);
    const content = file.toString();

    switch (filePath.ext) {
        case ".mmd":
            await parseMMD(filePath, content, context);
        case ".md":
            await parseMD(filePath, content, context);
        default:
            return;
    }
}

async function parseMMD(filePath: FilePath, content: string, context: LoaderContext) {

    mermaid.mermaidAPI.initialize({ startOnLoad: false });
    const { db: diagramDB } = await mermaid.mermaidAPI.getDiagramFromText(content, { title: filePath.name });

    const vertices = Object.fromEntries(diagramDB["vertices"] as Map<string, FlowVertex>);
    const edges = diagramDB["edges"] as FlowEdge[];

    if (!edges?.length) {
        return;
    }

    const chart = await flowchart.parseAsync({ vertices, edges }) as Flowchart;
    const scene = await flowChartToScene(chart);

    context.store.set({
        id: filePath.name,
        filePath: filePath.relativePath,
        data: scene,
    });
}

async function parseMD(filePath: FilePath, content: string, context: LoaderContext) {
    // console.log(content)
}

async function flowChartToScene(chart: Flowchart): Promise<Scene> {

    if (!chart?.edges?.length) {
        return sceneSchema.parse({});
    }

    const nodes: Record<string, SceneNode> = {};
    const varsUsed = new Set<string>();

    for (var i = 0; i < chart.edges.length; i++) {
        const edge = chart.edges[i];

        const startNode = await getOrCreateNode(edge, "start");
        const endNode = await getOrCreateNode(edge, "end");

        const child = await getChild(startNode, endNode, edge);
        startNode.children.push(child);
    }

    const scene = sceneSchema.parse({
        nodes: nodes,
        varsUsed: Array.from(varsUsed),
        entryNode: chart.edges[0].start,
    });

    return scene;

    async function getOrCreateNode(edge: FlowchartEdge, side: "start" | "end"): Promise<SceneNode> {

        const key = edge[side];
        const vert = chart.vertices[key];

        let node: SceneNode;

        if (key in nodes) {
            node = nodes[key];
        }
        else {
            node = await initNode();
            nodes[key] = node;
        }

        return node;

        /**
         * called once, most likely as an end node
         */
        async function initNode(): Promise<SceneNode> {
            const node: any = { key };

            if (side === "end" && edge.type === "arrow_circle") {
                node.type = "choice";
                node.html = marked.parseInline(vert.text!);
                // node.style =
            }
            else if (assets.has(vert.text!)) {
                node.type = assets.get(vert.text!);
                switch (node.type as SceneNode["type"]) {
                    case "scene":
                        node.key = path.parse(vert.text!).name;
                        break;
                    case "component":
                        node.key = vert.text;
                        break;
                    case "image":
                        // TODO how do I pass in alt
                        node.src = vert.text!;
                        // node.alt = 
                        // node.style = 
                        break;
                }
            }
            else if (vert.type !== undefined) {
                node.type = "text";
                node.html = await marked.parseInline(vert.text!);
                // node.style =
            }
            else {
                node.type = "passthrough";
            }

            return nodeSchema.parse(node);
        }
    }

    async function getChild(startNode: SceneNode, endNode: SceneNode, edge: FlowchartEdge): Promise<SceneChild> {

        const child = childNodeSchema.parse({
            key: edge.end,
            delay: {
                cycles: edge.length - 1,
                // style: TODO haven't added options yet
            },
            clearPrevious: edge.type === "arrow_cross",
        });

        // stateVariables
        if (edge.text !== undefined && edge.text !== "") {

            let key: string;

            if (edge.text === "!") {
                // special case, only allow this node once
                key = getVisitedStateVariableKey(edge.end);

                child.requiredState = { key, negated: true };
                endNode.setState = { key, negated: false };
            }
            else {
                const negated = edge.text.startsWith("!");
                key = negated ? edge.text.substring(1) : edge.text;

                if (startNode.type === "choice") {
                    // need to set this state on choosing the choice
                    startNode.setState = { key, negated };
                }
                else {
                    // otherwise, state is required for this path
                    child.requiredState = { key, negated };
                }
            }

            varsUsed.add(key);
        }

        return child;
    }
}