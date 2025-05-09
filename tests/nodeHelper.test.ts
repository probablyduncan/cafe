import { expect, test } from "vitest";
import { getNodeKey, parseNodeKey, toNodePosition } from "../src/lib/agnostic/nodeHelper";

test("parseNodeKey", () => {
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

test("getNodeKey", () => {
    expect(getNodeKey({
        nodeId: "hey",
        sceneId: "hi",
    })).toBe("hi:hey");
});

test("toNodePosition", () => {

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