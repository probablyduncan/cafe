export const componentNodes = {
    confetti,
    passTime,
} as const;

export type ComponentKey = keyof typeof componentNodes;
export const componentKeys: [ComponentKey] = Object.keys(componentNodes) as [ComponentKey];

async function confetti(context) {
    context.state.isConditionMet({
        name: "confetti",
        negated: false,
    })
    document.body.style.backgroundColor = "red";
    console.log("confetti!!");
    await new Promise(resolve => setTimeout(resolve, 1000));
    document.body.style.backgroundColor = "unset";
}

async function passTime(context) {
    console.log("hey!");
}