import path from "path";

/**
 * @file: "file.ext"
 * @name: "file"
 * @ext: ".ext"
 * 
 * @relativePath: "src/etc/file.ext"
 * @absolutePath: "C:\\etc\\src\\etc\file.ext" or "/Users/etc/src/etc/file.ext"
 */
export type FilePath = {
    file: string;
    name: string;
    ext: string;
    relativePath: string;
    absolutePath: string;
}

/**
 * only supported on nodejs
 */
export function parsePath(filePath: string) {
    
    const normalized = path.normalize(filePath);
    const { ext, name, base: file } = path.parse(normalized);
    const absolutePath = normalized.startsWith(process.cwd()) ? normalized : path.join(process.cwd(), normalized);
    const relativePath = path.relative(process.cwd(), absolutePath);
    
    return { 
        file,
        name,
        ext,
        relativePath,
        absolutePath,
    };
}

export function testParsePath() {
    console.log(process.platform)
    const paths = {
        win32: [
            "C:\\Code\\cafe\\src\\assets\\scenes\\basic.mmd",
            "\\src\\assets\\scenes\\basic.mmd",
            "src\\assets\\scenes\\basic.mmd",
        ],
        darwin: [
            "/Users/duncanpetrie/Code/cafe/src/assets/scenes/basic.mmd",
            "/src/assets/scenes/basic.mmd",
            "src/assets/scenes/basic.mmd",
        ],
    };

    paths[process.platform]?.forEach((fp: string) => {
        const parsed = parsePath(fp);
        console.log(parsed);
    });
}