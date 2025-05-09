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
