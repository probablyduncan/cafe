import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import path from "path";
import fs from "fs";

const contentDir = path.join(process.cwd(), "src", "content", "cafe");
const targetDir = path.join(process.cwd(), "src", "content", "generated");

const globLoader = glob({
    pattern: "**/*.mdx",
    base: "./src/content/generated",
    generateId: ({ entry }) => path.parse(entry).name
});

const baseGlobLoad = globLoader.load;
globLoader.load = (context) => {


    // this is what generates all generated mdx files from md ones
    if (fs.existsSync(targetDir)) {
        fs.rmSync(targetDir, { recursive: true, force: true });
    }
    fs.mkdirSync(targetDir, { recursive: true });

    fs.cpSync(contentDir, targetDir, {
        recursive: true, filter: (src, dst) => {

            if (src.endsWith(".obsidian") || src.endsWith("notes")) {
                return false;
            }

            if (src.endsWith(".md")) {
                const file = fs.readFileSync(src, "utf-8");
                dst += "x";
                fs.writeFileSync(dst, file);
                return false;
            }
            return true;
        }
    });

    // this is what regenerates mdx when a single file changes
    const reload = (changedPath: string) => {

        if (!changedPath.includes(contentDir) || !changedPath.endsWith(".md")) {
            return;
        }

        const dst = path.join(targetDir, path.parse(changedPath).base + "x");
        const file = fs.readFileSync(changedPath, "utf-8");
        // fs.rmSync(dst);
        fs.writeFileSync(dst, file);
    }

    if (context.watcher) {
        context.watcher.on('change', reload);
        context.watcher.on('add', reload);
    }

    return baseGlobLoad(context);
}

const cafe = defineCollection({
    // loader: glob({
    //     pattern: "**/*.(md|mdx)",
    //     base: "./src/cafe",
    //     generateId: ({ entry }) => path.parse(entry).name
    // }),
    loader: globLoader,
    schema: z.object({
        reset: z.boolean().default(false),
        appearOnce: z.boolean().default(false),
    }),
});

export const collections = { cafe };