import { getCollection } from "astro:content";
import path from "path";
import type {
    InferGetStaticParamsType,
    InferGetStaticPropsType,
    GetStaticPaths,
} from "astro";

export const getStaticPathsImpl = (async () => {
    const cafe = (await getCollection("cafe"));
    const all = cafe
        .map(data => ({
            params: { id: path.parse(data.id).name },
            props: { data },
        }));

    return all;
}) satisfies GetStaticPaths;

export type WikiParams = InferGetStaticParamsType<typeof getStaticPathsImpl>;
export type WikiProps = InferGetStaticPropsType<typeof getStaticPathsImpl>;