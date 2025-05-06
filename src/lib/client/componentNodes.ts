export const componentNodes: Record<string, () => Promise<void>> = {
    confetti, 
}

async function confetti() {
    // const context = window.CafeContext;
    console.log("confetti!!");
}