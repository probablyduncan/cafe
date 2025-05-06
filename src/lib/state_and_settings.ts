import type { NodePosition } from "./schemasAndTypes";

interface ISaveable {
    serialize: () => string;
}

class State implements ISaveable {
    
    lastChoice: NodePosition;

    constructor(value: string) {

    }
    
    serialize(): string {

    }
}

const themes = ["light", "dark", "system"] as const;
class Settings implements ISaveable {
    theme: typeof themes[number];

    constructor(value: string) {
        
    }

    serialize: () => string;
}