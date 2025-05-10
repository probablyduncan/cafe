import type { NodePosition } from "../contentSchemaTypes";

/**
 * Given an object like `{ sceneId, nodeId }`.
 * returns a node key like: `"sceneId:nodeId"`,
 */
export function getNodeKey(node: NodePosition): string {
    return node.sceneId + ":" + node.nodeId;
}

/**
 * Given a node key like: `"sceneId:nodeId"`,
 * returns an object like `{ sceneId, nodeId }`.
 */
export function parseNodeKey(key: string): NodePosition {
    const split = key.trim().split(":");

    if (split.length !== 2) {
        throw "Invalid node key.";
    }

    return {
        sceneId: split[0],
        nodeId: split[1]
    }
}

/**
 * Returns a NodePosition with unnecessary properties stripped.
 */
export function toNodePosition(extendsNodePosition: NodePosition): NodePosition {
    return {
        sceneId: extendsNodePosition.sceneId,
        nodeId: extendsNodePosition.nodeId,
    };
}

/**
 * Takes string value like `"scene1:node7/scene2:node4/scene3:node8"` and returns array of NodePositions.
 */
export function pathToNodePositions(path?: string): NodePosition[] {

    if (path === undefined || path === "") {
        return [];
    }

    return path.split("/").map(parseNodeKey);
}

/**
 * Takes list of NodePositions and returns string value like `"scene1:node7/scene2:node4/scene3:node8"`. 
 */
export function nodePositionsToPath(nodes?: NodePosition[]): string {

    if (nodes === undefined || nodes.length === 0) {
        return "";
    }

    return nodes.map(getNodeKey).join("/");
}

/**
 * Takes a map of sceneIds and corresponding nodes and returns a string value like `"scene1:n1,n2|scene3:n4,n1"`.
 */
export function sceneNodeMapToString(map?: Map<string, Set<string>>): string {
    if (map === undefined) {
        return "";
    }

    return [...map].map(([sceneId, nodeIds]) => sceneId + ":" + [...nodeIds].join(",")).join("|");
}

/**
 * Takes a string value like `"scene1:n1,n2|scene3:n4,n1"` and returns a map of sceneIds and corresponding nodes.
 */
export function stringToSceneNodeMap(str?: string): Map<string, Set<string>> {
    const result: Map<string, Set<string>> = new Map();
    if (str === undefined || str === "") {
        return result;
    }

    str.split("|").forEach((sceneNodes) => {
        const splitIndex = sceneNodes.indexOf(":");
        if (splitIndex === -1) {
            return;
        }

        const sceneId = sceneNodes.substring(0, splitIndex);
        const nodeIds = sceneNodes.substring(splitIndex + 1).split(",");
        
        if (sceneId && nodeIds.length) {
            result.set(sceneId, new Set(nodeIds));
        }

    });

    return result;
}