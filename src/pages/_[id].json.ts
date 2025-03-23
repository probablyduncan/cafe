import type { GetStaticPaths } from "astro";
import { getStaticPathsImpl } from "../lib/server";
import { getEntry } from "astro:content";

export async function GET({ params, request }) {

    const id = params.id;
    const entry = await getEntry("cafe", id);

    return new Response(
        JSON.stringify({
            
        }),
    );
}

export const getStaticPaths = (async () => await getStaticPathsImpl()) satisfies GetStaticPaths;