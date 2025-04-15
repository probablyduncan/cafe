import { getCollection } from "astro:content";
import type {
    InferGetStaticParamsType,
    InferGetStaticPropsType,
    GetStaticPaths,
} from "astro";

export const getStaticPathsImpl = (async () => {
    const scenes = (await getCollection("scenes"));
    const all = scenes
        .map(entry => {
            
            return {
                params: { id: entry.id },
                props: entry,
            }
        });

    return all;
}) satisfies GetStaticPaths;

export type StaticPathParams = InferGetStaticParamsType<typeof getStaticPathsImpl>;
export type StaticPathProps = InferGetStaticPropsType<typeof getStaticPathsImpl>;
