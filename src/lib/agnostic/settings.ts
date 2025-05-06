export const themes = ["light", "dark", "system"] as const;
export type Settings = {
    theme: typeof themes[number];
    speed: number;
    autoplay: boolean;
}