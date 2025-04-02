import type { z } from "astro/zod";

declare var getTime: () => TimeSlot;

declare var state: {
    get: () => SaveData,
    setVariable: (key: string, value: boolean) => void,
    setCurrentNode: (node: string, scene?: string) => void,
}

type SaveData = {
    // like "structure/morning-start-outside/around-back/ii"
    currentPath: string[];
    // all keys in state (how do I want to handle choices??) in a Set<string> or something??
    state: Record<string, boolean>;

    // maybe this way? will this get way too big in the future?
    // stored in the format visited:{scene}:{node}
    // chosen: Set<string>;
}