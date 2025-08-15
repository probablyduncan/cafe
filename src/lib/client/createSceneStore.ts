import type { Scene } from "../contentSchemaTypes"

export function useSceneStore() {

    const sceneStore: Map<string, Scene> = new Map();

    async function fetchScene(sceneId: string): Promise<Scene | undefined> {
        // await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
        const result = await fetch(`/api/scenes/${sceneId}.json`);

        if (!result.ok) {
            return undefined;
        }

        const scene = await result.json() as Scene;
        return scene;
    }

    async function getScene(sceneId: string): Promise<Scene | undefined> {

        if (!sceneStore.has(sceneId)) {
            const fetched = await fetchScene(sceneId);
            if (fetched) {
                sceneStore.set(sceneId, fetched);
                return { ...fetched };
            }
        }

        return sceneStore.get(sceneId);
    }

    return {
        getScene,
    }
}