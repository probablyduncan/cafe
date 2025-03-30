type Time = "morning" | "afternoon" | "evening" | "closed";
declare var getTime: () => Time;

declare var state: {
    get: () => SaveData,
    setVariable: (key: string, value: boolean) => void,
    setCurrentNode: (node: string, scene?: string) => void,
}

type SaveData = {
    currentScene: string;
    currentNode: string;
    state: Record<string, boolean>;
}