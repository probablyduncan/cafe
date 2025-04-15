import type { GetStaticPaths } from "astro";
import { getStaticPathsImpl, type StaticPathProps } from "../../../lib/server/getStaticPaths";

export async function GET({ props }: { props: StaticPathProps }) {
    return new Response(
        JSON.stringify(props.data),
    );
}

export const getStaticPaths = (async () => await getStaticPathsImpl()) satisfies GetStaticPaths;