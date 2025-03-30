import { getCollection } from "astro:content";
import path from "path";
import type {
    InferGetStaticParamsType,
    InferGetStaticPropsType,
    GetStaticPaths,
} from "astro";

export const getStaticPathsImpl = (async () => {
    const cafe = (await getCollection("dialogueNodes"));
    const all = cafe
        .map(data => ({
            params: { id: data.id },
            props: { data },
        }));

    console.log(all)

    return all;
}) satisfies GetStaticPaths;

export type WikiParams = InferGetStaticParamsType<typeof getStaticPathsImpl>;
export type WikiProps = InferGetStaticPropsType<typeof getStaticPathsImpl>;