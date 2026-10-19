import fs from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runtimeAssets } from "./assets.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const output = join(root, "artifacts");
await fs.mkdir(output, { recursive: true });
const stage = await fs.mkdtemp(join(output, ".portable-stage-"));
const manifest = JSON.parse(await fs.readFile(join(root, "package.json"), "utf8"));
const names = [".github/copilot-instructions.md", ...runtimeAssets];
const npmCli = process.env.npm_execpath;
if (!npmCli || !npmCli.endsWith(".js")) throw new Error("Run through npm run package.");
try {
    for (const name of names) {
        const source = join(root, ...name.split("/")), target = join(stage, ...name.split("/"));
        const info = await fs.lstat(source);
        if (!info.isFile() || info.isSymbolicLink()) throw new Error(`Not a regular package input: ${name}`);
        await fs.mkdir(dirname(target), { recursive: true }); await fs.copyFile(source, target);
    }
    const references = join(stage, ".github", "skills", "marketing-iq", "references");
    await fs.writeFile(join(references, "sharepoint-source-routes.json"),
        JSON.stringify({ schemaVersion: 1, revision: "portable-v1", routes: [] }, null, 2) + "\n");
    await fs.copyFile(join(root, "docs", "integration", "MarketingIQ_Portable.md"), join(stage, "README.md"));
    await fs.writeFile(join(stage, "package.json"), JSON.stringify({
        name: "marketing-iq-workspace", version: manifest.version, private: true,
        description: "Portable hosted Marketing IQ workspace skills and compiled Node helpers",
        engines: manifest.engines, files: [".github", "README.md"], license: "UNLICENSED"
    }, null, 2));
    const receipt = JSON.parse(execFileSync(process.execPath,
        [npmCli, "pack", "--ignore-scripts", "--json", "--pack-destination", output],
        { cwd: stage, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }))[0];
    const archive = join(output, receipt.filename);
    const sha256 = createHash("sha256").update(await fs.readFile(archive)).digest("hex");
    await fs.writeFile(archive + ".sha256", `${sha256}  ${receipt.filename}\n`);
    console.log(JSON.stringify({ archive, sha256, files: receipt.files.map(file => file.path) }));
} finally {
    await fs.rm(stage, { recursive: true });
}
