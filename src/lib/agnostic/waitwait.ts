/**
 * Don't tell me!
 */
export async function waitwait(ms: number) { await new Promise((res) => setTimeout(res, ms)); }