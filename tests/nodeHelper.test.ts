import { expect, test } from "vitest";
import { getNodeKey, nodePositionsToPath, parseNodeKey, pathToNodePositions, toNodePosition } from "../src/lib/agnostic/nodeHelper";

test(parseNodeKey, () => {
    expect(parseNodeKey("s1:n1")).toEqual({
        nodeId: "n1",
        sceneId: "s1",
    });

    expect(parseNodeKey("scahabbada:scahoobida")).toEqual({
        sceneId: "scahabbada",
        nodeId: "scahoobida",
    });

    expect(() => parseNodeKey("aaaah")).toThrow();
    expect(() => parseNodeKey("one:two:three")).toThrow();
});

test(getNodeKey, () => {
    expect(getNodeKey({
        nodeId: "hey",
        sceneId: "hi",
    })).toBe("hi:hey");
});

test(toNodePosition, () => {

    const simple = {
        nodeId: "hey",
        sceneId: "hi",
    };

    const complicated = {
        nodeId: "hey",
        sceneId: "hi",
        ahooga: "waa",
        aheega: "woo",
    };

    expect(toNodePosition(simple)).toEqual(toNodePosition(complicated));
    expect(Object.keys(toNodePosition(simple))).toHaveLength(2);
    expect(Object.keys(toNodePosition(complicated))).toHaveLength(2);

});

test(pathToNodePositions, () => {
    expect(pathToNodePositions("s1:n1/s2:n2")).toEqual([{ nodeId: "n1", sceneId: "s1" }, { nodeId: "n2", sceneId: "s2" }]);
    expect(pathToNodePositions("s1:n1/s1:n1")).toEqual([{ nodeId: "n1", sceneId: "s1" }, { nodeId: "n1", sceneId: "s1" }]);
    expect(pathToNodePositions("a:b")).toEqual([{ nodeId: "b", sceneId: "a" }]);

    expect(pathToNodePositions("")).toEqual([])
    expect(pathToNodePositions()).toEqual([])
    expect(() => pathToNodePositions("a/b")).toThrow();
});

test(nodePositionsToPath, () => {
    expect(nodePositionsToPath([{ nodeId: "n1", sceneId: "s1" }, { nodeId: "n2", sceneId: "s2" }])).toBe("s1:n1/s2:n2");
    expect(nodePositionsToPath([{ nodeId: "n1", sceneId: "s1" }, { nodeId: "n1", sceneId: "s1" }])).toBe("s1:n1/s1:n1");
    expect(nodePositionsToPath([{ nodeId: "b", sceneId: "a" }])).toBe("a:b");

    expect(nodePositionsToPath([])).toBe("");
    expect(nodePositionsToPath()).toBe("");
})