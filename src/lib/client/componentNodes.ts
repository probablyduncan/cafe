import type { IGameState } from "./gameState";

/**
 * Functions of type `(context: ComponentNodeContext) => Promise<void>`
 * that can be used as linear nodes
 */
export const componentNodes = {
    confetti,
    passTime,
} as const;

export type ComponentKey = keyof typeof componentNodes;
export const componentKeys = Object.keys(componentNodes) as [ComponentKey];

export type ComponentNodeContext = {
    state: IGameState;
    isBackRendering: boolean;
}

//#region functions

async function confetti(context: ComponentNodeContext) {

    if (context.isBackRendering) {
        console.log("back rendering confetti");
        return;
    }

    context.state.isConditionMet({
        name: "confetti",
        negated: false,
    })
    document.body.style.backgroundColor = "red";
    console.log("confetti!!");
    await new Promise(resolve => setTimeout(resolve, 1000));
    document.body.style.backgroundColor = "unset";
}

async function passTime() {
    console.log("hey!");
}

//#endregion